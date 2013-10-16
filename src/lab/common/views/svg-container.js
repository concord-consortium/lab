/*global $, define: false, d3: false */
// ------------------------------------------------------------
//
//   SVG View Container
//
// ------------------------------------------------------------
define(function (require) {
  // Dependencies.
  var performance           = require('common/performance'),
      getNextTabIndex       = require('common/views/tab-index'),
      featureTests          = require('common/feature-tests'),
      console               = require('common/console'),
      PIXI                  = require('pixi'),

      CANVAS_OVERSAMPLING = 1.5;

  return function SVGContainer(model, modelUrl, Renderer, opt) {
        // Public API object to be returned.
    var api,

        // Coordinate system origin. Supported values are 'bottom-left' and 'top-left'.
        origin = opt && opt.origin || 'bottom-left',

        $el,
        node,
        emsize,
        fontSizeInPixels,

        backgroundContainer, viewportContainer, foregroundContainer, clickShield,

        containerBackground, gridContainer, brushContainer,

        pixiRenderers, pixiStages, pixiContainers,

        // A list of all outermost svg/canvas/div containers which may have clickable or touchable
        // child elements, ordered from topmost to bottom-most. Because the layers are siblings, not
        // ancestors, the upper layers prevent mouse and touch events from reaching the lower layers
        // even when no element within the upper layers is actually being clicked/touched.
        layersToHitTest,

        cx, cy,
        padding, size, modelSize, viewport, viewPortZoom,

        model2canvas    = d3.scale.linear(),
        model2canvasInv = d3.scale.linear(),

        // Basic scaling functions for positio, it transforms model units to "pixels".
        // Use it for positions of objects rendered inside the view.
        //
        // This function is exposed in public API. Never ever recreated it, as
        // renderers and sub-renders will loose reference to valid scale
        // function.
        model2px = d3.scale.linear(),

        // Inverted scaling function for position transforming model units to "pixels".
        // Use it for Y coordinates, as Y axis in model coordinate system increases
        // from bottom to top, while but SVG has increases from top to bottom.
        //
        // This function is exposed in public API. Never ever recreated it, as
        // renderers and sub-renders will loose reference to valid scale
        // function.
        model2pxInv = d3.scale.linear(),

        clickHandler,
        dragHandler,
        // d3.svg.brush object used to implement select action. It should be
        // updated each time model2px and model2pxInv functions are changed!
        selectBrush,

        dispatch = d3.dispatch("viewportDrag"),

        renderer;

    function getFontSizeInPixels() {
      return parseFloat($el.css('font-size')) || 18;
    }

    // Padding is based on the calculated font-size used for the model view container.
    function updatePadding() {
      fontSizeInPixels = getFontSizeInPixels();
      // Convert value to "em", using 18px as a basic font size.
      // It doesn't have to reflect true 1em value in current context.
      // It just means, that we assume that for 18px font-size,
      // padding and playback have scale 1.
      emsize = fontSizeInPixels / 18;

      padding = {
         "top":    0 * emsize,
         "right":  0 * emsize,
         "bottom": 0 * emsize,
         "left":   0 * emsize
      };

      if (model.get("xunits") || model.get("yunits")) {
        padding.bottom += (fontSizeInPixels * 1.2);
        padding.left +=   (fontSizeInPixels * 1.3);
        padding.top +=    (fontSizeInPixels/2);
        padding.right +=  (fontSizeInPixels/2);
      }

      if (model.get("xlabel") || model.get("ylabel")) {
        padding.bottom += (fontSizeInPixels * 0.8);
        padding.left +=   (fontSizeInPixels * 0.8);
      }
    }

    function scale() {
      var viewPortWidth = model.get("viewPortWidth"),
          viewPortHeight = model.get("viewPortHeight"),
          viewPortX = model.get("viewPortX"),
          viewPortY = model.get("viewPortY"),
          aspectRatio,
          width, height;

      viewPortZoom = model.get("viewPortZoom") || 1;

      // Model size in model units.
      modelSize = {
        "minX": model.get('minX'),
        "minY": model.get('minY'),
        "maxX": model.get('maxX'),
        "maxY": model.get('maxY')
      };

      // Note that viewPort specification can be undefined and then viewport
      // should fit the model.
      viewport = {
        width: viewPortWidth != null ? viewPortWidth : modelSize.maxX - modelSize.minX,
        height: viewPortHeight != null ? viewPortHeight : modelSize.maxY - modelSize.minY,
        x: viewPortX != null ? viewPortX : modelSize.minX,
        y: viewPortY != null ? viewPortY : modelSize.minY
      };

      viewport.scaledWidth  = viewport.width / viewPortZoom;
      viewport.scaledHeight = viewport.height / viewPortZoom;
      if (origin === 'bottom-left') {
        viewport.y += viewport.scaledHeight;
      }

      aspectRatio = viewport.width / viewport.height;

      updatePadding();

      cx = $el.width();
      width = cx - padding.left  - padding.right;
      height = width / aspectRatio;
      cy = height + padding.top  + padding.bottom;
      node.style.height = cy + "px";

      // Plot size in px.
      size = {
        "width":  cx - padding.left - padding.right,
        "height": cy - padding.top  - padding.bottom
      };

      size = {
        "width":  width,
        "height": height
      };

      // Basic model2px scaling function for position.
      model2px
        .domain([0, viewport.width])
        .range([0, size.width]);

      model2canvas
        .domain([0, viewport.scaledWidth])
        .range([0, size.width * CANVAS_OVERSAMPLING]);

      // Inverted model2px scaling function for position (for y-coordinates, domain can be inverted).
      model2pxInv
        .domain([viewport.height, 0])
        .range(origin === 'bottom-left' ? [0, size.height] : [size.height, 0]);

      model2canvasInv
        .domain([viewport.scaledHeight, 0])
        .range(origin === 'bottom-left' ? [0, size.height * CANVAS_OVERSAMPLING] :
                                          [size.height * CANVAS_OVERSAMPLING, 0]);

      if (selectBrush) {
        // Update brush to use new scaling functions.
        selectBrush
          .x(model2px)
          .y(model2pxInv);
      }
    }

    function redrawGridLinesAndLabels() {
          // Overwrite default model2px and model2pxInv to display correct units.
      var model2px = d3.scale.linear().domain([viewport.x, viewport.x + viewport.scaledWidth]).range([0, size.width]),
          model2pxInv = d3.scale.linear().domain([viewport.y, viewport.y - viewport.scaledHeight]).range([0, size.height]),
          tx = function(d) { return "translate(" + model2px(d) + ",0)"; },
          ty = function(d) { return "translate(0," + model2pxInv(d) + ")"; },
          stroke = function(d) { return d ? "#ccc" : "#666"; },
          fx = model2px.tickFormat(5),
          fy = model2pxInv.tickFormat(5),
          lengthUnits = model.getUnitDefinition ? model.getUnitDefinition('length') : "",
          xlabel, ylabel;

      if (d3.event && d3.event.transform) {
        d3.event.transform(model2px, model2pxInv);
      }

      gridContainer.selectAll("g.x, g.y").remove();

      // Regenerate x-ticks…
      var gx = gridContainer.selectAll("g.x")
          .data(model2px.ticks(5), String)
          .attr("transform", tx)
          .classed("axes", true);

      gx.select("text").text(fx);

      var gxe = gx.enter().insert("g", "a")
          .attr("class", "x")
          .attr("transform", tx);

      if (model.get("gridLines")) {
        gxe.append("line")
            .attr("stroke", stroke)
            .attr("y1", 0)
            .attr("y2", size.height);
      } else {
        gxe.selectAll("line").remove();
      }

      // x-axis units
      if (model.get("xunits")) {
        gxe.append("text")
            .attr("class", "xunits")
            .attr("y", size.height)
            .attr("dy", fontSizeInPixels*0.8 + "px")
            .attr("text-anchor", "middle")
            .text(fx);
      } else {
        gxe.select("text.xunits").remove();
      }

      gx.exit().remove();

      // x-axis label
      xlabel = backgroundContainer.selectAll("text.xlabel").data(model.get("xlabel") ? [lengthUnits.pluralName] : []);
      xlabel.enter().append("text")
          .attr("class", "axis")
          .attr("class", "xlabel")
          .attr("x", size.width / 2)
          .attr("y", size.height)
          .attr("dy", (fontSizeInPixels * 1.6) + "px")
          .style("text-anchor", "middle");
      xlabel.text(String);
      xlabel.exit().remove();

      // Regenerate y-ticks…
      var gy = gridContainer.selectAll("g.y")
          .data(model2pxInv.ticks(5), String)
          .attr("transform", ty)
          .classed("axes", true);

      gy.select("text")
          .text(fy);

      var gye = gy.enter().insert("g", "a")
          .attr("class", "y")
          .attr("transform", ty)
          .attr("background-fill", "#FFEEB6");

      if (model.get("gridLines")) {
        gye.append("line")
            .attr("stroke", stroke)
            .attr("x1", 0)
            .attr("x2", size.width);
      } else {
        gye.selectAll("line").remove();
      }

      // y-axis units
      if (model.get("yunits")) {
        gye.append("text")
            .attr("class", "yunits")
            .attr("x", "-0.3em")
            .attr("dy", fontSizeInPixels/6 + "px")
            .attr("text-anchor", "end")
            .text(fy);
      } else {
        gxe.select("text.yunits").remove();
      }

      gy.exit().remove();

      // y-axis label
      ylabel = backgroundContainer.selectAll("text.ylabel").data(model.get("ylabel") ? [lengthUnits.pluralName] : []);
      ylabel.enter().append("text")
          .attr("class", "axis")
          .attr("class", "ylabel")
          .style("text-anchor","middle")
          .attr("transform","translate(" + -fontSizeInPixels * 1.6 + " " + size.height / 2 + ") rotate(-90)");
      ylabel.text(String);
      ylabel.exit().remove();
    }

    // Setup background.
    function setupBackground() {
      var color = model.get("backgroundColor") || "rgba(0, 0, 0, 0)";
      containerBackground.attr("fill", color);
      // Set color of PIXI.Stage to fix an issue with outlines around the objects that are visible
      // when WebGL renderer is being used. It only happens when PIXI.Stage background is different
      // from model container background. It's necessary to convert color into number, as PIXI
      // accepts only numbers. D3 helps us handle color names like "red", "green" etc. It doesn't
      // support rgba values, so ingore alpha channel.
      pixiStages.forEach(function (pixiStage) {
        pixiStage.setBackgroundColor(parseInt(d3.rgb(color.replace("rgba", "rgb")).toString().substr(1), 16));
      });
    }

    function mousedown() {
      setFocus();
    }

    function setFocus() {
      if (model.get("enableKeyboardHandlers")) {
        node.focus();
      }
    }

    function basicSVGAttrs() {
      return this.attr({
        // TODO confirm xmlns def is required?
        'xmlns': 'http://www.w3.org/2000/svg',
        'xmlns:xmlns:xlink': 'http://www.w3.org/1999/xlink', // hack: doubling xmlns: so it doesn't disappear once in the DOM
        'overflow': 'hidden' // Important in IE! Otherwise content won't be clipped by SVG container
      });
    }

    function layeredOnTop() {
      return this.style({
        position: "absolute",
        top: 0,
        left: 0
      });
    }

    function renderContainer() {
      var viewBox;

      // Update cx, cy, size, viewport and modelSize variables.
      scale();

      // Create container, or update properties if it already exists.
      if (backgroundContainer === undefined) {

        backgroundContainer = d3.select(node).append("svg")
          .attr("class", "root-layer container background-container")
          .call(basicSVGAttrs);

        containerBackground = backgroundContainer.append("rect")
          .attr("class", "container-background background");

        gridContainer = backgroundContainer.append("g")
          .attr("class", "grid-container");

        viewportContainer = d3.select(node).append("div")
          .attr("class", "root-layer container viewport-container");

        foregroundContainer = d3.select(node).append("svg")
          .attr("class", "root-layer container foreground-container")
          .on("contextmenu", function() {
            // Disable default context menu on foreground container, as otherwise it  covers all
            // possible context menu that can be used by layers beneath.
            d3.event.preventDefault();
          })
          .call(basicSVGAttrs);

        brushContainer = foregroundContainer.append("g")
          .attr("class", "brush-container");

        // Transparent click shield receives all mouse/touch events; setupHitTesting() sets up
        // handlers that re-dispatch the event to the appropriate element in the appropriate layer.
        clickShield = d3.select(node).append("div")
          .attr("class", "root-layer click-shield")
          // IE bug: without background color, layer will be transparent for mouse events,
          // underlying canvas (if any) will become an event target. See:
          // https://www.pivotaltracker.com/story/show/58418116
          .style("background-color", "rgba(0,0,0,0)");

        // Root layers should overlap each other.
        d3.select(node).selectAll(".root-layer").call(layeredOnTop);

        if (model.get("enableKeyboardHandlers")) {
          d3.select(node)
            .attr("tabindex", 0)
            .on("mousedown", mousedown);
        }

        pixiRenderers = [];
        pixiStages = [];
        pixiContainers = [];

        setupHitTesting();
        setupTouchEventTranslation();
      }

      viewportContainer.style({
        width: cx + "px",
        height: cy + "px"
      });

      // Dimension/position of all the root layers
      d3.select(node).selectAll('.root-layer')
        .attr({
          width: cx,
          height: cy,
          left: padding.left,
          top: padding.top
        })
        // Update style values too, as otherwise SVG isn't clipped correctly e.g. in Safari.
        .style({
          width: cx + "px",
          height: cy + "px"
        });

      pixiRenderers.forEach(function (pixiRenderer) {
        pixiRenderer.resize(cx * CANVAS_OVERSAMPLING, cy * CANVAS_OVERSAMPLING);
        $(pixiRenderer.view).css({
          width: cx,
          height: cy
        });
      });

      viewBox = model2px(viewport.x) + " " +
                model2pxInv(viewport.y) + " " +
                model2px(viewport.scaledWidth) + " " +
                model2px(viewport.scaledHeight);

      // Apply the viewbox to all "viewport" layers we have created
      viewportContainer.selectAll(".svg-viewport").attr({
        viewBox: viewBox,
        x: 0,
        y: 0,
        width: model2px(viewport.width),
        height: model2px(viewport.height)
      });

      pixiContainers.forEach(function (pixiContainer) {
        // It would be nice to set position of PIXI.Stage object, but it doesn't work. We have
        // to use nested PIXI.DisplayObjectContainer:
        pixiContainer.pivot.x = model2canvas(viewport.x);
        pixiContainer.pivot.y = model2canvasInv(viewport.y);
        // This would also work:
        // pixiContainer.scale.x = pixiContainer.scale.y = (modelSize.maxX - modelSize.minX) /
        //                                                  viewport.scaledWidth;
        // and would be pretty fast, however sprites will be pixelated. To ensure that quality isn't
        // affected it's better to modify .model2canvas() functions.
      });

      // Update padding, as it can be changed after rescaling.
      // TODO move this up to where other attrs are set on 'layers'. It doesn't look like 'padding'
      // is changed between here and there (and if it *is*, that needs to be made more explicit.)

      // Rescale main plot.
      backgroundContainer.select("rect.container-background")
        .attr({
          width: model2px(viewport.width),
          height: model2px(viewport.height),
          x: 0,
          y: 0
        });

      redrawGridLinesAndLabels();
      api.renderCanvas();
    }

    /**
      setupHitTesting:

      Forward mouse events to the view's stack of overlaid visual layers to simulate the "hit
      testing" that would occur natively if the visual layers were all implemented as descendants of
      a single, common svg element.

      In that scenario, native hit-testing is used: a mouse event at any point is forwarded to the
      topmost visible element at that point; the layers above it are effectively transparent to the
      event. This is subject to control by the 'pointer-events' property. See
      http://www.w3.org/TR/SVG/interact.html#pointer-processing

      However, in order to allow some layers to be implemented as <canvas> elements (or perhaps
      <divs> or rootmost <svg> elements, to which hardware-accelerated css transforms apply), and to
      allow those layers to be above some layers and below others, our layers cannot in fact be
      children of a common svg element.

      This means that the topmost layer always becomes the target of any mouseevent on the view,
      regardless of whether it has an element at that point, and it hides the event from the layers
      below.

      What we need, therefore, is to simulate svg's hit testing. This can be achieved by listening
      to events that bubble to the topmost layer and successively hiding the layers below, applying
      document.elementFromPoint to determine whether there is an element within that layer at that
      event's coordinates. (Where the layer in question is a <canvas> with its own hit testing
      implemented in Javascript, we must defer to the layer's own hit-testing algorithm instead
      of using elementFromPoint.)

      CSS pointer-events (as distinct from SVG pointer events) cannot completely capture the
      semantics we need because they simply turn pointer "transparency" on or off rather than
      responding to the presence or absence of an element inside the layer at the event coordinates;
      and besides they do not work in IE9 or IE10.

      Note that to the extent we do use CSS pointer-events, document.elementFromPoint correctly
      respects the "none" value.

      What this means for event handling:

        * Mousedown, mouseup, and any custom mouse events such as those created by the jQuery
          ContextMenu plugin, are captured by a click shield element and prevented from bubbling.
          However, a clone event is dispatched to the element that passed the hit test and allowed
          to bubble to the window.

        * Click events on the click shield are captured and canceled because they are inherently not
          meaningful--the browser cannot tell if the mouseup and mousedown targets are "really" the
          same so it dispatches click events anytime a mousedown and mouseup occur on the view.
          Instead, if the mousedown and mouseup occur on the same element or sprite (e.g., same
          atom) we dispatch a synthetic click event targeted at the element. In the case that the
          mouseup occurs on a sprite in the canvas layer, the click event is only emitted if the
          same sprite was under the previous mousedown. Additionally, the target of a click on a
          sprite is the canvas layer itself since to DOM gives us no way to be any more specific.
          (Notice this means the same canvas can successfully hit test a mousedown followed by a
          mouseup, but still not cause a click to be issued, if the mousedown and mouseup were over
          two different sprites.)

        * Canvas elements should not listen for click events. They are responsible instead for
          performing a click action, if appropriate, when they receive a mouseup, and notifying the
          parent whether a DOM click event should be issued. (This prevents them from having to
          hit-test the same coordinates twice, once for the mouseup and then once for a click.)

        * Single-touch containing touch events will be captured and canceled, and synthetic mouse
          events corresponding to the touches will be issued and routed through the above-discussed
          hit test exactly as if they were mouse events. This is a reasonable choice because we do
          not use any multitouch gestures and must retain compatibility with desktop browsers.

        * Note that mouseover/mouseout/mousenter/mouseleave events are not handled in any way!
    */
    function setupHitTesting() {

      var EVENT_TYPES = ['mousedown', 'mouseup', 'contextmenu'];

      // TODO: touch events (touchstart, touchmove, touchend).
      //
      // These are a little tricker than mouse events because once a hit test for touchstart
      // succeeds, we have to remember the found target and send all subsequent touchmove and
      // touchend events for that particular touch to the same target element that received the
      // touchstart -- NOT to the element beneath the touch's updated coordinates. (That's how touch
      // events work, and is what Pixi expects.)
      // see https://developer.apple.com/library/safari/documentation/UserExperience/Reference/TouchEventClassReference/TouchEvent/TouchEvent.html#//apple_ref/javascript/instm/TouchEvent/initTouchEvent

      var foregroundNode  = foregroundContainer.node();
      var backgroundNode  = backgroundContainer.node();
      var viewportNode    = viewportContainer.node();
      var clickShieldNode = clickShield.node();

      // We need to hide HTML layers from mouse events. It can be achieved by setting
      // "pointer-events" style to "none", however it isn't supported by all browsers
      // (e.g. IE9, IE10, Safari 5). The fallback method is to set layer's visibility to "hidden".
      var propName    = featureTests.cssPointerEvents ? "pointerEvents" : "visibility";
      var propHidden  = featureTests.cssPointerEvents ? "none" : "hidden";
      var propVisible = featureTests.cssPointerEvents ? "auto" : "visible";
      var propBackup;

      var mousedownTarget;
      var targetForCreatedClick;

      // Elements added to the viewportContainer will go in the middle. The viewportContainer itself
      // is just a holder -- it shouldn't receive mouse/touch events itself.
      layersToHitTest = [foregroundNode, backgroundNode];

      // Return a cloned version of 'e' having 'target' as its target property; cancel the original
      // event.
      function retargetMouseEvent(e, target) {
        var clonedEvent = document.createEvent("MouseEvent");
        clonedEvent.initMouseEvent(e.type, e.bubbles, e.cancelable, e.view, e.detail, e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button, e.relatedTarget);
        clonedEvent.target = target;
        e.stopPropagation();
        e.preventDefault();
        return clonedEvent;
      }

      // Create a click event from a mouse event (presumably mouseup). Leaves original event as-is.
      function createClick(e, target) {
        // TODO. Does copying the properties adequately capture all the semantics of the click event?
        var clonedEvent = document.createEvent("MouseEvent");
        clonedEvent.initMouseEvent('click', true, e.cancelable, e.view, e.detail, e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button, e.relatedTarget);
        clonedEvent.target = target;
        return clonedEvent;
      }

      // Hide layer from mouse events using visibility or pointer-events styles.
      function hideLayer(i) {
        var layer = layersToHitTest[i];
        propBackup[i] = layer.style[propName];
        layer.style[propName] = propHidden;
      }

      // Restore original visibility or pointer-events styles of layers n to 0, inclusive.
      function unhideLayers(n) {
        for (var i = n; i >= 0; i--) {
          layersToHitTest[i].style[propName] = propBackup[i];
        }
        if (n >= layersToHitTest.length - 2) {
          // Viewport container is treated as a layer between last viewport and background.
          viewportNode.style[propName] = propVisible;
        }
        clickShieldNode.style[propName] = propVisible;
      }

      function hitTest(e) {
        // Remember style rules of the layers we peel back
        propBackup = [];

        var layer;
        var target;
        var testEvent;
        var hitTestSucceeded;
        var isCanvasObjectClick;
        var layerBgColor;

        clickShieldNode.style[propName] = propHidden;

        // Must be set, as we test it after calling hitTest()
        targetForCreatedClick = null;

        for (var i = 0, len = layersToHitTest.length; i < len; i++) {
          layer = layersToHitTest[i];

          if (i > 0) {
            hideLayer(i - 1);
          }

          if (layer === backgroundNode) {
            // When we are testing background container, we have to hide also viewportContainer.
            // Otherwise it will detected in .elementFromPoint() call.
            viewportNode.style[propName] = propHidden;
          }

          if (layer.tagName.toLowerCase() === "canvas") {
            // Need to ask the Canvas-based view to perform custom hit-testing.
            // TODO: make this a static function rather than rebinding to closure each time∫
            api.hitTestCallback = function(isHit) {
              hitTestSucceeded = isHit;
              if (isHit) {
                unhideLayers(i-1);
              } else {
                testEvent.stopPropagation();
                testEvent.preventDefault();
              }
            };

            api.mouseupCallback = function(isClick) {
              isCanvasObjectClick = isClick;
            };

            // For now we have to dispatch an event first, *then* see if the Canvas-based view
            // considered it a hit -- we stopPropagation and keep going if it does not report a hit.
            testEvent = retargetMouseEvent(e, layer);
            layer.dispatchEvent(testEvent);

            if (isCanvasObjectClick) {
              // The canvas view itself won't listen to this click, but let the click bubble.
              targetForCreatedClick = layer;
            }

            if (hitTestSucceeded) {
              return layer;
            }
          } else {
            // IE bug: without background color layer will be transparent for .elementFromPoint(),
            // underlying canvas (if any) will become a target. See:
            // https://www.pivotaltracker.com/story/show/58418116
            layerBgColor = layer.style.backgroundColor;
            layer.style.backgroundColor = "rgba(0,0,0,0)";

            // clientX and clientY report the event coords in CSS pixels relative to the viewport
            // (ie they aubtract the x, y the page is scrolled to). This is what elementFromPoint
            // requires in Chrome, Safari 5+, IE 8+, and Firefox 3+.
            // http://www.quirksmode.org/dom/tests/elementfrompoint.html
            // http://www.quirksmode.org/blog/archives/2010/06/new_webkit_test.html
            // http://www.quirksmode.org/mobile/tableViewport_desktop.html
            target = document.elementFromPoint(e.clientX, e.clientY);

            // Restore original background color.
            layer.style.backgroundColor = layerBgColor;

            // FIXME? Since we nominally allow target layers to be hidden or have pointer-events: none
            // we would have to replace this simplistic test. In the case that the layer is
            // transparent to events even before we hide it, target !== layer not because target is an
            // element in the layer that received the hit but because the target is below the layer.
            if (target !== layer) {
              unhideLayers(i-1);
              target.dispatchEvent(retargetMouseEvent(e, target));
              // There was an element in the layer at the event target. This hides the event from all
              // layers below, so we're done.
              return target;
            }
          }
        }
        // If no element is hit, make sure that all layer properties are restored.
        unhideLayers(layersToHitTest.length - 2); // -2 because the last layer is never hidden
      }

      EVENT_TYPES.forEach(function(eventType) {
        // Use a capturing handler on window so we can swallow the event
        window.addEventListener(eventType, function(e) {
          var target;

          if (e.target !== clickShieldNode) {
            return;
          }

          e.stopPropagation();
          e.preventDefault();
          target = hitTest(e);

          if (e.type === 'mousedown') {
            mousedownTarget = target;
          } else if (e.type === 'mouseup') {
            if (target === mousedownTarget && target.tagName.toLowerCase() !== 'canvas') {
              target.dispatchEvent(createClick(e), target);
            }
            if (targetForCreatedClick) {
              targetForCreatedClick.dispatchEvent(createClick(e), targetForCreatedClick);
            }
          }
        }, true);
      });

      // Completely swallow "click" events on the clickShieldNode. The browser can't issue these
      // correctly; we have to issue them ourselves after a mouseup.
      window.addEventListener('click', function(e) {
        if (e.target === clickShieldNode) {
          e.stopPropagation();
          e.preventDefault();
        }
      }, true);
    }

    // Translate any touch events on the clickShield which have only a single touch point ("finger")
    // when started, to the corresponding mouse events. Does not attempt to initiate a cancel action
    // for touchcancel; just issues mouseup stops tracking the touch.
    function setupTouchEventTranslation() {
      // Identifier of the touch point we are tracking; set to null when touch not in progress.
      var touchId = null;
      var clickShieldNode = clickShield.node();

      function createMouseEvent(touch, type) {
        var mouseEvent = document.createEvent("MouseEvent");
        mouseEvent.initMouseEvent(type, true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
        return mouseEvent;
      }

      // listener for touchstart
      function touchStarted(e) {
        var touch = e.changedTouches[0];

        if (e.touches.length > 1 || touch.target !== clickShieldNode) {
          return;
        }

        e.stopPropagation();
        e.preventDefault();

        // Remember which touch point--later touch events may or may not include this touch point
        // but we have to listen to them all to make sure we update dragging state correctly.
        touchId = touch.identifier;
        clickShieldNode.dispatchEvent(createMouseEvent(touch, 'mousedown'));
      }

      // Listener for touchmove, touchend, and touchcancel:
      function touchChanged(e) {

        if (touchId === null) {
          return;
        }

        var i;
        var len;
        var touch;
        var target;

        for (i = 0, len = e.changedTouches.length; i < len; i++) {
          touch = e.changedTouches[i];

          if (touch.identifier !== touchId) {
            continue;
          }

          if (len === 1) {
            e.stopPropagation();
          }

          // Generally, sending preventDefault for the first touchmove in a series prevents browser
          // default actions such as pinch-zoom. So it looks as if as a rule we give up on letting
          // the user "add a finger" to pinch-zoom midway through a dragging operation. Therefore,
          // prevent away. preventDefault on touchend will also prevent the browser from generating
          // a click, but that's okay; our hit testing intentionally ignores browser-generated click
          // events anyway, and generates its own when appropriate.
          e.preventDefault();

          // touch's target will always be the element that received the touchstart. But since
          // we're creating a pretend mousemove, let its target be the target the browser would
          // report for an actual mousemove/mouseup (Remember that the--expensive--hitTest() is not
          // called for mousemove, though; drag handlers should and do listen for mousemove on the
          // window). Note that clientX can be off the document, so report window in that case!
          target = document.elementFromPoint(touch.clientX, touch.clientY) || window;

          if (e.type === 'touchmove') {
            target.dispatchEvent(createMouseEvent(touch, 'mousemove'));
          } else if (e.type === 'touchcancel' || e.type === 'touchend') {
            // Remember this generates a click, too
            target.dispatchEvent(createMouseEvent(touch, 'mouseup'));
            touchId = null;
          }
          return;
        }
      }

      window.addEventListener('touchstart', touchStarted, true);
      ['touchmove', 'touchend', 'touchcancel'].forEach(function (eventType) {
        window.addEventListener(eventType, touchChanged, true);
      });

      // TODO implement cancel semantics for atom dragging?
      // see http://alxgbsn.co.uk/2011/12/23/different-ways-to-trigger-touchcancel-in-mobile-browsers/
      // until then we have to observe touchcancel to stop in-progress drags.
    }

    // Support viewport dragging behavior.
    function viewportDragging() {
      var xs = [],
          ys = [],
          ts = [],
          samples = 8,
          newDrag = false,
          dragOpt = model.properties.viewPortDrag || false,
          vx, vy, t,
          dragBehavior;

      if (dragOpt === false) {
        // This causes that drag behavior will be removed and dragging of
        // other nodes will work again. It's based on the d3 implementation,
        // please see drag() function here:
        // https://github.com/mbostock/d3/blob/master/src/behavior/drag.js
        backgroundContainer.on("mousedown.drag", null)
            .on("touchstart.drag", null)
            .classed("draggable", false);
        return;
      }

      dragBehavior = d3.behavior.drag();
      dragBehavior.on("dragstart", function () {
        newDrag = true;
        xs.length = 0;
        ys.length = 0;
        ts.length = 0;
        updateArrays();
      }).on("drag", function () {
        var dx = dragOpt === "y" ? 0 : model2px.invert(d3.event.dx),
            dy = dragOpt === "x" ? 0 : model2px.invert(d3.event.dy);
        model.properties.viewPortX -= dx;
        model.properties.viewPortY += dy;
        dispatch.viewportDrag();
        updateArrays();
      }).on("dragend", function () {
        updateArrays();
        var last = xs.length - 1,
            dt = ts[last] - ts[0];
        // Prevent from division by 0.
        if (dt < 1e-5) return;
        // When time difference between last 'drag' and 'dragend' events is
        // bigger than 100ms assume that there should be no interia (it means
        // that pointer was staying in one place > 100ms just before 'mouseup').
        if (ts[last] - ts[last - 1] > 100) return;
        vx = (xs[last] - xs[0]) / dt;
        vy = (ys[last] - ys[0]) / dt;
        t  = ts[last];
        newDrag = false;
        d3.timer(step);
      });

      backgroundContainer.call(dragBehavior).classed("draggable", true);

      function updateArrays() {
        xs.push(model.properties.viewPortX);
        ys.push(model.properties.viewPortY);
        ts.push(performance.now());
        if(xs.length > samples) {
          xs.shift();
          ys.shift();
          ts.shift();
        }
      }

      function step() {
        if (newDrag) return true;

        var now = performance.now(),
            dt = now - t,
            ax = -0.003 * vx,
            ay = -0.003 * vy;

        // Update positions.
        model.properties.viewPortX += vx * dt + 0.5 * ax * dt * dt;
        model.properties.viewPortY += vy * dt + 0.5 * ay * dt * dt;
        dispatch.viewportDrag();
        // Update velocities.
        vx += ax * dt;
        vy += ay * dt;
        // Update last time.
        t = now;

        if (Math.abs(vx) < 1e-5 && Math.abs(vy) < 1e-5) {
          return true;
        }
        return false;
      }
    }

    function removeClickHandlers() {
      var selector;
      for (selector in clickHandler) {
        if (clickHandler.hasOwnProperty(selector)) {
          backgroundContainer.selectAll(selector).on("click.custom", null);
        }
      }
    }

    function init() {
      // Setup model view state.
      renderContainer();
      viewportDragging();

      clickHandler = {};
      dragHandler = {};

      // Register listeners.
      // Redraw container each time when some visual-related property is changed.
      model.addPropertiesListener([ "backgroundColor"], api.repaint);
      model.addPropertiesListener(["gridLines", "xunits", "yunits", "xlabel", "ylabel",
                                   "viewPortX", "viewPortY", "viewPortZoom"],
                                   renderContainer);
      model.addPropertiesListener(["viewPortDrag"],
                                   viewportDragging);
    }

    api = {
      get $el() {
        return $el;
      },
      get node() {
        return node;
      },
      get foregroundContainer() {
        return foregroundContainer;
      },
      get model2px() {
        return model2px;
      },
      get model2canvas() {
        return model2canvas;
      },
      get model2pxInv() {
        return model2pxInv;
      },
      get model2canvasInv() {
        return model2canvasInv;
      },
      get setFocus() {
        return setFocus;
      },
      get getFontSizeInPixels() {
        return getFontSizeInPixels;
      },
      get url() {
        return modelUrl;
      },
      get clickHandler() {
        return clickHandler;
      },
      get dragHandler() {
        return dragHandler;
      },

      repaint: function() {
        setupBackground();
        if (renderer.repaint) renderer.repaint();

        api.updateClickHandlers();

        api.renderCanvas();
      },

      /**
        Renderers call this method to append a "viewport" svg element on behalf of a renderer.

        Viewport svgs are drawn to the exact same dimensions at the exact same screen coordinates
        (they overlap each other exactly.) Viewports added later are drawn above viewports added
        earlier, but are transparent.

        Viewports can contain layering <g> elements;

        What makes the viewports special is that their viewBox attribute is automatically adjusted
        when the model viewport (visible part of the model) is adjusted. Renderers can just draw to
        the viewport element without needing to think about

        Viewports are added in front of all viewports previously added. At the moment, they cannot
        be reordered.
      */
      appendViewport: function() {
        var viewport = viewportContainer.append("svg")
          .attr("class", "svg-viewport")
          .call(layeredOnTop)
          .call(basicSVGAttrs);

        // Cascade events into this viewport
        layersToHitTest.splice(1, 0, viewport.node());

        return viewport;
      },

      /**
        Please see .appendViewport() docs.
        The main difference is that it returns PIXI.DisplayObjectContainer object and related
        canvas (where container will be rendered) instead of SVG element.
       */
      appendPixiViewport: function() {
        var pixiRenderer  = PIXI.autoDetectRenderer(cx * CANVAS_OVERSAMPLING,
                                                    cy * CANVAS_OVERSAMPLING, null, true),
            pixiStage     = new PIXI.Stage(null),
            pixiContainer = new PIXI.DisplayObjectContainer();

        pixiStage.addChild(pixiContainer);

        viewportContainer.node().appendChild(pixiRenderer.view);
        d3.select(pixiRenderer.view)
          .attr("class", "pixi-viewport")
          .call(layeredOnTop);

        // Cascade events into this viewport
        layersToHitTest.splice(1, 0, pixiRenderer.view);

        pixiRenderers.push(pixiRenderer);
        pixiStages.push(pixiStage);
        pixiContainers.push(pixiContainer);

        // We return container instead of stage, as we can apply view port transformations to it.
        // Stage transformations seem to be ignored by the PIXI renderer.
        return {
          pixiContainer: pixiContainer,
          canvas: pixiRenderer.view
        };
      },

      hitTestCallback: function() {},

      resize: function() {
        renderContainer();
        api.repaint();

        if (selectBrush) {
          brushContainer.select("g.select-area").call(selectBrush);
        }

        if (renderer.resize) renderer.resize();

        api.renderCanvas();
      },

      setup: function() {
        if (renderer.setup) renderer.setup(model);

        api.renderCanvas();
      },

      update: function() {
        if (renderer.update) renderer.update();

        api.renderCanvas();
      },

      renderCanvas: function() {
        var i, len;
        // For now we follow that each Pixi viewport has just one PIXI.Stage.
        for (i = 0, len = pixiRenderers.length; i < len; i++) {
          pixiRenderers[i].render(pixiStages[i]);
        }
      },

      getHeightForWidth: function (width) {
        var aspectRatio = viewport.width / viewport.height;
        width = width - padding.left  - padding.right;
        return width / aspectRatio + padding.top + padding.bottom;
      },

      bindModel: function(newModel, newModelUrl) {
        modelUrl = newModelUrl || modelUrl;
        model = newModel || model;
        removeClickHandlers();
        api.setSelectHandler(null);
        init();

        if (renderer.bindModel) renderer.bindModel(newModel, newModelUrl);
      },

      pos: function() {
        // Add a pos() function so the model renderer can more easily
        // manipulate absolutely positioned dom elements it may create or
        // manage.
        var rect = {
              bottom: 0,
              top:    0,
              height: 0,
              left:   0,
              right:  0,
              width:  0
            };
        if ($el) {
          rect.top = $el.position().top;
          rect.left = $el.position().left;
          rect.width = $el.width();
          rect.height = $el.height();
          rect.bottom = rect.top + rect.height;
          rect.right = rect.left + rect.width;
        }
        return rect;
      },

      on: function(type, listener) {
        dispatch.on(type, listener);
      },

      /**
       * Sets custom click handler.
       *
       * @param {string}   selector Selector string defining clickable objects.
       * @param {Function} handler  Custom click handler. It will be called
       *                            when object is clicked with (x, y, d, i) arguments:
       *                              x - x coordinate in model units,
       *                              y - y coordinate in model units,
       *                              d - data associated with a given object (can be undefined!),
       *                              i - ID of clicked object (usually its value makes sense if d is defined).
       */
      setClickHandler: function (selector, handler) {
        if (typeof handler !== "function") {
          throw new Error("Click handler should be a function.");
        }
        clickHandler[selector] = handler;
        api.updateClickHandlers();
      },

      /**
       * Applies all custom click handlers to objects matching selector
       * Note that this function should be called each time when possibly
       * clickable object is added or repainted!
       */
      updateClickHandlers: function () {
        var selector;

        function getClickHandler (handler) {
          return function (d, i) {
            if (d3.event.defaultPrevented) return;
            // Get current coordinates relative to the plot area!
            var coords = d3.mouse(containerBackground.node()),
                x = model2px.invert(coords[0]),
                y = model2pxInv.invert(coords[1]);
            console.log("[view] click at (" + x.toFixed(3) + ", " + y.toFixed(3) + ")");
            handler(x, y, d, i);
          };
        }

        for (selector in clickHandler) {
          if (clickHandler.hasOwnProperty(selector)) {
            // Use 'custom' namespace to don't overwrite other click handlers which
            // can be added by default.
            d3.selectAll(selector).on("click.custom", getClickHandler(clickHandler[selector]));
          }
        }
      },

      /**
       * Sets custom select handler. When you provide function as a handler, select action
       * is enabled and the provided handler executed when select action is finished.
       * To disable select action, pass 'null' as an argument.
       *
       * @param {Function} handler Custom select handler. It will be called
       *                           when select action is finished with (x, y, w, h) arguments:
       *                             x - x coordinate of lower left selection corner (in model units),
       *                             y - y coordinate of lower left selection corner (in model units),
       *                             width  - width of selection rectangle (in model units),
       *                             height - height of selection rectangle (in model units).
       *
       *                            Pass 'null' to disable select action.
       */
      setSelectHandler: function (handler) {
        if (typeof handler !== "function" && handler !== null) {
          throw new Error("Select handler should be a function or null.");
        }
        // Remove previous select handler.
        brushContainer.select("g.select-area").remove();
        if (handler === null) {
          // Previous handler removed, so just return.
          selectBrush = null;
          return;
        }
        selectBrush = d3.svg.brush()
          .x(model2px)
          .y(model2pxInv)
          .on("brushend.select", function() {
            var r = selectBrush.extent(),
                x      = r[0][0],
                y      = r[0][1],
                width  = r[1][0] - x,
                height = r[1][1] - y;

            console.log("[view] selection area (" + x.toFixed(3) + ", " +
              y.toFixed(3) + "), width: " + width + ", height: " + height);

            // Call the user defined callback, passing selected area, as
            // rectangle defined by:
            // x, y, width, height
            // where (x, y) defines its lower left corner in model units.
            handler(x, y, width, height);
            // Clear and hide the brush.
            selectBrush.clear();
            // Redraw brush (which is now empty).
            brushContainer.select("g.select-area").call(selectBrush);
          });
        // Add a new "g" to easily remove it while
        // disabling / reseting select action.
        brushContainer.append("g").classed("select-area", true).call(selectBrush);
      },
      /**
       * Sets custom drag handler. Note that dragging behavior is very specific for implementation
       * and it's done in the particular renderers. That's why this functions only provides handler
       * for renderers in .dragHandler property (plain object). Renderers that implement dragging
       * behavior can tests whether drag handler for a given object type is available, e.g.:
       * if (svgContainer.dragHandler.someObject) {
       *   svgContainer.dragHandler.someObject(x, y, d, i);
       * }
       * This method is mostly about convention, it doesn't provide any special behavior.
       *
       * @param {string}   selector String defining draggable objects.
       * @param {Function} handler  Custom drag handler. It will be called
       *                            when object is dragged with (x, y, d, i) arguments:
       *                              x - x coordinate in model units,
       *                              y - y coordinate in model units,
       *                              d - data associated with a given object (can be undefined!),
       *                              i - ID of an object (usually its value makes sense if d is defined).
       */
      setDragHandler: function (type, handler) {
        dragHandler[type] = handler;
      }
    };

    // Initialization.
    // jQuery object with model container.
    $el = $("<div>")
      .attr({
        "id": "model-container",
        "class": "container",
        "tabindex": getNextTabIndex
      })
      // Set initial dimensions.
      .css({
        "width": "50px",
        "height": "50px"
      });
    // DOM element.
    node = $el[0];


    init();
    renderer = new Renderer(api, model);

    return api;
  };
});

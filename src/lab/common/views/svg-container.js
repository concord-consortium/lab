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

        backgroundContainer, viewportContainer, foregroundContainer,

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

    // TODO confirm this is required?
    function xlinkable() {
      return this.attr({
        'xmlns': 'http://www.w3.org/2000/svg',
        'xmlns:xmlns:xlink': 'http://www.w3.org/1999/xlink' // hack: doubling xmlns: so it doesn't disappear once in the DOM
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
      var svgs;

      // Update cx, cy, size, viewport and modelSize variables.
      scale();

      // Create container, or update properties if it already exists.
      if (backgroundContainer === undefined) {

        backgroundContainer = d3.select(node).append("svg")
          .attr("class", "container background-container")
          .call(layeredOnTop)
          .call(xlinkable);

        containerBackground = backgroundContainer.append("rect")
          .attr("class", "container-background background");

        gridContainer = backgroundContainer.append("g")
          .attr("class", "grid-container");

        viewportContainer = d3.select(node).append("div")
          .attr("class", "container viewport-container")
          .call(layeredOnTop);

        foregroundContainer = d3.select(node).append("svg")
          .attr("class", "container foreground-container")
          .call(layeredOnTop)
          .call(xlinkable);

        brushContainer = foregroundContainer.append("g")
          .attr("class", "brush-container");

        if (model.get("enableKeyboardHandlers")) {
          d3.select(node)
            .attr("tabindex", 0)
            .on("mousedown", mousedown);
        }

        pixiRenderers = [];
        pixiStages = [];
        pixiContainers = [];

        setupHitTesting();
      }

      viewportContainer.style({
        width: cx + "px",
        height: cy + "px"
      });

      // Set new dimensions of SVG containers
      svgs = d3.select(node).selectAll('.background-container, .foreground-container, .svg-viewport');

      svgs
        .attr({
          width: cx,
          height: cy
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
      svgs.attr("transform", "translate(" + padding.left + "," + padding.top + ")");

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

      Forward mouse/touch events to the view's stack of overlaid visual layers to simulate
      the "hit testing" that would occur natively if the visual layers were all implemented as
      descendants of a single, common svg element.

      In that scenario, native hit-testing is used: a mouse click or touch event at any point is
      forwarded to the topmost visible element at that point; the layers above it are effectively
      transparent to the event. This is subject to control by the 'pointer-events' property. See
      http://www.w3.org/TR/SVG/interact.html#pointer-processing

      However, in order to allow some layers to be implemented as <canvas> elements (or perhaps
      <divs> or rootmost <svg> elements, to which hardware-accelerated css transforms apply), and to
      allow those layers to be above some layers and below others, our layers cannot in fact be
      children of a common svg element.

      This means that the topmost layer always becomes the target of any mouse or click event on the
      view, regardless of whether it has an element at that point, and it hides the event from the
      layers below.

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
    */
    function setupHitTesting() {

      var EVENT_TYPES = ['mousedown', 'mouseup', 'click'];

      // TODO: touch events (touchstart, touchmove, touchend).
      //
      // These are a little tricker than mouse events because once a hit test for touchstart
      // succeeds, we have to remember the found target and send all subsequent touchmove and
      // touchend events for that particular touch to the same target element that received the
      // touchstart -- NOT to the element beneath the touch's updated coordinates. (That's how touch
      // events work, and is what Pixi expects.)
      // see https://developer.apple.com/library/safari/documentation/UserExperience/Reference/TouchEventClassReference/TouchEvent/TouchEvent.html#//apple_ref/javascript/instm/TouchEvent/initTouchEvent

      var foregroundNode = foregroundContainer.node();
      var backgroundNode = backgroundContainer.node();
      var viewportNode   = viewportContainer.node();

      var pointerEvents;
      var visibility;

      // Elements added to the viewportContainer will go in the middle. The viewportContainer itself
      // is just a holder -- it shouldn't receive mouse/touch events itself.
      layersToHitTest = [foregroundNode, backgroundNode];

      function retargetMouseEvent(e, target) {
        var clonedEvent = document.createEvent("MouseEvent");
        clonedEvent.initMouseEvent(e.type, e.bubbles, e.cancelable, e.view, e.detail, e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button, e.relatedTarget);
        clonedEvent.target = target;
        e.stopPropagation();
        return clonedEvent;
      }

      // Restore original visiblity and pointer-events styles of layers n to 0, inclusive
      function unhideLayers(n) {
        for (var i = n; i >= 0; i--) {
          layersToHitTest[i].style.visibility = visibility[i];
          layersToHitTest[i].style.pointerEvents = pointerEvents[i];
        }
        if (n >= layersToHitTest.length - 2) {
          // Viewport container is treated as a layer between last viewport and background.
          viewportNode.style.visibility = "visible";
          viewportNode.style.pointerEvents = "auto";
        }
      }

      function hitTest(e) {
        // Event bubbled to the foregroundNode; if the target was a descendant of the
        // foregroundNode, then we have already completed the hit test (the foreground already
        // received the event.) Otherwise, continue.
        if (e.target !== foregroundNode) {
          return;
        }

        // Remember style rules of the layers we peel back
        visibility = [];
        pointerEvents = [];

        var layer;
        var prevLayer;
        var target;

        for (var i = 1, len = layersToHitTest.length; i < len; i++) {
          layer = layersToHitTest[i];
          prevLayer = layersToHitTest[i-1];

          // Set prevLayer's visiblity to "hidden" and pointer-events to "none"; need to do both
          // because Safari doesn't respect visibility changes in elementFromPoint (!) and IE9 & 10
          // don't support pointerEvents.
          visibility[i-1] = prevLayer.style.visibility;
          prevLayer.style.visibility = "hidden";
          pointerEvents[i-1] = prevLayer.style.pointerEvents;
          prevLayer.style.pointerEvents = "none";

          if (layer === backgroundNode) {
            // When we are testing background container, we have to hide also viewportContainer.
            // Otherwise it will detected in .elementFromPoint() call.
            viewportNode.style.visibility = "hidden";
            viewportNode.style.pointerEvents = "none";
          }

          // If target is a <canvas> with its own hit testing to (say, a Pixi view...):
          //   clear hit-test flag on target's view
          //   dispatch event to canvas
          //   (if view responds to event (hit test was true), it should set the hit-test flag)
          //   check the view's hit-test flag-- if true, break
          if (layer.tagName.toLowerCase() === "canvas") {
            api.hitTestFlag = false;
            layer.dispatchEvent(retargetMouseEvent(e, layer));
            if (api.hitTestFlag) {
              unhideLayers(i-1);
              break;
            }
          }

          // clientX and clientY report the event coords in CSS pixels relative to the viewport
          // (ie they aubtract the x, y the page is scrolled to). This is what elementFromPoint
          // requires in Chrome, Safari 5+, IE 8+, and Firefox 3+.
          // http://www.quirksmode.org/dom/tests/elementfrompoint.html
          // http://www.quirksmode.org/blog/archives/2010/06/new_webkit_test.html
          // http://www.quirksmode.org/mobile/tableViewport_desktop.html
          target = document.elementFromPoint(e.clientX, e.clientY);

          if (target !== layer) {
            unhideLayers(i-1);
            target.dispatchEvent(retargetMouseEvent(e, target));
            // There was an element in the layer at the event target. This hides the event from all
            // layers below, so we're done.
            break;
          }
        }
      }

      EVENT_TYPES.forEach(function(eventType) {
        foregroundNode.addEventListener(eventType, hitTest);
      });
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
        d3.select(node).on("mousedown.drag", null)
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

      d3.select(node).call(dragBehavior).classed("draggable", true);

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
        api.updateClickHandlers();

        if (renderer.repaint) renderer.repaint();

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
          .call(xlinkable);

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

      hitTestFlag: false,

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

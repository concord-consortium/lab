 // ------------------------------------------------------------
//
//   SVG View Container
//
// ------------------------------------------------------------
import performance from 'common/performance';
import benchmark from 'common/benchmark/benchmark';
import getNextTabIndex from 'common/views/tab-index';
import HitTestingHelper from 'common/views/hit-testing-helper';
import console from 'common/console';
import PIXI from 'pixi.js';
// Dependencies.
var CANVAS_OVERSAMPLING = 2,

  MAX_Z_INDEX = 1000;

// Assume that we can have *only one* Pixi renderer.
// This is caused by the Pixi bug: https://github.com/GoodBoyDigital/pixi.js/issues/181
function getPixiRenderer(w, h) {
  if (getPixiRenderer.instance == null) {
    var browser = benchmark.browser;
    var newRenderer;
    if (browser.browser === 'Firefox' && browser.oscpu.match(/Mac OS X 10.6/)) {
      // Work around GPU driver brokenness on some hardware running OS X 10.6 by not using
      // WebGL. Note Chrome automatically disables WebGL when using the problematic driver.
      // (Note that sometimes the separator between 10 and 6 is a '.' and sometimes a '_' so
      // use of the '.' matcher works is required)
      newRenderer = function(w, h, view, transparent) {
        return new PIXI.CanvasRenderer(w, h, view, transparent);
      };
    } else {
      newRenderer = PIXI.autoDetectRenderer;
    }
    getPixiRenderer.instance = newRenderer(w * CANVAS_OVERSAMPLING, h * CANVAS_OVERSAMPLING, null, true);
  } else {
    getPixiRenderer.instance.resize(w, h);
  }
  return getPixiRenderer.instance;
}
getPixiRenderer.instance = null;

export default function SVGContainer(model, modelUrl, Renderer, opt) {
  // Public API object to be returned.
  var api,

    i18n = opt && opt.i18n || null,

    // Coordinate system origin. Supported values are 'bottom-left' and 'top-left'.
    origin = opt && opt.origin || 'bottom-left',

    $el,
    node,

    plotContainer, backgroundContainer, foregroundContainer,

    backgroundRect, backgroundGroup, foregroundGroup, brushContainer,

    pixiRenderers, pixiStages, pixiContainers,

    hitTestingHelper,
    viewportZIndex = 0,

    cx, cy,
    viewport, viewPortZoom,

    model2canvas = d3.scale.linear(),
    model2canvasInv = d3.scale.linear(),

    // Basic scaling functions for position, it transforms model units to "pixels".
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

  function nextViewportZIndex() {
    return viewportZIndex++;
  }

  function getFontSizeInPixels() {
    return parseFloat($el.css('font-size')) || 18;
  }

  function scale() {
    var viewPortWidth = model.get("viewPortWidth"),
      viewPortHeight = model.get("viewPortHeight"),
      viewPortX = model.get("viewPortX"),
      viewPortY = model.get("viewPortY"),
      aspectRatio, modelSize;

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

    viewport.scaledWidth = viewport.width / viewPortZoom;
    viewport.scaledHeight = viewport.height / viewPortZoom;
    if (origin === 'bottom-left') {
      viewport.y += viewport.scaledHeight;
    }

    aspectRatio = viewport.width / viewport.height;

    cx = $el.width();
    cy = cx / aspectRatio;
    node.style.height = cy + "px";

    // Basic model2px scaling function for position.
    model2px
      .domain([0, viewport.width])
      .range([0, cx]);

    model2canvas
      .domain([0, viewport.scaledWidth])
      .range([0, cx * CANVAS_OVERSAMPLING]);

    // Inverted model2px scaling function for position (for y-coordinates, domain can be inverted).
    model2pxInv
      .domain([viewport.height, 0])
      .range(origin === 'bottom-left' ? [0, cy] : [cy, 0]);

    model2canvasInv
      .domain([viewport.scaledHeight, 0])
      .range(origin === 'bottom-left' ? [0, cy * CANVAS_OVERSAMPLING] : [cy * CANVAS_OVERSAMPLING, 0]);

    if (selectBrush) {
      // Update brush to use new scaling functions.
      selectBrush
        .x(model2px)
        .y(model2pxInv);
    }
  }

  function redrawGridLinesAndLabels() {
    var fsize = 0.7 * getFontSizeInPixels(),
      // Overwrite default model2px and model2pxInv to display correct units.
      model2px = d3.scale.linear().domain([viewport.x + 0.07 * viewport.scaledWidth, viewport.x + viewport.scaledWidth]).range([0.07 * cx, cx]),
      model2pxInv = d3.scale.linear().domain([viewport.y, viewport.y - 0.93 * viewport.scaledHeight]).range([0, 0.93 * cy]),
      tx = function(d) {
        return "translate(" + model2px(d) + ",0)";
      },
      ty = function(d) {
        return "translate(0," + model2pxInv(d) + ")";
      },
      stroke = function(d) {
        return d ? "#ccc" : "#666";
      },
      fx = model2px.tickFormat(5),
      fy = model2pxInv.tickFormat(5),
      lengthUnits = model.getUnitDefinition ? model.getUnitDefinition('length') : "",
      drawXunits = model.get("xunits"),
      drawYunits = model.get("yunits"),
      drawXLabel = model.get("xlabel"),
      drawYLabel = model.get("ylabel"),
      xlabel,
      ylabel;

    if (d3.event && d3.event.transform) {
      d3.event.transform(model2px, model2pxInv);
    }

    plotContainer.selectAll("g.x, g.y").remove();

    // Regenerate x-ticks…
    var gx = plotContainer.selectAll("g.x")
      .data(model2px.ticks(5), String)
      .attr("transform", tx)
      .classed("axes", true);

    gx.select("text").text(fx);

    var gxe = gx.enter().append("g")
      .attr("class", "x")
      .attr("transform", tx);

    if (model.get("gridLines")) {
      gxe.append("line")
        .attr("stroke", stroke)
        .attr("y1", 0)
        .attr("y2", cy - (drawXLabel ? fsize : 0) - (drawXunits ? fsize : 0));
    } else {
      gxe.selectAll("line").remove();
    }

    // x-axis label
    xlabel = plotContainer.selectAll("text.xlabel").data(drawXLabel ? [lengthUnits.pluralName] : []);
    xlabel.enter().append("text");
    xlabel
      .attr("class", "axis")
      .attr("class", "xlabel")
      .attr("x", cx / 2)
      .attr("y", cy)
      .attr("dy", "-0.1em")
      .style("text-anchor", "middle")
      .text(String);
    xlabel.exit().remove();

    // x-axis units
    if (drawXunits) {
      gxe.append("text")
        .attr("class", "xunits")
        .attr("y", cy)
        .attr("dy", model.get("xlabel") ? "-1em" : "-0.1em")
        .attr("text-anchor", "middle")
        .text(fx);
    } else {
      gxe.select("text.xunits").remove();
    }

    // Regenerate y-ticks…
    var gy = plotContainer.selectAll("g.y")
      .data(model2pxInv.ticks(5), String)
      .attr("transform", ty)
      .classed("axes", true);

    gy.select("text")
      .text(fy);

    var gye = gy.enter().append("g")
      .attr("class", "y")
      .attr("transform", ty)
      .attr("background-fill", "#FFEEB6");

    if (model.get("gridLines")) {
      gye.append("line")
        .attr("stroke", stroke)
        .attr("x1", (drawYLabel ? fsize : 0) + (drawYunits ? 2 * fsize : 0))
        .attr("x2", cx);
    } else {
      gye.selectAll("line").remove();
    }

    // y-axis label
    ylabel = plotContainer.selectAll("text.ylabel").data(drawYLabel ? [lengthUnits.pluralName] : []);
    ylabel.enter().append("text");
    ylabel
      .attr("class", "axis")
      .attr("class", "ylabel")
      .attr("transform", "translate(0 " + (cy * 0.5) + ") rotate(-90)")
      .attr("dy", "0.75em")
      .style("text-anchor", "middle")
      .text(String);
    ylabel.exit().remove();

    // y-axis units
    if (drawYunits) {
      gye.append("text")
        .attr("class", "yunits")
        .attr("dy", "0.34em")
        .attr("dx", model.get("ylabel") ? "1em" : "0.1em")
        .text(fy);
    } else {
      gxe.select("text.yunits").remove();
    }
  }

  // Setup background.
  function setupBackground() {
    var color = model.get("backgroundColor") || "rgba(0, 0, 0, 0)";
    backgroundRect.attr("fill", color);
    // Set color of PIXI.Stage to fix an issue with outlines around the objects that are visible
    // when WebGL renderer is being used. It only happens when PIXI.Stage background is different
    // from model container background. It's necessary to convert color into number, as PIXI
    // accepts only numbers. D3 helps us handle color names like "red", "green" etc. It doesn't
    // support rgba values, so ingore alpha channel.
    pixiStages.forEach(function(pixiStage) {
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

    // Create container, or update properties if it already exists.
    if (plotContainer === undefined) {

      plotContainer = d3.select(node).append("svg")
        .attr("class", "root-layer container plot-container")
        .style("z-index", nextViewportZIndex())
        .call(basicSVGAttrs);

      backgroundRect = plotContainer.append("rect")
        .attr("class", "container-background background");

      backgroundContainer = d3.select(node).append("svg")
        .attr("class", "root-layer container background-container svg-viewport")
        .style("z-index", nextViewportZIndex())
        .call(basicSVGAttrs);

      backgroundGroup = backgroundContainer.append("g");

      foregroundContainer = d3.select(node).append("svg")
        .attr("class", "root-layer container foreground-container svg-viewport")
        .style("z-index", MAX_Z_INDEX)
        // IE bug: without background color the layer will be transparent for mouse events
        // when there is some underlying canvas. See:
        // https://www.pivotaltracker.com/story/show/58418116
        .style("background-color", "rgba(0,0,0,0)")
        .on("contextmenu", function() {
          // Disable default context menu on foreground container, as otherwise it  covers all
          // possible context menu that can be used by layers beneath.
          d3.event.preventDefault();
        })
        .call(basicSVGAttrs);

      foregroundGroup = foregroundContainer.append("g");

      brushContainer = foregroundContainer.append("g")
        .attr("class", "brush-container");

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

      // Setup custom hit testing similar to one provided natively by SVG. So layers can overlap,
      // but only real objects (elements inside layer) will block mouse events.
      hitTestingHelper = new HitTestingHelper(foregroundContainer.node());
      hitTestingHelper.addLayer(plotContainer.node());
      hitTestingHelper.addLayer(backgroundContainer.node());
    }

    // Update cx, cy, size, viewport and modelSize variables.
    scale();

    // Dimension/position of all the root layers
    d3.select(node).selectAll('.root-layer')
      .attr({
        width: cx,
        height: cy
      })
      // Update style values too, as otherwise SVG isn't clipped correctly e.g. in Safari.
      .style({
        width: cx + "px",
        height: cy + "px"
      });

    pixiRenderers.forEach(function(pixiRenderer) {
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
    d3.select(node).selectAll(".svg-viewport").attr({
      viewBox: viewBox,
      x: 0,
      y: 0,
      width: model2px(viewport.width),
      height: model2px(viewport.height)
    });

    pixiContainers.forEach(function(pixiContainer) {
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
    backgroundRect
      .attr({
        width: model2px(viewport.width),
        height: model2px(viewport.height),
        x: 0,
        y: 0
      });

    redrawGridLinesAndLabels();
    api.renderCanvas();
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
      plotContainer.on("mousedown.drag", null)
        .on("touchstart.drag", null)
        .classed("draggable", false);
      return;
    }

    dragBehavior = d3.behavior.drag();
    dragBehavior.on("dragstart", function() {
      newDrag = true;
      xs.length = 0;
      ys.length = 0;
      ts.length = 0;
      updateArrays();

      // Prevent default on mousemove. It's necessary when we deal with synthetic mouse
      // events translated from touch events. Then we have to prevent default action (panning,
      // zooming etc.).
      d3.select(window).on("mousemove.viewport-drag", function() {
        d3.event.preventDefault();
      });
    }).on("drag", function() {
      var dx = dragOpt === "y" ? 0 : model2px.invert(d3.event.dx),
        dy = dragOpt === "x" ? 0 : model2px.invert(d3.event.dy);
      model.properties.viewPortX -= dx;
      model.properties.viewPortY += dy;
      dispatch.viewportDrag();
      updateArrays();
    }).on("dragend", function() {
      d3.select(window).on("mousemove.viewport-drag", null);

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
      t = ts[last];
      newDrag = false;
      d3.timer(step);
    });

    plotContainer.call(dragBehavior).classed("draggable", true);

    function updateArrays() {
      xs.push(model.properties.viewPortX);
      ys.push(model.properties.viewPortY);
      ts.push(performance.now());
      if (xs.length > samples) {
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
        plotContainer.selectAll(selector).on("click.custom", null);
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
    model.addPropertiesListener(["backgroundColor"], api.repaint);
    model.addPropertiesListener(["gridLines", "xunits", "yunits", "xlabel", "ylabel",
        "viewPortX", "viewPortY", "viewPortZoom"
      ],
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
    get i18n() {
      return i18n;
    },
    get setFocus() {
      return setFocus;
    },
    get fontFamily() {
      // Note that we intentionally return font-family of the model container instead of
      // the interactive container. Custom theme may apply some font to interactive container,
      // but it may want to keep fonts inside model unchanged.
      return this.$el.css('font-family');
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

    get hitTestCallback() {
      return hitTestingHelper.hitTestCallback;
    },

    get mouseupCallback() {
      return hitTestingHelper.mouseupCallback;
    },

    repaint: function() {
      setupBackground();
      if (renderer.repaint) renderer.repaint();

      api.updateClickHandlers();

      api.renderCanvas();
    },

    /**
      Renderers call this method to append a "viewport" svg <g> element on behalf of a renderer.

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
      var parent = pixiRenderers.length > 0 ? foregroundGroup : backgroundGroup;
      return parent.append("g");
    },

    /**
      Please see .appendViewport() docs.
      The main difference is that it returns PIXI.DisplayObjectContainer object and related
      canvas (where container will be rendered) instead of SVG group element.

      Note that mousemove events will be always passed to this viewport.
     */
    appendPixiViewport: function() {
      var pixiRenderer, pixiStage;
      var browser;
      var newRenderer;

      if (pixiRenderers.length === 0) {
        pixiRenderer = getPixiRenderer(cx, cy);
        pixiStage = new PIXI.Stage(null);

        node.appendChild(pixiRenderer.view);
        d3.select(pixiRenderer.view)
          .attr("class", "pixi-viewport")
          .style("z-index", nextViewportZIndex())
          .call(layeredOnTop);

        pixiRenderers.push(pixiRenderer);
        pixiStages.push(pixiStage);

        // Cascade events into this viewport.
        hitTestingHelper.addLayer(pixiRenderer.view);
        hitTestingHelper.passMouseMove(foregroundContainer.node(), pixiRenderers[0].view);
      }

      var pixiContainer = new PIXI.DisplayObjectContainer();
      pixiStages[0].addChild(pixiContainer);
      pixiContainers.push(pixiContainer);

      // We return container instead of stage, as we can apply view port transformations to it.
      // Stage transformations seem to be ignored by the PIXI renderer.
      return {
        pixiContainer: pixiContainer,
        canvas: pixiRenderers[0].view
      };
    },

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

    getHeightForWidth: function(width) {
      var aspectRatio = viewport.width / viewport.height;
      return width / aspectRatio;
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
        top: 0,
        height: 0,
        left: 0,
        right: 0,
        width: 0
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
    setClickHandler: function(selector, handler) {
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
    updateClickHandlers: function() {
      var selector;

      function getClickHandler(handler) {
        return function(d, i) {
          if (d3.event.defaultPrevented) return;
          // Get current coordinates relative to the plot area!
          var coords = d3.mouse(backgroundRect.node()),
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
    setSelectHandler: function(handler) {
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
        .on("brushstart.select", function() {
          // Prevent default on mousemove. It's necessary when we deal with synthetic mouse
          // events translated from touch events. Then we have to prevent default action (panning,
          // zooming etc.).
          d3.select(window).on("mousemove.select", function() {
            d3.event.preventDefault();
          });
        })
        .on("brushend.select", function() {
          d3.select(window).on("mousemove.select", null);

          var r = selectBrush.extent(),
            x = r[0][0],
            y = r[0][1],
            width = r[1][0] - x,
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
    setDragHandler: function(type, handler) {
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

  // REF TODO ugly
  if (model) {
    init();
  }
  renderer = new Renderer(api, model);

  return api;
};

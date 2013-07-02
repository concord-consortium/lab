/*global $, define: false, d3: false */
// ------------------------------------------------------------
//
//   PTA View Container
//
// ------------------------------------------------------------
define(function (require) {
  // Dependencies.
  var performance           = require('common/performance'),
      getNextTabIndex       = require('common/views/tab-index'),
      console               = require('common/console');

  return function SVGContainer(model, modelUrl, Renderer) {
        // Public API object to be returned.
    var api,

        $el,
        node,
        emsize,
        fontSizeInPixels,
        vis1, vis, plot, viewportG,
        cx, cy,
        padding, size, modelSize, viewport,

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

        gridContainer,
        brushContainer,

        clickHandler,
        // d3.svg.brush object used to implement select action. It should be
        // updated each time model2px and model2pxInv functions are changed!
        selectBrush,

        dispatch = d3.dispatch("viewportDrag"),

        renderer,

        offsetLeft, offsetTop;

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
          viewPortZoom = model.get("viewPortZoom") || 1,
          viewPortX = model.get("viewPortX"),
          viewPortY = model.get("viewPortY"),
          aspectRatio,
          width, height;

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
      viewport.y += viewport.scaledHeight;

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

      offsetTop  = node.offsetTop + padding.top;
      offsetLeft = node.offsetLeft + padding.left;

      // Basic model2px scaling function for position.
      model2px
        .domain([0, viewport.width])
        .range([0, size.width]);

      // Inverted model2px scaling function for position (for y-coordinates, inverted domain).
      model2pxInv
        .domain([viewport.height, 0])
        .range([0, size.height]);

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
      xlabel = vis.selectAll("text.xlabel").data(model.get("xlabel") ? [lengthUnits.pluralName] : []);
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
      ylabel = vis.selectAll("text.ylabel").data(model.get("ylabel") ? [lengthUnits.pluralName] : []);
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
      // Just set the color.
      plot.attr("fill", model.get("backgroundColor") || "rgba(0, 0, 0, 0)");
    }

    function mousedown() {
      setFocus();
    }

    function setFocus() {
      if (model.get("enableKeyboardHandlers")) {
        node.focus();
      }
    }

    function renderContainer() {
      var viewBox;

      // Update cx, cy, size, viewport and modelSize variables.
      scale();

      // Create container, or update properties if it already exists.
      if (vis === undefined) {
        vis1 = d3.select(node).append("svg")
          .attr({
            'xmlns': 'http://www.w3.org/2000/svg',
            'xmlns:xmlns:xlink': 'http://www.w3.org/1999/xlink', // hack: doubling xmlns: so it doesn't disappear once in the DOM
            overflow: 'hidden'
          });

        vis = vis1.append("g").attr("class", "particle-container-vis");

        plot = vis.append("rect")
            .attr("class", "plot");

        if (model.get("enableKeyboardHandlers")) {
          d3.select(node)
            .attr("tabindex", 0)
            .on("mousedown", mousedown);
        }

        gridContainer = vis.append("g").attr("class", "grid-container");
        // Create and arrange "layers" of the final image (g elements). Note
        // that order of their creation is significant.
        // TODO: containers should be initialized by renderers. It's weird
        // that top-level view defines containers for elements that it's
        // unaware of.
        viewportG = vis.append("svg").attr("class", "viewport");
        brushContainer = vis.append("g").attr("class", "brush-container");

      } else {
        // TODO: ?? what g, why is it here?
        vis.selectAll("g.x").remove();
        vis.selectAll("g.y").remove();
      }

      // Set new dimensions of the top-level SVG container.
      vis1
        .attr({
          width: cx,
          height: cy
        })
        // Update style values too, as otherwise SVG isn't clipped correctly e.g. in Safari.
        .style({
          width: cx + "px",
          height: cy + "px"
        });

      viewBox = model2px(viewport.x) + " " +
                model2pxInv(viewport.y) + " " +
                model2px(viewport.scaledWidth) + " " +
                model2px(viewport.scaledHeight);
      viewportG.attr({
        viewBox: viewBox,
        x: 0,
        y: 0,
        width: model2px(viewport.width),
        height: model2px(viewport.height)
      });

      // Update padding, as it can be changed after rescaling.
      vis
        .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      // Rescale main plot.
      vis.select("rect.plot")
        .attr({
          width: model2px(viewport.width),
          height: model2px(viewport.height),
          x: 0,
          y: 0
        });

      redrawGridLinesAndLabels();
    }

    // Support viewport dragging behavior.
    function viewportDragging() {
      var xs = [],
          ys = [],
          ts = [],
          samples = 8,
          newDrag = false,
          dragOpt = model.properties.viewPortDrag,
          vx, vy, t,
          dragBehavior;

      if (dragOpt === false) {
        // This causes that drag behavior will be removed and dragging of
        // other nodes will work again. It's based on the d3 implementation,
        // please see drag() function here:
        // https://github.com/mbostock/d3/blob/master/src/behavior/drag.js
        vis1.on("mousedown.drag", null)
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

      vis1.call(dragBehavior).classed("draggable", true);

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
          vis.selectAll(selector).on("click.custom", null);
        }
      }
    }

    function init() {
      // Setup model view state.
      renderContainer();
      viewportDragging();

      clickHandler = {};

      // Register listeners.
      // Redraw container each time when some visual-related property is changed.
      model.addPropertiesListener([ "backgroundColor"], repaint);
      model.addPropertiesListener(["gridLines", "xunits", "yunits", "xlabel", "ylabel",
                                   "viewPortX", "viewPortY", "viewPortZoom"],
                                   renderContainer);
      model.addPropertiesListener(["viewPortDrag"],
                                   viewportDragging);
    }

    //
    // repaint
    //
    // Call when container changes size.
    //
    function repaint() {
      setupBackground();
      api.updateClickHandlers();
    }

    api = {
      get $el() {
        return $el;
      },
      get viewport() {
        return viewportG;
      },
      get model2px() {
        return model2px;
      },
      get model2pxInv() {
        return model2pxInv;
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

      repaint: function() {
        repaint();

        if (renderer.repaint) renderer.repaint();
      },
      resize: function() {
        renderContainer();
        repaint();
        if (selectBrush) {
          brushContainer.select("g.select-area").call(selectBrush);
        }

        if (renderer.resize) renderer.resize();
      },
      update: function() {
        if (renderer.update) renderer.update();
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
        repaint();

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
            // Get current coordinates relative to the plot area!
            var coords = d3.mouse(plot.node()),
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
            vis.selectAll(selector).on("click.custom", getClickHandler(clickHandler[selector]));
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
            brushContainer.call(selectBrush);
          });
        // Add a new "g" to easily remove it while
        // disabling / reseting select action.
        brushContainer.append("g").classed("select-area", true).call(selectBrush);
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
    renderer = new Renderer(api);
    renderer.bindModel(model);

    return api;
  };
});

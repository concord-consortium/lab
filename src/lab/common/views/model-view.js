/*global $, model_player, define: false, d3: false */
// ------------------------------------------------------------
//
//   PTA View Container
//
// ------------------------------------------------------------
define(function (require) {
  // Dependencies.
  var labConfig             = require('lab.config'),
      console               = require('common/console'),
      PlayResetComponentSVG = require('cs!common/components/play_reset_svg'),
      PlayOnlyComponentSVG  = require('cs!common/components/play_only_svg'),
      PlaybackComponentSVG  = require('cs!common/components/playback_svg'),
      gradients             = require('common/views/gradients');

  return function ModelView(modelUrl, model, Renderer) {
        // Public API object to be returned.
    var api = {},
        renderer,
        $el,
        node,
        emsize,
        fontSizeInPixels,
        imagePath,
        vis1, vis, plot,
        playbackComponent,
        cx, cy,
        padding, size, modelSize,
        playbackXPos, playbackYPos,

        // Basic scaling functions for positio, it transforms model units to "pixels".
        // Use it for positions of objects rendered inside the view.
        model2px,

        // Inverted scaling function for position transforming model units to "pixels".
        // Use it for Y coordinates, as Y axis in model coordinate system increases
        // from bottom to top, while but SVG has increases from top to bottom
        model2pxInv,

        // Basic scaling function for size, it transforms model units to "pixels".
        // Use it for dimensions of objects rendered inside the view.
        modelSize2px,

        // "Containers" - SVG g elements used to position layers of the final visualization.
        mainContainer,
        gridContainer,
        radialBondsContainer,
        VDWLinesContainer,
        imageContainerBelow,
        imageContainerTop,
        textContainerBelow,
        textContainerTop,

        // we can ask the view to render the playback controls to some other container
        useExternalPlaybackContainer = false,
        playbackContainer,

        preexistingControls,

        clickHandler,

        offsetLeft, offsetTop;

    function processOptions(newModelUrl, newModel) {
      modelUrl = newModelUrl || modelUrl;
      model = newModel || model;
      if (modelUrl) {
        imagePath = labConfig.actualRoot + modelUrl.slice(0, modelUrl.lastIndexOf("/") + 1);
      }
    }

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

      if (model.get("controlButtons") && !useExternalPlaybackContainer) {
        padding.bottom += (fontSizeInPixels * 2.5);
      }
    }

    function scale() {
      var modelWidth = model.get('width'),
          modelHeight = model.get('height'),
          modelMinX = model.get('minX'),
          modelMinY = model.get('minY'),
          modelMaxX = model.get('maxX'),
          modelMaxY = model.get('maxY'),
          aspectRatio = modelWidth / modelHeight,
          width, height;

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

      // Model size in model units.
      modelSize = {
        "width":  modelWidth,
        "height": modelHeight,
        "minX": modelMinX,
        "minY": modelMinY,
        "maxX": modelMaxX,
        "maxY": modelMaxY
      };

      offsetTop  = node.offsetTop + padding.top;
      offsetLeft = node.offsetLeft + padding.left;

      if (!useExternalPlaybackContainer) {
        switch (model.get("controlButtons")) {
          case "play":
            playbackXPos = padding.left + (size.width - (75 * emsize))/2;
            break;
          case "play_reset":
            playbackXPos = padding.left + (size.width - (140 * emsize))/2;
            break;
          case "play_reset_step":
            playbackXPos = padding.left + (size.width - (230 * emsize))/2;
            break;
          default:
            playbackXPos = padding.left + (size.width - (230 * emsize))/2;
        }

        playbackYPos = cy - 42 * emsize;
      } else {
        playbackXPos = 0;
        playbackYPos = fontSizeInPixels/6;
      }

      // Basic model2px scaling function for position.
      model2px = d3.scale.linear()
          .domain([modelSize.minX, modelSize.maxX])
          .range([0, size.width]);

      // Inverted model2px scaling function for position (for y-coordinates, inverted domain).
      model2pxInv = d3.scale.linear()
          .domain([modelSize.maxY, modelSize.minY])
          .range([0, size.height]);

      // Basic modelSize2px scaling function for size.
      modelSize2px = function (sizeX) {
        return model2px(modelMinX + sizeX);
      };

    }

    function redraw() {
      var tx = function(d) { return "translate(" + model2px(d) + ",0)"; },
          ty = function(d) { return "translate(0," + model2pxInv(d) + ")"; },
          stroke = function(d) { return d ? "#ccc" : "#666"; },
          fx = model2px.tickFormat(5),
          fy = model2pxInv.tickFormat(5),
          lengthUnits = model.getUnitDefinition('length');

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

      // x-axis label
      if (model.get("xlabel")) {
        vis.append("text")
            .attr("class", "axis")
            .attr("class", "xlabel")
            .text(lengthUnits.pluralName)
            .attr("x", size.width/2)
            .attr("y", size.height)
            .attr("dy", fontSizeInPixels*1.6 + "px")
            .style("text-anchor","middle");
      } else {
        vis.select("text.xlabel").remove();
      }

      gx.exit().remove();

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

      // y-axis label
      if (model.get("ylabel")) {
        vis.append("g").append("text")
            .attr("class", "axis")
            .attr("class", "ylabel")
            .text(lengthUnits.pluralName)
            .style("text-anchor","middle")
            .attr("transform","translate(" + -fontSizeInPixels*1.6 + " " + size.height/2+") rotate(-90)");
      } else {
        vis.select("text.ylabel").remove();
      }

      gy.exit().remove();
    }

    function createGradients() {
      // "Marked" particle gradient.
      gradients.createRadialGradient("mark-grad", "#fceabb", "#fccd4d", "#f8b500", mainContainer);

      // "Charge" gradients.
      gradients.createRadialGradient("neg-grad", "#ffefff", "#fdadad", "#e95e5e", mainContainer);
      gradients.createRadialGradient("pos-grad", "#dfffff", "#9abeff", "#767fbf", mainContainer);
      gradients.createRadialGradient("neutral-grad", "#FFFFFF", "#f2f2f2", "#A4A4A4", mainContainer);

      // "Marked" atom gradient.
      gradients.createRadialGradient("mark-grad", "#fceabb", "#fccd4d", "#f8b500", mainContainer);

      // Colored gradients, used for MD2D Editable element
      gradients.createRadialGradient("green-grad", "#dfffef", "#75a643", "#2a7216", mainContainer);
      gradients.createRadialGradient("blue-grad", "#dfefff", "#7543a6", "#2a1672", mainContainer);
      gradients.createRadialGradient("purple-grad", "#EED3F0", "#D941E0", "#84198A", mainContainer);
      gradients.createRadialGradient("aqua-grad", "#DCF5F4", "#41E0D8", "#12827C", mainContainer);
      gradients.createRadialGradient("orange-grad", "#F0E6D1", "#E0A21B", "#AD7F1C", mainContainer);
    }

    // Setup background.
    function setupBackground() {
      // Just set the color.
      plot.style("fill", model.get("backgroundColor"));
    }

    function mousedown() {
      setFocus();
    }

    function setFocus() {
      if (model.get("enableKeyboardHandlers")) {
        node.focus();
      }
    }

    // ------------------------------------------------------------
    //
    // Handle keyboard shortcuts for model operation
    //
    // ------------------------------------------------------------

    function setupKeyboardHandler() {
      if (!model.get("enableKeyboardHandlers")) return;
      $(node).keydown(function(event) {
        var keycode = event.keycode || event.which;
        switch(keycode) {
          case 13:                 // return
          event.preventDefault();
          if (!model_player.isPlaying()) {
            model_player.play();
          }
          break;

          case 32:                 // space
          event.preventDefault();
          if (model_player.isPlaying()) {
            model_player.stop();
          } else {
            model_player.play();
          }
          break;

          case 37:                 // left-arrow
          event.preventDefault();
          if (model_player.isPlaying()) {
            model_player.stop();
          } else {
            model_player.back();
          }
          break;

          case 39:                 // right-arrow
          event.preventDefault();
          if (model_player.isPlaying()) {
            model_player.stop();
          } else {
            model_player.forward();
          }
          break;
        }
      });
    }

    function renderContainer() {
      // Update cx, cy, size and modelSize variables.
      scale();

      // Create container, or update properties if it already exists.
      if (vis === undefined) {
        vis1 = d3.select(node).append("svg")
          .attr({
            'xmlns': 'http://www.w3.org/2000/svg',
            'xmlns:xmlns:xlink': 'http://www.w3.org/1999/xlink', // hack: doubling xmlns: so it doesn't disappear once in the DOM
            width: cx,
            height: cy
          })
          // SVG element should always fit its parent container.
          .style({
            width: "100%",
            height: "100%"
          });

        vis = vis1.append("g").attr("class", "particle-container-vis");

        plot = vis.append("rect")
            .attr("class", "plot");

        if (model.get("enableKeyboardHandlers")) {
          d3.select(node)
            .attr("tabindex", 0)
            .on("mousedown", mousedown);
        }

        // Create and arrange "layers" of the final image (g elements).
        // Note that order of their creation is significant.
        gridContainer        = vis.append("g").attr("class", "grid-container");
        imageContainerBelow  = vis.append("g").attr("class", "image-container-below");
        textContainerBelow   = vis.append("g").attr("class", "text-container-below");
        radialBondsContainer = vis.append("g").attr("class", "radial-bonds-container");
        VDWLinesContainer    = vis.append("g").attr("class", "vdw-lines-container");
        mainContainer        = vis.append("g").attr("class", "main-container");
        imageContainerTop    = vis.append("g").attr("class", "image-container-top");
        textContainerTop     = vis.append("g").attr("class", "text-container-top");

        api.containers = {
          gridContainer:        gridContainer,
          imageContainerBelow:  imageContainerBelow,
          textContainerBelow:   textContainerBelow,
          radialBondsContainer: radialBondsContainer,
          VDWLinesContainer:    VDWLinesContainer,
          mainContainer:        mainContainer,
          imageContainerTop:    imageContainerTop,
          textContainerTop:     textContainerTop
        };

        setupKeyboardHandler();
        createGradients();

        playbackContainer = vis1;
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
        });

      // Update padding, as it can be changed after rescaling.
      vis
        .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      // Rescale main plot.
      vis.select("rect.plot")
        .attr({
          width: size.width,
          height: size.height
        });

      redraw();
    }

    function setupPlaybackControls() {
      if (preexistingControls) preexistingControls.remove();
      switch (model.get("controlButtons")) {
        case "play":
          playbackComponent = new PlayOnlyComponentSVG(playbackContainer, model_player, playbackXPos, playbackYPos, emsize);
          break;
        case "play_reset":
          playbackComponent = new PlayResetComponentSVG(playbackContainer, model_player, playbackXPos, playbackYPos, emsize);
          break;
        case "play_reset_step":
          playbackComponent = new PlaybackComponentSVG(playbackContainer, model_player, playbackXPos, playbackYPos, emsize);
          break;
        default:
          playbackComponent = null;
      }
      preexistingControls = playbackContainer.select('.model-controller');
    }

    //
    // *** Main Renderer functions ***
    //

    function init() {
      // Setup model view state.
      clickHandler = {};

      // dynamically add modelUrl as a model property so the renderer
      // can find resources on paths relative to the model
      model.url = modelUrl;

      // create a model renderer ... if one hasn't already been created
      if (!renderer) {
        renderer = new Renderer(api, model);
      } else {
        renderer.reset(model);
      }

      // Register listeners.
      // Redraw container each time when some visual-related property is changed.
      model.addPropertiesListener([ "backgroundColor"], repaint);
      model.addPropertiesListener(["gridLines", "xunits", "yunits", "xlabel", "ylabel" ],
        function() {
          renderContainer();
          setupPlaybackControls();
          repaint();
        }
      );
    }

    //
    // repaint
    //
    // Call when container changes size.
    //
    function repaint() {
      setupBackground();
      renderer.repaint(model2px, model2pxInv, modelSize2px);
      api.updateClickHandlers();
    }

    api = {
      $el: null,
      node: null,
      update: null,
      containers: null,
      scale: scale,
      setFocus: setFocus,
      getFontSizeInPixels: getFontSizeInPixels,
      resize: function() {
        renderContainer();
        setupPlaybackControls();
        repaint();
      },
      getHeightForWidth: function (width) {
        var modelWidth = model.get('width'),
            modelHeight = model.get('height'),
            aspectRatio = modelWidth / modelHeight,
            height;

        updatePadding();

        width = width - padding.left - padding.right;
        height = width / aspectRatio;
        return height + padding.top  + padding.bottom;
      },
      setPlaybackContainer: function(svgPlaybackContainer) {
        useExternalPlaybackContainer = true;
        playbackContainer = svgPlaybackContainer;
      },
      repaint: function() {
        repaint();
      },
      reset: function(newModelUrl, newModel) {
        processOptions(newModelUrl, newModel);
        renderContainer();
        setupPlaybackControls();
        init();
        repaint();
      },
      model2px: function(val) {
        // Note that we shouldn't just do:
        // api.model2px = model2px;
        // as model2px local variable can be reinitialized
        // many times due container rescaling process.
        return model2px(val);
      },
      model2pxInv: function(val) {
        // See comments for model2px.
        return model2pxInv(val);
      },
      modelSize2px: function(val) {
        // See comments for model2px.
        return modelSize2px(val);
      },
      pos: function() {
        // Add a pos() function so the model renderer can more easily
        // manipulate absolutely positioned dom elements it may create or
        // manage.
        return  mainContainer.node().parentElement.getBoundingClientRect();
      },
      /**
       * Sets custom click handler.
       *
       * @param {string}   selector Selector string defining clickable objects.
       * @param {Function} callback Custom click handler. It will be called
       *                            when object is clicked with (x, y, d, i) arguments:
       *                              x - x coordinate in model units,
       *                              y - y coordinate in model units,
       *                              d - data associated with a given object (can be undefined!),
       *                              i - ID of clicked object (usually its value makes sense if d is defined).
       */
      setClickHandler: function (selector, callback) {
        clickHandler[selector] = callback;
        api.updateClickHandlers();
      },
      /**
       * Applies all custom callback to objects matching selector
       * Note that this function should be called each time when possibly
       * clickable object is added or repainted!
       */
      updateClickHandlers: function () {
        var selector;

        function getClickHandler (callback) {
          return function (d, i) {
            // Get current coordinates relative to the plot area!
            var coords = d3.mouse(plot.node()),
                x = model2px.invert(coords[0]),
                y = model2pxInv.invert(coords[1]);
            console.log("[view] click at (" + x.toFixed(3) + ", " + y.toFixed(3) + ")");
            callback(x, y, d, i);
          };
        }

        for (selector in clickHandler) {
          if (clickHandler.hasOwnProperty(selector)) {
            vis.selectAll(selector).on("click", getClickHandler(clickHandler[selector]));
          }
        }
      }
    };

    // Initialization.
    // jQuery object with model container.
    $el = $("<div>")
      .attr({
        "id": "model-container",
        "class": "container"
      })
      // Set initial dimensions.
      .css({
        "width": "50px",
        "height": "50px"
      });
    // DOM element.
    node = $el[0];

    processOptions();
    renderContainer();
    setupPlaybackControls();
    init();

    // Extend Public withExport initialized object to initialized objects
    api.update = renderer.update;
    api.$el = $el;
    api.node = node;

    return api;
  };
});

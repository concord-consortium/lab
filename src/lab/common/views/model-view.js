/*global $ model_player define: false, d3: false */
// ------------------------------------------------------------
//
//   PTA View Container
//
// ------------------------------------------------------------
define(function (require) {
  // Dependencies.
  var labConfig             = require('lab.config'),
      PlayResetComponentSVG = require('cs!common/components/play_reset_svg'),
      PlayOnlyComponentSVG  = require('cs!common/components/play_only_svg'),
      PlaybackComponentSVG  = require('cs!common/components/playback_svg'),
      gradients             = require('common/views/gradients');

  return function ModelView(e, modelUrl, model, Renderer) {
        // Public API object to be returned.
    var api = {},
        renderer,
        containers = {},
        elem = d3.select(e),
        node = elem.node(),
        // in fit-to-parent mode, the d3 selection containing outermost container
        outerElement,
        cx = elem.property("clientWidth"),
        cy = elem.property("clientHeight"),
        width, height,
        emsize,
        imagePath,
        vis1, vis, plot,
        playbackComponent,
        padding, size, modelSize,
        dragged,
        playbackXPos, playbackYPos,
        timePrefix = "",
        timeSuffix = " (fs)",

        // Basic scaling function, it transforms model units to "pixels".
        // Use it for dimensions of objects rendered inside the view.
        model2px,
        // Inverted scaling function transforming model units to "pixels".
        // Use it for Y coordinates, as model coordinate system has (0, 0) point
        // in lower left corner, but SVG has (0, 0) point in upper left corner.
        model2pxInv,

        // "Containers" - SVG g elements used to position layers of the final visualization.
        mainContainer,
        gridContainer,
        radialBondsContainer,
        VDWLinesContainer,
        imageContainerBelow,
        imageContainerTop,
        textContainerBelow,
        textContainerTop,

        offsetLeft, offsetTop,
        showClock;

    function processOptions(newModelUrl, newModel) {
      modelUrl = newModelUrl || modelUrl;
      model = newModel || model;
      if (modelUrl) {
        imagePath = labConfig.actualRoot + modelUrl.slice(0, modelUrl.lastIndexOf("/") + 1);
      }
    }

    function scale() {
      var modelWidth = model.get('width'),
          modelHeight = model.get('height'),
          aspectRatio = modelWidth / modelHeight;

      // TODO: temporary workaround.
      emsize = 1;

      padding = {
         "top":    20,
         "right":  25,
         "bottom": 10,
         "left":   25
      };

      if (model.get("xunits")) {
        padding.bottom += (20  * emsize);
      }

      if (model.get("yunits")) {
        padding.left += (20  * emsize);
      }

      if (model.get("controlButtons")) {
        padding.bottom += (40  * emsize);
      } else {
        padding.bottom += (15  * emsize);
      }

      cx = elem.property("clientWidth");
      width = cx - padding.left  - padding.right;
      height = width / aspectRatio;
      // cy = elem.property("clientHeight");
      // height = cy - padding.top  - padding.bottom;
      // width = height * aspectRatio;
      cy = height + padding.top  + padding.bottom;
      node.style.height = cy +"px";

      // Container size in px.
      size = {
        "width":  width,
        "height": height
      };
      // Model size in model units.
      modelSize = {
        "width":  modelWidth,
        "height": modelHeight
      };

      offsetTop  = node.offsetTop + padding.top;
      offsetLeft = node.offsetLeft + padding.left;

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

      // Basic model2px scaling function.
      model2px = d3.scale.linear()
          .domain([0, modelSize.width])
          .range([0, size.width]);

      // Inverted model2px scaling function (for y-coordinates, inverted domain).
      model2pxInv = d3.scale.linear()
          .domain([modelSize.height, 0])
          .range([0, size.height]);

      dragged = null;
      return [cx, cy, width, height];
    }

    function modelTimeLabel() {
      return timePrefix + modelTimeFormatter(model.get('time')) + timeSuffix;
    }

    function redraw() {
      var tx = function(d) { return "translate(" + model2px(d) + ",0)"; },
          ty = function(d) { return "translate(0," + model2pxInv(d) + ")"; },
          stroke = function(d) { return d ? "#ccc" : "#666"; },
          fx = model2px.tickFormat(5),
          fy = model2pxInv.tickFormat(5);

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

      if (model.get("xunits")) {
        gxe.append("text")
            .attr("y", size.height)
            .attr("dy", "1.25em")
            .attr("text-anchor", "middle")
            .text(fx);
      } else {
        gxe.select("text").remove();
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

      if (model.get("yunits")) {
        gye.append("text")
            .attr("x", "-0.5em")
            .attr("dy", "0.30em")
            .attr("text-anchor", "end")
            .text(fy);
      } else {
        gye.select("text").remove();
      }

      // update model time display
      if (showClock) {
        timeLabel.text(modelTimeLabel());
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
      scale();
      // create container, or update properties if it already exists
      if (vis === undefined) {

        outerElement = elem;
        vis1 = d3.select(node).append("svg")
          .attr({
            width: cx,
            height: cy
          })
          .style({
            width: cx,
            height: cy
          });

        vis = vis1.append("g")
            .attr("class", "particle-container-vis")
            .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

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

        //
        containers = {
          node: node,
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
      } else {
        // TODO: ?? what g, why is it here?
        vis.selectAll("g.x").remove();
        vis.selectAll("g.y").remove();
      }

      vis1
        .attr({
          width: cx,
          height: cy
        })
        .style({
          width: cx,
          height: cy
        });

      vis.select("rect.plot")
        .attr({
          width: size.width,
          height: size.height
        });

      redraw();
    }

    function setupPlaybackControls() {
      d3.select('.model-controller').remove();
      switch (model.get("controlButtons")) {
        case "play":
          playbackComponent = new PlayOnlyComponentSVG(vis1, model_player, playbackXPos, playbackYPos, emsize);
          break;
        case "play_reset":
          playbackComponent = new PlayResetComponentSVG(vis1, model_player, playbackXPos, playbackYPos, emsize);
          break;
        case "play_reset_step":
          playbackComponent = new PlaybackComponentSVG(vis1, model_player, playbackXPos, playbackYPos, emsize);
          break;
        default:
          playbackComponent = null;
      }
    }

    //
    // *** Main Renderer functions ***
    //

    //
    // init
    //
    // Called when Model View Container is created.
    //
    function init() {
      // render model container ... the chrome around the model
      renderContainer();

      // dynamically add modelUrl as a model property so the renderer
      // can find resources on paths relative to the model
      model.url = modelUrl;

      // create a model renderer ... if one hasn't already been created
      if (!renderer) {
        renderer = new Renderer(model, containers, model2px, model2pxInv);
      } else {
        renderer.reset(model, containers, model2px, model2pxInv);
      }

      repaint();

      // Redraw container each time when some visual-related property is changed.
      model.addPropertiesListener([ "showClock", "backgroundColor"], repaint);
      model.addPropertiesListener(["gridLines", "xunits", "yunits"],
        function() {
          renderContainer();
          repaint();
        }
      );
      setupPlaybackControls();
    }

    //
    // repaint
    //
    // Call when container changes size.
    //
    function repaint() {
      setupBackground();
      renderer.repaint(model2px, model2pxInv);
    }

    api = {
      update: null,
      node: null,
      outerNode: null,
      scale: scale,
      setFocus: setFocus,
      resize: function() {
        scale();
        processOptions();
        init();
      },
      getHeightForWidth: function (width) {
        var modelWidth = model.get('width'),
            modelHeight = model.get('height'),
            aspectRatio = modelWidth / modelHeight,
            height;

        width = width - padding.left - padding.right;
        height = width / aspectRatio;
        return height + padding.top  + padding.bottom;
      },
      repaint: function() {
        repaint();
      },
      reset: function(newModelUrl, newModel) {
        processOptions(newModelUrl, newModel);
        init();
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
      }
    };

    // Initialization.
    processOptions();
    init();

    // Extend Public withExport initialized object to initialized objects
    api.update = renderer.update;
    api.node = node;
    api.outerNode = outerElement.node();

    return api;
  };
});

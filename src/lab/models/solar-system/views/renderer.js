/*global $ alert ACTUAL_ROOT model_player define: false, d3: false */
// ------------------------------------------------------------
//
//   SolarSystem View Renderer
//
// ------------------------------------------------------------
define(function (require) {
  // Dependencies.
  var labConfig             = require('lab.config'),
      console               = require('common/console'),
      wrapSVGText           = require('cs!common/layout/wrap-svg-text'),
      gradients             = require('common/views/gradients');

  return function SolarSystemView(SVGContainer, model) {
    // Public API object to be returned.
    var api = {},

        modelWidth,
        modelHeight,
        modelMinX2,
        modelMinY2,
        modelMaxX2,
        modelMaxY2,
        aspectRatio,

        // Basic scaling functions for position, it transforms model units to "pixels".
        // Use it for positions of objects rendered inside the view.
        model2px,

        // Inverted scaling function for position transforming model units to "pixels".
        // Use it for Y coordinates, as Y axis in model coordinate system increases
        // from bottom to top, while but SVG has increases from top to bottom
        model2pxInv,

        // The model function get_results() returns a 2 dimensional array
        // of particle indices and properties that is updated every model tick.
        // This array is not garbage-collected so the view can be assured that
        // the latest results will be in this array when the view is executing
        modelResults,

        // "Containers" - SVG g elements used to position layers of the final visualization.
        imageContainerBelow  = SVGContainer.viewport.append("g").attr("class", "image-container-below"),
        textContainerBelow   = SVGContainer.viewport.append("g").attr("class", "text-container-below"),
        mainContainer        = SVGContainer.viewport.append("g").attr("class", "main-container"),
        imageContainerTop    = SVGContainer.viewport.append("g").attr("class", "image-container-top"),
        textContainerTop     = SVGContainer.viewport.append("g").attr("class", "text-container-top"),

        // Array which defines a gradient assigned to a given astromonicalBody.
        gradientNameForBody = [],

        astromonicalBodyTooltipOn,

        astromonicalBody,
        label, labelEnter,
        astromonicalBodyDiv, astromonicalBodyDivPre,

        fontSizeInPixels,
        textBoxFontSizeInPixels,

        imageProp,
        imageMapping,
        modelImagePath,
        imageSizes = [],
        textBoxes,
        imagePath,

        drawBodyTrace,
        bodyTraceId,
        bodyTraceColor,
        bodyTrace,
        bodyTracePath,
        bodyTraceMaxLength = 35500,
        traceBodyStrokeWidth;

    /**
     * Setups set of gradient which can be changed by the user.
     * They should be recreated during each reset / repaint operation.
     * @private
     */
    function setupDynamicGradients() {
      var i, color, lightColor, medColor, darkColor;

      // "Marked" particle gradient.
      medColor   = model.get("markColor");
      // Mark color defined in JSON defines medium color of a gradient.
      color      = d3.rgb(medColor);
      lightColor = color.brighter(1).toString();
      darkColor  = color.darker(1).toString();
      gradients.createRadialGradient("mark-grad", lightColor, medColor, darkColor, mainContainer);
      gradients.createRadialGradient("neutral-grad", "#FFFFFF", "#f2f2f2", "#A4A4A4", mainContainer);
    }

    // Returns gradient appropriate for a given astromonicalBody.
    // d - astromonicalBody data.
    function getBodyGradient(d) {
      if (d.marked) {
        return "url(#mark-grad)";
      } else {
        return "url(#neutral-grad)";
      }
    }

    function updateBodyRadius() {
      mainContainer.selectAll("circle").data(modelResults).attr("r",  function(d) { return model2px(d.radius); });
    }

    function setupColorsOfBodies() {
      var i, len;

      gradientNameForBody.length = modelResults.length;
      for (i = 0, len = modelResults.length; i < len; i++)
        gradientNameForBody[i] = getBodyGradient(modelResults[i]);
    }

    function setupBodies() {

      mainContainer.selectAll("circle").remove();
      mainContainer.selectAll("g.label").remove();

      astromonicalBody = mainContainer.selectAll("circle").data(modelResults);

      astromonicalBodyEnter();

      label = mainContainer.selectAll("g.label")
          .data(modelResults);

      labelEnter = label.enter().append("g")
          .attr("class", "label")
          .attr("transform", function(d) {
            return "translate(" + model2px(d.x) + "," + model2pxInv(d.y) + ")";
          });

      labelEnter.each(function (d) {
        var selection = d3.select(this),
            txtValue, txtSelection;
        // Append appropriate label. For now:
        // If 'astromonicalBodyNumbers' option is enabled, use indices.
        // If not and there is available 'label'/'symbol' property, use one of them
        if (model.get("astromonicalBodyNumbers")) {
          selection.append("text")
            .text(d.idx)
            .style("font-size", model2px(1.4 * d.radius) + "px");
        }
        // Set common attributes for labels (+ shadows).
        txtSelection = selection.selectAll("text");
        // Check if node exists and if so, set appropriate attributes.
        if (txtSelection.node()) {
          txtSelection
            .attr("pointer-events", "none")
            .style({
              "font-weight": "bold",
              "opacity": 0.7
            });
          txtSelection
            .attr({
              // Center labels, use real width and height.
              // Note that this attrs should be set *after* all previous styling options.
              // .node() will return first node in selection. It's OK - both texts
              // (label and its shadow) have the same dimension.
              "x": -txtSelection.node().getComputedTextLength() / 2,
              "y": "0.31em"//bBox.height / 4
            });
        }
        // Set common attributes for shadows.
        selection.select("text.shadow")
          .style({
            "stroke": "#fff",
            "stroke-width": 0.15 * model2px(d.radius),
            "stroke-opacity": 0.7
          });
      });
    }

    function setupBodyTrace() {
      mainContainer.selectAll("path.bodyTrace").remove();
      bodyTracePath = "";

      drawBodyTrace = model.get("showBodyTrace");
      bodyTraceId = model.get("bodyTraceId");
      if (drawBodyTrace) {
        bodyTrace = mainContainer.selectAll("path.bodyTrace").data([modelResults[bodyTraceId]]);
        bodyTraceEnter();
      }
    }

    /**
      Call this wherever a d3 selection is being used to add circles for astromonicalBodys
    */

    function astromonicalBodyEnter() {
      astromonicalBody.enter().append("circle")
          .attr({
            "r":  function(d) {
              return model2px(d.radius); },
            "cx": function(d) {
              return model2px(d.x); },
            "cy": function(d) {
              return model2pxInv(d.y); },
            "fill-opacity": function(d) {
              return d.visible; },
            "fill": function (d, i) {
              return gradientNameForBody[i]; }
          })
          .on("mousedown", astromonicalBodyMouseDown)
          .on("mouseover", astromonicalBodyMouseOver)
          .on("mouseout", astromonicalBodyMouseOut);
    }

    function astromonicalBodyUpdate() {
      astromonicalBody.attr({
        "r":  function(d) {
          return model2px(d.radius); },
        "cx": function(d) {
          return model2px(d.x); },
        "cy": function(d) {
          return model2pxInv(d.y); }
      });

      if (astromonicalBodyTooltipOn === 0 || astromonicalBodyTooltipOn > 0) {
        renderBodyTooltip(astromonicalBodyTooltipOn);
      }
    }

    function astromonicalBodyMouseOver(d, i) {
      if (model.get("enableBodyTooltips")) {
        renderBodyTooltip(i);
      }
    }

    function astromonicalBodyMouseDown(d, i) {
      SVGContainer.node.focus();
      if (model.get("enableBodyTooltips")) {
        if (astromonicalBodyTooltipOn !== false) {
          astromonicalBodyDiv.style("opacity", 1e-6);
          astromonicalBodyDiv.style("display", "none");
          astromonicalBodyTooltipOn = false;
        } else {
          if (d3.event.shiftKey) {
            astromonicalBodyTooltipOn = i;
          } else {
            astromonicalBodyTooltipOn = false;
          }
          renderBodyTooltip(i);
        }
      }
    }

    function updateBodyTrace() {
      bodyTrace.attr({
        "d": getBodyTracePath
      });
    }

    function bodyTraceEnter() {
      bodyTrace.enter().append("path")
        .attr({
          "class": "bodyTrace",
          "d": getBodyTracePath,
          "stroke-width": traceBodyStrokeWidth,
          "stroke": bodyTraceColor,
          "fill": "none"
        });
    }

    function getBodyTracePath(d) {
      // until we implement buffered array model output properties,
      // we just keep the path history in the path string
      var dx = Math.floor(model2px(d.x) * 100) / 100,
          dy = Math.floor(model2pxInv(d.y) * 100) / 100,
          lIndex, sIndex;
      if (!bodyTracePath) {
        bodyTracePath = "M"+dx+","+dy+"L";
        return "M "+dx+","+dy;
      } else {
        bodyTracePath += dx+","+dy + " ";
      }

      // fake buffered array functionality by knocking out the first
      // element of the string when we get too big
      if (bodyTracePath.length > bodyTraceMaxLength) {
        lIndex = bodyTracePath.indexOf("L");
        sIndex = bodyTracePath.indexOf(" ");
        bodyTracePath = "M" + bodyTracePath.slice(lIndex+1, sIndex) + "L" + bodyTracePath.slice(sIndex+1);
      }
      return bodyTracePath;
    }

    function renderBodyTooltip(i) {
      astromonicalBodyDiv
            .style("opacity", 1.0)
            .style("display", "inline")
            .style("background", "rgba(100%, 100%, 100%, 0.7)")
            .style("left", model2px(modelResults[i].x) + 60 + "px")
            .style("top",  model2pxInv(modelResults[i].y) + 30 + "px")
            .style("zIndex", 100)
            .transition().duration(250);

      astromonicalBodyDivPre.text(
          "astromonicalBody: " + i + "\n" +
          "time: " + modelTimeLabel() + "\n" +
          "speed: " + d3.format("+6.3e")(modelResults[i].speed) + "\n" +
          "vx:    " + d3.format("+6.3e")(modelResults[i].vx)    + "\n" +
          "vy:    " + d3.format("+6.3e")(modelResults[i].vy)    + "\n" +
          "ax:    " + d3.format("+6.3e")(modelResults[i].ax)    + "\n" +
          "ay:    " + d3.format("+6.3e")(modelResults[i].ay)    + "\n"
        );
    }

    function astromonicalBodyMouseOut() {
      if (!astromonicalBodyTooltipOn && astromonicalBodyTooltipOn !== 0) {
        astromonicalBodyDiv.style("opacity", 1e-6).style("zIndex" -1);
      }
    }

    function setupTooTips() {
      if ( astromonicalBodyDiv === undefined) {
        astromonicalBodyDiv = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 1e-6);
        astromonicalBodyDivPre = astromonicalBodyDiv.append("pre");
      }
    }

    //
    // *** Main Renderer functions ***
    //

    function setupRendererOptions() {
      imageProp = model.get("images");
      imageMapping = model.get("imageMapping");
      modelImagePath = model.get('imagePath');
      if (modelImagePath) {
        imagePath = labConfig.actualRoot + modelImagePath;
      }
      else if (SVGContainer.url) {
        imagePath = labConfig.actualRoot + SVGContainer.url.slice(0, SVGContainer.url.lastIndexOf("/") + 1);
      }

      bodyTraceColor = model.get("bodyTraceColor");
    }

    //
    // SolarSystem Renderer: init
    //
    // Called when Renderer is created.
    //
    function init() {
      model2px = SVGContainer.model2px;
      model2pxInv = SVGContainer.model2pxInv;

      fontSizeInPixels = SVGContainer.getFontSizeInPixels();
      textBoxFontSizeInPixels = fontSizeInPixels * 0.9;
      traceBodyStrokeWidth = fontSizeInPixels/12;

      modelResults  = model.get_results();
      modelWidth    = model.get('width');
      modelHeight   = model.get('height');
      aspectRatio   = modelWidth / modelHeight;

      setupRendererOptions();

      modelMinX = model.get('minX');
      modelMinY = model.get('minY');
      modelMaxX = model.get('maxX');
      modelMaxY = model.get('maxY');

      setupTooTips();

      function redrawClickableObjects (redrawOperation) {
        return function () {
          redrawOperation();
          // All objects where repainted (probably removed and added again), so
          // it's necessary to apply click handlers again.
          SVGContainer.updateClickHandlers();
        };
      }

      // Redraw container each time when some visual-related property is changed.
      model.addPropertiesListener([
        "showBodyTrace", "bodyTraceId",
        "backgroundColor", "markColor"],
          redrawClickableObjects(repaint));

      // Redraw container each time when some visual-related property is changed.
      model.on('addBody', redrawClickableObjects(repaint));
      model.on('removeBody', redrawClickableObjects(repaint));
    }

    // Call when model is reset or reloaded.
    function bindModel(newModel) {
      model = newModel;
      init();
    }

    //
    // SolarSystem Renderer: repaint
    //
    // Call when container being rendered into changes size, in that case
    // pass in new D3 scales for model2px transformations.
    //
    // Also call when the number of objects changes such that the container
    // must be setup again.
    //
    function repaint(m2px, m2pxInv) {
      if (arguments.length) {
        model2px = m2px;
        model2pxInv = m2pxInv;
      }
      fontSizeInPixels = SVGContainer.getFontSizeInPixels();
      textBoxFontSizeInPixels = fontSizeInPixels * 0.9;

      setupDynamicGradients();
      setupBodyTrace();
      setupColorsOfBodies();
      setupBodies();
    }

    //
    // SolarSystem Renderer: update
    //
    // Call to update visualization when model result state changes.
    // Normally called on every model tick.
    //
    function update() {
      console.time('view update');

      astromonicalBodyUpdate();

      if (drawBodyTrace) {
        updateBodyTrace();
      }

      console.timeEnd('view update');
    }


    //
    // Public API to instantiated Renderer
    //
    api = {
      // Expose private methods.
      update: update,
      repaint: repaint,
      bindModel: bindModel,
      model2px: SVGContainer.model2px,
      model2pxInv: SVGContainer.model2pxInv
    };

    return api;
  };
});

/*global $, define: false, d3: false, Image */
/*jshint loopfunc: true */

// ------------------------------------------------------------
//
//   MD2D View Renderer
//
// ------------------------------------------------------------
define(function(require) {
  // Dependencies.
  var labConfig         = require('lab.config'),
    console             = require('common/console'),
    benchmark           = require('common/benchmark/benchmark'),
    AtomsRenderer       = require('models/md2d/views/atoms-renderer'),
    BondsRenderer       = require('models/md2d/views/bonds-renderer'),
    GeneticRenderer     = require('models/md2d/views/genetic-renderer'),
    wrapSVGText         = require('cs!common/layout/wrap-svg-text'),
    gradients           = require('common/views/gradients'),
    color               = require('common/views/color');

  return function MD2DView(modelView, model) {
    // Public API object to be returned.
    var api = {},

      // Allows us to defer running actual renderer setup until layout system has determined oursize.
      isSetup = false,

      // The model function getAtoms() returns a 2 dimensional array
      // of particle indices and properties that is updated every model tick.
      // This array is not garbage-collected so the view can be assured that
      // the latest modelAtoms will be in this array when the view is executing
      modelAtoms,
      modelElements,
      modelWidth,
      modelHeight,
      aspectRatio,

      // Basic scaling functions for position, it transforms model units to "pixels".
      // Use it for positions of objects rendered inside the view.
      model2px,

      // Inverted scaling function for position transforming model units to "pixels".
      // Use it for Y coordinates, as Y axis in model coordinate system increases
      // from bottom to top, while but SVG has increases from top to bottom
      model2pxInv,

      // "Viewports" - SVG elements whose viewbox is automatically adjusted appropriately by the
      // container (called modelView here although it's a generic container, *not* the modelView)
      belowAtomsViewport = modelView.appendViewport().classed("below-atoms", true),

      // "Containers" - G elements used to position layers of the final visualization.
      fieldVisualization   = belowAtomsViewport.append("g").attr("class", "field-visualization"),
      shapeContainerBelow  = belowAtomsViewport.append("g").attr("class", "shape-container-below"),
      imageContainerBelow  = belowAtomsViewport.append("g").attr("class", "image-container-below"),
      textContainerBelow   = belowAtomsViewport.append("g").attr("class", "text-container-below"),
      VDWLinesContainer    = belowAtomsViewport.append("g").attr("class", "vdw-lines-container"),

      // TODO: remove it, as well as legacy code responsible for SVG atoms rendering.
      atomsViewport  = modelView.appendViewport().classed("atoms", true),
      atomsContainer = atomsViewport.append("g").attr("class", "atoms-container"),

      bondsPixi = modelView.appendPixiViewport(),
      atomsPixi = modelView.appendPixiViewport(true),

      aboveAtomsViewport = modelView.appendViewport().classed("above-atoms", true),
      shapeContainerTop  = aboveAtomsViewport.append("g").attr("class", "shape-container-top"),
      lineContainerTop   = aboveAtomsViewport.append("g").attr("class", "line-container-top"),
      imageContainerTop  = aboveAtomsViewport.append("g").attr("class", "image-container-top"),
      textContainerTop   = aboveAtomsViewport.append("g").attr("class", "text-container-top"),

      iconContainer = modelView.foregroundContainer.append("g").attr("class", "icon-container"),

      // Renderers specific for MD2D
      // TODO: try to create new renderers in separate files for clarity and easier testing.
      atomsRenderer = new AtomsRenderer(modelView, model, atomsPixi.pixiContainer, atomsPixi.canvas),
      bondsRenderer = new BondsRenderer(modelView, model, bondsPixi.pixiContainer, atomsRenderer),
      geneticRenderer,

      // Set of gradients used for Kinetic Energy Shading.
      gradientNameForKELevel = [],
      // Number of gradients used for Kinetic Energy Shading.
      KE_SHADING_STEPS = 25,
      // Set of gradients used for Charge Energy Shading.
      gradientNameForPositiveChargeLevel = [],
      gradientNameForNegativeChargeLevel = [],
      // Number of gradients used for Charge Shading (for both positive and negative charges).
      CHARGE_SHADING_STEPS = 25,

      atomTooltipOn = false,

      atomToolTip, atomToolTipPre,

      fontSizeInPixels,

      modelTimeFormatter = d3.format("5.1f"),
      timePrefix = "",
      timeSuffix = "",

      obstacle,
      obstacles,
      mockObstaclesArray = [],
      shapes,
      shapeTop,
      shapeBelow,
      mockShapesTop = [],
      mockShapesBelow = [],
      lines,
      lineTop,
      mockLinesTop = [],
      vdwPairs = [],
      vdwLines,
      keShadingMode,
      useQuantumDynamics,
      drawVdwLines,
      drawVelocityVectors,
      drawElectricForceField,
      velocityVectorColor,
      velocityVectorWidth,
      velocityVectorLength,
      drawForceVectors,
      forceVectorColor,
      forceVectorWidth,
      forceVectorLength,
      forceVectorsDirectionOnly,
      velVector,
      forceVector,
      efVector,
      imageProp,
      imageMapping,
      modelImagePath,
      imageSizes = [],
      textBoxes,
      imagePath,
      drawAtomTrace,
      atomTraceId,
      atomTraceColor,
      atomTrace,
      atomTracePath,

      VELOCITY_STR = "velocity",
      FORCE_STR = "force",

      browser = benchmark.what_browser(),

      // pre-calculations
      halfPi = Math.PI / 2,

      // this is a hack put in place to temporarily deal with a IE 10 bug which
      // does not update line markers when svg lines are moved
      // see https://connect.microsoft.com/IE/feedback/details/781964/
      hideLineMarkers = browser.browser === "MSIE" && Number(browser.version) >= 10;


    function modelTimeLabel() {
      return timePrefix + modelTimeFormatter(model.get('displayTime')) + timeSuffix;
    }

    // Pass in the signed 24-bit Integer used for Java MW elementColors
    // See: https://github.com/mbostock/d3/wiki/Colors

    function createElementColorGradient(id, signedInt, mainContainer) {
      var colorstr = (signedInt + Math.pow(2, 24)).toString(16),
        color,
        medColor,
        lightColor,
        darkColor,
        i;

      for (i = colorstr.length; i < 6; i++) {
        colorstr = String(0) + colorstr;
      }
      color = d3.rgb("#" + colorstr);
      medColor = color.toString();
      lightColor = color.brighter(1).toString();
      darkColor = color.darker(1).toString();
      return gradients.createRadialGradient(id, lightColor, medColor, darkColor, mainContainer);
    }

    /**
     * Setups set of gradient which can be changed by the user.
     * They should be recreated during each reset / repaint operation.
     * @private
     */

    function setupDynamicGradients() {
      var i, color, lightColor, medColor, darkColor;

      for (i = 0; i < 4; i++) {
        // Use names defined in gradientNameForElement array!
        createElementColorGradient("elem" + i + "-grad", modelElements.color[i], atomsContainer);
      }

      // "Marked" particle gradient.
      medColor = model.get("markColor");
      // Mark color defined in JSON defines medium color of a gradient.
      color = d3.rgb(medColor);
      lightColor = color.brighter(1).toString();
      darkColor = color.darker(1).toString();
      gradients.createRadialGradient("mark-grad", lightColor, medColor, darkColor, atomsContainer);
    }

    /**
     * Creates set of gradient which cannot be changed, they are constant
     * for each possible model. So, it is enough to setup them just once.
     * @private
     */

    function createImmutableGradients() {
      // Scale used for Kinetic Energy Shading gradients.
      var medColorScale = d3.scale.linear()
        .interpolate(d3.interpolateRgb)
        .range(["#F2F2F2", "#FF8080"]),
        // Scale used for Kinetic Energy Shading gradients.
        darkColorScale = d3.scale.linear()
          .interpolate(d3.interpolateRgb)
          .range(["#A4A4A4", "#FF2020"]),
        gradientName,
        gradientUrl,
        KELevel,
        i;

      // Kinetic Energy Shading gradients
      for (i = 0; i < KE_SHADING_STEPS; i++) {
        gradientName = "ke-shading-" + i;
        KELevel = i / KE_SHADING_STEPS;
        gradientUrl = gradients.createRadialGradient(gradientName, "#FFFFFF", medColorScale(KELevel),
          darkColorScale(KELevel), atomsContainer);
        gradientNameForKELevel[i] = gradientUrl;
      }

      // Scales used for Charge Shading gradients.
      // Originally Positive:(ffefff,9abeff,767fbf) and Negative:(dfffff,fdadad,e95e5e)

      gradients.createRadialGradient("neutral-grad", "#FFFFFF", "#f2f2f2", "#A4A4A4", atomsContainer);

      var posLightColorScale = d3.scale.linear()
        .interpolate(d3.interpolateRgb)
        .range(["#FFFFFF", "#ffefff"]),
        posMedColorScale = d3.scale.linear()
          .interpolate(d3.interpolateRgb)
          .range(["#f2f2f2", "#9090FF"]),
        posDarkColorScale = d3.scale.linear()
          .interpolate(d3.interpolateRgb)
          .range(["#A4A4A4", "#3030FF"]),
        negLightColorScale = d3.scale.linear()
          .interpolate(d3.interpolateRgb)
          .range(["#FFFFFF", "#dfffff"]),
        negMedColorScale = d3.scale.linear()
          .interpolate(d3.interpolateRgb)
          .range(["#f2f2f2", "#FF8080"]),
        negDarkColorScale = d3.scale.linear()
          .interpolate(d3.interpolateRgb)
          .range(["#A4A4A4", "#FF2020"]),
        ChargeLevel;

      // Charge Shading gradients
      for (i = 1; i < CHARGE_SHADING_STEPS; i++) {
        gradientName = "pos-charge-shading-" + i;
        ChargeLevel = i / CHARGE_SHADING_STEPS;
        gradientUrl = gradients.createRadialGradient(gradientName,
          posLightColorScale(ChargeLevel),
          posMedColorScale(ChargeLevel),
          posDarkColorScale(ChargeLevel), atomsContainer);
        gradientNameForPositiveChargeLevel[i] = gradientUrl;

        gradientName = "neg-charge-shading-" + i;
        ChargeLevel = i / CHARGE_SHADING_STEPS;
        gradientUrl = gradients.createRadialGradient(gradientName,
          negLightColorScale(ChargeLevel),
          negMedColorScale(ChargeLevel),
          negDarkColorScale(ChargeLevel), atomsContainer);
        gradientNameForNegativeChargeLevel[i] = gradientUrl;
      }

      // Colored gradients, used for amino acids.
      gradients.createRadialGradient("green-grad", "#dfffef", "#75a643", "#2a7216", atomsContainer);
      gradients.createRadialGradient("orange-grad", "#F0E6D1", "#E0A21B", "#AD7F1C", atomsContainer);
    }

    function createCustomArrowHead(i, path, start) {
      if(!path || path === "none"){
        return "none";
      }
      // Create marker defs for _each_ path in order to account for differing path colors and visibility
      var defs,
        id = "Arrowhead-path" + i + '-' + path.toLowerCase().replace(/[^a-z0-9]/g,'') + (start ? "-start" : ""),
        arrowHead;
      defs = atomsContainer.select("defs");
      if (defs.empty()) {
        defs = atomsContainer.append("defs");
      }
      arrowHead = defs.select("#" + id);
      // Must rerender markers to account for changes in line properties (e.g. visibility, color)
      arrowHead.remove();
      arrowHead = defs.append("marker")
        .attr("id", id)
        .attr("viewBox", "0 0 10 10")
        .attr("refX", "5")
        .attr("refY", "5")
        .attr("markerUnits", "strokeWidth")
        .attr("markerWidth", "4")
        .attr("markerHeight", "4")
        .attr("orient", "auto");
      arrowHead.append("path")
        .attr("d", path)
        .attr("fill",lines.visible[i] ? lines.lineColor[i] : "transparent")
        .attr("transform", start ? "translate(10, 10) rotate(180)" : "");
      return "url(#" + id + ")";
    }

    function createVectorArrowHeads(color, name) {
      var defs,
        id = "Triangle-" + name,
        arrowHead;
      defs = atomsContainer.select("defs");
      if (defs.empty()) {
        defs = atomsContainer.append("defs");
      }
      arrowHead = defs.select("#" + id).remove();
      arrowHead = defs.append("marker")
        .attr("id", "Triangle-" + name)
        .attr("viewBox", "0 0 10 10")
        .attr("refX", "0")
        .attr("refY", "5")
        .attr("markerUnits", "strokeWidth")
        .attr("markerWidth", "4")
        .attr("markerHeight", "3")
        .attr("orient", "auto")
        .attr("stroke", color)
        .attr("fill", color);
      arrowHead.append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z");
    }

    function createExcitationGlow() {
      var defs,
        glow;

      defs = atomsContainer.select("defs");
      if (defs.empty()) {
        defs = atomsContainer.append("defs");
      }
      glow = defs.select("#glow");
      if (glow.empty()) {
        glow = defs.append("filter")
          .attr("id", "glow")
          .attr("x", "-2")
          .attr("y", "-2")
          .attr("width", "800%")
          .attr("height", "800%");
        glow.append("feMorphology")
          .attr("result", "bigger")
          .attr("in", "SourceGraphic")
          .attr("operator", "dilate")
          .attr("radius", "6");
        glow.append("feGaussianBlur")
          .attr("result", "blurOut")
          .attr("in", "bigger")
          .attr("stdDeviation", "10");
        glow.append("feBlend")
          .attr("in", "SourceGraphic")
          .attr("in2", "blurOut")
          .attr("mode", "normal");
      }
    }

    // Create key images which can be shown in the
    // upper left corner in different situations.
    // IMPORTANT: The height attribute must be set,
    // it will allow to properly calculate images
    // placement in drawSymbolImages() function.
    function createSymbolImages() {
      var xMargin = "1%",
        fSize = Math.max(fontSizeInPixels, 12);

      // only add these images if they don't already exist
      if (iconContainer.select("#heat-bath").empty()) {
        // Heat bath key image.
        iconContainer.append("image")
          .attr({
            "id": "heat-bath",
            "x": xMargin,
            "width": fSize * 2,
            "height": fSize * 2,
            "preserveAspectRatio": "xMinYMin",
            "xlink:href": "resources/upstatement/heatbath.svg",
            "class": "opaque-on-hover"
          })
          .append("title")
          .text("Heatbath active");
      }
      if (iconContainer.select("#ke-gradient").empty()) {
        // Kinetic Energy Shading gradient image.
        iconContainer.append("image")
          .attr({
            "id": "ke-gradient",
            "x": "0",
            "width": fSize * 2.2,
            "height": fSize * 6,
            "preserveAspectRatio": "xMinYMin",
            "xlink:href": "resources/upstatement/ke-gradient.svg",
            "class": "opaque-on-hover"
          })
          .append("title")
          .text("Kinetic energy gradient");
      }
    }

    // Draw key images in the upper left corner.
    // Place them in one row, dynamically calculate
    // y position.

    function drawSymbolImages() {
      var heatBath = model.get('temperatureControl'),
        imageSelect, imageHeight,
        // Variables used for calculating proper y positions.
        yPos = 0,
        yMargin = 1,
        fSize = Math.max(fontSizeInPixels, 12);

      // Heat bath symbol.
      if (heatBath) {
        yPos += yMargin;
        imageSelect = iconContainer.select("#heat-bath")
          .attr({
            "y": yPos,
            "width": fSize * 2,
            "height": fSize * 2
          })
          .style("display", "");

        imageHeight = parseInt(imageSelect.attr("height"), 10);
        yPos += imageHeight;
      } else {
        iconContainer.select("#heat-bath").style("display", "none");
      }

      // Kinetic Energy shading gradient.
      // Put it under heat bath symbol.
      if (keShadingMode) {
        yPos += yMargin;
        iconContainer.select("#ke-gradient")
          .attr({
            "y": yPos,
            "width": fSize * 2.2,
            "height": fSize * 6
          })
          .style("display", "");
      } else {
        iconContainer.select("#ke-gradient").style("display", "none");
      }
    }

    function vectorEnter(vector, pathFunc, widthFunc, color, name) {
      vector.enter().append("path")
        .attr({
          "class": "vector-" + name,
          "marker-end": hideLineMarkers ? "" : "url(#Triangle-" + name + ")",
          "d": pathFunc,
          "stroke-width": widthFunc,
          "stroke": color,
          "fill": "none"
        });
    }

    function atomTraceEnter() {
      atomTrace.enter().append("path")
        .attr({
          "class": "atomTrace",
          "d": getAtomTracePath,
          "stroke-width": model2px(0.01),
          "stroke": atomTraceColor,
          "fill": "none",
          "stroke-dasharray": "6, 6"
        });
    }

    function obstacleEnter() {
      var obstacleGroup = obstacle.enter().append("g");

      obstacleGroup
        .attr("class", "obstacle")
        .attr("transform",
          function(d, i) {
            return "translate(" + model2px(obstacles.x[i]) + " " + model2pxInv(obstacles.y[i] + obstacles.height[i]) + ")";
          }
      );
      obstacleGroup.append("rect")
        .attr({
          "class": "obstacle-shape",
          "x": 0,
          "y": 0,
          "width": function(d, i) {
            return model2px(obstacles.width[i]);
          },
          "height": function(d, i) {
            return model2px(obstacles.height[i]);
          },
          "fill": function(d, i) {
            return obstacles.visible[i] ? gradients.toSVG(gradients.parse(obstacles.color[i]), atomsContainer) : "transparent";
          },
          "stroke-width": function(d, i) {
            return obstacles.visible[i] ? 0.2 : 0.0;
          },
          "stroke": function(d, i) {
            return obstacles.visible[i] ? gradients.toSVG(gradients.parse(obstacles.color[i]), atomsContainer) : "transparent";
          }
        });

      // Append external force markers.
      obstacleGroup.each(function(d, i) {
        // Fast path, if no forces are defined.
        if (!obstacles.externalAx[i] && !obstacles.externalAy[i])
          return;

        // Note that arrows indicating obstacle external force use
        // the same options for styling like arrows indicating atom force.
        // Only their length is fixed.
        var obstacleGroupEl = d3.select(this),
          obsHeight = obstacles.height[i],
          obsWidth = obstacles.width[i],
          obsAx = obstacles.externalAx[i],
          obsAy = obstacles.externalAy[i],
          // Use fixed length of force vectors (in nm).
          vecLen = 0.06,
          space = 0.06,
          step, coords;

        // Set arrows indicating horizontal force.
        if (obsAx) {
          // Make sure that arrows keep constant distance between both ends of an obstacle.
          step = (obsHeight - 2 * space) / Math.round((obsHeight - 2 * space) / 0.2);
          coords = d3.range(space, obsHeight, step);
          obstacleGroupEl.selectAll("path.obstacle-force-hor").data(coords).enter().append("path")
            .attr({
              "class": "obstacle-force-hor",
              "d": function(d) {
                if (obsAx < 0)
                  return "M " + model2px(obsWidth + vecLen + space) +
                    "," + model2px(d) +
                    " L " + model2px(obsWidth + space) +
                    "," + model2px(d);
                else
                  return "M " + model2px(-vecLen - space) +
                    "," + model2px(d) +
                    " L " + model2px(-space) +
                    "," + model2px(d);
              }
            });
        }
        // Later set arrows indicating vertical force.
        if (obsAy) {
          // Make sure that arrows keep constant distance between both ends of an obstacle.
          step = (obsWidth - 2 * space) / Math.round((obsWidth - 2 * space) / 0.2);
          coords = d3.range(space, obsWidth, step);
          obstacleGroupEl.selectAll("path.obstacle-force-vert").data(coords).enter().append("path")
            .attr({
              "class": "obstacle-force-vert",
              "d": function(d) {
                if (obsAy < 0)
                  return "M " + model2px(d) +
                    "," + model2px(-vecLen - space) +
                    " L " + model2px(d) +
                    "," + model2px(-space);
                else
                  return "M " + model2px(d) +
                    "," + model2px(obsHeight + vecLen + space) +
                    " L " + model2px(d) +
                    "," + model2px(obsHeight + space);
              }
            });
        }
        // Finally, set common attributes and stying for both vertical and horizontal forces.
        obstacleGroupEl.selectAll("path.obstacle-force-hor, path.obstacle-force-vert")
          .attr({
            "marker-end": hideLineMarkers ? "" : "url(#Triangle-" + FORCE_STR + ")",
            "stroke-width": model2px(forceVectorWidth),
            "stroke": forceVectorColor,
            "fill": "none"
          });
      });
    }


    function shapeEnter() {
      var layers = [shapeTop, shapeBelow],
        i;
      for (i = 0; i < layers.length; i++) {
        var shapeGroup = layers[i].enter().append("g");
        shapeGroup.attr("class", "shape").attr("transform", function(d) {
          return "translate(" + model2px(shapes.x[d.index]) + " " + model2pxInv(shapes.y[d.index] + shapes.height[d.index]) + ")";
        });
        shapeGroup.append("rect").attr({
          "class": "shape-rectangle",
          "x": 0,
          "y": 0,
          "width": function(d) {
            return model2px(shapes.width[d.index]);
          },
          "height": function(d) {
            return model2px(shapes.height[d.index]);
          },
          "fill": function(d) {
            return shapes.visible[d.index] && shapes.type[d.index] === 'rectangle' ? gradients.toSVG(gradients.parse(shapes.color[d.index]), atomsContainer) : "transparent";
          },
          "stroke-width": function(d) {
            return shapes.lineWeight[d.index];
          },
          "stroke-dasharray": function(d) {
            return shapes.lineDashes[d.index];
          },
          "stroke": function(d) {
            return shapes.visible[d.index] && shapes.type[d.index] === 'rectangle' ? shapes.lineColor[d.index] : "transparent";
          }
        });
        shapeGroup.append("ellipse").attr({
          "class": "shape-ellipse",
          "cx": function(d) {
            return model2px(shapes.width[d.index]) / 2;
          },
          "cy": function(d) {
            return model2px(shapes.height[d.index]) / 2;
          },
          "rx": function(d) {
            return model2px(shapes.width[d.index]) / 2;
          },
          "ry": function(d) {
            return model2px(shapes.height[d.index]) / 2;
          },
          "fill": function(d) {
            return shapes.visible[d.index] && shapes.type[d.index] === 'ellipse' ? gradients.toSVG(gradients.parse(shapes.color[d.index]), atomsContainer) : "transparent";
          },
          "stroke-width": function(d) {
            return shapes.lineWeight[d.index];
          },
          "stroke-dasharray": function(d) {
            return shapes.lineDashes[d.index];
          },
          "stroke": function(d) {
            return shapes.visible[d.index] && shapes.type[d.index] === 'ellipse' ? shapes.lineColor[d.index] : "transparent";
          }
        });
      }
    }

    function lineEnter() {
      lineTop.enter().append("line").attr({
        "class": "line",
        "x1": function(d, i) {
          return model2px(lines.x1[i]);
        },
        "y1": function(d, i) {
          return model2pxInv(lines.y1[i]);
        },
        "x2": function(d, i) {
          return model2px(lines.x2[i]);
        },
        "y2": function(d, i) {
          return model2pxInv(lines.y2[i]);
        },
        "stroke-width": function(d, i) {
          return lines.lineWeight[i];
        },
        "stroke-dasharray": function(d, i) {
          return lines.lineDashes[i];
        },
        "stroke": function(d, i) {
          return lines.visible[i] ? lines.lineColor[i] : "transparent";
        },
        "marker-start": function(d,i){
          return createCustomArrowHead(i, lines.beginStyle[i], true);
        },
        "marker-end": function(d,i){
          return createCustomArrowHead(i, lines.endStyle[i]);
        }
      });
    }

    function vdwLinesEnter() {
      var strokeWidth = model2px(0.02),
        strokeDasharray = model2px(0.03) + " " + model2px(0.02);
      // update existing lines
      vdwLines.attr({
        "x1": function(d) {
          return model2px(modelAtoms[d[0]].x);
        },
        "y1": function(d) {
          return model2pxInv(modelAtoms[d[0]].y);
        },
        "x2": function(d) {
          return model2px(modelAtoms[d[1]].x);
        },
        "y2": function(d) {
          return model2pxInv(modelAtoms[d[1]].y);
        }
      });

      // append new lines
      vdwLines.enter().append('line')
        .attr({
          "class": "attractionforce",
          "x1": function(d) {
            return model2px(modelAtoms[d[0]].x);
          },
          "y1": function(d) {
            return model2pxInv(modelAtoms[d[0]].y);
          },
          "x2": function(d) {
            return model2px(modelAtoms[d[1]].x);
          },
          "y2": function(d) {
            return model2pxInv(modelAtoms[d[1]].y);
          }
        })
        .style({
          "stroke-width": strokeWidth,
          "stroke-dasharray": strokeDasharray
        });

      // remove old lines
      vdwLines.exit().remove();
    }

    function getImagePath(imgProp) {
      return imagePath + (imageMapping[imgProp.imageUri] || imgProp.imageUri);
    }

    function drawImageAttachment() {
      var img = [],
        imglayer,
        container,
        i,
        positionOrder,
        positionOrderTop = [],
        positionOrderBelow = [];

      imageContainerTop.selectAll("image").remove();
      imageContainerBelow.selectAll("image").remove();

      if (!imageProp) return;

      for (i = 0; i < imageProp.length; i++) {
        img[i] = new Image();
        img[i].src = getImagePath(imageProp[i]);
        img[i].onload = (function(i) {
          return function() {
            imglayer = imageProp[i].imageLayer;
            positionOrder = imglayer === 1 ? positionOrderTop : positionOrderBelow;
            positionOrder.push({
              i: i,
              zOrder: ( !! imageProp[i].imageLayerPosition) ? imageProp[i].imageLayerPosition : 0
            });
            positionOrder.sort(function(a, b) {
              return d3.ascending(a["zOrder"], b["zOrder"]);
            });
            // In Classic MW model size is defined in 0.1A.
            // Model unit (0.1A) - pixel ratio is always 1. The same applies
            // to images. We can assume that their pixel dimensions are
            // in 0.1A also. So convert them to nm (* 0.01).
            imageSizes[i] = [0.01 * img[i].width, 0.01 * img[i].height];
            container = imglayer === 1 ? imageContainerTop : imageContainerBelow;
            container.selectAll("image").remove();
            container.selectAll("image")
              .data(positionOrder, function(d) {
                return d.i;
              })
              .enter().append("image")
              .attr("x", function(d) {
                return getImageCoords(d.i)[0];
              })
              .attr("y", function(d) {
                return getImageCoords(d.i)[1];
              })
              .attr("class", function(d) {
                return "image_attach" + d.i;
              })
              .attr("xlink:href", function(d) {
                return img[d.i].src;
              })
              .attr("width", function(d) {
                return model2px(imageSizes[d.i][0]);
              })
              .attr("height", function(d) {
                return model2px(imageSizes[d.i][1]);
              })
              .attr("pointer-events", function(d) {
                // Make images transparent for mouse events when they are attached to atoms or
                // obstacles. In such case interactivity of image will be defined by the
                // interactivity of the host object.
                if (imageProp[d.i].imageHostType) return "none";
                return "auto";
              });
          };
        })(i);
      }
    }

    function getTextBoxCoords(d) {
      var x, y, hostX, hostY, textX, textY, frameX, frameY, calloutX, calloutY,
        pixelScale = model2px(d.fontSize);

      x = d.x;
      y = d.y;

      if (d.hostType) {
        if (d.hostType === "Atom") {
          hostX = modelAtoms[d.hostIndex].x;
          hostY = modelAtoms[d.hostIndex].y;
        } else {
          hostX = obstacles.x[d.hostIndex] + (obstacles.width[d.hostIndex] / 2);
          hostY = obstacles.y[d.hostIndex] + (obstacles.height[d.hostIndex] / 2);
        }
      }

      if (d.hostType && !d.calloutPoint) {
        x = hostX;
        y = hostY;
      }

      if (d.calloutPoint) {
        if (!d.hostType) {
          calloutX = d.calloutPoint[0];
          calloutY = d.calloutPoint[1];
        } else {
          calloutX = hostX;
          calloutY = hostY;
        }
      }

      frameX = model2px(x);
      frameY = model2pxInv(y);

      textX = frameX + pixelScale * 0.75;
      textY = frameY + pixelScale * 1.2;

      calloutX = model2px(calloutX);
      calloutY = model2pxInv(calloutY);

      return [textX, textY, frameX, frameY, calloutX, calloutY];
    }

    function getCalloutPath(location, frame, fullWidth, fullHeight, fontSize) {
      var calloutLocation = [
        parseFloat(location[0]),
        parseFloat(location[1])
      ],
        center = [
          parseFloat(frame.getAttribute("x")) + (fullWidth / 2),
          parseFloat(frame.getAttribute("y")) + (fullHeight / 2)
        ],
        angle = halfPi - Math.atan((calloutLocation[0] - center[0]) / (calloutLocation[1] - center[1])),
        baseSize = Math.min(fontSize, fullHeight / 2),

        dcx = Math.sin(angle) * baseSize,
        dcy = Math.cos(angle) * baseSize;

      return (center[0] + dcx) + ", " + (center[1] - dcy) + " " + (center[0] - dcx) + ", " + (center[1] + dcy) + " " + calloutLocation;
    }

    function updateTextBoxes() {
      var layers = [textContainerTop, textContainerBelow],
        updateText;

      updateText = function(layerNum) {
        var layer = layers[layerNum - 1],
          layerTextBoxes = textBoxes.filter(function(t) {
            return t.layer === layerNum;
          });

        layer.selectAll("g.textBoxWrapper rect")
          .data(layerTextBoxes.filter(function(d) {
            return d.frame;
          }))
          .attr({
            "x": function(d) {
              return getTextBoxCoords(d)[2];
            },
            "y": function(d) {
              return getTextBoxCoords(d)[3];
            },
            "transform": function(d) {
              var rotate = d.rotate,
                pos = getTextBoxCoords(d);
              return "rotate(" + rotate + " " + pos[0] + " " + pos[1] + ")";
            }
          });

        layer.selectAll("g.textBoxWrapper text")
          .data(layerTextBoxes)
          .attr({
            "y": function(d) {
              $(this).find("tspan").attr("x", getTextBoxCoords(d)[0]);
              return getTextBoxCoords(d)[1];
            }
          });

        layer.selectAll("g.textBoxWrapper polygon")
          .data(layerTextBoxes.filter(function(d) {
            return d.calloutPoint;
          }))
          .attr({
            "callout-location-data": function(d) {
              var pos = getTextBoxCoords(d);
              return pos[4] + ", " + pos[5];
            }
          });
      };

      updateText(1);
      updateText(2);

      // update callouts
      $(".textBox").each(function() {
        var $parentNode = $(this.parentNode),
          callout = $parentNode.find("polygon"),
          frame = $parentNode.find("rect")[0],
          fontSize, width, height, calloutLocation;

        if (!frame || callout.length === 0) return;

        fontSize = parseFloat(this.getAttributeNS(null, "font-size"));
        width = frame.getAttribute("width");
        height = frame.getAttribute("height");
        calloutLocation = callout.attr("callout-location-data").split(", ");

        callout.attr("points", getCalloutPath(calloutLocation, frame, width, height, fontSize));
      });
    }

    function drawTextBoxes() {
      var size, layers, appendTextBoxes;
      // Workaround for a rendering bug in Chrome on OS X; see http://crbug.com/309740
      var shouldRoundTextBoxStrokeWidth = browser.browser === 'Chrome' && browser.oscpu.indexOf('OS X') > 0;

      textBoxes = model.get('textBoxes');

      size = [model.get('width'), model.get('height')];

      layers = [textContainerTop, textContainerBelow];

      // Append to either top or bottom layer depending on item's layer #.
      appendTextBoxes = function(layerNum) {
        var layer = layers[layerNum - 1],
          text, layerTextBoxes, selection;

        layer.selectAll("g.textBoxWrapper").remove();

        layerTextBoxes = textBoxes.filter(function(t) {
          return t.layer === layerNum;
        });

        selection = layer.selectAll("g.textBoxWrapper")
          .data(layerTextBoxes);
        text = selection.enter().append("svg:g")
          .attr("class", "textBoxWrapper");

        text.filter(function(d) {
          return d.calloutPoint;
        })
          .append("polygon")
          .attr({
            "points": "0,0 0,0 0,0",
            "style": function(d) {
              var backgroundColor = d.backgroundColor,
                strokeWidth = d.strokeWidthEms * fontSizeInPixels,
                strokeOpacity = d.strokeOpacity;
              return "fill:" + backgroundColor + ";opacity:1.0;fill-opacity:1;stroke:#000000;stroke-width:" + (strokeWidth * 2) + ";stroke-opacity:" + strokeOpacity;
            },
            "callout-location-data": function(d) {
              var pos = getTextBoxCoords(d);
              return pos[4] + ", " + pos[5];
            }
          });

        text.filter(function(d) {
          return d.frame;
        })
          .append("rect")
          .attr({
            "class": function(d, i) {
              return "textBoxFrame text-" + i;
            },
            "id": function(d, i) {
              return "text-" + i;
            },
            "transform": function(d) {
              var rotate = d.rotate,
                pos = getTextBoxCoords(d);
              return "rotate(" + rotate + " " + pos[0] + " " + pos[1] + ")";
            },
            "style": function(d) {
              var backgroundColor = d.backgroundColor,
                strokeWidth = d.strokeWidthEms * fontSizeInPixels,
                strokeOpacity = d.strokeOpacity;

              if (shouldRoundTextBoxStrokeWidth && strokeWidth < 1) {
                // Workaround for ghosting artifact left when stroke-width < 1 in Chrome on OS X.
                // Try to adjust opacity to compensate for increased width:
                strokeOpacity *= strokeWidth;
                strokeWidth = 1;
              }

              return "fill:" + backgroundColor + ";opacity:1.0;fill-opacity:1;stroke:#000000;stroke-width:" + strokeWidth + ";stroke-opacity:" + strokeOpacity;
            },
            "width": 0,
            "height": 0,
            "rx": function(d) {
              return d.frame === "rounded rectangle" ? model2px(d.fontSize) / 2.5 : 0;
            },
            "ry": function(d) {
              return d.frame === "rounded rectangle" ? model2px(d.fontSize) / 2 : 0;
            },
            "x": function(d) {
              return getTextBoxCoords(d)[2];
            },
            "y": function(d) {
              return getTextBoxCoords(d)[3];
            }
          });

        text.filter(function(d) {
          return d.calloutPoint;
        })
          .append("polygon")
          .attr({
            "points": "0,0 0,0 0,0",
            "style": function(d) {
              var backgroundColor = d.backgroundColor;
              return "fill:" + backgroundColor + ";opacity:1.0;fill-opacity:1;stroke:#000000;stroke-width:0;";
            }
          });

        text.append("text")
          .attr({
            "class": function() {
              return "textBox" + (AUTHORING ? " draggable" : "");
            },
            "transform": function(d) {
              var rotate = d.rotate,
                pos = getTextBoxCoords(d);
              return "rotate(" + rotate + " " + pos[0] + " " + pos[1] + ")";
            },
            "x-data": function(d) {
              return getTextBoxCoords(d)[0];
            },
            "y": function(d) {
              return getTextBoxCoords(d)[1];
            },
            "width-data": function(d) {
              return d.width;
            },
            "height-data": function(d) {
              return d.height;
            },
            "width": model2px(size[0]),
            "height": model2px(size[1]),
            "xml:space": "preserve",
            "font-family": "'" + labConfig.fontface + "', sans-serif",
            "font-size": function(d) {
              return model2px(d.fontSize) + "px";
            },
            "fill": function(d) {
              return d.color || "black";
            },
            "text-data": function(d) {
              return d.text;
            },
            "text-anchor": function(d) {
              var align = d.textAlign || "left";
              if (align === "center") align = "middle";
              return align;
            },
            "has-host": function(d) {
              return !!d.hostType;
            }
          })
          .call(d3.behavior.drag()
            .on("drag", textDrag)
            .on("dragend", function(d) {
              // simple output to console for now, eventually should just get
              // serialized back to interactive (or model?) JSON on author save
              console.log('"x": ' + d.x + ",");
              console.log('"y": ' + d.y + ",");
            })
        );
        selection.exit().remove();
      };

      appendTextBoxes(1);
      appendTextBoxes(2);

      // wrap text, set callouts
      $(".textBox").each(function() {
        var text = this.getAttributeNS(null, "text-data"),
          x = this.getAttributeNS(null, "x-data"),
          width = this.getAttributeNS(null, "width-data"),
          height = this.getAttributeNS(null, "height-data"),
          fontSize = parseFloat(this.getAttributeNS(null, "font-size")),
          transform = this.getAttributeNS(null, "transform"),
          hasHost = this.getAttributeNS(null, "has-host"),
          textAlign = this.getAttributeNS(null, "text-anchor"),
          $parentNode = $(this.parentNode),
          horizontalPadding, verticalPadding,
          result, fullWidth, fullHeight, frame, dy, tx, ty,
          callout, calloutLocation;

        dy = fontSize * 1.2;
        horizontalPadding = +fontSize * 1.5;
        verticalPadding = fontSize / 1.8;

        if (width === '') {
          width = -1;
        } else {
          width = model2px(width);
        }

        if (height === '') {
          height = -1;
        } else {
          height = model2px(height);
        }

        while (this.firstChild) { // clear element first
          this.removeChild(this.firstChild);
        }

        result = wrapSVGText(text, this, width, x, dy);

        if ($parentNode.find("rect").length > 0) {
          frame = $parentNode.find("rect")[0];
          fullWidth = result.width + horizontalPadding;
          frame.setAttributeNS(null, "width", fullWidth);
          if (height > 0) {
            fullHeight = height;
          } else {
            fullHeight = (result.lines * dy) + verticalPadding;
          }
          frame.setAttributeNS(null, "height", fullHeight);
        }

        // if we have a callout
        callout = $parentNode.find("polygon");
        if (frame && callout.length > 0) {
          calloutLocation = callout.attr("callout-location-data").split(", ");
          callout.attr("points", getCalloutPath(calloutLocation, frame, fullWidth, fullHeight, fontSize));
        }

        // center all hosted labels simply by tweaking the g.transform
        if (textAlign === "middle") {
          tx = result.width / 2;
          if (height > 0) {
            ty = height / 2 - verticalPadding * 1.5 - (result.lines - 1) * dy / 2;
          } else {
            ty = 0;
          }
          transform = transform + " translate(" + tx + "," + ty + ")";
          $(this).attr("transform", transform);
        }
        if (hasHost === "true" && callout.length === 0) {
          tx = result.width / -2 - horizontalPadding / 2;
          ty = result.lines * dy / -2 - verticalPadding / 2;
          $parentNode.attr("transform", "translate(" + tx + "," + ty + ")");
        }
      });
    }

    function setupObstacles() {
      obstacles = model.get_obstacles();
      atomsContainer.selectAll("g.obstacle").remove();
      if (obstacles) {
        mockObstaclesArray.length = obstacles.x.length;
        obstacle = atomsContainer.selectAll("g.obstacle").data(mockObstaclesArray);
        obstacleEnter();
      }
    }

    function setupShapes() {
      shapes = model.get_shapes();
      shapeContainerTop.selectAll(".shape").remove();
      shapeContainerBelow.selectAll(".shape").remove();
      if (shapes) {
        mockShapesTop = [];
        mockShapesBelow = [];
        for (var i = 0; i < shapes.x.length; i++) {
          if (shapes.layer[i] === 1) {
            mockShapesTop.push({
              index: i,
              layerPosition: shapes.layerPosition[i]
            });
          } else {
            mockShapesBelow.push({
              index: i,
              layerPosition: shapes.layerPosition[i]
            });
          }
        }
        mockShapesTop.sort(function(a, b) {
          return a.layerPosition - b.layerPosition;
        });
        mockShapesBelow.sort(function(a, b) {
          return a.layerPosition - b.layerPosition;
        });
        shapeTop = shapeContainerTop.selectAll(".shape").data(mockShapesTop);
        shapeBelow = shapeContainerBelow.selectAll(".shape").data(mockShapesBelow);
        shapeEnter();
      }
    }

    function setupLines() {
      lines = model.get_lines();
      lineContainerTop.selectAll(".line").remove();
      if (lines) {
        mockLinesTop.length = lines.x1.length;
        lineTop = lineContainerTop.selectAll(".line").data(mockLinesTop);
        lineEnter();
      }
    }

    function setupVdwPairs() {
      VDWLinesContainer.selectAll("line.attractionforce").remove();
      updateVdwPairsArray();
      drawVdwLines = model.get("showVDWLines");
      if (drawVdwLines) {
        vdwLines = VDWLinesContainer.selectAll("line.attractionforce").data(vdwPairs);
        vdwLinesEnter();
      }
    }

    // The vdw hash returned by md2d consists of typed arrays of length N*N-1/2
    // To make these d3-friendly we turn them into an array of atom pairs, only
    // as long as we need.

    function updateVdwPairsArray() {
      var vdwHash = model.get_vdw_pairs();
      for (var i = 0; i < vdwHash.count; i++) {
        vdwPairs[i] = [vdwHash.atom1[i], vdwHash.atom2[i]];
      }
      // if vdwPairs was longer at the previous tick, trim the end
      vdwPairs.splice(vdwHash.count);
    }

    function setupVectors() {
      atomsContainer.selectAll("path.vector-" + VELOCITY_STR).remove();
      atomsContainer.selectAll("path.vector-" + FORCE_STR).remove();

      drawVelocityVectors = model.get("showVelocityVectors");
      drawForceVectors = model.get("showForceVectors");
      if (drawVelocityVectors) {
        velVector = atomsContainer.selectAll("path.vector-" + VELOCITY_STR).data(modelAtoms);
        vectorEnter(velVector, getVelVectorPath, getVelVectorWidth, velocityVectorColor, VELOCITY_STR);
      }
      if (drawForceVectors) {
        forceVector = atomsContainer.selectAll("path.vector-" + FORCE_STR).data(modelAtoms);
        vectorEnter(forceVector, getForceVectorPath, getForceVectorWidth, forceVectorColor, FORCE_STR);
      }
    }

    function setupElectricField() {
      var density = model.get("electricFieldDensity"),
        show = model.get("showElectricField"),
        col, size;
      drawElectricForceField = show && density > 0;
      // Do full enter-update-remove cycle to reuse DOM elements.
      efVector = fieldVisualization.selectAll(".vector-electric-field")
        .data(show ? model.getElectricField() : []);
      efVector.exit().remove();
      if (drawElectricForceField) {
        // Enter.
        efVector.enter()
          .append("g")
          .attr("class", "vector-electric-field")
          .append("g")
          .attr("class", "rot-g")
          .append("svg")
          .attr("viewBox", "-5 -12 10 12")
          .append("path")
          .attr("d", "M0,0 L0,-8 L1,-8 L0,-10 L-1,-8, L0,-8");
        // Update.
        col = model.get("electricFieldColor");
        if (col === "auto")
          col = color.contrastingColor(model.get("backgroundColor"));

        efVector
          .attr("transform", function(d) {
            return "translate(" + model2px(d.x) + ", " + model2pxInv(d.y) + ")";
          })
          .style("fill", col)
          .style("stroke", col);
        // Size update.
        size = Math.sqrt(30 / density);
        efVector.select("svg")
          .attr("x", (-0.5 * size) + "em")
          .attr("y", (-size) + "em")
          .attr("width", size + "em")
          .attr("height", size + "em");
        // Cache selection + update rotation.
        efVector = efVector.select(".rot-g");
        updateElectricForceField();
      }
    }

    function updateElectricForceField() {
      var rad2deg = 180 / Math.PI;
      efVector
        .attr("transform", function(d) {
          return "rotate(" + (Math.atan2(d.fx, d.fy) * rad2deg) + ")";
        })
        .style("opacity", function(d) {
          return Math.min(1, Math.pow(d.fx * d.fx + d.fy * d.fy, 0.2) * 0.3);
        });
    }

    function setupAtomTrace() {
      atomsContainer.selectAll("path.atomTrace").remove();
      atomTracePath = "";

      drawAtomTrace = model.get("showAtomTrace");
      atomTraceId = model.get("atomTraceId");
      if (drawAtomTrace) {
        atomTrace = atomsContainer.selectAll("path.atomTrace").data([modelAtoms[atomTraceId]]);
        atomTraceEnter();
      }
    }

    function updateVdwPairs() {
      // Get new set of pairs from model.
      updateVdwPairsArray();

      vdwLines = VDWLinesContainer.selectAll("line.attractionforce").data(vdwPairs);
      vdwLinesEnter();
    }

    function moleculeMouseOver(d, i) {
      if (model.get("enableAtomTooltips") && (atomTooltipOn === false)) {
        renderAtomTooltip(i);
      }
    }

    function moleculeMouseDown(d, i) {
      modelView.node.focus();
      if (model.get("enableAtomTooltips")) {
        if (atomTooltipOn !== false) {
          atomToolTip.style("opacity", 1e-6);
          atomToolTip.style("display", "none");
          atomTooltipOn = false;
        } else {
          if (d3.event.shiftKey) {
            atomTooltipOn = i;
          } else {
            atomTooltipOn = false;
          }
          renderAtomTooltip(i);
        }
      }
    }

    function renderAtomTooltip(i) {
      var pos = modelView.pos(),
        left = pos.left + model2px(modelAtoms[i].x),
        top = pos.top + model2pxInv(modelAtoms[i].y);

      atomToolTip
        .style("opacity", 1.0)
        .style("display", "inline")
        .style("background", "rgba(100%, 100%, 100%, 0.7)")
        .style("left", left + "px")
        .style("top", top + "px")
        .style("zIndex", 100)
        .transition().duration(250);

      atomToolTipPre.text(
        "atom: " + i + "\n" +
        "time: " + modelTimeLabel() + "\n" +
        "speed: " + d3.format("+6.3e")(modelAtoms[i].speed) + "\n" +
        "vx:    " + d3.format("+6.3e")(modelAtoms[i].vx) + "\n" +
        "vy:    " + d3.format("+6.3e")(modelAtoms[i].vy) + "\n" +
        "ax:    " + d3.format("+6.3e")(modelAtoms[i].ax) + "\n" +
        "ay:    " + d3.format("+6.3e")(modelAtoms[i].ay) + "\n"
      );
    }

    function moleculeMouseOut() {
      if (!atomTooltipOn && atomTooltipOn !== 0) {
        atomToolTip.style("opacity", 1e-6).style("zIndex" - 1);
      }
    }

    function getVelVectorPath(d) {
      var x_pos = model2px(d.x),
        y_pos = model2pxInv(d.y),
        path = "M " + x_pos + "," + y_pos,
        scale = velocityVectorLength * 100;
      return path + " L " + (x_pos + model2px(d.vx * scale)) + "," + (y_pos - model2px(d.vy * scale));
    }

    function getForceVectorPath(d) {
      var xPos = model2px(d.x),
        yPos = model2pxInv(d.y),
        mass = d.mass,
        scale = forceVectorLength * 100 * mass;
      if (forceVectorsDirectionOnly) {
        mass *= mass;
        scale /= Math.sqrt(d.ax * d.ax * mass + d.ay * d.ay * mass) * 1e3 || 1;
      }
      return "M" + xPos + "," + yPos +
        "L" + (xPos + model2px(d.ax * scale)) + "," + (yPos - model2px(d.ay * scale));
    }

    function getVelVectorWidth(d) {
      return Math.abs(d.vx) + Math.abs(d.vy) > 1e-6 ? model2px(velocityVectorWidth) : 0;
    }

    function getForceVectorWidth(d) {
      return Math.abs(d.ax) + Math.abs(d.ay) > 1e-8 ? model2px(forceVectorWidth) : 0;
    }

    function updateVectors(vector, pathFunc, widthFunc) {
      vector.attr({
        "d": pathFunc,
        "stroke-width": widthFunc
      });
    }

    function getAtomTracePath(d) {
      // until we implement buffered array model output properties,
      // we just keep the path history in the path string
      var dx = Math.floor(model2px(d.x) * 100) / 100,
        dy = Math.floor(model2pxInv(d.y) * 100) / 100,
        lIndex, sIndex;
      if (!atomTracePath) {
        atomTracePath = "M" + dx + "," + dy + "L";
        return "M " + dx + "," + dy;
      } else {
        atomTracePath += dx + "," + dy + " ";
      }

      // fake buffered array functionality by knocking out the first
      // element of the string when we get too big
      if (atomTracePath.length > 4000) {
        lIndex = atomTracePath.indexOf("L");
        sIndex = atomTracePath.indexOf(" ");
        atomTracePath = "M" + atomTracePath.slice(lIndex + 1, sIndex) + "L" + atomTracePath.slice(sIndex + 1);
      }
      return atomTracePath;
    }

    function updateAtomTrace() {
      atomTrace.attr({
        "d": getAtomTracePath
      });
    }

    function getImageCoords(i) {
      var props = imageProp[i],
        x, y, img_width, img_height;
      if (props.imageHostType) {
        if (props.imageHostType === "Atom") {
          x = modelAtoms[props.imageHostIndex].x;
          y = modelAtoms[props.imageHostIndex].y;
        } else if (props.imageHostType === "RectangularObstacle") {
          x = obstacles.x[props.imageHostIndex] + (obstacles.width[props.imageHostIndex] / 2);
          y = obstacles.y[props.imageHostIndex] + (obstacles.height[props.imageHostIndex] / 2);
        }
        img_width = imageSizes[i][0];
        img_height = imageSizes[i][1];
        x = x - img_width / 2;
        y = y + img_height / 2;
      } else {
        x = props.imageX;
        y = props.imageY;
      }
      return [model2px(x), model2pxInv(y)];
    }

    function updateImageAttachment() {
      var numImages, imglayer, container, coords, i;
      numImages = imageProp.length;
      for (i = 0; i < numImages; i++) {
        if (!imageSizes || !imageSizes[i]) continue;
        coords = getImageCoords(i);
        imglayer = imageProp[i].imageLayer;
        container = imglayer === 1 ? imageContainerTop : imageContainerBelow;
        container.selectAll("image.image_attach" + i)
          .attr("x", coords[0])
          .attr("y", coords[1]);
      }
    }

    function textDrag(d) {
      var dragDx = model2px.invert(d3.event.dx),
        dragDy = model2px.invert(d3.event.dy);

      if (!(AUTHORING && model.isStopped())) {
        // for now we don't have user-draggable textBoxes
        return;
      } else {
        d.x = d.x + dragDx;
        d.y = d.y - dragDy;
        updateTextBoxes();
      }
    }

    function setupToolTips() {
      var mc = d3.select("#model-container");
      if (atomToolTip === undefined && !mc.empty()) {
        atomToolTip = mc.append("div")
          .attr("class", "tooltip")
          .style("opacity", 1e-6);
        atomToolTipPre = atomToolTip.append("pre");
      }
    }

    function setupFirefoxWarning() {
      var $firefoxWarningPane,
        pos,
        top,
        left,
        b = benchmark.what_browser(); // we need to recalc this for FF, for some reason

      if (b.browser === "Firefox" && b.version >= "18" && b.version < "23") {
        $firefoxWarningPane = $("#firefox-warning-pane");
        pos = modelView.pos();
        top = pos.bottom - $firefoxWarningPane.height();
        left = pos.right - $firefoxWarningPane.width();
        $firefoxWarningPane.css({
          display: "inline",
          top: top - 5,
          left: left - 15,
          'z-index': 100
        });
      }
    }

    function setupMiscOptions() {
      // Note that vector options are specified in a very untypical way. They are nested objects.
      velocityVectorColor = model.get("velocityVectors").color;
      velocityVectorWidth = model.get("velocityVectors").width;
      velocityVectorLength = model.get("velocityVectors").length;

      forceVectorColor = model.get("forceVectors").color;
      forceVectorWidth = model.get("forceVectors").width;
      forceVectorLength = model.get("forceVectors").length;

      forceVectorsDirectionOnly = model.get("forceVectorsDirectionOnly");

      createVectorArrowHeads(velocityVectorColor, VELOCITY_STR);
      createVectorArrowHeads(forceVectorColor, FORCE_STR);

      atomTraceColor = model.get("atomTraceColor");
    }

    function setupRendererOptions() {
      imageProp = model.get("images");
      imageMapping = model.get("imageMapping");
      modelImagePath = model.get('imagePath');
      if (modelImagePath) {
        imagePath = labConfig.actualRoot + modelImagePath;
      } else if (modelView.url) {
        imagePath = labConfig.actualRoot + modelView.url.slice(0, modelView.url.lastIndexOf("/") + 1);
      }

      useQuantumDynamics = model.properties.useQuantumDynamics;
      if (useQuantumDynamics) {
        createExcitationGlow();
      }

      createSymbolImages();
      createImmutableGradients();

      // Initialize renderers.
      geneticRenderer = new GeneticRenderer(modelView, model);
    }

    function photonPath(d) {
      var lineData = [],
        nPoints = 40,
        line = d3.svg.line()
          .x(function(d) {
            return model2px(0.5 / nPoints * d.x);
          })
          .y(function(d) {
            return model2px(0.1 * d.y);
          }),

        t = d.angularFrequency * 2 * Math.PI / nPoints,
        i;

      // Reference implementation: https://github.com/concord-consortium/mw/blob/6e2f2d4630323b8e993fcfb531a3e7cb06644fef/src/org/concord/mw2d/models/Photon.java#L74-L79
      for (i = 0; i < nPoints; i++) {
        lineData.push({
          x: i - nPoints / 2,
          y: Math.sin(i * t) / (1 + 0.01 * (i - 0.5 * nPoints) * (i - 0.5 * nPoints))
        });
      }

      return line(lineData);
    }

    function enterAndUpdatePhotons() {
      var photons = atomsContainer
        .selectAll(".photon")
        .data(model.getPhotons(), function(d) {
          return d.id;
        });

      photons.enter().append("path")
        .attr({
          "class": "photon",
          "d": photonPath,
          "stroke-width": 0.5,
          "stroke": "rgba(0,0,0,0.8)",
          "fill-opacity": 0
        });

      photons.exit().remove();

      photons.attr("transform", function(d) {
        return "translate(" + model2px(d.x) + ", " + model2pxInv(d.y) + ") " +
          "rotate(" + d.angle + ")";
      });

    }

    //
    // *** Main Renderer functions ***
    //

    //
    // MD2D Renderer: setup
    //

    function setup() {
      timeSuffix = " (" + model.getPropertyDescription('displayTime').getUnitAbbreviation() + ")";

      model2px = modelView.model2px;
      model2pxInv = modelView.model2pxInv;

      fontSizeInPixels = modelView.getFontSizeInPixels();

      modelAtoms = model.getAtoms();
      modelElements = model.get_elements();
      modelWidth = model.get('width');
      modelHeight = model.get('height');
      aspectRatio = modelWidth / modelHeight;

      setupRendererOptions();

      // Subscribe for model events.
      model.addPropertiesListener(["temperatureControl"], drawSymbolImages);

      function redrawClickableObjects(redrawOperation) {
        return function() {
          redrawOperation();
          // All objects where repainted (probably removed and added again), so
          // it's necessary to apply click handlers again.
          modelView.updateClickHandlers();
        };
      }

      // Redraw container each time when some visual-related property is changed.
      model.addPropertiesListener([
          "chargeShading", "showChargeSymbols", "useThreeLetterCode",
          "showVDWLines", "VDWLinesCutoff",
          "showVelocityVectors", "showForceVectors",
          "showAtomTrace", "atomTraceId", "aminoAcidColorScheme",
          "backgroundColor", "markColor", "forceVectorsDirectionOnly"
        ],
        redrawClickableObjects(repaint));
      model.addPropertiesListener(["electricFieldDensity", "showElectricField", "electricFieldColor"],
        setupElectricField);

      model.on('addAtom', redrawClickableObjects(function () {
        atomsRenderer.setup();
        modelView.renderCanvas();
      }));
      model.on('removeAtom', redrawClickableObjects(function () {
        atomsRenderer.setup();
        modelView.renderCanvas();
      }));
      model.on('addRadialBond', redrawClickableObjects(function () {
        bondsRenderer.setup();
        modelView.renderCanvas();
      }));
      model.on('removeRadialBond', redrawClickableObjects(function () {
        bondsRenderer.setup();
        modelView.renderCanvas();
      }));
      model.on('textBoxesChanged', redrawClickableObjects(drawTextBoxes));
      model.on('imagesChanged', redrawClickableObjects(drawImageAttachment));
      model.on('addElectricField', setupElectricField);
      model.on('removeElectricField', setupElectricField);
      model.on('changeElectricField', setupElectricField);

      setupFirefoxWarning();

      isSetup = true;
    }

    // Call when model is reset or reloaded.

    function bindModel(newModel) {
      model = newModel;
      atomsRenderer.bindModel(newModel);
      bondsRenderer.bindModel(newModel);
      setup();
    }

    //
    // MD2D Renderer: repaint
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
      fontSizeInPixels = modelView.getFontSizeInPixels();

      setupMiscOptions();
      setupDynamicGradients();
      setupObstacles();
      setupVdwPairs();
      atomsRenderer.setup();
      bondsRenderer.setup();
      setupShapes();
      setupLines();
      geneticRenderer.setup();
      setupVectors();
      setupElectricField();
      setupAtomTrace();
      drawImageAttachment();
      drawTextBoxes();
      setupToolTips();
      drawSymbolImages();
      setupFirefoxWarning();
      if (useQuantumDynamics) {
        enterAndUpdatePhotons();
      }
    }

    //
    // MD2D Renderer: update
    //
    // Call to update visualization when model result state changes.
    // Normally called on every model tick.
    //

    function update() {
      console.time('view update');
      if (obstacles) {
        obstacle.attr("transform", function(d, i) {
          return "translate(" + model2px(obstacles.x[i]) + " " + model2pxInv(obstacles.y[i] + obstacles.height[i]) + ")";
        });
      }

      if (shapes) {
        shapeTop.attr("transform", function(d) {
          return "translate(" + model2px(shapes.x[d.index]) + " " + model2pxInv(shapes.y[d.index] + shapes.height[d.index]) + ")";
        });
        shapeBelow.attr("transform", function(d) {
          return "translate(" + model2px(shapes.x[d.index]) + " " + model2pxInv(shapes.y[d.index] + shapes.height[d.index]) + ")";
        });
      }

      if (drawVdwLines) {
        updateVdwPairs();
      }

      atomsRenderer.update();
      bondsRenderer.update();

      if (drawVelocityVectors) {
        updateVectors(velVector, getVelVectorPath, getVelVectorWidth);
      }
      if (drawForceVectors) {
        updateVectors(forceVector, getForceVectorPath, getForceVectorWidth);
      }
      if (drawElectricForceField) {
        updateElectricForceField();
      }
      if (drawAtomTrace) {
        updateAtomTrace();
      }
      if (imageProp && imageProp.length !== 0) {
        updateImageAttachment();
      }
      if (textBoxes && textBoxes.length > 0) {
        updateTextBoxes();
      }
      if (useQuantumDynamics) {
        enterAndUpdatePhotons();
      }
      console.timeEnd('view update');
    }

    //
    // Public API to instantiated Renderer
    //
    api = {
      // Expose private methods.
      setup: function() {
        if (!isSetup) {
          setup();
        }
      },

      update: function() {
        if (isSetup) {
          update();
        }
      },

      repaint: function() {
        if (isSetup) {
          repaint();
        }
      },

      bindModel: bindModel,
      model2px: modelView.model2px,
      model2pxInv: modelView.model2pxInv
    };

    return api;
  };
});

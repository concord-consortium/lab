/*global $, define: false, d3: false, Image */
// ------------------------------------------------------------
//
//   MD2D View Renderer
//
// ------------------------------------------------------------
define(function (require) {
  // Dependencies.
  var labConfig             = require('lab.config'),
      alert                 = require('common/alert'),
      console               = require('common/console'),
      benchmark             = require('common/benchmark/benchmark'),
      amniacidContextMenu   = require('cs!md2d/views/aminoacid-context-menu'),
      GeneticRenderer       = require('md2d/views/genetic-renderer'),
      wrapSVGText           = require('cs!common/layout/wrap-svg-text'),
      gradients             = require('common/views/gradients'),

      RADIAL_BOND_TYPES = {
        STANDARD_STICK  : 101,
        LONG_SPRING     : 102,
        BOND_SOLID_LINE : 103,
        GHOST           : 104,
        UNICOLOR_STICK  : 105,
        SHORT_SPRING    : 106,
        DOUBLE_BOND     : 107,
        TRIPLE_BOND     : 108,
        DISULPHIDE_BOND : 109
      };

  return function MD2DView(modelView, model) {
        // Public API object to be returned.
    var api = {},

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

        // "Containers" - SVG g elements used to position layers of the final visualization.
        mainContainer,
        geneticsContainer,
        radialBondsContainer,
        VDWLinesContainer,
        imageContainerBelow,
        imageContainerTop,
        textContainerBelow,
        textContainerTop,
        iconContainer,

        dragOrigin,

        // Renderers specific for MD2D
        // TODO: for now only DNA is rendered in a separate class, try to create
        // new renderers in separate files for clarity and easier testing.
        geneticRenderer,

        gradientNameForElement = [
          "url(#elem0-grad)",
          "url(#elem1-grad)",
          "url(#elem2-grad)",
          "url(#elem3-grad)"
        ],
        // Set of gradients used for Kinetic Energy Shading.
        gradientNameForKELevel = [],
        // Number of gradients used for Kinetic Energy Shading.
        KE_SHADING_STEPS = 25,
        // Array which defines a gradient assigned to a given particle.
        gradientNameForParticle = [],

        atomTooltipOn = false,

        particle, label, labelEnter,
        atomToolTip, atomToolTipPre,

        fontSizeInPixels,
        textBoxFontSizeInPixels,

        modelTimeFormatter = d3.format("5.1f"),
        timePrefix = "",
        timeSuffix = " (" + model.getPropertyDescription('displayTime').getUnitAbbreviation() + ")",

        radialBonds,
        radialBondResults,
        obstacle,
        obstacles,
        mockObstaclesArray = [],
        radialBond1, radialBond2,
        vdwPairs = [],
        vdwLines,
        chargeShadingMode,
        keShadingMode,
        useQuantumDynamics,
        drawVdwLines,
        drawVelocityVectors,
        velocityVectorColor,
        velocityVectorWidth,
        velocityVectorLength,
        drawForceVectors,
        forceVectorColor,
        forceVectorWidth,
        forceVectorLength,
        velVector,
        forceVector,
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
        FORCE_STR    = "force",

        browser = benchmark.what_browser(),

        // pre-calculations
        halfPi = Math.PI/2,

        // this is a hack put in place to temporarily deal with an image-size
        // caching bug in Chrome Canary
        needCachebusting = browser.browser == "Chrome" && browser.version >= "26",

        // this is a hack put in place to temporarily deal with a IE 10 bug which
        // does not update line markers when svg lines are moved
        // see https://connect.microsoft.com/IE/feedback/details/781964/
        hideLineMarkers = browser.browser == "MSIE" && browser.version >= "10.0";


    function modelTimeLabel() {
      return timePrefix + modelTimeFormatter(model.get('displayTime')) + timeSuffix;
    }

    function setAtomPosition(i, xpos, ypos, checkPosition, moveMolecule) {
      return model.setAtomProperties(i, {x: xpos, y: ypos}, checkPosition, moveMolecule);
    }

    function getObstacleColor(i) {
      return "rgb(" +
        obstacles.colorR[i] + "," +
        obstacles.colorG[i] + "," +
        obstacles.colorB[i] + ")";
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
      color      = d3.rgb("#" + colorstr);
      medColor   = color.toString();
      lightColor = color.brighter(1).toString();
      darkColor  = color.darker(1).toString();
      return gradients.createRadialGradient(id, lightColor, medColor, darkColor, mainContainer);
    }

    /**
     * Setups set of gradient which can be changed by the user.
     * They should be recreated during each reset / repaint operation.
     * @private
     */
    function setupDynamicGradients() {
      var i, color, lightColor, medColor, darkColor;

      for (i= 0; i < 4; i++) {
        // Use names defined in gradientNameForElement array!
        createElementColorGradient("elem" + i + "-grad", modelElements.color[i], mainContainer);
      }

      // "Marked" particle gradient.
      medColor   = model.get("markColor");
      // Mark color defined in JSON defines medium color of a gradient.
      color      = d3.rgb(medColor);
      lightColor = color.brighter(1).toString();
      darkColor  = color.darker(1).toString();
      gradients.createRadialGradient("mark-grad", lightColor, medColor, darkColor, mainContainer);
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
          darkColorScale(KELevel), mainContainer);
        gradientNameForKELevel[i] = gradientUrl;
      }

      // "Charge" gradients.
      gradients.createRadialGradient("neg-grad", "#ffefff", "#fdadad", "#e95e5e", mainContainer);
      gradients.createRadialGradient("pos-grad", "#dfffff", "#9abeff", "#767fbf", mainContainer);
      gradients.createRadialGradient("neutral-grad", "#FFFFFF", "#f2f2f2", "#A4A4A4", mainContainer);

      // Colored gradients, used for amino acids.
      gradients.createRadialGradient("green-grad", "#dfffef", "#75a643", "#2a7216", mainContainer);
      gradients.createRadialGradient("orange-grad", "#F0E6D1", "#E0A21B", "#AD7F1C", mainContainer);
    }

    function createVectorArrowHeads(color, name) {
      var defs,
          id = "Triangle-"+name,
          arrowHead;
      defs = mainContainer.select("defs");
      if (defs.empty()) {
        defs = mainContainer.append("defs");
      }
      arrowHead = defs.select("#" + id);
      if (arrowHead.empty()) {
        arrowHead = defs.append("marker")
          .attr("id", "Triangle-"+name)
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
    }

    function createExcitationGlow() {
      var defs,
          glow;

      defs = mainContainer.select("defs");
      if (defs.empty()) {
        defs = mainContainer.append("defs");
      }
      glow = defs.select("#glow");
      if (glow.empty()) {
        glow = defs.append("filter")
          .attr("id", "glow")
          .attr("x", "-1")
          .attr("y", "-1")
          .attr("width", "400%")
          .attr("height", "400%");
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

    // Returns gradient appropriate for a given atom.
    // d - atom data.
    function getParticleGradient(d) {
        var ke, keIndex, charge;

        if (d.marked) return "url(#mark-grad)";

        if (keShadingMode) {
          ke  = model.getAtomKineticEnergy(d.idx),
          // Convert Kinetic Energy to [0, 1] range
          // using empirically tested transformations.
          // K.E. shading should be similar to the classic MW K.E. shading.
          keIndex = Math.min(5 * ke, 1);

          return gradientNameForKELevel[Math.round(keIndex * (KE_SHADING_STEPS - 1))];
        }

        if (chargeShadingMode) {
          charge = d.charge;

          if (charge === 0) return "url(#neutral-grad)";
          return charge > 0 ? "url(#pos-grad)" : "url(#neg-grad)";
        }

        if (!d.isAminoAcid()) {
          return gradientNameForElement[d.element % 4];
        }
        // Particle represents amino acid.
        switch (model.get("aminoAcidColorScheme")) {
          case "none":
            return "url(#neutral-grad)";
          case "hydrophobicity":
            return d.hydrophobicity > 0 ? "url(#orange-grad)" : "url(#green-grad)";
          case "charge":
            if (d.charge === 0) return "url(#neutral-grad)";
            return d.charge > 0 ? "url(#pos-grad)" : "url(#neg-grad)";
          case "chargeAndHydro":
            if (d.charge < -0.000001)
              return "url(#neg-grad)";
            if (d.charge > 0.000001)
              return "url(#pos-grad)";
            return d.hydrophobicity > 0 ? "url(#orange-grad)" : "url(#green-grad)";
          default:
            throw new Error("ModelContainer: unknown amino acid color scheme.");
        }
    }

    // Returns first color appropriate for a given radial bond (color next to atom1).
    // d - radial bond data.
    function getBondAtom1Color(d) {
      if (isSpringBond(d)) {
        return "#888";
      } else {
        return gradients.mainColorOfGradient[gradientNameForParticle[d.atom1]];
      }
    }

    // Returns second color appropriate for a given radial bond (color next to atom2).
    // d - radial bond data.
    function getBondAtom2Color(d) {
      if (isSpringBond(d)) {
        return "#888";
      } else {
        return gradients.mainColorOfGradient[gradientNameForParticle[d.atom2]];
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
              "width": fSize*2,
              "height": fSize*2,
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
              "width": fSize*2.2,
              "height": fSize*6,
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
                "width": fSize*2,
                "height": fSize*2,
              })
              .style("display", "");

            imageHeight = parseInt(imageSelect.attr("height"));
            yPos += imageHeight;
        } else {
            iconContainer.select("#heat-bath").style("display","none");
        }

        // Kinetic Energy shading gradient.
        // Put it under heat bath symbol.
        if (keShadingMode) {
            yPos += yMargin;
            iconContainer.select("#ke-gradient")
              .attr({
                "y": yPos,
                "width": fSize*2.2,
                "height": fSize*6,
              })
              .style("display", "");
        } else {
            iconContainer.select("#ke-gradient").style("display", "none");
        }
    }

    function updateParticleRadius() {
      mainContainer.selectAll("circle").data(modelAtoms).attr("r",  function(d) { return model2px(d.radius); });
    }

    /**
      Call this wherever a d3 selection is being used to add circles for atoms
    */

    function particleEnterExit() {
      particle.enter().append("circle")
          .attr({
            "class": function (d) { return d.isAminoAcid() ? "draggable atom amino-acid" : "atom draggable"; },
            "r":  function(d) { return model2px(d.radius); },
            "cx": function(d) { return model2px(d.x); },
            "cy": function(d) { return model2pxInv(d.y); },
            "fill-opacity": function(d) { return d.visible ? 1 : 0; },
            "fill": function (d, i) { return gradientNameForParticle[i]; },
            "filter": function (d, i) { if (d.excitation) {return "url(#glow)";} return null; }
          })
          .on("mousedown", moleculeMouseDown)
          .on("mouseover", moleculeMouseOver)
          .on("mouseout", moleculeMouseOut)
          .call(d3.behavior.drag()
            .on("dragstart", nodeDragStart)
            .on("drag", nodeDrag)
            .on("dragend", nodeDragEnd)
          );

      particle.exit().remove();
    }

    function vectorEnter(vector, pathFunc, widthFunc, color, name) {
      vector.enter().append("path")
        .attr({
          "class": "vector-"+name,
          "marker-end": hideLineMarkers ? "" : "url(#Triangle-"+name+")",
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
          function (d, i) {
            return "translate(" + model2px(obstacles.x[i]) + " " + model2pxInv(obstacles.y[i] + obstacles.height[i]) + ")";
          }
        );
      obstacleGroup.append("rect")
        .attr({
          "class": "obstacle-shape",
          "x": 0,
          "y": 0,
          "width": function(d, i) {return model2px(obstacles.width[i]); },
          "height": function(d, i) {return model2px(obstacles.height[i]); },
          "fill": function(d, i) { return obstacles.visible[i] ? getObstacleColor(i) : "rgba(128,128,128, 0)"; },
          "stroke-width": function(d, i) { return obstacles.visible[i] ? 0.2 : 0.0; },
          "stroke": function(d, i) { return obstacles.visible[i] ? getObstacleColor(i) : "rgba(128,128,128, 0)"; }
        });

      // Append external force markers.
      obstacleGroup.each(function (d, i) {
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
              "d": function (d) {
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
              "d": function (d) {
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
            "marker-end": hideLineMarkers ? "" : "url(#Triangle-"+ FORCE_STR +")",
            "stroke-width": model2px(forceVectorWidth),
            "stroke": forceVectorColor,
            "fill": "none"
          });
      });
    }

    function radialBondEnter() {
      radialBond1.enter().append("path")
          .attr({
            "d": function (d) { return findPoints(d,1); },
            "stroke-width": function (d) {
              if (isSpringBond(d)) {
                return springStrokeWidth(d);
              } else {
                return model2px(Math.min(modelAtoms[d.atom1].radius, modelAtoms[d.atom2].radius)) * 0.75;
              }
            },
            "stroke": getBondAtom1Color,
            "fill": "none"
          })
          .classed("radialbond1", true)
          .classed("disulphideBond", function (d) {
            return d.type === RADIAL_BOND_TYPES.DISULPHIDE_BOND;
          });

      radialBond2.enter().append("path")
          .attr({
            "d": function (d) { return findPoints(d,2); },
            "stroke-width": function (d) {
              if (isSpringBond(d)) {
                return springStrokeWidth(d);
              } else {
                return model2px(Math.min(modelAtoms[d.atom1].radius, modelAtoms[d.atom2].radius)) * 0.75;
              }
            },
            "stroke": getBondAtom2Color,
            "fill": "none"
          })
          .classed("radialbond2", true)
          .classed("disulphideBond", function (d) {
            return d.type === RADIAL_BOND_TYPES.DISULPHIDE_BOND;
          });

    }

    function findPoints(d, num) {
      var pointX, pointY,
          j,
          dx, dy,
          x1, x2,
          y1, y2,
          radius_x1, radius_x2, radiusFactorX,
          radius_y1, radius_y2, radiusFactorY,
          path,
          costheta,
          sintheta,
          length,
          strength,
          numTurns,
          springDiameter,
          cosThetaDiameter,
          sinThetaDiameter,
          cosThetaSpikes,
          sinThetaSpikes;

      x1 = model2px(d.x1);
      y1 = model2pxInv(d.y1);
      x2 = model2px(d.x2);
      y2 = model2pxInv(d.y2);
      dx = x2 - x1;
      dy = y2 - y1;

      strength = d.strength;
      length = Math.sqrt(dx*dx + dy*dy) / model2px(0.01);

      numTurns = Math.floor(d.length * 24);
      springDiameter = length / numTurns;

      costheta = dx / length;
      sintheta = dy / length;
      cosThetaDiameter = costheta * springDiameter;
      sinThetaDiameter = sintheta * springDiameter;
      cosThetaSpikes = costheta * numTurns;
      sinThetaSpikes = sintheta * numTurns;

      radius_x1 = model2px(modelAtoms[d.atom1].radius) * costheta;
      radius_x2 = model2px(modelAtoms[d.atom2].radius) * costheta;
      radius_y1 = model2px(modelAtoms[d.atom1].radius) * sintheta;
      radius_y2 = model2px(modelAtoms[d.atom2].radius) * sintheta;
      radiusFactorX = radius_x1 - radius_x2;
      radiusFactorY = radius_y1 - radius_y2;

      if (isSpringBond(d)) {
        path = "M "+x1+","+y1+" " ;
        for (j = 0; j < numTurns; j++) {
          if (j % 2 === 0) {
            pointX = x1 + (j + 0.5) * cosThetaDiameter - 0.5 * sinThetaSpikes;
            pointY = y1 + (j + 0.5) * sinThetaDiameter + 0.5 * cosThetaSpikes;
          }
          else {
            pointX = x1 + (j + 0.5) * cosThetaDiameter + 0.5 * sinThetaSpikes;
            pointY = y1 + (j + 0.5) * sinThetaDiameter - 0.5 * cosThetaSpikes;
          }
          path += " L "+pointX+","+pointY;
        }
        return path += " L "+x2+","+y2;
      } else {
        if (num === 1) {
          return "M "+x1+","+y1+" L "+((x2+x1+radiusFactorX)/2)+" , "+((y2+y1+radiusFactorY)/2);
        } else {
          return "M "+((x2+x1+radiusFactorX)/2)+" , "+((y2+y1+radiusFactorY)/2)+" L "+x2+","+y2;
        }
      }
    }

    function isSpringBond(d){
      return d.type === RADIAL_BOND_TYPES.SHORT_SPRING;
    }

    function springStrokeWidth(d) {
      return 1.25;
      // The following code is intended to use a thicker stroke-width when
      // the spring constant is larger ... but to work properly in models with
      // both MD2D and MKS units schemes the model would need to supply
      // an apprpriately scaled default spring constant.
      // For example in the Spring and Mass Interactive which uses an MKS unit
      // scheme the spring constant is varied between 0.001 and 0.003 ... while in
      // the Comparing Dipole atom-pulling Interactive that uses an MD2D unit
      // scheme the spring constant is 10.
      // return (1 + Math.log(1+d.strength*1000)) * 0.25;
    }

    function vdwLinesEnter() {
      var strokeWidth = model2px(0.02),
          strokeDasharray = model2px(0.03) + " " + model2px(0.02);
      // update existing lines
      vdwLines.attr({
        "x1": function(d) { return model2px(modelAtoms[d[0]].x); },
        "y1": function(d) { return model2pxInv(modelAtoms[d[0]].y); },
        "x2": function(d) { return model2px(modelAtoms[d[1]].x); },
        "y2": function(d) { return model2pxInv(modelAtoms[d[1]].y); }
      });

      // append new lines
      vdwLines.enter().append('line')
        .attr({
          "class": "attractionforce",
          "x1": function(d) { return model2px(modelAtoms[d[0]].x); },
          "y1": function(d) { return model2pxInv(modelAtoms[d[0]].y); },
          "x2": function(d) { return model2px(modelAtoms[d[1]].x); },
          "y2": function(d) { return model2pxInv(modelAtoms[d[1]].y); }
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
        // temp: add cachebusting string if we are in Chrome 26 or above
        img[i].src = getImagePath(imageProp[i]) + (needCachebusting ? "?"+Math.random() : "");
        img[i].onload = (function(i) {
          return function() {
            imglayer = imageProp[i].imageLayer;
            positionOrder = imglayer === 1 ? positionOrderTop : positionOrderBelow;
            positionOrder.push({
              i: i,
              zOrder: (!!imageProp[i].imageLayerPosition) ? imageProp[i].imageLayerPosition : 0
            });
            positionOrder.sort(function(a,b){return d3.ascending(a["zOrder"],b["zOrder"])});
            // In Classic MW model size is defined in 0.1A.
            // Model unit (0.1A) - pixel ratio is always 1. The same applies
            // to images. We can assume that their pixel dimensions are
            // in 0.1A also. So convert them to nm (* 0.01).
            imageSizes[i] = [0.01 * img[i].width, 0.01 * img[i].height];
            container = imglayer === 1 ? imageContainerTop : imageContainerBelow;
            container.selectAll("image").remove();
            container.selectAll("image")
              .data(positionOrder, function(d){ return d["i"] })
              .enter().append("image")
                .attr("x", function(d){ return getImageCoords(d["i"])[0] } )
                .attr("y", function(d){ return getImageCoords(d["i"])[1] } )
                .attr("class", function(d){ return "image_attach" + d["i"] + " draggable"})
                .attr("xlink:href", function(d){ return img[d["i"]].src})
                .attr("width", function(d){return model2px( imageSizes[d["i"]][0] )})
                .attr("height", function(d){return model2px( imageSizes[d["i"]][1] )})
                .attr("pointer-events", "none");
          };
        })(i);
      }
    }

    function getTextBoxCoords(d) {
      var x, y, hostX, hostY, textX, textY, frameX, frameY, calloutX, calloutY,
          pixelScale = textBoxFontSizeInPixels * d.fontScale;

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

      textX = frameX + pixelScale*0.75;
      textY = frameY + pixelScale*1.2;

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
          baseSize = Math.min(fontSize, fullHeight/2),

          dcx = Math.sin(angle) * baseSize,
          dcy = Math.cos(angle) * baseSize;

      return (center[0]+dcx) + ", " + (center[1]-dcy) + " " + (center[0]-dcx) + ", " + (center[1]+dcy) + " " + calloutLocation;
    }

    function updateTextBoxes() {
      var layers = [textContainerTop, textContainerBelow],
          updateText;

      updateText = function (layerNum) {
        var layer = layers[layerNum - 1],
            layerTextBoxes = textBoxes.filter(function (t) {
              return t.layer === layerNum;
            });

        layer.selectAll("g.textBoxWrapper rect")
          .data(layerTextBoxes.filter( function(d) { return d.frame; } ))
          .attr({
            "x": function(d) { return getTextBoxCoords(d)[2]; },
            "y": function(d) { return getTextBoxCoords(d)[3]; },
            "transform": function(d) {
              var rotate = d.rotate,
                  pos = getTextBoxCoords(d);
              return "rotate("+rotate+" "+pos[0]+" "+pos[1]+")";
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
          .data(layerTextBoxes.filter( function(d) { return d.calloutPoint; } ))
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
      $(".textBox").each( function() {
        var $parentNode = $(this.parentNode),
            callout     = $parentNode.find("polygon"),
            frame       = $parentNode.find("rect")[0],
            fontSize, width, height, calloutLocation;

        if (!frame || callout.length === 0) return;

        fontSize  = parseFloat(this.getAttributeNS(null, "font-size"));
        width  = frame.getAttribute("width");
        height = frame.getAttribute("height");
        calloutLocation = callout.attr("callout-location-data").split(", ");

        callout.attr("points", getCalloutPath(calloutLocation, frame, width, height, fontSize) );
      });
    }

    function drawTextBoxes() {
      var size, layers, appendTextBoxes;

      textBoxes = model.get('textBoxes');

      size = [ model.get('width'), model.get('height') ];

      layers = [textContainerTop, textContainerBelow];

      // Append to either top or bottom layer depending on item's layer #.
      appendTextBoxes = function (layerNum) {
        var layer = layers[layerNum - 1],
            text, layerTextBoxes, selection;

        layer.selectAll("g.textBoxWrapper").remove();

        layerTextBoxes = textBoxes.filter(function(t) { return t.layer === layerNum; });

        selection = layer.selectAll("g.textBoxWrapper")
          .data(layerTextBoxes);
        text = selection.enter().append("svg:g")
          .attr("class", "textBoxWrapper");

        text.filter(function (d) { return d.calloutPoint; })
          .append("polygon")
          .attr({
            "points": "0,0 0,0 0,0",
            "style": function(d) {
              var backgroundColor = d.backgroundColor,
                  strokeWidth = d.strokeWidthEms * fontSizeInPixels,
                  strokeOpacity = d.strokeOpacity;
              return "fill:"+backgroundColor+";opacity:1.0;fill-opacity:1;stroke:#000000;stroke-width:"+(strokeWidth*2)+";stroke-opacity:"+strokeOpacity;
            },
            "callout-location-data": function(d) {
              var pos = getTextBoxCoords(d);
              return pos[4] + ", " + pos[5];
            }
          });

        text.filter(function (d) { return d.frame; })
          .append("rect")
          .attr({
            "class": function(d, i) { return "textBoxFrame text-"+i; },
            "id": function(d, i) { return "text-"+i; },
            "transform": function(d) {
              var rotate = d.rotate,
                  pos = getTextBoxCoords(d);
              return "rotate("+rotate+" "+pos[0]+" "+pos[1]+")";
            },
            "style": function(d) {
              var backgroundColor = d.backgroundColor,
                  strokeWidth = d.strokeWidthEms * fontSizeInPixels,
                  strokeOpacity = d.strokeOpacity;
              return "fill:"+backgroundColor+";opacity:1.0;fill-opacity:1;stroke:#000000;stroke-width:"+strokeWidth+";stroke-opacity:"+strokeOpacity;
            },
            "width": 0,
            "height": 0,
            "rx": function(d) { return d.frame === "rounded rectangle" ? textBoxFontSizeInPixels/2.5  : 0; },
            "ry": function(d) { return d.frame === "rounded rectangle" ? textBoxFontSizeInPixels/2 : 0; },
            "x":  function(d) { return getTextBoxCoords(d)[2]; },
            "y":  function(d) { return getTextBoxCoords(d)[3]; }
          });

        text.filter(function (d) { return d.calloutPoint; })
          .append("polygon")
          .attr({
            "points": "0,0 0,0 0,0",
            "style": function(d) {
              var backgroundColor = d.backgroundColor;
              return "fill:"+backgroundColor+";opacity:1.0;fill-opacity:1;stroke:#000000;stroke-width:0;";
            }
          });

        text.append("text")
          .attr({
            "class": function() { return "textBox" + (AUTHORING ? " draggable" : ""); },
            "transform": function(d) {
              var rotate = d.rotate,
                  pos = getTextBoxCoords(d);
              return "rotate("+rotate+" "+pos[0]+" "+pos[1]+")";
            },
            "x-data": function(d) { return getTextBoxCoords(d)[0]; },
            "y": function(d)      { return getTextBoxCoords(d)[1]; },
            "width-data": function(d) { return d.width; },
            "height-data": function(d) { return d.height; },
            "width":  model2px(size[0]),
            "height": model2px(size[1]),
            "xml:space": "preserve",
            "font-family": "'" + labConfig.fontface + "', sans-serif",
            "font-size": function(d) {
              return d.fontScale * textBoxFontSizeInPixels + "px";
            },
            "fill": function(d) { return d.color || "black"; },
            "text-data": function(d) { return d.text; },
            "text-anchor": function(d) {
              var align = d.textAlign || "left";
              if (align === "center") align = "middle";
              return align;
            },
            "has-host": function(d) { return !!d.hostType; }
          })
          .call(d3.behavior.drag()
            .on("drag", textDrag)
            .on("dragend", function(d) {
              // simple output to console for now, eventually should just get
              // serialized back to interactive (or model?) JSON on author save
              console.log('"x": '+d.x+",");
              console.log('"y": '+d.y+",");
            })
          );
        selection.exit().remove();
      };

      appendTextBoxes(1);
      appendTextBoxes(2);

      // wrap text, set callouts
      $(".textBox").each( function() {
        var text      = this.getAttributeNS(null, "text-data"),
            x         = this.getAttributeNS(null, "x-data"),
            width     = this.getAttributeNS(null, "width-data"),
            height    = this.getAttributeNS(null, "height-data"),
            fontSize  = parseFloat(this.getAttributeNS(null, "font-size")),
            transform = this.getAttributeNS(null, "transform"),
            hasHost   = this.getAttributeNS(null, "has-host"),
            textAlign = this.getAttributeNS(null, "text-anchor"),
            $parentNode = $(this.parentNode),
            horizontalPadding, verticalPadding,
            result, fullWidth, fullHeight, frame, dy, tx, ty,
            callout, calloutLocation;

        dy = fontSize*1.2;
        horizontalPadding = +fontSize*1.5;
        verticalPadding = fontSize/1.8;

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

        while (this.firstChild) {     // clear element first
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
          callout.attr("points", getCalloutPath(calloutLocation, frame, fullWidth, fullHeight, fontSize) );
        }

        // center all hosted labels simply by tweaking the g.transform
        if (textAlign === "middle") {
          tx = result.width / 2;
          if (height > 0) {
            ty = height / 2 - verticalPadding * 1.5 - (result.lines-1) * dy / 2;
          } else {
            ty = 0;
          }
          transform = transform + " translate("+tx+","+ty+")";
          $(this).attr("transform", transform);
        }
        if (hasHost === "true" && callout.length === 0) {
          tx = result.width / -2 - horizontalPadding/2;
          ty = result.lines * dy / -2 - verticalPadding/2;
          $parentNode.attr("transform", "translate("+tx+","+ty+")");
        }
      });
    }

    function setupColorsOfParticles() {
      var i, len;

      chargeShadingMode = model.get("chargeShading");
      keShadingMode = model.get("keShading");

      gradientNameForParticle.length = modelAtoms.length;
      for (i = 0, len = modelAtoms.length; i < len; i++)
        gradientNameForParticle[i] = getParticleGradient(modelAtoms[i]);
    }

    function setupParticles() {
      var showChargeSymbols = model.get("showChargeSymbols"),
          useThreeLetterCode = model.get("useThreeLetterCode");

      setupColorsOfParticles();

      mainContainer.selectAll("circle").remove();
      mainContainer.selectAll("g.label").remove();

      particle = mainContainer.selectAll("circle").data(modelAtoms);
      updateParticleRadius();

      particleEnterExit();

      label = mainContainer.selectAll("g.label")
          .data(modelAtoms);

      labelEnter = label.enter().append("g")
          .attr("class", "label")
          .attr("transform", function(d) {
            return "translate(" + model2px(d.x) + "," + model2pxInv(d.y) + ")";
          });

      labelEnter.each(function (d) {
        var selection = d3.select(this),
            txtValue, txtSelection;
        // Append appropriate label. For now:
        // If 'atomNumbers' option is enabled, use indices.
        // If not and there is available 'label'/'symbol' property, use one of them
        // (check 'useThreeLetterCode' option to decide which one).
        // If not and 'showChargeSymbols' option is enabled, use charge symbols.
        if (model.get("atomNumbers")) {
          selection.append("text")
            .text(d.idx)
            .style("font-size", model2px(1.4 * d.radius) + "px");
        }
        else if (useThreeLetterCode && d.label) {
          // Add shadow - a white stroke, which increases readability.
          selection.append("text")
            .text(d.label)
            .attr("class", "shadow")
            .style("font-size", model2px(d.radius) + "px");
          selection.append("text")
            .text(d.label)
            .style("font-size", model2px(d.radius) + "px");
        }
        else if (!useThreeLetterCode && d.symbol) {
          // Add shadow - a white stroke, which increases readability.
          selection.append("text")
            .text(d.symbol)
            .attr("class", "shadow")
            .style("font-size", model2px(1.4 * d.radius) + "px");
          selection.append("text")
            .text(d.symbol)
            .style("font-size", model2px(1.4 * d.radius) + "px");
        }
        else if (showChargeSymbols) {
          if (d.charge > 0){
            txtValue = "+";
          } else if (d.charge < 0){
            txtValue = "-";
          } else {
            return;
          }
          selection.append("text")
            .text(txtValue)
            .style("font-size", model2px(1.6 * d.radius) + "px");
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
              "x": -txtSelection.node().getBBox().width / 2,
              "y": "0.31em"
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

    function setupObstacles() {
      obstacles = model.get_obstacles();
      mainContainer.selectAll("g.obstacle").remove();
      if (obstacles) {
        mockObstaclesArray.length = obstacles.x.length;
        obstacle = mainContainer.selectAll("g.obstacle").data(mockObstaclesArray);
        obstacleEnter();
      }
    }

    function setupRadialBonds() {
      radialBondsContainer.selectAll("path.radialbond1").remove();
      radialBondsContainer.selectAll("path.radialbond2").remove();
      radialBonds = model.get_radial_bonds();
      radialBondResults = model.get_radial_bond_results();
      if (radialBondResults) {
        radialBond1 = radialBondsContainer.selectAll("path.radialbond1").data(radialBondResults);
        radialBond2 = radialBondsContainer.selectAll("path.radialbond2").data(radialBondResults);
        radialBondEnter();
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
      mainContainer.selectAll("path.vector-"+VELOCITY_STR).remove();
      mainContainer.selectAll("path.vector-"+FORCE_STR).remove();

      drawVelocityVectors = model.get("showVelocityVectors");
      drawForceVectors    = model.get("showForceVectors");
      if (drawVelocityVectors) {
        velVector = mainContainer.selectAll("path.vector-"+VELOCITY_STR).data(modelAtoms);
        vectorEnter(velVector, getVelVectorPath, getVelVectorWidth, velocityVectorColor, VELOCITY_STR);
      }
      if (drawForceVectors) {
        forceVector = mainContainer.selectAll("path.vector-"+FORCE_STR).data(modelAtoms);
        vectorEnter(forceVector, getForceVectorPath, getForceVectorWidth, forceVectorColor, FORCE_STR);
      }
    }

    function setupAtomTrace() {
      mainContainer.selectAll("path.atomTrace").remove();
      atomTracePath = "";

      drawAtomTrace = model.get("showAtomTrace");
      atomTraceId = model.get("atomTraceId");
      if (drawAtomTrace) {
        atomTrace = mainContainer.selectAll("path.atomTrace").data([modelAtoms[atomTraceId]]);
        atomTraceEnter();
      }
    }

    function updateVdwPairs() {
      // Get new set of pairs from model.
      updateVdwPairsArray();

      vdwLines = VDWLinesContainer.selectAll("line.attractionforce").data(vdwPairs);
      vdwLinesEnter();
    }

    function mousedown() {
      setFocus();
    }

    function setFocus() {
      if (model.get("enableKeyboardHandlers")) {
        modelView.node.focus();
      }
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
          top  = pos.top +  model2pxInv(modelAtoms[i].y);

      atomToolTip
            .style("opacity", 1.0)
            .style("display", "inline")
            .style("background", "rgba(100%, 100%, 100%, 0.7)")
            .style("left", left + "px")
            .style("top",  top + "px")
            .style("zIndex", 100)
            .transition().duration(250);

      atomToolTipPre.text(
          "atom: " + i + "\n" +
          "time: " + modelTimeLabel() + "\n" +
          "speed: " + d3.format("+6.3e")(modelAtoms[i].speed) + "\n" +
          "vx:    " + d3.format("+6.3e")(modelAtoms[i].vx)    + "\n" +
          "vy:    " + d3.format("+6.3e")(modelAtoms[i].vy)    + "\n" +
          "ax:    " + d3.format("+6.3e")(modelAtoms[i].ax)    + "\n" +
          "ay:    " + d3.format("+6.3e")(modelAtoms[i].ay)    + "\n"
        );
    }

    function moleculeMouseOut() {
      if (!atomTooltipOn && atomTooltipOn !== 0) {
        atomToolTip.style("opacity", 1e-6).style("zIndex" -1);
      }
    }

    // TODO: this function name seems to be inappropriate to
    // its content.
    function updateParticles() {
      particle.attr({
        "cx": function(d) { return model2px(d.x); },
        "cy": function(d) { return model2pxInv(d.y); }
      });

      if (keShadingMode) {
        // When Kinetic Energy Shading is enabled, update style of atoms
        // during each frame.
        setupColorsOfParticles();
        // Update particles "fill" attribute. Array of colors is already updated.
        particle.attr("fill", function (d, i) { return gradientNameForParticle[i]; });
      }

      if (useQuantumDynamics) {
        particle.attr("filter", function (d) { if (d.excitation) {return "url(#glow)";} return null; })
      }

      label.attr("transform", function (d) {
        return "translate(" + model2px(d.x) + "," + model2pxInv(d.y) + ")";
      });

      if (atomTooltipOn === 0 || atomTooltipOn > 0) {
        renderAtomTooltip(atomTooltipOn);
      }
    }

    function getVelVectorPath(d) {
      var x_pos = model2px(d.x),
          y_pos = model2pxInv(d.y),
          path = "M "+x_pos+","+y_pos,
          scale = velocityVectorLength * 100;
      return path + " L "+(x_pos + model2px(d.vx*scale))+","+(y_pos - model2px(d.vy*scale));
    }

    function getForceVectorPath(d) {
      var x_pos = model2px(d.x),
          y_pos = model2pxInv(d.y),
          mass  = d.mass,
          scale = forceVectorLength * 100,
          path  = "M "+x_pos+","+y_pos;
      return path + " L "+(x_pos + model2px(d.ax*mass*scale))+","+(y_pos - model2px(d.ay*mass*scale));
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
        atomTracePath = "M"+dx+","+dy+"L";
        return "M "+dx+","+dy;
      } else {
        atomTracePath += dx+","+dy + " ";
      }

      // fake buffered array functionality by knocking out the first
      // element of the string when we get too big
      if (atomTracePath.length > 4000) {
        lIndex = atomTracePath.indexOf("L");
        sIndex = atomTracePath.indexOf(" ");
        atomTracePath = "M" + atomTracePath.slice(lIndex+1, sIndex) + "L" + atomTracePath.slice(sIndex+1);
      }
      return atomTracePath;
    }

    function updateAtomTrace() {
      atomTrace.attr({
        "d": getAtomTracePath
      });
    }

    function updateRadialBonds() {
      radialBond1.attr("d", function (d) { return findPoints(d, 1); });
      radialBond2.attr("d", function (d) { return findPoints(d, 2); });

      if (keShadingMode) {
        // Update also radial bonds color when keShading is on.
        radialBond1.attr("stroke", getBondAtom1Color);
        radialBond2.attr("stroke", getBondAtom2Color);
      }
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

    function updateImageAttachment(){
      var numImages, imglayer, container, coords, i;
      numImages= imageProp.length;
      for(i = 0; i < numImages; i++) {
        if (!imageSizes || !imageSizes[i]) continue;
        coords = getImageCoords(i);
        imglayer = imageProp[i].imageLayer;
        container = imglayer === 1 ? imageContainerTop : imageContainerBelow;
        container.selectAll("image.image_attach"+i)
          .attr("x", coords[0])
          .attr("y", coords[1]);
      }
    }

    function nodeDragStart(d, i) {
      if (model.is_stopped()) {
        // cache the *original* atom position so we can go back to it if drag is disallowed
        dragOrigin = [d.x, d.y];
      }
      else if ( d.draggable ) {
        model.liveDragStart(i);
      }
    }

    /**
      Given x, y, and a bounding box (object with keys top, left, bottom, and right relative to
      (x, y), returns an (x, y) constrained to keep the bounding box within the molecule container.
    */
    function dragBoundingBox(x, y, bbox) {
      if (bbox.left + x < 0)                x = 0 - bbox.left;
      if (bbox.right + x > modelWidth) x = modelWidth - bbox.right;
      if (bbox.bottom + y < 0)              y = 0 - bbox.bottom;
      if (bbox.top + y > modelHeight)  y = modelHeight - bbox.top;

      return { x: x, y: y };
    }

    function clip(value, min, max) {
      if (value < min) return min;
      if (value > max) return max;
      return value;
    }

    /**
      Given x, y, make sure that x and y are clipped to remain within the model container's
      boundaries
    */
    function dragPoint(x, y) {
      return { x: clip(x, 0, modelWidth), y: clip(y, 0, modelHeight) };
    }

    function nodeDrag(d, i) {
      var dragX = model2px.invert(d3.event.x),
          dragY = model2pxInv.invert(d3.event.y),
          drag;

      if (model.is_stopped()) {
        drag = dragBoundingBox(dragX, dragY, model.getMoleculeBoundingBox(i));
        setAtomPosition(i, drag.x, drag.y, false, true);
        update();
      }
      else if ( d.draggable ) {
        drag = dragPoint(dragX, dragY);
        model.liveDrag(drag.x, drag.y);
      }
    }

    function textDrag(d) {
      var dragDx = model2px.invert(d3.event.dx),
          dragDy = model2px.invert(d3.event.dy);

      if (!(AUTHORING && model.is_stopped())) {
      // for now we don't have user-draggable textBoxes
        return;
      }
      else {
        d.x = d.x + dragDx;
        d.y = d.y - dragDy;
        updateTextBoxes();
      }
    }

    function nodeDragEnd(d, i) {
      if (model.is_stopped()) {

        if (!setAtomPosition(i, d.x, d.y, true, true)) {
          alert("You can't drop the atom there");     // should be changed to a nice Lab alert box
          setAtomPosition(i, dragOrigin[0], dragOrigin[1], false, true);
        }
        update();
      }
      else if (d.draggable) {
        // here we just assume we are removing the one and only spring force.
        // This assumption will have to change if we can have more than one.
        model.liveDragEnd();
      }
    }

    function setupToolTips() {
      var mc = d3.select("#model-container");
      if ( atomToolTip === undefined && !mc.empty()) {
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
          b = benchmark.what_browser();   // we need to recalc this for FF, for some reason

      if (b.browser === "Firefox" && b.version >= "18") {
        $firefoxWarningPane = $("#firefox-warning-pane");
        pos = modelView.pos();
        top  = pos.bottom - $firefoxWarningPane.height();
        left = pos.right - $firefoxWarningPane.width();
        $firefoxWarningPane.css({
          display: "inline",
          top: top -5,
          left: left - 15,
          'z-index': 100
        });
      }
    }

    function setupRendererOptions() {
      imageProp = model.get("images");
      imageMapping = model.get("imageMapping");
      modelImagePath = model.get('imagePath');
      if (modelImagePath) {
        imagePath = labConfig.actualRoot + modelImagePath;
      }
      else if (model.url) {
        imagePath = labConfig.actualRoot + model.url.slice(0, model.url.lastIndexOf("/") + 1);
      }

      velocityVectorColor = model.get("velocityVectors").color;
      velocityVectorWidth  = model.get("velocityVectors").width;
      velocityVectorLength = model.get("velocityVectors").length;

      forceVectorColor = model.get("forceVectors").color;
      forceVectorWidth  = model.get("forceVectors").width;
      forceVectorLength = model.get("forceVectors").length;

      atomTraceColor = model.get("atomTraceColor");


      createVectorArrowHeads(velocityVectorColor, VELOCITY_STR);
      createVectorArrowHeads(forceVectorColor, FORCE_STR);

      useQuantumDynamics = model.get("quantumDynamics") && model.get("quantumDynamics").useQuantumDynamics;
      if (useQuantumDynamics) {
        createExcitationGlow();
      }

      createSymbolImages();
      createImmutableGradients();

      // Register additional controls, context menus etc.
      // Note that special selector for class is used. Typical class selectors
      // (e.g. '.amino-acid') cause problems when interacting with SVG nodes.
      amniacidContextMenu.register(model, api, '[class~="amino-acid"]');

      // Initialize renderers.
      geneticRenderer = new GeneticRenderer(geneticsContainer, api, model);
    }

    function enterAndUpdatePhotons() {
      var photonData = model.get("quantumDynamics").photons,
          photons =  mainContainer.selectAll("circle.photon").data(photonData.x);

      photons.enter().append("circle")
        .attr({
          "class": "atom draggable photon",
          "r":  function() { return model2px(0.06); },
          "stroke": "orange",
          "stroke-width": 1,
          "fill-opacity": 1,
          "fill": "yellow",
          "filter": "url(#glow)",
          "display": "none"
        });

      photons.attr({
        "cx": function(d, i) { return model2px(photonData.x[i]); },
        "cy": function(d, i) { return model2pxInv(photonData.y[i]); },
        "display": function(d, i) {
          return photonData.vx[i] || photonData.vy[i] ? "inline": "none";
        }
      });

      photons.exit().remove();
    }

    //
    // *** Main Renderer functions ***
    //

    //
    // MD2D Renderer: init
    //
    // Called when Renderer is created.
    //
    function init() {
      // Assign shortcuts, as these variables / functions shouldn't
      // change.
      mainContainer        = modelView.containers.mainContainer,
      geneticsContainer    = modelView.containers.geneticsContainer,
      radialBondsContainer = modelView.containers.radialBondsContainer,
      VDWLinesContainer    = modelView.containers.VDWLinesContainer,
      imageContainerBelow  = modelView.containers.imageContainerBelow,
      imageContainerTop    = modelView.containers.imageContainerTop,
      textContainerBelow   = modelView.containers.textContainerBelow,
      textContainerTop     = modelView.containers.textContainerTop,
      iconContainer        = modelView.containers.iconContainer,

      model2px = modelView.model2px;
      model2pxInv = modelView.model2pxInv;

      fontSizeInPixels = modelView.getFontSizeInPixels();
      textBoxFontSizeInPixels = fontSizeInPixels * 0.9;

      modelAtoms  = model.getAtoms();
      modelElements = model.get_elements();
      modelWidth    = model.get('width');
      modelHeight   = model.get('height');
      aspectRatio   = modelWidth / modelHeight;

      setupRendererOptions();

      // Subscribe for model events.
      model.addPropertiesListener(["temperatureControl"], drawSymbolImages);

      function redrawClickableObjects (redrawOperation) {
        return function () {
          redrawOperation();
          // All objects where repainted (probably removed and added again), so
          // it's necessary to apply click handlers again.
          modelView.updateClickHandlers();
        };
      }

      // Redraw container each time when some visual-related property is changed.
      model.addPropertiesListener([
        "keShading", "chargeShading", "showChargeSymbols", "useThreeLetterCode",
        "showVDWLines", "VDWLinesCutoff",
        "showVelocityVectors", "showForceVectors",
        "showAtomTrace", "atomTraceId", "aminoAcidColorScheme",
        "backgroundColor", "markColor"],
          redrawClickableObjects(repaint));

      model.on('addAtom', redrawClickableObjects(setupParticles));
      model.on('removeAtom', redrawClickableObjects(repaint));
      model.on('addRadialBond', redrawClickableObjects(setupRadialBonds));
      model.on('removeRadialBond', redrawClickableObjects(setupRadialBonds));
      model.on('textBoxesChanged', redrawClickableObjects(drawTextBoxes));

      setupFirefoxWarning();
    }

    //
    // MD2D Renderer: reset
    //
    // Call when model is reset or reloaded.
    //
    function reset(newModel) {
      model = newModel;
      init();
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
      textBoxFontSizeInPixels = fontSizeInPixels * 0.9;

      setupDynamicGradients();
      setupObstacles();
      setupVdwPairs();
      setupParticles();
      // Always setup radial bonds *after* particles to use correct atoms
      // color table.
      setupRadialBonds();
      geneticRenderer.render();
      setupVectors();
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
        obstacle.attr("transform", function (d, i) {
          return "translate(" + model2px(obstacles.x[i]) + " " + model2pxInv(obstacles.y[i] + obstacles.height[i]) + ")";
        });
      }

      if (drawVdwLines) {
        updateVdwPairs();
      }

      updateParticles();

      if (radialBondResults) {
        // Always update radial bonds *after* particles, as particles can
        // change their color and radial bonds should reflect that too (=> use
        // updated colors array).
        updateRadialBonds();
      }
      if (drawVelocityVectors) {
        updateVectors(velVector, getVelVectorPath, getVelVectorWidth);
      }
      if (drawForceVectors) {
        updateVectors(forceVector, getForceVectorPath, getForceVectorWidth);
      }
      if (drawAtomTrace) {
        updateAtomTrace();
      }
      if(imageProp && imageProp.length !== 0) {
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
      update: update,
      repaint: repaint,
      reset: reset,
      model2px: modelView.model2px,
      model2pxInv: modelView.model2pxInv
    };

    // Initialization.
    init();

    return api;
  };
});

/*global $ alert define: false, d3: false */
// ------------------------------------------------------------
//
//   MD2D View Renderer
//
// ------------------------------------------------------------
define(function (require) {
  // Dependencies.
  var labConfig             = require('lab.config'),
      console               = require('common/console'),
      layout                = require('common/layout/layout'),
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

  return function MD2DView(model, containers, model2px, model2pxInv) {
        // Public API object to be returned.
    var api = {},

        // The model function get_results() returns a 2 dimensional array
        // of particle indices and properties that is updated every model tick.
        // This array is not garbage-collected so the view can be assured that
        // the latest modelResults will be in this array when the view is executing
        modelResults,
        modelElements,
        modelWidth,
        modelHeight,
        aspectRatio,

        // "Containers" - SVG g elements used to position layers of the final visualization.
        mainContainer        = containers.mainContainer,
        radialBondsContainer = containers.radialBondsContainer,
        VDWLinesContainer    = containers.VDWLinesContainer,
        imageContainerBelow  = containers.imageContainerBelow,
        imageContainerTop    = containers.imageContainerTop,
        textContainerBelow   = containers.textContainerBelow,
        textContainerTop     = containers.textContainerTop,

        emsize,

        dragOrigin,

        // Renderers specific for MD2D
        // TODO: for now only DNA is rendered in a separate class, try to create
        // new renderers in separate files for clarity and easier testing.
        geneticRenderer,

        gradientNameForElement,
        // Set of gradients used for Kinetic Energy Shading.
        gradientNameForKELevel = [],
        // Number of gradients used for Kinetic Energy Shading.
        KE_SHADING_STEPS = 25,
        // Array which defines a gradient assigned to a given particle.
        gradientNameForParticle = [],

        atomTooltipOn,

        particle, label, labelEnter,
        moleculeDiv, moleculeDivPre,

        // for model clock
        timeLabel,
        modelTimeFormatter = d3.format("5.1f"),
        timePrefix = "",
        timeSuffix = " (ps)",

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
        imageSizes = [],
        textBoxes,
        imagePath,
        drawAtomTrace,
        atomTraceId,
        atomTraceColor,
        atomTrace,
        atomTracePath,
        showClock,

        VELOCITY_STR = "velocity",
        FORCE_STR    = "force";


    function modelTimeLabel() {
      return timePrefix + modelTimeFormatter(model.get('time')/1000) + timeSuffix;
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

      gy.exit().remove();
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

    function createAdditionalGradients() {
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

      for (i= 0; i < 4; i++) {
        createElementColorGradient("elem" + i + "-grad", modelElements.color[i], mainContainer);
      }
      gradientNameForElement = ["url(#elem0-grad)", "url(#elem1-grad)", "url(#elem2-grad)", "url(#elem3-grad)"];
    }

    function createVectorArrowHeads(color, name) {
      var arrowHead = mainContainer.append("defs")
        .append("marker")
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
    // IMPORTANT: use percentage values whenever possible,
    // especially for *height* attribute!
    // It will allow to properly calculate images
    // placement in drawSymbolImages() function.
    function createSymbolImages() {
      var xMargin = "1%";
      // only add these images if they don't already exist
      if ($("#heat-bath").length === 0) {
        // Heat bath key image.
        mainContainer.append("image")
            .attr({
              "id": "heat-bath",
              "x": xMargin,
              "width": "3%",
              "height": "3%",
              "preserveAspectRatio": "xMinYMin",
              "xlink:href": "../../resources/heatbath.gif"
            });
      }
      if ($("#ke-gradient").length === 0) {
        // Kinetic Energy Shading gradient image.
        mainContainer.append("image")
            .attr({
              "id": "ke-gradient",
              "x": xMargin,
              "width": "12%",
              "height": "12%",
              "preserveAspectRatio": "xMinYMin",
              "xlink:href": "../../resources/ke-gradient.png"
            });
      }
    }

    // Draw key images in the upper left corner.
    // Place them in one row, dynamically calculate
    // y position.
    function drawSymbolImages() {
        var heatBath = model.get('temperatureControl'),
            imageSelect, imageHeight,
            // Variables used for calculating proper y positions.
            // The unit for these values is percentage points!
            yPos = 0,
            yMargin = 1;

        // Heat bath symbol.
        if (heatBath) {
            yPos += yMargin;
            imageSelect = d3.select("#heat-bath")
              .attr("y", yPos + "%")
              .style("display", "");

            imageHeight = imageSelect.attr("height");
            // Truncate % symbol and convert to Number.
            imageHeight = Number(imageHeight.substring(0, imageHeight.length - 1));
            yPos += imageHeight;
        } else {
            d3.select("#heat-bath").style("display","none");
        }

        // Kinetic Energy shading gradient.
        // Put it under heat bath symbol.
        if (keShadingMode) {
            yPos += yMargin;
            d3.select("#ke-gradient")
              .attr("y", yPos + "%")
              .style("display", "");
        } else {
            d3.select("#ke-gradient").style("display", "none");
        }
    }

    function updateParticleRadius() {
      mainContainer.selectAll("circle").data(modelResults).attr("r",  function(d) { return model2px(d.radius); });
    }

    /**
      Call this wherever a d3 selection is being used to add circles for atoms
    */

    function particleEnter() {
      particle.enter().append("circle")
          .attr({
            "class": function (d) { return d.isAminoAcid() ? "draggable amino-acid" : "draggable"; },
            "r":  function(d) { return model2px(d.radius); },
            "cx": function(d) { return model2px(d.x); },
            "cy": function(d) { return model2pxInv(d.y); }
          })
          .style({
            "fill-opacity": function(d) { return d.visible; },
            "fill": function (d, i) { return gradientNameForParticle[i]; }
          })
          .on("mousedown", moleculeMouseDown)
          .on("mouseover", moleculeMouseOver)
          .on("mouseout", moleculeMouseOut)
          .call(d3.behavior.drag()
            .on("dragstart", nodeDragStart)
            .on("drag", nodeDrag)
            .on("dragend", nodeDragEnd)
          );
    }

    function vectorEnter(vector, pathFunc, widthFunc, color, name) {
      vector.enter().append("path")
        .attr({
          "class": "vector-"+name,
          "marker-end": "url(#Triangle-"+name+")",
          "d": pathFunc
        })
        .style({
          "stroke-width": widthFunc,
          "stroke": color,
          "fill": "none"
        });
    }

    function atomTraceEnter() {
      atomTrace.enter().append("path")
        .attr({
          "class": "atomTrace",
          "d": getAtomTracePath
        })
        .style({
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
          "height": function(d, i) {return model2px(obstacles.height[i]); }
        })
        .style({
          "fill": function(d, i) { return obstacles.visible[i] ? getObstacleColor(i) : "rgba(128,128,128, 0)"; },
          "stroke-width": function(d, i) { return obstacles.visible[i] ? 0.2 : 0.0; },
          "stroke": function(d, i) { return obstacles.visible[i] ? getObstacleColor(i) : "rgba(128,128,128, 0)"; }
        });

      // Append external force markers.
      obstacleGroup.each(function (d, i) {
        // Fast path, if no forces are defined.
        if (!obstacles.externalFx[i] && !obstacles.externalFy[i])
          return;

        // Note that arrows indicating obstacle external force use
        // the same options for styling like arrows indicating atom force.
        // Only their length is fixed.
        var obstacleGroupEl = d3.select(this),
            obsHeight = obstacles.height[i],
            obsWidth = obstacles.width[i],
            obsFx = obstacles.externalFx[i],
            obsFy = obstacles.externalFy[i],
            // Use fixed length of force vectors (in nm).
            vecLen = 0.06,
            space = 0.06,
            step, coords;

        // Set arrows indicating horizontal force.
        if (obsFx) {
          // Make sure that arrows keep constant distance between both ends of an obstacle.
          step = (obsHeight - 2 * space) / Math.round((obsHeight - 2 * space) / 0.2);
          coords = d3.range(space, obsHeight, step);
          obstacleGroupEl.selectAll("path.obstacle-force-hor").data(coords).enter().append("path")
            .attr({
              "class": "obstacle-force-hor",
              "d": function (d) {
                if (obsFx < 0)
                  return "M " + model2px(obsWidth + vecLen + space) + "," + model2px(d) + " L " + model2px(obsWidth + space) + "," + model2px(d);
                else
                  return "M " + model2px(-vecLen - space) + "," + model2px(d) + " L " + model2px(-space) + "," + model2px(d);
              }
            });
        }
        // Later set arrows indicating vertical force.
        if (obsFy) {
          // Make sure that arrows keep constant distance between both ends of an obstacle.
          step = (obsWidth - 2 * space) / Math.round((obsWidth - 2 * space) / 0.2);
          coords = d3.range(space, obsWidth, step);
          obstacleGroupEl.selectAll("path.obstacle-force-vert").data(coords).enter().append("path")
            .attr({
              "class": "obstacle-force-vert",
              "d": function (d) {
                if (obsFy < 0)
                  return "M " + model2px(d) + "," + model2px(-vecLen - space) + " L " + model2px(d) + "," + model2px(-space);
                else
                  return "M " + model2px(d) + "," + model2px(obsHeight + vecLen + space) + " L " + model2px(d) + "," + model2px(obsHeight + space);
              }
            });
        }
        // Finally, set common attributes and stying for both vertical and horizontal forces.
        obstacleGroupEl.selectAll("path.obstacle-force-hor, path.obstacle-force-vert")
          .attr({
            "marker-end": "url(#Triangle-"+ FORCE_STR +")"
          })
          .style({
            "stroke-width": model2px(forceVectorWidth),
            "stroke": forceVectorColor,
            "fill": "none"
          });
      });
    }

    function radialBondEnter() {
      radialBond1.enter().append("path")
          .attr("d", function (d) {
            return findPoints(d,1);})
          .classed("radialbond1", true)
          .classed("disulphideBond", function (d) {
            return d.type === RADIAL_BOND_TYPES.DISULPHIDE_BOND;
          })
          .style("stroke-width", function (d) {
            if (isSpringBond(d)) {
              return Math.log(d.strength) / 4 + model2px(0.005);
            } else {
              return model2px(Math.min(modelResults[d.atom1].radius, modelResults[d.atom2].radius)) * 0.75;
            }
          })
          .style("stroke", getBondAtom1Color)
          .style("fill", "none");

      radialBond2.enter().append("path")
          .attr("d", function (d) {
            return findPoints(d,2); })
          .classed("radialbond2", true)
          .classed("disulphideBond", function (d) {
            return d.type === RADIAL_BOND_TYPES.DISULPHIDE_BOND;
          })
          .style("stroke-width", function (d) {
            if (isSpringBond(d)) {
              return Math.log(d.strength) / 4 + model2px(0.005);
            } else {
              return model2px(Math.min(modelResults[d.atom1].radius, modelResults[d.atom2].radius)) * 0.75;
            }
          })
          .style("stroke", getBondAtom2Color)
          .style("fill", "none");
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

      radius_x1 = model2px(modelResults[d.atom1].radius) * costheta;
      radius_x2 = model2px(modelResults[d.atom2].radius) * costheta;
      radius_y1 = model2px(modelResults[d.atom1].radius) * sintheta;
      radius_y2 = model2px(modelResults[d.atom2].radius) * sintheta;
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

    function vdwLinesEnter() {
      // update existing lines
      vdwLines.attr({
        "x1": function(d) { return model2px(modelResults[d[0]].x); },
        "y1": function(d) { return model2pxInv(modelResults[d[0]].y); },
        "x2": function(d) { return model2px(modelResults[d[1]].x); },
        "y2": function(d) { return model2pxInv(modelResults[d[1]].y); }
      });

      // append new lines
      vdwLines.enter().append('line')
        .attr({
          "class": "attractionforce",
          "x1": function(d) { return model2px(modelResults[d[0]].x); },
          "y1": function(d) { return model2pxInv(modelResults[d[0]].y); },
          "x2": function(d) { return model2px(modelResults[d[1]].x); },
          "y2": function(d) { return model2pxInv(modelResults[d[1]].y); }
        })
        .style({
          "stroke-width": model2px(0.02),
          "stroke-dasharray": model2px(0.03) + " " + model2px(0.02)
        });

      // remove old lines
      vdwLines.exit().remove();
    }

    function getImagePath(imgProp) {
      return imagePath + (imageMapping[imgProp.imageUri] || imgProp.imageUri);
    }

    function drawImageAttachment() {
      var img = [],
          img_height,
          img_width,
          imgHost,
          imgHostType,
          imglayer,
          imgX, imgY,
          container,
          i;

      imageContainerTop.selectAll("image").remove();
      imageContainerBelow.selectAll("image").remove();

      if (!imageProp) return;

      for (i = 0; i < imageProp.length; i++) {
        img[i] = new Image();
        img[i].src = getImagePath(imageProp[i]);
        img[i].onload = (function(i) {
          return function() {
            imageContainerTop.selectAll("image.image_attach"+i).remove();
            imageContainerBelow.selectAll("image.image_attach"+i).remove();

            imgHost = modelResults[imageProp[i].imageHostIndex];
            imgHostType = imageProp[i].imageHostType;
            imglayer = imageProp[i].imageLayer;
            imgX = model2px(imageProp[i].imageX);
            imgY = model2pxInv(imageProp[i].imageY);
            // Cache the image width and height.
            // In Classic MW model size is defined in 0.1A.
            // Model unit (0.1A) - pixel ratio is always 1. The same applies
            // to images. We can assume that their pixel dimensions are
            // in 0.1A also. So convert them to nm (* 0.01).
            imageSizes[i] = [0.01 * img[i].width, 0.01 * img[i].height];
            img_width = model2px(imageSizes[i][0]);
            img_height = model2px(imageSizes[i][1]);

            container = imglayer === 1 ? imageContainerTop : imageContainerBelow;
            container.append("image")
              .attr("x", function() { if (imgHostType === "") { return imgX; } else { return model2px(imgHost.x) - img_width / 2; } })
              .attr("y", function() { if (imgHostType === "") { return imgY; } else { return model2pxInv(imgHost.y) - img_height / 2; } })
              .attr("class", "image_attach"+i+" draggable")
              .attr("xlink:href", img[i].src)
              .attr("width", img_width)
              .attr("height", img_height)
              .attr("pointer-events", "none");
          };
        })(i);
      }
    }

    function getTextBoxCoords(d, i) {
      var x, y, frameX, frameY;
      if (d.hostType) {
        if (d.hostType === "Atom") {
          x = modelResults[d.hostIndex].x;
          y = modelResults[d.hostIndex].y;
        } else {
          x = obstacles.x[d.hostIndex] + (obstacles.width[d.hostIndex] / 2);
          y = obstacles.y[d.hostIndex] + (obstacles.height[d.hostIndex] / 2);
        }
      } else {
        x = d.x;
        y = d.y;
      }
      frameX = x - 0.1;
      frameY = y + 0.15;
      return [model2px(x), model2pxInv(y), model2px(frameX), model2pxInv(frameY)];
    }

    function updateTextBoxes() {
      var layers = [textContainerTop, textContainerBelow],
          updateText;

      updateText = function (layerNum) {
        var layer = layers[layerNum - 1];

        layerTextBoxes = textBoxes.filter(function(t) { return t.layer == layerNum; });

        layer.selectAll("g.textBoxWrapper rect")
          .data(layerTextBoxes.filter( function(d) { return d.frame; } ))
          .attr({
            "x": function(d,i) { return getTextBoxCoords(d,i)[2]; },
            "y": function(d,i) { return getTextBoxCoords(d,i)[3]; }
          });

        layer.selectAll("g.textBoxWrapper text")
          .data(layerTextBoxes)
          .attr({
            "y": function(d,i) {
              $(this).find("tspan").attr("x", getTextBoxCoords(d,i)[0]);
              return getTextBoxCoords(d,i)[1];
            }
          });
      };

      updateText(1);
      updateText(2);
    }

    function drawTextBoxes() {
      var size, layers, appendTextBoxes;

      textBoxes = model.get('textBoxes');

      size = model.size();

      layers = [textContainerTop, textContainerBelow];

      // Append to either top or bottom layer depending on item's layer #.
      appendTextBoxes = function (layerNum) {
        var layer = layers[layerNum - 1],
            text, layerTextBoxes, selection;

        layer.selectAll("g.textBoxWrapper").remove();

        layerTextBoxes = textBoxes.filter(function(t) { return t.layer == layerNum; });

        selection = layer.selectAll("g.textBoxWrapper")
          .data(layerTextBoxes);
        text = selection.enter().append("svg:g")
          .attr("class", "textBoxWrapper");

        text.filter(function (d) { return d.frame; })
          .append("rect")
          .attr({
            "class": function(d, i) { return "textBoxFrame text-"+i; },
            "style": function(d) {
              var backgroundColor = d.backgroundColor || "white";
              return "fill:"+backgroundColor+";opacity:1.0;fill-opacity:1;stroke:#000000;stroke-width:0.5;stroke-opacity:1";
            },
            "width": 0,
            "height": 0,
            "rx": function(d)  { return d.frame == "rounded rectangle" ? 8  : 0; },
            "ry": function(d)  { return d.frame == "rounded rectangle" ? 10 : 0; },
            "x": function(d,i) { return getTextBoxCoords(d,i)[2]; },
            "y": function(d,i) { return getTextBoxCoords(d,i)[3]; }
          });

        text.append("text")
          .attr({
            "class": function() { return "textBox" + (AUTHORING ? " draggable" : ""); },
            "x-data": function(d,i) { return getTextBoxCoords(d,i)[0]; },
            "y": function(d,i)      { return getTextBoxCoords(d,i)[1]; },
            "width-data": function(d) { return model2px(d.width); },
            "width":  model2px(size[0]),
            "height": model2px(size[1]),
            "xml:space": "preserve",
            "font-family": "'Open Sans', sans-serif",
            "font-size": model2px(0.12),
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

      // wrap text
      $(".textBox").each( function() {
        var text  = this.getAttributeNS(null, "text-data"),
            x     = this.getAttributeNS(null, "x-data"),
            width = this.getAttributeNS(null, "width-data") || -1,
            dy    = model2px(0.16),
            hasHost = this.getAttributeNS(null, "has-host"),
            textAlign = this.getAttributeNS(null, "text-anchor"),
            result, frame, dx;

        while (this.firstChild) {     // clear element first
          this.removeChild(this.firstChild);
        }

        result = wrapSVGText(text, this, width, x, dy);

        if (this.parentNode.childElementCount > 1) {
          frame = this.parentNode.childNodes[0];
          frame.setAttributeNS(null, "width", result.width + model2px(0.2));
          frame.setAttributeNS(null, "height", (result.lines * dy) + model2px(0.06));
        }

        // center all hosted labels simply by tweaking the g.transform
        if (textAlign === "middle") {
          dx = result.width / 2;
          $(this).attr("transform", "translate("+dx+",0)");
        }
        if (hasHost === "true") {
          dx = -result.width / 2;
          dy = (result.lines-1) * dy / -2 + 4.5;
          $(this.parentNode).attr("transform", "translate("+dx+","+dy+")");
        }
      });
    }

    function setupColorsOfParticles() {
      var i, len;

      chargeShadingMode = model.get("chargeShading");
      keShadingMode = model.get("keShading");

      gradientNameForParticle.length = modelResults.length;
      for (i = 0, len = modelResults.length; i < len; i++)
        gradientNameForParticle[i] = getParticleGradient(modelResults[i]);
    }

    function setupParticles() {
      var showChargeSymbols = model.get("showChargeSymbols"),
          useThreeLetterCode = model.get("useThreeLetterCode");

      mainContainer.selectAll("circle").remove();
      mainContainer.selectAll("g.label").remove();

      particle = mainContainer.selectAll("circle").data(modelResults);
      updateParticleRadius();

      particleEnter();

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
        velVector = mainContainer.selectAll("path.vector-"+VELOCITY_STR).data(modelResults);
        vectorEnter(velVector, getVelVectorPath, getVelVectorWidth, velocityVectorColor, VELOCITY_STR);
      }
      if (drawForceVectors) {
        forceVector = mainContainer.selectAll("path.vector-"+FORCE_STR).data(modelResults);
        vectorEnter(forceVector, getForceVectorPath, getForceVectorWidth, forceVectorColor, FORCE_STR);
      }
    }

    function setupAtomTrace() {
      mainContainer.selectAll("path.atomTrace").remove();
      atomTracePath = "";

      drawAtomTrace = model.get("showAtomTrace");
      atomTraceId = model.get("atomTraceId");
      if (drawAtomTrace) {
        atomTrace = mainContainer.selectAll("path.atomTrace").data([modelResults[atomTraceId]]);
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
        containers.node.focus();
      }
    }

    function moleculeMouseOver(d, i) {
      if (model.get("enableAtomTooltips")) {
        renderAtomTooltip(i);
      }
    }

    function moleculeMouseDown(d, i) {
      containers.node.focus();
      if (model.get("enableAtomTooltips")) {
        if (atomTooltipOn !== false) {
          moleculeDiv.style("opacity", 1e-6);
          moleculeDiv.style("display", "none");
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
      moleculeDiv
            .style("opacity", 1.0)
            .style("display", "inline")
            .style("background", "rgba(100%, 100%, 100%, 0.7)")
            .style("left", model2px(modelResults[i].x) + 60 + "px")
            .style("top",  model2pxInv(modelResults[i].y) + 30 + "px")
            .style("zIndex", 100)
            .transition().duration(250);

      moleculeDivPre.text(
          "atom: " + i + "\n" +
          "time: " + modelTimeLabel() + "\n" +
          "speed: " + d3.format("+6.3e")(modelResults[i].speed) + "\n" +
          "vx:    " + d3.format("+6.3e")(modelResults[i].vx)    + "\n" +
          "vy:    " + d3.format("+6.3e")(modelResults[i].vy)    + "\n" +
          "ax:    " + d3.format("+6.3e")(modelResults[i].ax)    + "\n" +
          "ay:    " + d3.format("+6.3e")(modelResults[i].ay)    + "\n"
        );
    }

    function moleculeMouseOut() {
      if (!atomTooltipOn && atomTooltipOn !== 0) {
        moleculeDiv.style("opacity", 1e-6).style("zIndex" -1);
      }
    }

    function updateDrawablePositions() {
      console.time('view update');
      if (obstacles) {
        obstacle.attr("transform", function (d, i) {
          return "translate(" + model2px(obstacles.x[i]) + " " + model2pxInv(obstacles.y[i] + obstacles.height[i]) + ")";
        });
      }

      if (drawVdwLines) {
        updateVdwPairs();
      }
      // When Kinetic Energy Shading is enabled, update style of atoms
      // during each frame.
      if (keShadingMode) {
        setupColorsOfParticles();
      }
      if (radialBondResults) {
        updateRadialBonds();
      }
      updateParticles();
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
      console.timeEnd('view update');
    }

    // TODO: this function name seems to be inappropriate to
    // its content.
    function updateParticles() {
      particle.attr({
        "cx": function(d) { return model2px(d.x); },
        "cy": function(d) { return model2pxInv(d.y); }
      });

      if (keShadingMode) {
        // Update particles color. Array of colors should be already updated.
        particle.style("fill", function (d, i) { return gradientNameForParticle[i]; });
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
         "d": pathFunc
      })
      .style({
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
        radialBond1.style("stroke", getBondAtom1Color);
        radialBond2.style("stroke", getBondAtom2Color);
      }
    }

    function updateImageAttachment(){
      var numImages, img_height, img_width, imgHost, imgHostType, imglayer, imgX, imgY, container, i;
      numImages= imageProp.length;
      for(i = 0; i < numImages; i++) {
        if (!imageSizes || !imageSizes[i]) continue;
        imgHost =  modelResults[imageProp[i].imageHostIndex];
        imgHostType =  imageProp[i].imageHostType;
        imgX = model2px(imageProp[i].imageX);
        imgY = model2pxInv(imageProp[i].imageY);
        imglayer = imageProp[i].imageLayer;
        img_width = model2px(imageSizes[i][0]);
        img_height = model2px(imageSizes[i][1]);
        container = imglayer === 1 ? imageContainerTop : imageContainerBelow;
        container.selectAll("image.image_attach"+i)
          .attr("x",  function() { if (imgHostType === "") { return imgX; } else { return model2px(imgHost.x) - img_width / 2; } })
          .attr("y",  function() { if (imgHostType === "") { return imgY; } else { return model2pxInv(imgHost.y) - img_height / 2; } });
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
        updateDrawablePositions();
      }
      else if ( d.draggable ) {
        drag = dragPoint(dragX, dragY);
        model.liveDrag(drag.x, drag.y);
      }
    }

    function textDrag(d, i) {
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
        updateDrawablePositions();
      }
      else if (d.draggable) {
        // here we just assume we are removing the one and only spring force.
        // This assumption will have to change if we can have more than one.
        model.liveDragEnd();
      }
    }

    function setupTooTips() {
      if ( moleculeDiv === undefined) {
        moleculeDiv = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 1e-6);
        moleculeDivPre = moleculeDiv.append("pre");
      }
    }

    function setupClock() {
      var xunitOffset;
      xunitOffset = model.get("xunits") ? 30 : 0;
      // add model time display
      mainContainer.selectAll('.modelTimeLabel').remove();
      // Update clock status.
      showClock = model.get("showClock");
      if (showClock) {
        timeLabel = mainContainer.append("text")
          .attr("class", "modelTimeLabel")
          .text(modelTimeLabel())
          // Set text position to (0nm, 0nm) (model domain) and add small, constant offset in px.
          .attr("x", model2px(0) + 5 * emsize)
          .attr("y", model2pxInv(0) + 30 * emsize + xunitOffset * emsize)
          .style("text-anchor","start");
      }
    }

    function setupRendererOptions() {
      imageProp = model.get("images");
      imageMapping = model.get("imageMapping");
      if (model.url) {
        imagePath = labConfig.actualRoot + model.url.slice(0, model.url.lastIndexOf("/") + 1);
      }

      velocityVectorColor = model.get("velocityVectors").color;
      velocityVectorWidth  = model.get("velocityVectors").width;
      velocityVectorLength = model.get("velocityVectors").length;

      forceVectorColor = model.get("forceVectors").color;
      forceVectorWidth  = model.get("forceVectors").width;
      forceVectorLength = model.get("forceVectors").length;

      atomTraceColor = model.get("atomTraceColor");

      createSymbolImages();
      createVectorArrowHeads(velocityVectorColor, VELOCITY_STR);
      createVectorArrowHeads(forceVectorColor, FORCE_STR);

      createAdditionalGradients();

      // Register additional controls, context menus etc.
      // Note that special selector for class is used. Typical class selectors
      // (e.g. '.amino-acid') cause problems when interacting with SVG nodes.
      amniacidContextMenu.register(model, api, '[class~="amino-acid"]');

      // Initialize renderers.
      geneticRenderer = new GeneticRenderer(mainContainer, api, model);
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
      mainContainer        = containers.mainContainer,
      radialBondsContainer = containers.radialBondsContainer,
      VDWLinesContainer    = containers.VDWLinesContainer,
      imageContainerBelow  = containers.imageContainerBelow,
      imageContainerTop    = containers.imageContainerTop,
      textContainerBelow   = containers.textContainerBelow,
      textContainerTop     = containers.textContainerTop,

      modelResults  = model.get_results();
      modelElements = model.get_elements();
      modelWidth    = model.get('width');
      modelHeight   = model.get('height');
      aspectRatio   = modelWidth / modelHeight;

      setupTooTips();
      setupRendererOptions();

      repaint();

      // Subscribe for model events.
      model.addPropertiesListener(["temperatureControl"], drawSymbolImages);

      // Redraw container each time when some visual-related property is changed.
      model.addPropertiesListener([
        "keShading", "chargeShading", "showChargeSymbols", "useThreeLetterCode",
        "showVDWLines", "VDWLinesCutoff",
        "showVelocityVectors", "showForceVectors",
        "showAtomTrace", "atomTraceId", "aminoAcidColorScheme",
        "showClock", "backgroundColor"],
          repaint);

      model.on('addAtom', repaint);
      model.on('removeAtom', repaint);
      model.on('addRadialBond', setupRadialBonds);
      model.on('removeRadialBond', setupRadialBonds);
      model.on('textBoxesChanged', drawTextBoxes);

    }

    //
    // MD2D Renderer: reset
    //
    // Call when model is reset or reloaded.
    //
    function reset(mod, cont, m2px, m2pxInv) {
      model = mod;
      containers = cont;
      model2px = m2px;
      model2pxInv = m2pxInv;
      init();
    }

    //
    // MD2D Renderer: repaint
    //
    // Call when container being rendered into changes size, in that case
    // pass in new D3 scales for model2pcx transformations.
    //
    // Also call when the number of objects changes suc that the conatiner
    // must be setup again.
    //
    function repaint(m2px, m2pxInv) {
      if (arguments.length) {
        model2px = m2px;
        model2pxInv = m2pxInv;
      }
      emsize = layout.getVizProperties().emsize;
      setupClock();
      setupObstacles();
      setupVdwPairs();
      setupColorsOfParticles();
      setupRadialBonds();
      setupParticles();
      geneticRenderer.setup();
      setupVectors();
      setupAtomTrace();
      drawSymbolImages();
      drawImageAttachment();
      drawTextBoxes();
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
      // When Kinetic Energy Shading is enabled, update style of atoms
      // during each frame.
      if (keShadingMode) {
        setupColorsOfParticles();
      }

      if (radialBondResults) {
        updateRadialBonds();
      }

      // update model time display
      if (showClock) {
        timeLabel.text(modelTimeLabel());
      }

      updateParticles();

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
      console.timeEnd('view update');
    }

    //
    // Public API to instantiated Renderer
    //
    api = {
      // Expose private methods.
      processOptions: processOptions,
      setupDrawables: setupDrawables,
      updateMoleculeRadius: updateMoleculeRadius,
      updateDrawablePositions: updateDrawablePositions,
      scale: scale,
      setFocus: setFocus,
      redraw: redraw,
      resize: function(w, h) {
        // For now (semantic-layout testing) assume all models are "fitToParent"

        // if (model.get("fitToParent")) {
          outerElement.style('width', w+'px');
        // } else {
          // api.scale(w, h);
        // }
        api.processOptions();
        init();
        api.setupDrawables();
      },
      reset: function(newModelUrl, newModel) {
        api.processOptions(newModelUrl, newModel);
        init();
        api.setupDrawables();
        api.updateMoleculeRadius();
      },
      nm2px: function(val) {
        // Note that we shouldn't just do:
        // api.nm2px = nm2px;
        // as nm2px local variable can be reinitialized
        // many times due container rescaling process.
        return model2px(val);
      },
      model2pxInv: function(val) {
        // See comments for nm2px.
        return model2pxInv(val);
      }
    };

    // Initialization.
    init();

    return api;
  };
});

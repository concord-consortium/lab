/*global define: false, d3: false, alert */
/*jshint multistr: true */

define(function(require) {
  // Dependencies.
  var PIXI     = require('pixi'),
      canvg    = require('canvg'),
      mustache = require('mustache'),

      atomSVG =
      '<svg x="0px" y="0px" width="{{ width }}px" height="{{ height }}px" \
       viewBox="0 0 32 32" xml:space="preserve"> \
         <defs> \
           <radialGradient id="grad" cx="50%" cy="47%" r="53%" fx="35%" fy="30%"> \
           <stop stop-color="{{ lightCol }}" offset="0%"></stop> \
           <stop stop-color="{{ medCol }}" offset="40%"></stop> \
           <stop stop-color="{{ darkCol }}" offset="80%"></stop> \
           <stop stop-color="{{ medCol }}" offset="100%"></stop> \
           </radialGradient> \
         </defs> \
         <circle fill="url(#grad)" cx="16" cy="16" r="15" fill-opacity="{{ opacity }}"/> \
       </svg>',

      // Scale used for Kinetic Energy Shading gradients.
      KE_SHADING_STEPS = 25,
      keMedColor = d3.scale.linear()
        .interpolate(d3.interpolateRgb)
        .range(["#F2F2F2", "#FF8080"]),
      keDarkColor = d3.scale.linear()
        .interpolate(d3.interpolateRgb)
        .range(["#A4A4A4", "#FF2020"]),

      FONT_FAMILY = " Lato",

      RENDERING_OPTIONS = ["keShading", "atomNumbers", "showChargeSymbols", "useThreeLetterCode"];

  return function AtomsRenderer(modelView, model) {
    // Public API object to be returned.
    var api,

        container,

        m2px,
        m2pxInv,

        modelAtoms,
        viewAtoms,

        elementTex = {},

        // Rendering options:
        renderMode = {};

    function init() {
      readRenderingOptions();
      // Modes require .setup() call:
      model.addPropertiesListener(RENDERING_OPTIONS, function () {
        readRenderingOptions();
        api.setup();
        modelView.renderCanvas();
      });
    }

    function readRenderingOptions() {
      RENDERING_OPTIONS.forEach(function (name) {
        renderMode[name] = model.get(name);
      });
    }

    function getAtomColors(i) {
      var elID = modelAtoms[i].element,
          props = model.getElementProperties(elID),
          colorStr, color,
          ke, keIndex;


      if (renderMode.keShading) {
        ke = model.getAtomKineticEnergy(i);
        // Convert Kinetic Energy to [0, 1] range
        // using empirically tested transformations.
        // K.E. shading should be similar to the classic MW K.E. shading.
        keIndex = Math.round(Math.min(5 * ke, 1) * KE_SHADING_STEPS);
        keIndex /= KE_SHADING_STEPS;
        return ["#ffffff", keMedColor(keIndex), keDarkColor(keIndex)];
      } else {
        colorStr = (props.color + Math.pow(2, 24)).toString(16);
        colorStr = "000000".substr(0, 6 - colorStr.length) + colorStr;
        color = d3.rgb("#" + colorStr);
        return [color.brighter(1).toString(), color.toString(), color.darker(1).toString()];
      }
    }

    function getAtomTexture(i) {
      var elID = modelAtoms[i].element,
          radius = m2px(model.getElementProperties(elID).radius),
          colors = getAtomColors(i, elID),
          visible = modelAtoms[i].visible,
          key = visible ? (elID + "-" + radius + "-" + colors.join("")) : (radius + "-invisible");

      if (elementTex[key] === undefined) {
        var canv = document.createElement("canvas"),
            tplData;

        tplData = {
          width: 2 * radius,
          height: 2 * radius,
          lightCol: colors[0],
          medCol: colors[1],
          darkCol: colors[2],
          opacity: visible
        };

        canvg(canv, mustache.render(atomSVG, tplData));
        elementTex[key] = new PIXI.Texture.fromCanvas(canv);
      }
      return elementTex[key];
    }

    function getAtomLabel(i) {
      var text, textShadow,
          textVal,
          sizeRatio;

      if (renderMode.atomNumbers) {
        textVal = i;
        sizeRatio = 1.3;
      } else if (renderMode.useThreeLetterCode && modelAtoms[i].label) {
        textVal = modelAtoms[i].label;
        sizeRatio = 1;
      } else if (!renderMode.useThreeLetterCode && modelAtoms[i].symbol) {
        textVal = modelAtoms[i].symbol;
        sizeRatio = 1.4;
      } else if (renderMode.showChargeSymbols) {
        if (modelAtoms[i].charge > 0) {
          textVal = "+";
        } else if (modelAtoms[i].charge < 0) {
          textVal = "-";
        } else {
          return null;
        }
        sizeRatio = 1.6;
      } else {
        return null;
      }

      textShadow = new PIXI.Text(textVal, {
        font: "bold " + m2px(sizeRatio * modelAtoms[i].radius) + "px " + FONT_FAMILY,
        fill: "#fff"
      });
      textShadow.anchor.x = 0.5;
      textShadow.anchor.y = 0.5;

      text = new PIXI.Text(textVal, {
        font: "bold " + m2px(sizeRatio * modelAtoms[i].radius) + "px " + FONT_FAMILY,
        fill: "#444"
      });
      text.anchor.x = 0.52;
      text.anchor.y = 0.52;

      textShadow.addChild(text);
      return textShadow;
    }

    function mouseDown(data) {
      if (model.isStopped()) {
        this.dragging = true;
        this.originX = modelAtoms[this.i].x;
        this.originY = modelAtoms[this.i].y;
      } else if (modelAtoms[this.i].draggable) {
        this.dragging = true;
        model.liveDragStart(this.i);
      }
    }

    function mouseMove(data) {
      if(this.dragging) {
        var newPosition = data.getLocalPosition(this.parent),
            x = m2px.invert(newPosition.x),
            y = m2pxInv.invert(newPosition.y);

        if (model.isStopped()) {
          setAtomPosition(this.i, x, y, false, true);
          modelView.update();
        } else {
          model.liveDrag(x, y);
        }
      }
    }

    function mouseUp(data)
    {
      if (this.dragging) {
        var newPosition = data.getLocalPosition(this.parent),
            x = m2px.invert(newPosition.x),
            y = m2pxInv.invert(newPosition.y);

        this.dragging = false;

        if (model.isStopped()) {
          if (!setAtomPosition(this.i, x, y, true, true)) {
            alert("You can't drop the atom there"); // should be changed to a nice Lab alert box
            setAtomPosition(this.i, this.originX, this.originY, false, true);
            modelView.update();
          }
        } else {
          model.liveDragEnd();
        }
      }
    }

    function setAtomPosition(i, xpos, ypos, checkPosition, moveMolecule) {
      return model.setAtomProperties(i, {
        x: xpos,
        y: ypos
      }, checkPosition, moveMolecule);
    }

    api = {
      setup: function () {
        var i, len, atom, text;

        if (container) {
          modelView.pixiStage.removeChild(container);
        }
        container = new PIXI.DisplayObjectContainer();
        modelView.pixiStage.addChild(container);

        m2px = modelView.model2canvas;
        m2pxInv = modelView.model2canvasInv;
        viewAtoms = [];
        modelAtoms = model.getAtoms();

        for (i = 0, len = modelAtoms.length; i < len; ++i) {
          atom = new PIXI.Sprite(getAtomTexture(i));
          atom.anchor.x = 0.5;
          atom.anchor.y = 0.5;

          atom.i = i;

          atom.setInteractive(true);
          atom.mousedown = atom.touchstart = mouseDown;
          atom.mouseup = atom.mouseupoutside = atom.touchend = atom.touchendoutside = mouseUp;
          atom.mousemove = atom.touchmove = mouseMove;

          text = getAtomLabel(i);
          if (text) {
            atom.addChild(text);
          }

          viewAtoms.push(atom);
          container.addChild(atom);
        }

        api.update();
      },

      bindModel: function (newModel) {
        model = newModel;
        init();
      },

      update: function () {
        var i, len;

        for (i = 0, len = viewAtoms.length; i < len; ++i) {
          viewAtoms[i].position.x = m2px(modelAtoms[i].x);
          viewAtoms[i].position.y = m2pxInv(modelAtoms[i].y);

          if (renderMode.keShading) {
            viewAtoms[i].setTexture(getAtomTexture(i));
          }
        }
      }
    };

    init();

    return api;
  };
});
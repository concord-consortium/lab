/*global define: false, d3: false */
/*jshint multistr: true */

define(function(require) {
  // Dependencies.
  var PIXI     = require('pixi'),
      canvg    = require('canvg'),
      mustache = require('mustache'),
      AtomsInteractions = require('md2d/views/atoms-interactions'),
      detectFontChange = require('common/layout/detect-font-change'),

      atomSVG =
      '<svg x="0px" y="0px" width="{{ width }}px" height="{{ height }}px" \
       viewBox="0 0 32 32" xml:space="preserve"> \
        <style type="text/css"> \
        <![CDATA[ \
          text { \
            font-family: Lato, "Open Sans", helvetica, sans-serif; \
            font-size: {{ fontSize }}px; \
            font-weight: bold; \
            fill: #222; \
          } \
          .shadow { \
            stroke: rgba(255, 255, 255, 0.7); \
            stroke-width: 3px; \
          } \
        ]]> \
        </style> \
         <defs> \
            <radialGradient id="grad" cx="50%" cy="47%" r="53%" fx="35%" fy="30%"> \
              <stop stop-color="{{ lightCol }}" offset="0%"></stop> \
              <stop stop-color="{{ medCol }}" offset="40%"></stop> \
              <stop stop-color="{{ darkCol }}" offset="80%"></stop> \
              <stop stop-color="{{ medCol }}" offset="100%"></stop> \
            </radialGradient> \
         </defs> \
         {{#excited}} \
          <circle fill="#ffe600" cx="16" cy="16" r="12" fill-opacity="{{ opacity }}"/> \
          <circle fill="url(#grad)" cx="16" cy="16" r="8" fill-opacity="{{ opacity }}"/> \
         {{/excited}} \
         {{^excited}} \
          <circle fill="url(#grad)" cx="16" cy="16" r="16" fill-opacity="{{ opacity }}"/> \
         {{/excited}} \
         <text class="shadow" text-anchor="middle" x="16" y="16" dy="0.31em">{{ label }}</text> \
         <text text-anchor="middle" x="16" y="16" dy="0.31em">{{ label }}</text> \
       </svg>',

      KE_SHADING_MIN_COLORS = ["#FFFFFF", "#F2F2F2", "#A4A4A4"],
      KE_SHADING_MAX_COLORS = ["#FFFFFF", "#FF8080", "#FF2020"],

      // Scales used for Charge Shading gradients.
      CHARGE_SHADING_STEPS = 25,
      NEUTRAL_COLORS = ["#FFFFFF", "#f2f2f2", "#A4A4A4"],
      posLightColor = d3.scale.linear()
        .interpolate(d3.interpolateRgb)
        .range(["#FFFFFF", "#ffefff"]),
      posMedColor = d3.scale.linear()
        .interpolate(d3.interpolateRgb)
        .range(["#f2f2f2", "#9090FF"]),
      posDarkColor = d3.scale.linear()
        .interpolate(d3.interpolateRgb)
        .range(["#A4A4A4", "#3030FF"]),
      negLightColor = d3.scale.linear()
        .interpolate(d3.interpolateRgb)
        .range(["#FFFFFF", "#dfffff"]),
      negMedColor = d3.scale.linear()
        .interpolate(d3.interpolateRgb)
        .range(["#f2f2f2", "#FF8080"]),
      negDarkColor = d3.scale.linear()
        .interpolate(d3.interpolateRgb)
        .range(["#A4A4A4", "#FF2020"]),

      getChargeShadingColors = function (charge) {
        var chargeIndex = Math.round(Math.min(Math.abs(charge) / 3, 1) * CHARGE_SHADING_STEPS);
        chargeIndex /= CHARGE_SHADING_STEPS;
        if (charge > 0) {
          return [posLightColor(chargeIndex), posMedColor(chargeIndex), posDarkColor(chargeIndex)];
        } else if (charge < 0) {
          return [negLightColor(chargeIndex), negMedColor(chargeIndex), negDarkColor(chargeIndex)];
        }
        return NEUTRAL_COLORS;
      },

      getHydrophobicityColors = function (h) {
        return h > 0 ?  ["#F0E6D1", "#E0A21B", "#AD7F1C"] : ["#dfffef", "#75a643", "#2a7216"];
      },

      RENDERING_OPTIONS = ["keShading", "chargeShading", "atomNumbers", "showChargeSymbols",
                           "aminoAcidColorScheme", "useThreeLetterCode", "viewPortZoom"];

  return function AtomsRenderer(modelView, model, pixiContainer, canvas) {
    // Public API object to be returned.
    var api,

        container,

        m2px,
        m2pxInv,

        modelAtoms,
        viewAtoms,

        elementTex = {},

        modelWidth,
        modelHeight,

        // Rendering options:
        renderMode = {},

        interactions = new AtomsInteractions(modelView, model, canvas);

    function init() {
      modelWidth = model.get("width");
      modelHeight = model.get("height");
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
      var atom = modelAtoms[i],
          elID = atom.element,
          props = model.getElementProperties(elID),
          colorStr, color;

      if (atom.marked) {
        colorStr = model.get("markColor");
        color = d3.rgb(colorStr);
        return [color.brighter(1).toString(), color.toString(), color.darker(1).toString()];
      }

      if (atom.aminoAcid) {
        switch(renderMode.aminoAcidColorScheme) {
          case "charge":
            return getChargeShadingColors(atom.charge);
          case "hydrophobicity":
            return getHydrophobicityColors(atom.hydrophobicity);
          case "chargeAndHydro":
            if (atom.charge !== 0) {
              return getChargeShadingColors(atom.charge);
            }
            return getHydrophobicityColors(atom.hydrophobicity);
          // case "none":
          // Do nothing, default rendering will be used.
        }
      }

      if (renderMode.keShading) {
        return KE_SHADING_MIN_COLORS;
      } else if (renderMode.chargeShading) {
        return getChargeShadingColors(atom.charge);
      } else {
        // Weird conversion, as we use color values literally imported from Classic MW. Perhaps we
        // should do that in MML -> JSON converter.
        colorStr = (props.color + Math.pow(2, 24)).toString(16);
        colorStr = "000000".substr(0, 6 - colorStr.length) + colorStr;
        color = d3.rgb("#" + colorStr);
        return [color.brighter(1).toString(), color.toString(), color.darker(1).toString()];
      }
    }

    function getAtomTexture(i, colors) {
      var elID = modelAtoms[i].element,
          radius = m2px(model.getElementProperties(elID).radius),
          visible = modelAtoms[i].visible,
          excitation = modelAtoms[i].excitation,
          label = getAtomLabel(i),
          key;

      colors = colors || getAtomColors(i);
      key = visible ? (elID + "-" + radius + "-" + colors.join("") + "-" + label.text + "-" + excitation + "-" + label.fontSize) :
                      (radius + "-invisible");

      if (elementTex[key] === undefined) {
        var canv = document.createElement("canvas"),
            tplData;

        // Would be nice to use same text below as in atomSVG. However, detection doesn't appear to
        // work if we supply multiple font-families to detectFontChange, so we need to watch changes
        // to each font family separately.
        watchFont("bold " + label.fontSize + "px Lato");
        watchFont("bold " + label.fontSize + "px \"Open Sans\"");

        tplData = {
          width: excitation ? 4 * radius : 2 * radius,
          height: excitation ? 4 * radius : 2 * radius,
          lightCol: colors[0],
          medCol: colors[1],
          darkCol: colors[2],
          opacity: Number(visible),
          label: label.text,
          fontSize: label.fontSize,
          excited: excitation
        };

        canvg(canv, mustache.render(atomSVG, tplData));
        elementTex[key] = new PIXI.Texture.fromCanvas(canv);
      }
      return elementTex[key];
    }

    // TODO rename?
    function clearTextureCacheAndRedraw() {
      elementTex = {};

      viewAtoms.forEach(function(atom, i) {
        atom.setTexture(getAtomTexture(i));
      });
      modelView.renderCanvas();
    }

    function watchFont(font) {
      detectFontChange({
        font: font,
        onchange: clearTextureCacheAndRedraw
      });
    }

    function getAtomLabel(i) {
      var textVal = "",
          sizeRatio = 0;

      if (renderMode.atomNumbers) {
        textVal = i;
        sizeRatio = 1.2;
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
        }
        sizeRatio = 1.6;
      }

      return {
        text: textVal,
        fontSize: sizeRatio * 16 // In fact: sizeRatio * atom radius. The value 16 is based on the
                                 // current SVG viewBox and <circle> "r" property.
      };
    }

    api = {
      setup: function () {
        var i, len, atom, keSprite;

        if (container) {
          pixiContainer.removeChild(container);
        }
        container = new PIXI.DisplayObjectContainer();
        pixiContainer.addChild(container);

        m2px = modelView.model2canvas;
        m2pxInv = modelView.model2canvasInv;

        viewAtoms = [];
        modelAtoms = model.getAtoms();

        for (i = 0, len = modelAtoms.length; i < len; ++i) {
          atom = new PIXI.Sprite(getAtomTexture(i));
          atom.anchor.x = 0.5;
          atom.anchor.y = 0.5;

          atom.i = i;

          if (renderMode.keShading) {
            keSprite = new PIXI.Sprite(getAtomTexture(i, KE_SHADING_MAX_COLORS));
            keSprite.anchor.x = 0.5;
            keSprite.anchor.y = 0.5;
            atom.keSprite = keSprite;
            atom.addChild(keSprite);
          }

          viewAtoms.push(atom);
          container.addChild(atom);
        }

        api.update();
      },

      bindModel: function (newModel) {
        model = newModel;
        init();

        interactions.bindModel(newModel);
      },

      update: function () {
        var i, len, viewAtom, x, y;

        for (i = 0, len = viewAtoms.length; i < len; ++i) {
          viewAtom = viewAtoms[i];
          x = m2px(modelAtoms[i].x);
          y = m2pxInv(modelAtoms[i].y);

          viewAtom.position.x = x;
          viewAtom.position.y = y;

          if (renderMode.keShading) {
            viewAtom.keSprite.alpha = Math.min(5 * model.getAtomKineticEnergy(i), 1);
          }

          if (model.properties.useQuantumDynamics) {
            viewAtoms[i].setTexture(getAtomTexture(i));
          }
        }
      },

      getAtomColors: getAtomColors
    };

    init();

    return api;
  };
});

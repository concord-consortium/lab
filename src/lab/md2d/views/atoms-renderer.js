/*global define: false, d3: false */
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
         <circle fill="url(#grad)" cx="16" cy="16" r="15"/> \
       </svg>',

      // Scale used for Kinetic Energy Shading gradients.
      KE_SHADING_STEPS = 25,
      keMedColor = d3.scale.linear()
        .interpolate(d3.interpolateRgb)
        .range(["#F2F2F2", "#FF8080"]),
      keDarkColor = d3.scale.linear()
        .interpolate(d3.interpolateRgb)
        .range(["#A4A4A4", "#FF2020"]);

  return function AtomsRenderer(modelView, model) {
    // Public API object to be returned.
    var api,

        container,

        m2px,
        m2pxInv,

        modelAtoms,
        viewAtoms,

        elementTex = {},

        keShading;

    function init() {
      keShading = model.get("keShading");
      model.addPropertiesListener(["keShading"], function () {
        keShading = model.get("keShading");
        api.update();
        modelView.renderCanvas();
      });
    }

    function getAtomColors(i) {
      var elID = modelAtoms[i].element,
          props = model.getElementProperties(elID),
          colorStr, color,
          ke, keIndex;


      if (keShading) {
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
          key = elID + "-" + radius + "-" + colors.join("");

      if (elementTex[key] === undefined) {
        var canv = document.createElement("canvas"),
            tplData;

        tplData = {
          width: 2 * radius,
          height: 2 * radius,
          lightCol: colors[0],
          medCol: colors[1],
          darkCol: colors[2]
        };

        canvg(canv, mustache.render(atomSVG, tplData));
        elementTex[key] = new PIXI.Texture.fromCanvas(canv);
      }
      return elementTex[key];
    }

    api = {
      setup: function () {
        var i, len, atom;

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

          if (keShading) {
            viewAtoms[i].setTexture(getAtomTexture(i));
          }
        }
      }
    };

    init();

    return api;
  };
});
/*global define: false */

define(function(require) {
  // Dependencies.
  var PIXI         = require('pixi'),
      color2number = require('common/views/color').color2number,

      RENDERING_OPTIONS = ["showVelocityVectors", "velocityVectors"];

  return function VectorsRenderer(modelView, model, pixiContainer) {
    // Public API object to be returned.
    var api,

        m2px,
        m2pxInv,

        modelAtoms,
        velocityVectorScale,

        renderMode = {},

        graphics = new PIXI.Graphics();

    function init() {
      readRenderingOptions();
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

    function renderVelocityVector(atom) {
      graphics.moveTo(m2px(atom.x), m2pxInv(atom.y));
      graphics.lineTo(m2px(atom.x + atom.vx * velocityVectorScale), m2pxInv(atom.y + atom.vy * velocityVectorScale));
    }

    function clear() {
      graphics.clear();
    }

    api = {
      setup: function () {
        if (!renderMode.showVelocityVectors) {
          clear();
          return;
        }

        modelAtoms = model.getAtoms();
        velocityVectorScale = renderMode.velocityVectors.length * 100;

        m2px = modelView.model2canvas;
        m2pxInv = modelView.model2canvasInv;

        api.update();
      },

      bindModel: function (newModel) {
        model = newModel;

        init();
      },

      update: function () {
        if (!renderMode.showVelocityVectors) return;
        var i, len;
        graphics.clear();
        graphics.lineStyle(m2px(renderMode.velocityVectors.width * 1.2),
                           color2number(renderMode.velocityVectors.color));
        for (i = 0, len = modelAtoms.length; i < len; ++i) {
          renderVelocityVector(modelAtoms[i]);
        }
      }
    };

    init();
    pixiContainer.addChild(graphics);

    return api;
  };
});

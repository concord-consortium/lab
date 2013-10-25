/*global define: false */

define(function(require) {
  // Dependencies.
  var PIXI         = require('pixi'),
      color2number = require('common/views/color').color2number,

      RENDERING_OPTIONS = ["showVelocityVectors", "velocityVectors"],
      USE_SPRITES = true;

  return function VectorsRenderer(modelView, model, pixiContainer) {
    // Public API object to be returned.
    var api,

        m2px,
        m2pxInv,

        modelAtoms,
        velocityVectorScale,

        container,
        viewVelocityVectors,

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

    function getVelocityVectorTexture() {
      var canv = document.createElement("canvas"),
          ctx = canv.getContext("2d");

      canv.width = 1;
      canv.height = 1;
      ctx.fillStyle = renderMode.velocityVectors.color;
      ctx.fillRect(0, 0, 1, 1);

      return new PIXI.Texture.fromCanvas(canv);
    }

    function renderVelocityVector(atom) {
      graphics.moveTo(m2px(atom.x), m2pxInv(atom.y));
      graphics.lineTo(m2px(atom.x + atom.vx * velocityVectorScale), m2pxInv(atom.y + atom.vy * velocityVectorScale));
    }

    function renderVelocityVectorSprite(i) {
      var vec = viewVelocityVectors[i],
          atom = modelAtoms[i],
          vx = atom.vx,
          vy = atom.vy;

      vec.position.x = m2px(atom.x);
      vec.position.y = m2pxInv(atom.y);
      vec.scale.y = m2px(Math.sqrt(vx * vx + vy * vy) * velocityVectorScale);
      vec.rotation = Math.PI + Math.atan2(vx, vy);
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

        if (USE_SPRITES) {
          var i, len, vec, tex;

          viewVelocityVectors = [];

          if (container) {
            pixiContainer.removeChild(container);
          }
          container = new PIXI.DisplayObjectContainer();
          pixiContainer.addChild(container);

          tex = getVelocityVectorTexture();
          for (i = 0, len = modelAtoms.length; i < len; ++i) {
            vec = new PIXI.Sprite(tex);
            vec.i = i;
            vec.scale.x = m2px(renderMode.velocityVectors.width);
            viewVelocityVectors.push(vec);
            container.addChild(vec);
          }
        }

        api.update();
      },

      bindModel: function (newModel) {
        model = newModel;

        init();
      },

      update: function () {
        if (!renderMode.showVelocityVectors) return;
        var i, len;

        if (USE_SPRITES) {
          for (i = 0, len = viewVelocityVectors.length; i < len; ++i) {
            renderVelocityVectorSprite(i);
          }
        } else {
          graphics.clear();
          graphics.lineStyle(m2px(renderMode.velocityVectors.width),
                             color2number(renderMode.velocityVectors.color));
          for (i = 0, len = modelAtoms.length; i < len; ++i) {
            renderVelocityVector(modelAtoms[i]);
          }
        }
      }
    };

    init();
    pixiContainer.addChild(graphics);

    return api;
  };
});

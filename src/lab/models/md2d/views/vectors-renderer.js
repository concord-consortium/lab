/*global define: false */

define(function(require) {
  // Dependencies.
  var PIXI = require('pixi');

  return function VectorsRenderer(modelView, model, pixiContainer, config) {
    // Public API object to be returned.
    var api,

        m2px,
        m2pxInv,

        modelAtoms,

        container,
        viewVectors,

        // Allows us to defer running actual renderer setup until layout system has determined our
        // size.
        isSetup = false,

        // Visual vector properties.
        show, length, width, color, dirOnly;

    function init() {
      var options = [config.showOptName, config.paramsOptName];
      if (config.dirOnlyOptName) {
        options.push(config.dirOnlyOptName);
      }
      readRenderingOptions();
      model.addPropertiesListener(options, function () {
        readRenderingOptions();
        if (isSetup) {
          api.setup();
          modelView.renderCanvas();
        }
      });
    }

    function readRenderingOptions() {
      var params = model.get(config.paramsOptName);
      length = params.length;
      width = params.width;
      color = params.color;
      show = model.get(config.showOptName);
      if (config.dirOnlyOptName) {
        dirOnly = model.get(config.dirOnlyOptName);
      }
    }

    function getVectorTexture() {
      var canv = document.createElement("canvas"),
          ctx = canv.getContext("2d");
      canv.width = 1;
      canv.height = 1;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);

      return new PIXI.Texture.fromCanvas(canv);
    }

    function getVectorArrowheadTexture() {
      var canv = document.createElement("canvas"),
          ctx = canv.getContext("2d"),
          dim = m2px(3.5 * width);
      canv.width = dim;
      canv.height = dim;
      ctx.fillStyle = color;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dim, 0);
      ctx.lineTo(dim * 0.5, dim);
      ctx.closePath();
      ctx.fill();

      return new PIXI.Texture.fromCanvas(canv);
    }

    function renderVector(i) {
      var vec = viewVectors[i],
          atom = modelAtoms[i],
          x = atom.x,
          y = atom.y,
          vx = config.vx(i) * length,
          vy = config.vy(i) * length,
          len = Math.sqrt(vx * vx + vy * vy),
          rot = Math.PI + Math.atan2(vx, vy),
          arrowHead = vec.arrowHead;
      if (dirOnly) {
        vx = 0.3 * vx / len;
        vy = 0.3 * vy / len;
        len = 0.3;
      }
      var lenInPx = m2px(len);
      if (lenInPx < 1) {
        vec.alpha = 0;
        arrowHead.alpha = 0;
        return;
      } else {
        vec.alpha = 1;
        arrowHead.alpha = 1;
      }
      // Vector.
      vec.position.x = m2px(x);
      vec.position.y = m2pxInv(y);
      vec.scale.y = lenInPx;
      vec.rotation = rot;
      // Arrowhead.
      arrowHead.position.x = m2px(x + vx);
      arrowHead.position.y = m2pxInv(y + vy);
      arrowHead.rotation = rot;
    }


    api = {
      setup: function () {
        isSetup = true;
        if (container) {
          pixiContainer.removeChild(container);
          container = null;
        }
        if (!show) return;

        container = new PIXI.DisplayObjectContainer();
        pixiContainer.addChild(container);

        modelAtoms = model.getAtoms();

        m2px = modelView.model2canvas;
        m2pxInv = modelView.model2canvasInv;

        var i, len, vec, arrowHead, tex;

        viewVectors = [];

        tex = getVectorTexture();
        for (i = 0, len = modelAtoms.length; i < len; ++i) {
          vec = new PIXI.Sprite(tex);
          vec.anchor.x = 0.5;
          vec.scale.x = m2px(width);
          vec.i = i;
          viewVectors.push(vec);
          container.addChild(vec);
        }
        tex = getVectorArrowheadTexture();
        for (i = 0, len = modelAtoms.length; i < len; ++i) {
          arrowHead = new PIXI.Sprite(tex);
          arrowHead.anchor.x = 0.5;
          arrowHead.anchor.y = 0.5;
          viewVectors[i].arrowHead = arrowHead;
          container.addChild(arrowHead);
        }

        api.update();
      },

      bindModel: function (newModel) {
        model = newModel;
        init();
      },

      update: function () {
        if (!show) return;
        var i, len;
        for (i = 0, len = viewVectors.length; i < len; ++i) {
          renderVector(i);
        }
      }
    };

    init();

    return api;
  };
});

/*global define: false */

define(function(require) {
  // Dependencies.
  var PIXI = require('pixi');

  function logistic(x) {
    return 1 / (1 + Math.exp(-x));
  }

  return function VectorsRenderer(pixiContainer, config) {
    // Public API object to be returned.
    var api,

        m2px,
        m2pxInv,

        container,
        viewVectors,

        // Vectors rendering enabled or disabled.
        show,
        // Number of vectors to render.
        count,
        // Physical vector properties (functions!).
        xFunc, yFunc, vxFunc, vyFunc,
        // Visual vector properties.
        alphaFunc, length, width, color, dirOnly, dirFieldType,

        // Switchable function that renders needle or vector
        renderVector;

    function readOptions() {
      count = config.count;

      xFunc = config.x;
      yFunc = config.y;
      vxFunc = config.vx;
      vyFunc = config.vy;
      alphaFunc = config.alpha;

      show = config.show;
      length = config.length;
      width = config.width;
      color = config.color;
      dirOnly = config.dirOnly;
      dirFieldType = config.dirFieldType;

      m2px = config.m2px;
      m2pxInv = config.m2pxInv;
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

    function getNeedleTexture() {
      var canv = document.createElement("canvas");
      var ctx = canv.getContext("2d");

      // Smoothly range the needle's aspect ratio from 5:1 when width is ~60px to 3:1 when width is
      // ~30px. Needle doesn't look good "fat" when long, and shouldn't be too narrow when short.
      var MIN_FRACTION = 1/5;
      var MAX_FRACTION = 1/3;
      var LOW_LENGTH_THRESHOLD  = 30;
      var HIGH_LENGTH_THRESHOLD = 60;
      var l = m2px(length);
      var x = (l - LOW_LENGTH_THRESHOLD) / (HIGH_LENGTH_THRESHOLD - LOW_LENGTH_THRESHOLD);
      var fraction = MIN_FRACTION + logistic(-8 * (x - 0.5)) * (MAX_FRACTION - MIN_FRACTION);
      var w = l * fraction;

      canv.height = l;
      canv.width = w;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.5, l);
      ctx.lineTo(w, 0);
      ctx.fillStyle = color;
      ctx.fill();

      return new PIXI.Texture.fromCanvas(canv);
    }

    function renderStandardVector(i) {
      var vec = viewVectors[i],
          x = xFunc(i),
          y = yFunc(i),
          vx = vxFunc(i) * length,
          vy = vyFunc(i) * length,
          len = Math.sqrt(vx * vx + vy * vy),
          rot = Math.PI + Math.atan2(vx, vy),
          arrowHead = vec.arrowHead;
      if (dirOnly) {
        // 0.15 is a bit random, empirically set value to match previous rendering done by SVG.
        vx = 0.15 * length * vx / len;
        vy = 0.15 * length * vy / len;
        len = 0.15 * length;
      }
      var lenInPx = m2px(len);
      if (lenInPx < 1) {
        // Hide completely tiny vectors (< 1px).
        vec.alpha = 0;
        arrowHead.alpha = 0;
        return;
      } else if (alphaFunc) {
        vec.alpha = alphaFunc(i);
        arrowHead.alpha = alphaFunc(i);
      } else {
        vec.alpha = 1;
        arrowHead.alpha = 1;
      }
      if (lenInPx > 1e6) {
        // When vectors has enormous size, it can cause rendering artifacts. Limit it.
        var s = lenInPx / 1e6;
        vx /= s; vy /= s; len /= s; lenInPx /= s;
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

    function renderNeedle(i) {
      var needle = viewVectors[i];
      var x = xFunc(i);
      var y = yFunc(i);

      needle.position.x = m2px(x);
      needle.position.y = m2pxInv(y);
      needle.rotation = Math.PI + Math.atan2(vxFunc(i), vyFunc(i));
      needle.alpha = alphaFunc(i);
    }


    api = {
      setup: function () {
        readOptions();

        if (container) {
          pixiContainer.removeChild(container);
          container = null;
        }
        if (!show || count === 0) return;

        container = new PIXI.DisplayObjectContainer();
        pixiContainer.addChild(container);

        var i, vec, arrowHead, tex;

        viewVectors = [];

        if (dirFieldType === "needle") {
          tex = getNeedleTexture();
          for (i = 0; i < count; ++i) {
            vec = new PIXI.Sprite(tex);
            // Should pivot on center
            vec.anchor.x = 0.5;
            vec.anchor.y = 0.5;
            vec.i = i;
            viewVectors.push(vec);
            container.addChild(vec);
          }

          renderVector = renderNeedle;
        } else {
          tex = getVectorTexture();
          for (i = 0; i < count; ++i) {
            vec = new PIXI.Sprite(tex);
            vec.anchor.x = 0.5;
            vec.scale.x = m2px(width);
            vec.i = i;
            viewVectors.push(vec);
            container.addChild(vec);
          }
          tex = getVectorArrowheadTexture();
          for (i = 0; i < count; ++i) {
            arrowHead = new PIXI.Sprite(tex);
            arrowHead.anchor.x = 0.5;
            viewVectors[i].arrowHead = arrowHead;
            container.addChild(arrowHead);
          }

          renderVector = renderStandardVector;
        }

        api.update();
      },

      update: function () {
        if (!show || count === 0) return;
        for (var i = 0; i < count; ++i) {
          renderVector(i);
        }
      }
    };

    return api;
  };
});

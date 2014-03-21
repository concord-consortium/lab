/*global define: false */

define(function(require) {
  // Dependencies.
  var PIXI = require('pixi');

  function logistic(x) {
    return 1 / (1 + Math.exp(-x));
  }

  return function FieldRenderer(pixiContainer, config) {

    var api,

        container,
        sprites,

        m2px,
        m2pxInv,

        // Rendering enabled or disabled?
        show,

        // Number of needles to render.
        count,

        // Functions that return x, y, vx, vy of field for grid position i
        xFunc, yFunc, vxFunc, vyFunc,

        // Function that returns alpha value to use for grid position i
        alphaFunc,

        // Needle length in nm
        length,

        // Need color, less alpha
        color;

    function readOptions() {
      count = config.count;

      xFunc = config.x;
      yFunc = config.y;
      vxFunc = config.vx;
      vyFunc = config.vy;
      alphaFunc = config.alpha;

      show = config.show;
      length = config.length;
      color = config.color;

      m2px = config.m2px;
      m2pxInv = config.m2pxInv;
    }

    function getTexture() {
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

    function renderSprite(i) {
      var sprite = sprites[i];
      var x = xFunc(i);
      var y = yFunc(i);

      sprite.position.x = m2px(x);
      sprite.position.y = m2pxInv(y);
      sprite.rotation = Math.PI + Math.atan2(vxFunc(i), vyFunc(i));
      sprite.alpha = alphaFunc(i);
    }


    api = {
      setup: function() {
        var i, sprite, texture;

        readOptions();

        if (container) {
          pixiContainer.removeChild(container);
          container = null;
        }
        if (!show || count === 0) return;

        container = new PIXI.DisplayObjectContainer();
        pixiContainer.addChild(container);

        sprites = [];

        texture = getTexture();
        for (i = 0; i < count; ++i) {
          sprite = new PIXI.Sprite(texture);
          // Should pivot on center
          sprite.anchor.x = 0.5;
          sprite.anchor.y = 0.5;
          sprite.i = i;
          sprites.push(sprite);
          container.addChild(sprite);
        }

        api.update();
      },

      update: function () {
        if (!show || count === 0) return;
        for (var i = 0; i < count; ++i) {
          renderSprite(i);
        }
      }
    };

    return api;
  };
});

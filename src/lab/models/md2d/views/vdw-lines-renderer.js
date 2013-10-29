define(function(require) {
  'use strict';

  var PIXI     = require('pixi');
  var canvg    = require('canvg');
  var mustache = require('mustache');

  /*jshint -W043 */
  var LINE_TEMPLATE =
    '<svg x="0px" y="0px" width="{{ width }}px" height="{{ height }}px"> \
       <line x1="{{ x1 }}" \
             y1="{{ y1 }}" \
             x2="{{ x2 }}" \
             y2="{{ y2 }}" \
             style="stroke: #aaa; \
                    stroke-width: {{ strokeWidth }}px; \
                    stroke-dasharray: {{ dashArrayLong }}px, {{ dashArrayShort }}px;"> \
      </line> \
    </svg>';
  /*jshint +W043*/

  return function VdwLinesRenderer(modelView, model, pixiContainer) {

    // Pixi container where our sprites go.
    var container;

    // Pixi texture consisting of the longest possible line
    var texture;

    // height of Pixi texture in pixels
    var textureHeight;

    // Pixi sprites for each line
    var sprites = [];

    var masks = [];

    // Maximum value of sigma (=== 0.5 * radius) of atoms actually in the model (be sure to exlude
    // any predefined elements not actually in the model, to prevent unnecessarily large values)
    function getMaxSigma() {
      var atoms = model.getAtoms();
      return 0.5 * atoms.reduce(function(prev, cur) {
        return cur.radius > prev ? cur.radius : prev;
      }, 0);
    }

    function getLineTexture() {
      var canvas = document.createElement('canvas');

      // VdW lines are drawn when 2 uncharged, nonbonded atoms are within
      //   r_ij < vdwLinesRatio * (sigma_i + sigma_j) / 2
      // and the maximum value of vdwLinesRatio is 2.0 (corresponding to
      // model.properties.VDWLinesCutoff === 'long')
      var maxLength   = 5 * modelView.model2canvas(2 * getMaxSigma());
      var strokeWidth = modelView.model2canvas(0.02);
      var halfStroke  = strokeWidth / 2;

      textureHeight = strokeWidth;

      var templateData = {
        width: strokeWidth + maxLength,
        height: textureHeight,
        x1: halfStroke,
        x2: halfStroke + maxLength,
        y1: halfStroke,
        y2: halfStroke,
        strokeWidth: strokeWidth,
        dashArrayShort: modelView.model2canvas(0.02),
        dashArrayLong:  modelView.model2canvas(0.03),
      };

      canvg(canvas, mustache.render(LINE_TEMPLATE, templateData));
      return PIXI.Texture.fromCanvas(canvas);
    }

    function setup() {
      var i;

      if (container) {
        for (i = 0; i < sprites.length; i++) {
          // must clear mask even on sprites we're removing, or else, empirically, the entire canvas
          // blanks after repaint (as if all graphics in all layers are masked)
          // presumed cause: https://github.com/GoodBoyDigital/pixi.js/issues/323
          sprites[i].mask = null;
        }
        pixiContainer.removeChild(container);
        container = null;
      }

      if ( ! model.properties.showVDWLines ) {
        return;
      }

      container = new PIXI.DisplayObjectContainer();
      pixiContainer.addChild(container);
      sprites = [];
      masks = [];
      texture = getLineTexture();

      update();
    }

    function update() {
      var vdwPairs = model.get_vdw_pairs();
      var atoms = model.getAtoms();
      var i;
      var atom1, atom2;
      var dx, dy, length;
      var angle;
      var mask;
      var x, y;

      // make sure we have enough sprites...
      for (i = sprites.length; i < vdwPairs.count; i++) {
        masks[i] = new PIXI.Graphics();
        container.addChild(masks[i]);
        sprites[i] = new PIXI.Sprite(texture);
        container.addChild(sprites[i]);
      }

      for (i = 0; i < vdwPairs.count; i++) {
        atom1 = atoms[vdwPairs.atom1[i]];
        atom2 = atoms[vdwPairs.atom2[i]];

        dx = modelView.model2canvas(atom2.x - atom1.x);
        dy = modelView.model2canvas(atom2.y - atom1.y);
        length = Math.ceil(Math.sqrt(dx * dx + dy * dy));
        angle = Math.atan2(-dy, dx);

        x = modelView.model2canvas(atom1.x);
        y = modelView.model2canvasInv(atom1.y);

        // mask off the underlying line texture to the correct length (aka width)
        mask = masks[i];
        mask.clear();
        mask.beginFill();
        mask.drawRect(0, 0, length, textureHeight);
        mask.endFill();
        mask.rotation = angle;
        mask.position.x = x;
        mask.position.y = y;

        sprites[i].mask = mask;
        sprites[i].rotation = angle;
        sprites[i].visible = true;
        sprites[i].position.x = x;
        sprites[i].position.y = y;
      }

      // hide unused sprites, but don't delete them -- VdW lines come and go on each tick!
      for (; i < sprites.length; i++) {
        // must remove mask on hidden sprites! see
        // https://github.com/GoodBoyDigital/pixi.js/issues/323
        sprites[i].mask = null;
        sprites[i].visible = false;
        // also prevent the mask (which is just a filled rect) from becoming visible
        masks[i].clear();
      }
    }

    function bindModel(_model) {
      model = _model;
    }

    return {
      setup: setup,
      update: update,
      bindModel: bindModel
    };
  };
});

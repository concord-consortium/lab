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

  var NUMBER_OF_SEGMENTS = 5;

  return function VdwLinesRenderer(modelView, model, pixiContainer) {

    // Pixi container where our sprites go.
    var container;

    // Pixi texture of a VdW Line
    var texture;

    // Width of VdW lines in pixels
    var strokeWidth;

    // Pixi sprites for each line
    var sprites = [];

    /**
      Return a PIXI.Texture from which the VdW sprites will be drawn. We want the height of this
      texture to be the actual on-canvas width of a VdW line in pixels, as represented by
      'strokeWidth', so that the boundaries between the line's segments and gaps are sharp. (Leaving
      the height at say 1px and scaling sprites up to the correct linewidth would likely introduce
      blurred edges).
    */
    function getLineTexture(strokeWidth) {
      var canvas = document.createElement('canvas');

      var gapLength = modelView.model2canvas(0.02);
      var segmentLength = modelView.model2canvas(0.03);
      var length = NUMBER_OF_SEGMENTS * (segmentLength + gapLength) + segmentLength;
      var halfStroke = strokeWidth / 2;

      var templateData = {
        width: length,
        height: strokeWidth,
        x1: 0,
        x2: length,
        y1: halfStroke,
        y2: halfStroke,
        strokeWidth: strokeWidth,
        dashArrayLong:  segmentLength,
        dashArrayShort: gapLength
      };

      canvg(canvas, mustache.render(LINE_TEMPLATE, templateData));
      return PIXI.Texture.fromCanvas(canvas);
    }

    function removeContainerAndSprites() {
      if (container) {
        pixiContainer.removeChild(container);
        container = null;
      }
      sprites = [];
    }

    function createContainerAndSprites() {
      container = new PIXI.DisplayObjectContainer();
      pixiContainer.addChild(container);
      sprites = [];
    }

    /**
      Call before calling update() for the first time and after any change to the model or canvas
      dimensions; resets the display container and texture, then calls update().
    */
    function setup() {
      var newStrokeWidth;

      if ( ! model.properties.showVDWLines ) {
        removeContainerAndSprites();
        return;
      }

      // Some interactives' scripts call repaint a lot, which calls this method. However, if there
      // is a container and the model dimensions have not changed, there is no setup to do. The
      // update method will ensure that the correct VdW lines are added or removed.
      newStrokeWidth = modelView.model2canvas(0.02);
      if (newStrokeWidth !== strokeWidth) {
        strokeWidth = newStrokeWidth;

        texture = getLineTexture(strokeWidth);
        removeContainerAndSprites();
        createContainerAndSprites();
      }

      if ( ! container ) {
        createContainerAndSprites();
      }

      update();
    }

    /**
      Call whenever the VdW lines need to be repainted; however, be sure to call setup() before the
      first time this is called and thereafter whenever a scale change is made.

      Note that, because VdW lines by their nature need to be added or removed at each tick, this
      method adds or removes VdW lines as necessary. (Many of the other renderers require that setup
      be called when the number of items to draw is changed.)
    */
    function update() {

      if ( ! model.properties.showVDWLines ) {
        return;
      }

      var vdwPairs = model.get_vdw_pairs();
      var atoms = model.getAtoms();
      var halfStroke = strokeWidth / 2;
      var i;
      var atom1, atom2;
      var dx, dy, length;
      var angle;
      var x1, y1, x2, y2;

      for (i = sprites.length; i < vdwPairs.count; i++) {
        sprites[i] = new PIXI.Sprite(texture);
        // The midpoint of the VdW line's left edge is placed at the atom's center; make sure that
        // the atom center is also the fixed point of the rotation applied to the line.
        sprites[i].pivot.x = strokeWidth / 2;
        container.addChild(sprites[i]);
      }

      for (i = 0; i < vdwPairs.count; i++) {
        atom1 = atoms[vdwPairs.atom1[i]];
        atom2 = atoms[vdwPairs.atom2[i]];

        x1 = modelView.model2canvas(atom1.x);
        y1 = modelView.model2canvasInv(atom1.y);
        x2 = modelView.model2canvas(atom2.x);
        y2 = modelView.model2canvasInv(atom2.y);

        dx = x2 - x1;
        dy = y2 - y1;

        length = Math.ceil(Math.sqrt(dx * dx + dy * dy));
        angle = Math.atan2(dy, dx);

        sprites[i].visible = true;
        // stretches/shrinks the sprite to the desired length; appears to be just fine visually
        sprites[i].width = length;
        // Make sure the midpoint of the left edge is at (x1, y1); sprite.position.{x|t} refer to
        // the upper left corner instead. A little bit of math is required because Pixi appears to
        // apply the rotation before the translation.
        sprites[i].position.x = x1 + halfStroke * Math.sin(angle);
        sprites[i].position.y = y1 - halfStroke * Math.cos(angle);
        sprites[i].rotation = angle;
      }

      // hide unused sprites, but don't delete them -- VdW lines come and go on each tick!
      for (; i < sprites.length; i++) {
        sprites[i].visible = false;
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

define(function(require) {
  'use strict';
  var PIXI = require('pixi');

  var NUMBER_OF_SEGMENTS = 5;

  return function VdwLinesRenderer(modelView, model, pixiContainer) {

    // Pixi container where our sprites go.
    var container;

    // Pixi texture of a VdW Line
    var texture;

    // Width of VdW lines in pixels
    var strokeWidth;

    // Length of VdW line texture in pixels
    var texLength;

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
      var ctx = canvas.getContext('2d');

      var gapLength = modelView.model2canvas(0.02);
      var segmentLength = modelView.model2canvas(0.03);
      var halfStroke = strokeWidth / 2;

      texLength = NUMBER_OF_SEGMENTS * (segmentLength + gapLength) + segmentLength;

      canvas.width = texLength;
      canvas.height = strokeWidth;
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = strokeWidth;

      var x = 0;
      for (var i = 0; i < NUMBER_OF_SEGMENTS; i++) {
        ctx.moveTo(x, halfStroke);
        ctx.lineTo(x + segmentLength, halfStroke);
        ctx.stroke();
        x += segmentLength + gapLength;
      }

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
      var i;
      var atom1, atom2;
      var dx, dy;
      var x1, y1, x2, y2;

      for (i = sprites.length; i < vdwPairs.count; i++) {
        sprites[i] = new PIXI.Sprite(texture);
        sprites[i].anchor.y = 0.5;
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

	// calculate the difference in charges of the atoms and use it to determine
	// the width of the stroke 
	var chargeDifference = Math.abs(atom1.charge - atom2.charge);
	container.removeChild(sprites[i]);
	sprites[i] = new PIXI.Sprite(getLineTexture(strokeWidth*chargeDifference));
	container.addChild(sprites[i]);
  
        sprites[i].visible = true;
        // stretches/shrinks the sprite to the desired length; appears to be just fine visually.
        sprites[i].scale.x = Math.ceil(Math.sqrt(dx * dx + dy * dy)) / texLength;
        // Make sure the midpoint of the left edge is at (x1, y1); sprite.position.{x|t} refer to
        // the upper left corner instead. A little bit of math is required because Pixi appears to
        // apply the rotation before the translation.
        sprites[i].position.x = x1;
        sprites[i].position.y = y1;
        sprites[i].rotation = Math.atan2(dy, dx);
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

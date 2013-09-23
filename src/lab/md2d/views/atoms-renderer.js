/*global $, define: false, d3: false */
/*jshint multistr: true */

define(function(require) {
  // Dependencies.
  var PIXI                = require('pixi'),
      canvg               = require('canvg');

  return function AtomsRenderer(modelView, model) {
    // Public API object to be returned.
    var api,

        container,

        m2px,
        m2pxInv,

        modelAtoms,
        viewAtoms,

        elementTex = {};

    function getElementTexture(elID) {
      if (elementTex[elID] === undefined) {
        var props  = model.getElementProperties(elID),
            width  = m2px(2 * props.radius),
            height = m2px(2 * props.radius),
            canv = document.createElement("canvas");

        canvg(canv,
          '<svg x="0px" y="0px" width="' + width + 'px" height="' + height + 'px" \
           viewBox="0 0 32 32" xml:space="preserve"> \
             <defs> \
               <radialGradient id="elem0-grad" cx="50%" cy="47%" r="53%" fx="35%" fy="30%"> \
               <stop stop-color="#ffffff" offset="0%"></stop> \
               <stop stop-color="#ffccff" offset="40%"></stop> \
               <stop stop-color="#b28eb2" offset="80%"></stop> \
               <stop stop-color="#ffccff" offset="100%"></stop> \
               </radialGradient> \
             </defs> \
             <circle fill="url(#elem0-grad)" cx="16" cy="16" r="15" stroke="none"/> \
           </svg>');

        elementTex[elID] = new PIXI.Texture.fromCanvas(canv);
      }
      return elementTex[elID];
    }

    api = {
      setup: function () {
        var i, len, atom;

        if (container) {
          modelView.pixiStage.removeChild(container);
        }
        container = new PIXI.DisplayObjectContainer();
        modelView.pixiStage.addChild(container);

        m2px = modelView.model2px;
        m2pxInv = modelView.model2pxInv;
        viewAtoms = [];
        modelAtoms = model.getAtoms();

        for (i = 0, len = modelAtoms.length; i < len; ++i) {
          atom = new PIXI.Sprite(getElementTexture(modelAtoms[i].element));
          atom.anchor.x = 0.5;
          atom.anchor.y = 0.5;
          viewAtoms.push(atom);
          container.addChild(atom);
        }

        api.update();
      },

      bindModel: function (newModel) {
        model = newModel;
      },

      update: function () {
        var i, len;
        for (i = 0, len = viewAtoms.length; i < len; ++i) {
          viewAtoms[i].position.x = m2px(modelAtoms[i].x);
          viewAtoms[i].position.y = m2pxInv(modelAtoms[i].y);
        }
      }
    };

    return api;
  };
});
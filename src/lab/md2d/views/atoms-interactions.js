/*global define: false */

define(function(require) {
  // Dependencies.
  var alert = require('common/alert'),

      POINT_CACHE = {};

  return function AtomsInteractions(modelView, model, target) {
    var api,

        m2px,
        m2pxInv,

        atoms,
        modelWidth,
        modelHeight,

        $target,
        targetOffset,
        targetOversampling,
        viewportX,
        viewportY;

    function init() {
      m2px = modelView.model2canvas;
      m2pxInv = modelView.model2canvasInv;

      $target = $(target);

      $target.on("mousedown.atoms-interactions touchstart.atoms-interactions", function (e) {
        var p = getClickCoords(e),
            atom = getAtomUnder(p.x, p.y);

        if (atom) mouseDownHandler(atom);
      });

      api.bindModel(model);
    }

    function getAtomUnder(x, y) {
      var atom, ax, ay, ar;
      for (var i = 0, len = atoms.length; i < len; i++) {
        atom = atoms[i];
        ax = atom.x;
        ay = atom.y;
        ar = atom.radius;
        if (x > ax - ar && x < ax + ar && y > ay - ar && y < ay + ar) {
          return atom;
        }
      }
      return null;
    }

    function getClickCoords(e, useCachedDimensionsAndViewport) {
      if (!useCachedDimensionsAndViewport) {
        // Sometimes we can risk and assume that model view wasn't resized or view port properties
        // changed (e.g. during atom dragging).
        targetOffset = $target.offset();
        targetOversampling = $target.attr("width") / $target.width();
        viewportX = model.get("viewPortX");
        viewportY = model.get("viewPortY");
      }

      POINT_CACHE.x = m2px.invert((e.clientX - targetOffset.left) * targetOversampling) + viewportX;
      POINT_CACHE.y = m2pxInv.invert((e.clientY - targetOffset.top) * targetOversampling) + viewportY;
      return POINT_CACHE;
    }

    function mouseDownHandler(atom) {
      modelView.hitTestFlag = true;

      dragBehavior(atom);
    }

    function dragBehavior(atom) {
      var i = atom.idx,
          p, x, y, originX, originY,
          dragged = false;

      $(window).on("mousemove.drag", function (e) {
        if (!dragged) {
          // Lazily initialize drag process when user really drags an atom (not only clicks it).
          if (model.isStopped()) {
            originX = atom.x;
            originY = atom.y;
          } else if (atom.draggable) {
            model.liveDragStart(i);
          }
          dragged = true;
        }

        // We can use cached canvas dimensions, as they rather don't change between mousedown
        // and mousemove.
        p = getClickCoords(e, true);
        x = p.x;
        y = p.y;

        var bbox = model.getMoleculeBoundingBox(i);
        if (bbox.left + x < 0) x = 0 - bbox.left;
        if (bbox.right + x > modelWidth) x = modelWidth - bbox.right;
        if (bbox.bottom + y < 0) y = 0 - bbox.bottom;
        if (bbox.top + y > modelHeight) y = modelHeight - bbox.top;

        if (model.isStopped()) {
          setAtomPosition(i, x, y, false, true);
          modelView.update();
        } else {
          model.liveDrag(x, y);
        }
      }).one("mouseup.drag", function () {
        $(window).off("mousemove.drag");

        // If user only clicked an atom (mousedown + mouseup, no mousemove), there is nothing to do.
        if (!dragged) return;

        if (model.isStopped()) {
          if (!setAtomPosition(i, x, y, true, true)) {
            alert("You can't drop the atom there");
            setAtomPosition(i, originX, originY, false, true);
            modelView.update();
          }
        } else {
          model.liveDragEnd();
        }
      });
    }

    function setAtomPosition(i, xpos, ypos, checkPosition, moveMolecule) {
      return model.setAtomProperties(i, {
        x: xpos,
        y: ypos
      }, checkPosition, moveMolecule);
    }

    api = {
      bindModel: function (newModel) {
        model = newModel;

        atoms = model.getAtoms();
        modelWidth = model.get("width");
        modelHeight = model.get("height");
      }
    };

    init();

    return api;
  };
});

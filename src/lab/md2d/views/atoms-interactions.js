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
        viewportY,

        preventClick,
        downAtom,
        dragged;

    // =============================================================================================
    // Basic handlers:
    function mouseDownHandler(x, y, atom, i) {
      modelView.hitTestFlag = true;

      dragBehavior(atom);
    }

    function mouseUpHandler(x, y, atom, i) {
      modelView.hitTestFlag = true;
    }

    function clickHandler(x, y, atom, i) {
      modelView.hitTestFlag = true;

      if (modelView.clickHandler[".atom"]) {
        modelView.clickHandler[".atom"](x, y, atom, i);
      }
    }
    // =============================================================================================

    function mouseDownTest(e) {
      var p = getClickCoords(e);

      downAtom = getAtomUnder(p.x, p.y);
      dragged = false;

      if (downAtom) mouseDownHandler(p.x, p.y, downAtom, downAtom.idx);
    }

    function mouseUpTest(e) {
      var p = getClickCoords(e),
          upAtom = getAtomUnder(p.x, p.y);

      if (!dragged && upAtom) {
        mouseUpHandler(p.x, p.y, upAtom, upAtom.idx);
        if (downAtom === upAtom) {
          clickHandler(p.x, p.y, downAtom, downAtom.idx);
        }
      }

      if (upAtom) {
        // Block upcoming click event.
        preventClick = true;
      }

      downAtom = null;
    }

    function clickTest() {
      // We emulate click events on canvas using "mousedown" and "mouseup" events. In theory
      // "click" handler shoudn't do anything. However if any atom passed a hit test during
      // "mouseup" event, we should ensure that "click" event won't be passed to the underlying
      // layers. modelView.hitTestFlag is used for that.
      if (preventClick) {
        modelView.hitTestFlag = true;
        preventClick = false;
      }
    }

    function init() {
      m2px = modelView.model2canvas;
      m2pxInv = modelView.model2canvasInv;

      $target = $(target);

      // Use native .addEventListener() instead of jQuery's .on() method, because parent of the
      // target (canvas) can be cleaned up using jQuery .empty() method (during layout) and all
      // jQuery handlers will be destroyed. Native handles will remain untouched.
      target.addEventListener("mousedown", mouseDownTest);
      target.addEventListener("touchstart", mouseDownTest);
      target.addEventListener("mouseup", mouseUpTest);
      target.addEventListener("touchend", mouseUpTest);
      target.addEventListener("click", clickTest);

      api.bindModel(model);
    }

    function getAtomUnder(x, y) {
      var atom, ax, ay, ar;
      for (var i = 0, len = atoms.length; i < len; i++) {
        atom = atoms[i];
        ax = atom.x;
        ay = atom.y;
        ar = atom.radius;
        // Optimization: hit area is square.
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
        // Undefined is a perfectly correct value for view port coords, it means that the whole
        // model area is being displayed.
        viewportX = model.get("viewPortX") || 0;
        viewportY = model.get("viewPortY") || 0;
      }

      POINT_CACHE.x = m2px.invert((e.clientX - targetOffset.left) * targetOversampling) + viewportX;
      POINT_CACHE.y = m2pxInv.invert((e.clientY - targetOffset.top) * targetOversampling) + viewportY;
      return POINT_CACHE;
    }

    function dragBehavior(atom) {
      var i = atom.idx,
          p, x, y, originX, originY;

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

        // Custom drag handler.
        if (modelView.dragHandler.atom) {
          modelView.dragHandler.atom(x, y, atom, i);
        }
      }).one("mouseup.drag", function () {
        $(window).off("mousemove.drag");

        // If user only clicked an atom (mousedown + mouseup, no mousemove), nothing to do.
        if (!dragged) return;

        if (model.isStopped()) {
          // Important: set position to (atom.x, atom.y), not (x, y)! Note that custom drag handler
          // could be executed and it could change actual position!
          if (!setAtomPosition(i, atom.x, atom.y, true, true)) {
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

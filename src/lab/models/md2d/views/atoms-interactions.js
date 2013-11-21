/*global define: false */

define(function(require) {
  // Dependencies.
  var alert               = require('common/alert'),
      amniacidContextMenu = require('cs!models/md2d/views/aminoacid-context-menu'),

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

        downAtom,
        contextMenuAtom,
        dragging, dragged;

    //**********************************************************************************************
    // Event handlers related to particular atom:
    function mouseDownHandler(x, y, atom, e) {
      // Dragging is only allowed when user touches an atom or uses *left* mouse button (== 0).
      // Right mouse button can interfere with context menus.
      if (e.button === 0) {
        dragBehavior(downAtom);
      }
    }

    function mouseOverHandler(x, y, atom, e) {
      // noop
    }

    function mouseOutHandler(x, y, e) {
      // noop
    }

    function mouseUpHandler(x, y, atom, e) {
      // noop
    }

    function clickHandler(x, y, atom, e) {
      // Custom click handlers for atoms are not supposed to be triggered if the atom was dragged
      if (!dragged && modelView.clickHandler[".atom"]) {
        modelView.clickHandler[".atom"](x, y, atom, atom.idx);
      }
    }

    function contextMenuHandler(x, y, atom, e) {
      // noop
    }

    //**********************************************************************************************
    // Event handlers related to whole target element (canvas):
    function mouseDownCanvas(e) {
      var p = getClickCoords(e);

      downAtom = getAtomUnder(p.x, p.y);
      contextMenuAtom = null;
      dragged = false;

      modelView.hitTestCallback(!!downAtom);
      if (downAtom) {
        mouseDownHandler(p.x, p.y, downAtom, e);
      }
    }

    function mouseMoveCanvas(e) {
      var p = getClickCoords(e),
          atom = getAtomUnder(p.x, p.y);

      modelView.hitTestCallback(!!atom);
      if (atom) {
        mouseOverHandler(p.x, p.y, atom, e);
      } else {
        mouseOutHandler(p.x, p.y, e);
      }
      if (!dragging) {
        setCursorForAtom(atom);
      }
    }

    function mouseUpCanvas(e) {
      var p = getClickCoords(e),
          upAtom = getAtomUnder(p.x, p.y),
          isDOMClick = false;

      modelView.hitTestCallback(!!upAtom);

      if (upAtom) {
        mouseUpHandler(p.x, p.y, upAtom, e);
        if (upAtom === downAtom) {
          // Regardless of whether or not the atom was dragged, if mouseup target == mousedown
          // target we should issue a DOM click event.
          isDOMClick = true;
          clickHandler(p.x, p.y, downAtom);
        }
      }

      modelView.mouseupCallback(isDOMClick);
      downAtom = null;
    }

    function mouseOverCanvas(e) {
      // noop
    }

    function mouseOutCanvas(e) {
      var p = getClickCoords(e);
      mouseOutHandler(p.x, p.y, e);
      setCursor("auto");
    }

    function contextMenuCanvas(e) {
      var p = getClickCoords(e);

      contextMenuAtom = getAtomUnder(p.x, p.y);

      modelView.hitTestCallback(!!contextMenuAtom);
      if (contextMenuAtom) {
        contextMenuHandler(p.x, p.y, contextMenuAtom);
      }
    }
    //**********************************************************************************************

    function setCursorFromEvent(e) {
      // If pointer is over some other element just restore the "auto" pointer.
      if (e.target !== target) {
        setCursor("auto");
        return;
      }
      var p = getClickCoords(e);
      setCursorForAtom(getAtomUnder(p.x, p.y));
    }

    function setCursorForAtom(atom) {
      if (atom && (model.isStopped() || atom.draggable)) {
        setCursor("move");
      } else {
        setCursor("auto");
      }
    }

    var cursorVal;
    function setCursor(name) {
      if (cursorVal !== name) {
        cursorVal = name;
        document.documentElement.style.cursor = name;
      }
    }

    function init() {
      m2px = modelView.model2canvas;
      m2pxInv = modelView.model2canvasInv;

      $target = $(target);
      $target.addClass("atoms-interaction-layer");

      // Use native .addEventListener() instead of jQuery's .on() method, because parent of the
      // target (canvas) can be cleaned up using jQuery .empty() method (during layout) and all
      // jQuery handlers will be destroyed. Native handles will remain untouched.
      target.addEventListener("mousedown", mouseDownCanvas);
      target.addEventListener("mouseup", mouseUpCanvas);
      target.addEventListener("mousemove", mouseMoveCanvas);
      target.addEventListener("mouseover", mouseOverCanvas);
      target.addEventListener("mouseout", mouseOutCanvas);
      target.addEventListener("contextmenu", contextMenuCanvas);

      amniacidContextMenu.register(model, modelView, ".atoms-interaction-layer", function () {
        return contextMenuAtom;
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

      var pageX = e.pageX,
          pageY = e.pageY;

      // IE9 doesn't set pageX and pageY for simulated events. Both values will be equal to 0. Even
      // if user really clicks (0, 0) point, this won't break anything. We will just do some
      // unnecessary work. It isn't very likely and too expensive anyway.
      if (!pageX && !pageY) {
        // This workaround is borrowed from jQuery source (jQuery.Event class):
        var eventDoc = e.target.ownerDocument || document,
            doc = eventDoc.documentElement,
            body = eventDoc.body;

        pageX = e.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
                            (doc && doc.clientLeft || body && body.clientLeft || 0);
        pageY = e.clientY + (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
                            (doc && doc.clientTop  || body && body.clientTop  || 0);
      }

      POINT_CACHE.x = m2px.invert((pageX - targetOffset.left) * targetOversampling) + viewportX;
      POINT_CACHE.y = m2pxInv.invert((pageY - targetOffset.top) * targetOversampling) + viewportY;
      return POINT_CACHE;
    }

    function dragBehavior(atom) {
      // Fast path, no dragging at all if model is running and atom isn't draggable.
      if (!model.isStopped() && !atom.draggable) return;

      var i = atom.idx,
          p, x, y, originX, originY;

      $(window).on("mousemove.lab-drag", function (e) {
        // Prevent accidental text selection or another unwanted action while dragging.
        e.preventDefault();

        if (!dragged) {
          // Lazily initialize drag process when user really drags an atom (not only clicks it).
          if (model.isStopped()) {
            originX = atom.x;
            originY = atom.y;
          } else if (atom.draggable) {
            model.liveDragStart(i);
          }
          dragging = true;
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

        setCursor("move");

        // Custom drag handler.
        if (modelView.dragHandler.atom) {
          modelView.dragHandler.atom(x, y, atom, i);
        }
      }).on("selectstart.lab-drag", function (e) {
        // Disable selection behavior while dragging an atom. It's supported and required in IE and
        // Safari. In Chrome it's enough to call .preventDefault() on mousemove event.
        e.preventDefault();
      }).one("mouseup.lab-drag", function (e) {
        $(window).off(".lab-drag");

        // If user only clicked an atom (mousedown + mouseup, no mousemove), nothing to do.
        if (!dragged) return;
        dragging = false;
        // Prevent accidental text selection or another unwanted action while dragging.
        e.preventDefault();
        // Pointer can be over atom or not (e.g. when user finished dragging below other object).
        setCursorFromEvent(e);

        if (model.isStopped()) {
          // Important: set position to (atom.x, atom.y), not (x, y)! Note that custom drag handler
          // could be executed and it could change actual position!
          if (!setAtomPosition(i, atom.x, atom.y, true, true)) {
            alert("You can't drop the object there.");
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

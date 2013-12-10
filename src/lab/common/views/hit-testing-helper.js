/*global define: false */

/**
  Forward mouse events to the view's stack of overlaid visual layers to simulate the "hit
  testing" that would occur natively if the visual layers were all implemented as descendants of
  a single, common svg element.

  In that scenario, native hit-testing is used: a mouse event at any point is forwarded to the
  topmost visible element at that point; the layers above it are effectively transparent to the
  event. This is subject to control by the 'pointer-events' property. See
  http://www.w3.org/TR/SVG/interact.html#pointer-processing

  However, in order to allow some layers to be implemented as <canvas> elements (or perhaps
  <divs> or rootmost <svg> elements, to which hardware-accelerated css transforms apply), and to
  allow those layers to be above some layers and below others, our layers cannot in fact be
  children of a common svg element.

  This means that the topmost layer always becomes the target of any mouseevent on the view,
  regardless of whether it has an element at that point, and it hides the event from the layers
  below.

  What we need, therefore, is to simulate svg's hit testing. This can be achieved by listening
  to events that bubble to the topmost layer and successively hiding the layers below, applying
  document.elementFromPoint to determine whether there is an element within that layer at that
  event's coordinates. (Where the layer in question is a <canvas> with its own hit testing
  implemented in Javascript, we must defer to the layer's own hit-testing algorithm instead
  of using elementFromPoint.)

  CSS pointer-events (as distinct from SVG pointer events) cannot completely capture the
  semantics we need because they simply turn pointer "transparency" on or off rather than
  responding to the presence or absence of an element inside the layer at the event coordinates;
  and besides they do not work in IE9 or IE10.

  Note that to the extent we do use CSS pointer-events, document.elementFromPoint correctly
  respects the "none" value.

  What this means for event handling:

    * Mousedown, mouseup, and any custom mouse events such as those created by the jQuery
      ContextMenu plugin, are captured by a click shield element and prevented from bubbling.
      However, a clone event is dispatched to the element that passed the hit test and allowed
      to bubble to the window.

    * Click events on the click shield are captured and canceled because they are inherently not
      meaningful--the browser cannot tell if the mouseup and mousedown targets are "really" the
      same so it dispatches click events anytime a mousedown and mouseup occur on the view.
      Instead, if the mousedown and mouseup occur on the same element or sprite (e.g., same
      atom) we dispatch a synthetic click event targeted at the element. In the case that the
      mouseup occurs on a sprite in the canvas layer, the click event is only emitted if the
      same sprite was under the previous mousedown. Additionally, the target of a click on a
      sprite is the canvas layer itself since to DOM gives us no way to be any more specific.
      (Notice this means the same canvas can successfully hit test a mousedown followed by a
      mouseup, but still not cause a click to be issued, if the mousedown and mouseup were over
      two different sprites.)

    * Canvas elements should not listen for click events. They are responsible instead for
      performing a click action, if appropriate, when they receive a mouseup, and notifying the
      parent whether a DOM click event should be issued. (This prevents them from having to
      hit-test the same coordinates twice, once for the mouseup and then once for a click.)

    * Single-touch containing touch events will be captured and canceled, and synthetic mouse
      events corresponding to the touches will be issued and routed through the above-discussed
      hit test exactly as if they were mouse events. This is a reasonable choice because we do
      not use any multitouch gestures and must retain compatibility with desktop browsers.

    * Note that mouseover/mouseout/mousenter/mouseleave events are not handled in any way!
*/
define(function (require) {
  // Dependencies.
  var featureTests = require('common/feature-tests'),

      EVENT_TYPES = ['mousedown', 'mouseup', 'contextmenu'],

  // Keep track of window listeners, so helper can cleanup previous listeners. Note that it
  // means that only one event translation per window is allowed for now!
      windowListeners = [];

  function addWindowEventListener(type, listener, useCapture) {
    window.addEventListener(type, listener, useCapture);

    windowListeners.push({
      type: type,
      func: listener,
      capture: useCapture
    });
  }

  function cleanupWindowListeners() {
    var l;
    while (windowListeners.length > 0) {
      l = windowListeners.pop();
      window.removeEventListener(l.type, l.func, l.capture);
    }
  }

  function noop() {}

  /**
   * @param {Element} foregroundNode the top-most layer.
   */
  return function HitTestingHelper(foregroundNode) {
    var api;

    // A list of all outermost svg/canvas/div containers which may have clickable or touchable child
    // elements, ordered from topmost to bottom-most. Because the layers are siblings, not
    // ancestors, the upper layers prevent mouse and touch events from reaching the lower layers
    // even when no element within the upper layers is actually being clicked/touched.
    var layersToHitTest;

    // We need to hide HTML layers from mouse events. It can be achieved by setting
    // "pointer-events" style to "none", however it isn't supported by all browsers
    // (e.g. IE9, IE10, Safari 5). The fallback method is to set layer's visibility to "hidden".
    var propName    = featureTests.cssPointerEvents ? "pointerEvents" : "visibility";
    var propHidden  = featureTests.cssPointerEvents ? "none" : "hidden";
    var propBackup;

    var mousedownTarget;
    var targetForCreatedClick;
    var defaultPreventedFlag;
    var cancelClickFlag;

    // Return a cloned version of 'e' having 'target' as its target property; cancel the original
    // event.
    function retargetMouseEvent(e, target) {
      var clonedEvent = document.createEvent("MouseEvent");
      clonedEvent.initMouseEvent(e.type, e.bubbles, e.cancelable, e.view, e.detail, e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button, e.relatedTarget);
      clonedEvent.target = target;
      clonedEvent.forwardedTouchEvent = e.forwardedTouchEvent;
      return clonedEvent;
    }

    // Create a click event from a mouse event (presumably mouseup). Leaves original event as-is.
    function createClick(e, target) {
      // TODO. Does copying the properties adequately capture all the semantics of the click event?
      var clonedEvent = document.createEvent("MouseEvent");
      clonedEvent.initMouseEvent('click', true, e.cancelable, e.view, e.detail, e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button, e.relatedTarget);
      clonedEvent.target = target;
      return clonedEvent;
    }

    // Hide layer from mouse events using visibility or pointer-events styles.
    function hideLayer(i) {
      var layer = layersToHitTest[i];
      propBackup[i] = layer.style[propName];
      layer.style[propName] = propHidden;
    }

    // Restore original visibility or pointer-events styles of layers n to 0, inclusive.
    function unhideLayers(n) {
      for (var i = n; i >= 0; i--) {
        layersToHitTest[i].style[propName] = propBackup[i];
      }
    }

    function hitTest(e) {
      // Remember style rules of the layers we peel back
      propBackup = [];

      var layer;
      var target;
      var mouseEvent;
      var hitTestSucceeded;
      var isCanvasObjectClick;
      var layerBgColor;

      // Must be set, as we test it after calling hitTest()
      targetForCreatedClick = null;

      for (var i = 0, len = layersToHitTest.length; i < len; i++) {
        layer = layersToHitTest[i];

        if (i > 0) {
          hideLayer(i - 1);
        }

        if (layer.tagName.toLowerCase() === "canvas") {
          // For now we have to dispatch an event first, *then* see if the Canvas-based view
          // considered it a hit -- we stopPropagation and keep going if it does not report a hit.
          mouseEvent = retargetMouseEvent(e, layer);

          // Need to ask the Canvas-based view to perform custom hit-testing.
          // TODO: make this a static function rather than rebinding to closure each time.
          api.hitTestCallback = function(isHit) {
            hitTestSucceeded = isHit;
            if (!isHit) {
              mouseEvent.stopPropagation();
              mouseEvent.preventDefault();
            }
          };
          api.mouseupCallback = function(isClick) {
            isCanvasObjectClick = isClick;
          };

          layer.dispatchEvent(mouseEvent);

          // Restore safe noop functions. It ensures that even if client code calls one of them
          // unnecessarily, it won't have unwanted, side effects like .preventDefault() or
          // .stopPropagation() calls.
          api.hitTestCallback = noop;
          api.mouseupCallback = noop;

          if (isCanvasObjectClick) {
            // The canvas view itself won't listen to this click, but let the click bubble.
            targetForCreatedClick = layer;
          }

          if (hitTestSucceeded) {
            unhideLayers(i-1);
            defaultPreventedFlag = mouseEvent.defaultPrevented;
            return layer;
          }
        } else {
          // IE bug: without background color layer will be transparent for .elementFromPoint(),
          // underlying canvas (if any) will become a target. See:
          // https://www.pivotaltracker.com/story/show/58418116
          layerBgColor = layer.style.backgroundColor;
          layer.style.backgroundColor = "rgba(0,0,0,0)";

          // clientX and clientY report the event coords in CSS pixels relative to the viewport
          // (ie they aubtract the x, y the page is scrolled to). This is what elementFromPoint
          // requires in Chrome, Safari 5+, IE 8+, and Firefox 3+.
          // http://www.quirksmode.org/dom/tests/elementfrompoint.html
          // http://www.quirksmode.org/blog/archives/2010/06/new_webkit_test.html
          // http://www.quirksmode.org/mobile/tableViewport_desktop.html
          target = document.elementFromPoint(e.clientX, e.clientY);

          // Restore original background color.
          layer.style.backgroundColor = layerBgColor;

          // FIXME? Since we nominally allow target layers to be hidden or have pointer-events: none
          // we would have to replace this simplistic test. In the case that the layer is
          // transparent to events even before we hide it, target !== layer not because target is an
          // element in the layer that received the hit but because the target is below the layer.
          if (target !== layer) {
            unhideLayers(i-1);
            mouseEvent = retargetMouseEvent(e, target);
            target.dispatchEvent(mouseEvent);
            defaultPreventedFlag = mouseEvent.defaultPrevented;
            // There was an element in the layer at the event target. This hides the event from all
            // layers below, so we're done.
            return target;
          }
        }
      }
      // If no element is hit, make sure that all layer properties are restored.
      unhideLayers(layersToHitTest.length - 2); // -2 because the last layer is never hidden
    }

    // Translate any touch events on the foreground which have only a single touch point ("finger")
    // when started, to the corresponding mouse events. Does not attempt to initiate a cancel action
    // for touchcancel; just issues mouseup stops tracking the touch.
    function setupTouchEventTranslation(foregroundNode) {
      // Identifier of the touch point we are tracking; set to null when touch not in progress.
      var touchId = null;
      var touchStartX;
      var touchStartY;

      function createMouseEvent(touch, type) {
        var mouseEvent = document.createEvent("MouseEvent");
        mouseEvent.initMouseEvent(type, true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
        // This flag prevents FastClick from trying to pre-emptively cancel the event
        mouseEvent.forwardedTouchEvent = true;
        return mouseEvent;
      }

      // Detect whether the touch was moved >10 device pixels between start and end; if the touch
      // moved we may infer that the user performed a scroll.
      //
      // Contra @ppk (http://www.quirksmode.org/mobile/viewports2.html), screenX and screenY *are*
      // useful here because we're in an iframe. clientX/Y and pageX/Y are relative to our page and
      // visual viewport, respectively, *but those both move in rough synchrony with the touch* (and
      // we can't detect the scroll itself because the iframe's page and visual viewport offsets
      // don't change! The *outer* page changes but we may not be allowed to measure that.)
      // Fortunately, screenX and screenY are relative to the device, which lets us know if the
      // viewport moved "physically" (bonus: measurements in device pixels correspond to actual
      // physical distances in the user's world, and don't change with zoom).
      function didTouchMove(touch) {
        return Math.abs(touch.screenX - touchStartX) > 10 || Math.abs(touch.screenY - touchStartY) > 10;
      }

      // listener for touchstart
      function touchStarted(e) {
        var touch = e.changedTouches[0];

        if (e.touches.length > 1 || touch.target !== foregroundNode) {
          return;
        }

        cancelClickFlag = false;
        touchStartX = touch.screenX;
        touchStartY = touch.screenY;

        // Remember which touch point--later touch events may or may not include this touch point
        // but we have to listen to them all to make sure we update dragging state correctly.
        touchId = touch.identifier;
        foregroundNode.dispatchEvent(createMouseEvent(touch, 'mousedown'));

        if (defaultPreventedFlag) {
          e.preventDefault();
        }
        e.stopPropagation();
      }

      // Listener for touchmove, touchend, and touchcancel:
      function touchChanged(e) {

        if (touchId === null) {
          return;
        }

        // Don't translate touch events to mouse events when there are more than two fingers
        // on the screen. This lets us to support pinch-zoom even if user started gesture only
        // with one finger and added second later.
        if (e.type === "touchmove" && e.touches.length > 1) {
          // User added a second finger, perhaps he wants to do pinch-zoom or pan rather than
          // trigger "click" action at the end.
          cancelClickFlag = true;
          // In theory this isn't 100% correct, but... it ensures that no handler will be able
          // to call .preventDefault() on this event (e.q. D3 does that for touch events), so we
          // will always native browser behavior like panning or pinch-zoom. This is reasonable
          // assumption that 2-finger gestures are always used for navigation.
          e.stopPropagation();
          return;
        }

        var i;
        var len;
        var touch;
        var target;

        for (i = 0, len = e.changedTouches.length; i < len; i++) {
          touch = e.changedTouches[i];

          if (touch.identifier !== touchId) {
            continue;
          }

          if (len === 1) {
            e.stopPropagation();
          }

          // touch's target will always be the element that received the touchstart. But since
          // we're creating a pretend mousemove, let its target be the target the browser would
          // report for an actual mousemove/mouseup (Remember that the--expensive--hitTest() is not
          // called for mousemove, though; drag handlers should and do listen for mousemove on the
          // window). Note that clientX can be off the document, so report window in that case!
          target = document.elementFromPoint(touch.clientX, touch.clientY) || window;

          if (e.type === 'touchmove') {
            if (!cancelClickFlag) {
              // Cancel "click" event when finger has moved (> 10px at the moment).
              cancelClickFlag = didTouchMove(touch);
            }
            target.dispatchEvent(createMouseEvent(touch, 'mousemove'));
          } else if (e.type === 'touchend') {
            target.dispatchEvent(createMouseEvent(touch, 'mouseup'));
            touchId = null;
          } else if (e.type === 'touchcancel') {
            // Do not dispatch click event on touchcancel.
            cancelClickFlag = true;
            target.dispatchEvent(createMouseEvent(touch, 'mouseup'));
            touchId = null;
          }

          // .preventDefault() on touchend will prevent the browser from generating a events like
          // mousedown, mouseup and click. It's necessary as we already translated touchstart
          // to mousedown and touchend to mouseup. Our hit testing intentionally ignores
          // browser-generated click events anyway, and generates its own when appropriate.
          if (e.type === 'touchend' || defaultPreventedFlag) {
            e.preventDefault();
          }

          return;
        }
      }

      addWindowEventListener('touchstart', touchStarted, true);
      ['touchmove', 'touchend', 'touchcancel'].forEach(function (eventType) {
        addWindowEventListener(eventType, touchChanged, true);
      });

      // TODO implement cancel semantics for atom dragging?
      // see http://alxgbsn.co.uk/2011/12/23/different-ways-to-trigger-touchcancel-in-mobile-browsers/
      // until then we have to observe touchcancel to stop in-progress drags.
    }

    function init() {
      cleanupWindowListeners();

      layersToHitTest = [foregroundNode];

      EVENT_TYPES.forEach(function(eventType) {
        // Use a capturing handler on window so we can swallow the event
        addWindowEventListener(eventType, function(e) {
          var target;

          if (e.target !== foregroundNode) {
            return;
          }

          e.stopPropagation();
          // Chrome (and Safari?) bug: http://crbug.com/269917
          // If we call .preventDefault() on the original mousedown event, it will break handling of
          // events outside the iframe. It can cause issues like this one:
          // https://www.pivotaltracker.com/story/show/58446862
          if (e.type !== 'mousedown') {
            e.preventDefault();
          }

          target = hitTest(e);

          if (e.type === 'mousedown') {
            mousedownTarget = target;
          } else if (e.type === 'mouseup') {
            // Note that cancelClickFlag can be set to true if e.g. there was significant
            // touchmove between touchstart (mousedown) and touchend (mouseup). It means that
            // user was panning the viewport rather than trying to perform "click". Other case can
            // be when second finger was added between touchstart and touchend what can be used to
            // perform pinch-zoom rather than click.
            if (target && target === mousedownTarget &&
                target.tagName.toLowerCase() !== 'canvas' && !cancelClickFlag) {
              target.dispatchEvent(createClick(e), target);
            }
            if (targetForCreatedClick && !cancelClickFlag) {
              targetForCreatedClick.dispatchEvent(createClick(e), targetForCreatedClick);
            }
          }
        }, true);
      });

      // Completely swallow "click" events on the foregroundNode. The browser can't issue these
      // correctly; we have to issue them ourselves after a mouseup.
      addWindowEventListener('click', function(e) {
        if (e.target === foregroundNode) {
          e.stopPropagation();
          e.preventDefault();
        }
      }, true);

      setupTouchEventTranslation(foregroundNode);
    }

    api = {
      /**
       * Setups fast, simplified hit testing for mousemove events. 'mousemove' will be dispatched
       * only to the specified target element. Because of that we can avoid very expensive
       * .elementFromPoint() calls. Target will receive mouseover and mouseout events too.
       * @param  {Element} mmoveSource
       * @param  {Element} mmoveTarget
       */
      passMouseMove: function (mmoveSource, mmoveTarget) {
        var prevTarget;

        // Return a cloned version of 'e' but with a different 'type', 'target' and 'relatedTarget'.
        function createMouseEvent(e, type, target, relatedTarget) {
          var clonedEvent = document.createEvent("MouseEvent");
          clonedEvent.initMouseEvent(type, e.bubbles, e.cancelable, e.view, e.detail, e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button, relatedTarget || e.relatedTarget);
          clonedEvent.target = target;
          return clonedEvent;
        }

        addWindowEventListener('mousemove', function (e) {
          // Note that we have to check if 'e' is not a synthetic event that can be be dispatched by
          // this handler. Otherwise we will enter infinite loop. We redispatch event even if we are
          // not retargeting it to be able to set defaultPreventedFlag here, so the touch handling
          // code can be simpler and always use that flag.
          if (!e.synthetic) {
            var target, mouseEvent;

            if (e.target === mmoveSource) {
              target = mmoveTarget;
            } else {
              target = e.target;
            }
            if (target !== prevTarget) {
              if (target === mmoveTarget) {
                mmoveTarget.dispatchEvent(createMouseEvent(e, "mouseover", mmoveTarget, prevTarget));
              } else if (prevTarget === mmoveTarget) {
                mmoveTarget.dispatchEvent(createMouseEvent(e, "mouseout", mmoveTarget, target));
              }
            }
            e.stopPropagation();
            e.preventDefault();
            mouseEvent = retargetMouseEvent(e, target);
            mouseEvent.synthetic = true; // !!!
            // We don't support more sophisticated mousemove event passing, e.g. based on the hit
            // test results (yet?), so just set noop callback.
            api.hitTestCallback = noop;
            target.dispatchEvent(mouseEvent);
            // Set the defaultPreventedFlag. That's why we redispatch event even if we don't change
            // target of the event.
            defaultPreventedFlag = mouseEvent.defaultPrevented;
            prevTarget = target;
          }
        }, true);
      },

      /**
       * Registers a new layer that will receive mouse events.
       * @param  {Element} element
       */
      addLayer: function (element) {
        // Add new element *after* foreground element.
        layersToHitTest.splice(1, 0, element);
      },

      /**
       * Lets the code responsible for interaction inside canvas notify this helper whether a hit
       * really occurred inside canvas (e.g. some drawn element was hit or not). If this callback
       * isn't called (or is called with false argument), an event will be passed to the layers
       * below canvas.
       * @param {Boolean} isHit
       */
      hitTestCallback: noop,

      /**
       * Lets canvas notify this helper whether 'click' event should be dispatched.
       * @param {Boolean} isClick
       */
      mouseupCallback: noop
    };

    init();

    return api;
  };
});

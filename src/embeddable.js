/*global Lab, $, _gaq, Embeddable: true, AUTHORING: true */
/*jshint boss:true */

// Strawman setting for telling the interactive to be in "author mode",
// allowing things like positioning textBoxes by hand.
AUTHORING = false;

Embeddable = window.Embeddable || {};
Embeddable.sendGAPageview = function (){
    // send the pageview to GA
    if (typeof _gaq === 'undefined'){
      return;
    }
    // make an array out of the URL's hashtag string, splitting the string at every ampersand
    var my_hashtag_array = location.hash.split('&');

    // grab the first value of the array (assuming that's the value that indicates which interactive is being viewed)
    var my_hashtag = my_hashtag_array[0];
    _gaq.push(['_trackPageview', location.pathname + my_hashtag]);
};

Embeddable.load = function(interactiveUrl, containerSelector, callbacks) {
  // Fix mouse dragging when the mouse goes into an iframe child, or leaves the iframe we're in
  (function() {
    var blocker = null,
        protectAllIframes = function() {
          $('iframe').each(function() {
            var iframe = $(this),
                offset = iframe.offset();
            blocker = $('<div class="drag-blocker"></div>');
            blocker.css({position: 'absolute', top: offset.top, left: offset.left, width: iframe.width(), height: iframe.height(), zIndex: 1000 });
            $(document.body).append(blocker);
          });
        },
        mouseMove = function() {
          $(window).off("mousemove", mouseMove);
          $('.drag-blocker').remove();
          protectAllIframes();
        },
        mouseLeave = function() {
          // If we don't trigger immediately, it's possible that the user could release
          // the mouse outside of our frame and return back into our frame within our timeout
          // period, and we'd miss the mouseup and have the same old problem we're trying
          // to fix.

          var stillGone = true,
              cameBack = function() { stillGone = false; };
          setTimeout(function() {
            $(window).off('mousemove', cameBack);
            // Trigger if the mouse never came back (we'll assume we're still dragging)
            if (stillGone) {
              $(document).trigger('mouseup');
            }
          }, 500);
          $(window).on('mousemove', cameBack);
        },
        mouseDown = function() {
          $(window).on('mousemove', mouseMove);
          $(document).on('mouseleave', mouseLeave);
        },
        mouseUp = function() {
          $(window).off("mousemove", mouseMove);
          $(document).off("mouseleave", mouseLeave);
          $('.drag-blocker').remove();
        };

    $(document).on('mousedown', mouseDown).on('mouseup', mouseUp);
  })();

  callbacks = callbacks || {};

  function loadLabInteractive(interactiveJSON) {
    Embeddable.controller = new Lab.InteractivesController(interactiveJSON, containerSelector);
    if (callbacks.controllerReady) callbacks.controllerReady(Embeddable.controller);
  }

  if (interactiveUrl == null) {
    // Load empty interactive that waits for Interactive JSON that can be provided by parent
    // page using iframe-phone.
    loadLabInteractive(null);
    return;
  }

  $.get(interactiveUrl).done(function(results) {
    if (typeof results === 'string') results = JSON.parse(results);

    if (results.redirect) {
      if (callbacks.redirect) {
        callbacks.redirect(results.redirect);
        return;
      } else {
        throw new Error("Redirecting interactive loaded without a redirect handler");
      }
    }
    loadLabInteractive(results);
  })
  .fail(function() {
    document.title = "Interactive not found";
    $(containerSelector).load("interactives/not-found.html", function(){
      $('#interactive-link').text(interactiveUrl).attr('href', interactiveUrl);
    });
    if(callbacks.notFound) callbacks.notFound();
  });
};

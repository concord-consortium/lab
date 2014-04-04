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
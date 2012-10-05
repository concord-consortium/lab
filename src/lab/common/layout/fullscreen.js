/*globals define: false, alert: false */
// ------------------------------------------------------------
//
// Fullscreen API
//
// ------------------------------------------------------------

define(function (require) {
  // Dependencies.
  var layout = require('layout/layout');

  /** do we have the querySelectorAll method? **/
  if (document.querySelectorAll) {
    var fullScreenImage = document.querySelector ('#fullscreen');
    if (fullScreenImage) {
      fullScreenImage.style.cursor = "pointer";
      fullScreenImage.addEventListener ('click', function () {
        var el = document.documentElement;
        var request = el.requestFullScreen ||
                      el.webkitRequestFullScreen ||
                      el.mozRequestFullScreen;

        var fullscreen = document.fullScreen ||
                         document.webkitIsFullScreen ||
                         document.mozFullScreen;

        var cancel = document.cancelFullScreen ||
                     document.webkitCancelFullScreen ||
                     document.mozCancelFullScreen;

        if (request) {
          if (fullscreen) {
            layout.cancelFullScreen = true;
            cancel.call(document);
          } else {
            layout.cancelFullScreen = false;
            request.call(el);
          }
        } else {
          alert("You'll need to use a newer browser to use the\n" +
                "full-screen API.\n\n" +
                "Chrome v15 (beta)\n" +
                "http://www.google.com/landing/chrome/beta/\n\n" +
                "Chrome v17 Canary:\n" +
                "http://tools.google.com/dlpage/chromesxs\n\n" +
                "Safari v5.1.1:\n\n" +
                "FireFox v9 Aurora:\n" +
                "https://www.mozilla.org/en-US/firefox/channel/\n\n" +
                "FireFox v10 Nightly\n" +
                "http://nightly.mozilla.org/\n" +
                "Open 'about:config' and set: full-screen-api-enabled");
        }
      }, false);
    }
  }

  // And return nothing...
  // Probably this is an example of RequireJS anti-pattern.
  // However, used as a temporary workaround to execute script above.
  // TODO: do it better.
});

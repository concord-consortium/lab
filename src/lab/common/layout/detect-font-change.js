define(function() {

  // how long to poll
  var DEFAULTS = {
    timeout: 3000,
    interval: 250,
    onchange: function() {}
  };

  var fontLoaded = {};
  var pollingInterval = {};
  var bitmaps = {};

  function getBitmap(font) {
    var dim = Math.ceil(1.5 * parseFloat(font.match(/[\d\.]+px/), 10));
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    if (isNaN(dim)) dim = 20;

    canvas.width = dim;
    canvas.height = dim;

    ctx.font = font;
    ctx.fillText("A", 0, dim);
    return canvas.toDataURL();
  }

  function stopChecking(font) {
    window.clearInterval(pollingInterval[font]);
    delete pollingInterval[font];
    delete bitmaps[font];
  }

  function fontChecker(font, startTime, timeout, changeCallback) {
    bitmaps[font] = getBitmap(font);

    return function() {
      if (getBitmap(font) !== bitmaps[font]) {
        changeCallback();
        fontLoaded[font] = true;
        stopChecking(font);
        return;
      }

      if (Date.now() - startTime > timeout) {
        stopChecking(font);
      }
    };
  }

  /**
    Detects changes to how a given font renders in a Canvas context, using the assumption that the
    first such change indicates that the font has loaded and should no longer be checked.

    options:
      font: a font name in the format used by the CSS font property. The font size should be in px.
            See https://developer.mozilla.org/en-US/docs/Web/CSS/font

      interval: Length in milliseconds of the interval to use for checking a font for changes.

      timeout: How many milliseconds to wait before indicating an error

      onchange: A function to be called when we detect a change to the way the font renders. This is
                not a promise-style callback that indicates the font is loaded; it is only called
                when we detect a difference in the bitmap created when rendering canvas fillText
                using this font. Furthermore if we have decided that this font has already loaded,
                then we wont' call onchange.

    semantics:

      for a given font specifier
        if it has been loaded already
          return valse
        if it has not loaded
          and we are not already polling for changes to that font:
            return true
          else:
            begin polling every interval milliseconds, for at most 'timeout' milliseconds
              if it changes during that interval
               call onchange function
               cancel polling interval
            return true
  */
  return function detectFontChange(_options) {

    var options = {};
    var font;

    // option processing
    Object.keys(_options).concat(Object.keys(DEFAULTS)).forEach(function(key) {
      options[key] = _options[key] != null ? _options[key] : DEFAULTS[key];
    });
    font = options.font;

    if (fontLoaded[font]) {
      // Font already loaded.
      return false;
    }

    if (pollingInterval[font]) {
      // We're already checking the font.
      return true;
    }

    pollingInterval[font] = window.setInterval(
      fontChecker(font, Date.now(), options.timeout, options.onchange),
      options.interval
    );

    return true;
  };

});

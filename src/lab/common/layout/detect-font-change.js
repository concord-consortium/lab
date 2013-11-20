define(function() {

  // how long to poll
  var DEFAULTS = {
    timeout: 3000,
    interval: 250,
    onchange: null
  };

  var fontLoaded = {};
  var loading = {};

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
    window.clearInterval(loading[font].pollingInterval);
    delete loading[font];
  }

  function fontChecker(font, startTime, timeout) {
    loading[font].bitmap = getBitmap(font);

    return function() {
      if (getBitmap(font) !== loading[font].bitmap) {
        loading[font].changeCallbacks.forEach(function (cb) {
          cb();
        });
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
                using this font. It will be called if this method returns true and the font-checking
                does not timeout. It is always called asynchronously (i.e, in a later event loop.)

    returns:
      true, if the font has not yet loaded
      false, if the font is already loaded

    semantics:

      for a given font specifier
        if it has been loaded already
          return false
        if it has not loaded
          and we are not already polling for changes to that font:
            add 'onchange' to the list of onchange listeners
            return true
          else:
            begin polling every interval milliseconds, for at most 'timeout' milliseconds
              if it changes during that interval
               call onchange listeners
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

    if ( ! loading[font] ) {
      loading[font] = {
        bitmap: null,
        pollingInterval: null,
        changeCallbacks: []
      };
    }

    if (options.onchange) {
      loading[font].changeCallbacks.push(options.onchange);
    }

    if ( ! loading[font].pollingInterval ) {
      loading[font].pollingInterval = window.setInterval(
        fontChecker(font, Date.now(), options.timeout),
        options.interval
      );
    }

    return true;
  };

});

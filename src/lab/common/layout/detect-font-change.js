define(function() {
  // Size of the font we test, it doesn't really matter.
  var FONT_SIZE = 15; // px

  // how long to poll
  var DEFAULTS = {
    weight: 'normal',
    timeout: 3000,
    interval: 250,
    onchange: null
  };

  var fontLoaded = {};
  var loading = {};

  function getBitmap(font) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var dim = FONT_SIZE * 1.5;

    canvas.width = dim;
    canvas.height = dim;

    ctx.font = font;
    ctx.fillText('A', 0, dim);
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
    If you provide multiple fonts (e.g. Lato, 'Open Sans', Arial), onchange handler can be called
    multiple times.

    options:
      font:   a font family name in the format used by the CSS font-family property.
              See https://developer.mozilla.org/en-US/docs/Web/CSS/font-family

      weight: a font weight in the format used by the CSS font-weight property.
              See https://developer.mozilla.org/en/docs/Web/CSS/font-weight

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

    // option processing
    Object.keys(_options).concat(Object.keys(DEFAULTS)).forEach(function(key) {
      options[key] = _options[key] != null ? _options[key] : DEFAULTS[key];
    });

    var multipleFonts = options.font.split(',');
    if (multipleFonts.length > 1) {
      var result = false;
      multipleFonts.forEach(function(fontName) {
        options.font = fontName.trim();
        if (detectFontChange(options)) {
          // Return true if at least one font is not already loaded.
          result = true;
        }
      });
      return result;
    }

    // Construct compact form that is expected by canvas.
    var font = options.weight + ' ' + FONT_SIZE + 'px ' + options.font;

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

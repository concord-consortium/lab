/*global define, $ */

/**
 * Require this module to initialize Lab jQuery plugins.
 */
define(function () {
  /**
   * Allows to measure element when it isn't already added to the page.
   * @param  {Function} fn       Function which will be executed.
   * @param  {string}   selector jQuery selector.
   * @param  {Object}   parent   Element which will be used as a temporal container.
   * @return {*}                 Result of 'fn' execution.
   */
  $.fn.measure = function(fn, selector, parent) {
    var el, selection, result;
    el = $(this).clone(false);
    el.css({
      visibility: 'hidden',
      position: 'absolute'
    });
    el.appendTo(parent);
    if (selector) {
      selection = el.find(selector);
    } else {
      selection = el;
    }
    result = fn.apply(selection);
    el.remove();
    return result;
  };

  /**
   * Truncates text inside given element, so its width doesn't exceed specified
   * value (in pixels). Note that you *can* use this function even on elements
   * like <p> or <h1>, which quite often have width of its parent (not width of
   * their text). This function will create a new <span> element with the same
   * style as original text and use it to measure real width of the text.
   *
   * @param  {number} maxWidth Maximum allowed width of text.
   */
  $.fn.truncate = function (maxWidth) {
    var $el = $(this),
        $span = $('<span>'),
        width,
        newText;

    $span.text($el.text());
    $span.css({
      'font-size': $el.css('font-size'),
      'font-weight': $el.css('font-weight'),
      'white-space': 'nowrap',
      'visibility': 'hidden'
    });
    $span.appendTo($el.parent());

    width = $span.width();

    if (width > maxWidth) {
      newText = $span.text() + "...";
      $span.text(newText);
      while (width > maxWidth && newText.length > 3) {
        newText = $span.text().slice(0, -4) + "...";
        $span.text(newText);
        width = $span.width();
      }

      // Save original text content in title attribute,
      // so tooltip can be displayed.
      $el.attr("title", $el.text());
      // Update original element.
      $el.text(newText);
    }
    // Cleanup!
    $span.remove();
  };

 /**
  * jQuery alterClass plugin
  *
  * Remove element classes with wildcard matching. Optionally add classes:
  *   $( '#foo' ).alterClass( 'foo-* bar-*', 'foobar' )
  *
  * Copyright (c) 2011 Pete Boere (the-echoplex.net)
  * Free under terms of the MIT license: http://www.opensource.org/licenses/mit-license.php
  *
  * source: https://gist.github.com/peteboere/1517285
  */
  $.fn.alterClass = function (removals, additions) {
    var self = this;

    if ( removals.indexOf( '*' ) === -1 ) {
      // Use native jQuery methods if there is no wildcard matching
      self.removeClass( removals );
      return !additions ? self : self.addClass( additions );
    }

    var patt = new RegExp( '\\s' +
        removals.
          replace( /\*/g, '[A-Za-z0-9-_]+' ).
          split( ' ' ).
          join( '\\s|\\s' ) +
        '\\s', 'g' );

    self.each( function ( i, it ) {
      var cn = ' ' + it.className + ' ';
      while ( patt.test( cn ) ) {
        cn = cn.replace( patt, ' ' );
      }
      it.className = $.trim( cn );
    });

    return !additions ? self : self.addClass( additions );
  };

  /**
    * jQuery special event triggered when element is removed from DOM.
    * e.g. $('#element-id').on('destroyed', function () { console.log('destroyed!'); })
    */
  $.event.special.destroyed = {
    remove: function(o) {
      if (o.handler) {
        o.handler()
      }
    }
  };
});

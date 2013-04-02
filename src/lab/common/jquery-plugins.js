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
});

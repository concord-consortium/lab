/*global define, $ */

/**
 * Require this module to add support of SVG elements in following jQuery functions:
 * - .hasClass(className)
 * - .addClass(className)
 * - .removeClass(className)
 * Note that only the basic form (argument is a string with class name) of these functions is
 * supported for SVG! E.g. if you pass function as an argument (what is supported by jQuery),
 * original jQuery function without SVG support will be executed.
 *
 * TEST: http://jsfiddle.net/aKJvc/
 * If you update code below, you can use this jsfiddle and test especially in Safari 7,
 * which was causing problems.
 */
// Save original jQuery functions (they will be used for HTML elements).
var hasClassHTML = $.fn.hasClass;
var addClassHTML = $.fn.addClass;
var removeClassHTML = $.fn.removeClass;
// Implement functions that work fine with SVGElements.
var hasClassSVG = function(className) {
  return new RegExp('(\\s|^)' + className + '(\\s|$)').test(this.getAttribute('class'));
};
var addClassSVG = function(className) {
  if (!hasClassSVG.apply(this, arguments)) {
    this.setAttribute('class', this.getAttribute('class') + ' ' + className);
  }
};
var removeClassSVG = function(className) {
  var removedClass = this.getAttribute('class').replace(new RegExp('(\\s|^)' + className + '(\\s|$)', 'g'), '$2');
  if (hasClassSVG.apply(this, arguments)) {
    this.setAttribute('class', removedClass);
  }
};

// Executes function suitable for SVG or HTML element.
function execute(jquerySelection, orgArguments, SVGFunc, HTMLFunc) {
  var result = [];
  var element;
  for (var i = 0, len = jquerySelection.length; i < len; i++) {
    element = jquerySelection[i];
    if (element instanceof SVGElement) {
      result.push(SVGFunc.apply(element, orgArguments));
    } else {
      result.push(HTMLFunc.apply($(element), orgArguments));
    }
  }
  return result;
}

// Overwrite jQuery functions:
$.fn.hasClass = function(value) {
  var result = execute(this, arguments, hasClassSVG, hasClassHTML);
  for (var i = 0, len = result.length; i < len; i++) {
    if (result[i]) return true;
  }
  return false;
};

$.fn.addClass = function(value) {
  if ($.isFunction(value)) {
    // No support for function argument and SVGElement.
    return addClassHTML.apply(this, arguments);
  }
  execute(this, arguments, addClassSVG, addClassHTML);
  return this;
};

$.fn.removeClass = function(value) {
  if ($.isFunction(value)) {
    // No support for function argument and SVGElement.
    return removeClassHTML.apply(this, arguments);
  }
  execute(this, arguments, removeClassSVG, removeClassHTML);
  return this;
};

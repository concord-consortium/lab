/*globals define, d3 */

define(function (require) {
  return function registerKeyboardHandler(callback) {
    d3.select(window).on("keydown", callback);
  };
});

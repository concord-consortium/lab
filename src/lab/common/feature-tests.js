/*global define, $ */

define(function () {

  // Cache results of feature tests, as e.g. two different modules can ask about the same thing.
  var CACHE = {};

  return {
    /**
     * Returns true if CSS pointer-events: none style can be used to make an element transparent
     * for mouse events and document.elementFromPoint() function.
     */
    get cssPointerEvents() {
      if (CACHE.cssPointerEvents === undefined) {
        CACHE.cssPointerEvents = (function () {
          var $div, $svg, result;
          // Using "fixed" positioning we can avoid thinking about scrollTop / scrollLeft values,
          // test elements will be always inside the current viewport.
          $div = $("<div id='supported'>").css({
            "position": "fixed",
            "left": 0,
            "top": 0,
            "width": "10px",
            "height": "10px"
          }).appendTo("body");
          $svg = $("<svg id='unsupported'>").css({
            "position": "fixed",
            "left": 0,
            "top": 0,
            "width": "10px",
            "height": "10px",
            "pointer-events": "none" // !!!
          }).appendTo("body");

          result = document.elementFromPoint(5, 5).id;

          $svg.remove();
          $div.remove();

          switch(result) {
            case "supported":
              return true;
            case "unsupported":
              return false;
            default:
              console.warn("CSS pointer-events feature test failed");
              return false;
          }
        }());
      }
      return CACHE.cssPointerEvents;
    }
  };
});

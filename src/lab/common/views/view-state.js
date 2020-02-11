/*global define */

/**
 * Custom handling of enabled/disabled state for Lab's HTML elements.
 */
export default {
  disableView: function($element) {
    if (!$element.hasClass("lab-disabled")) {
      $element.addClass("lab-disabled");
      $element.append('<div class="lab-disabled-overlay"/>');
    }
  },

  enableView: function($element) {
    $element.removeClass("lab-disabled");
    $element.find(".lab-disabled-overlay").remove();
  }
};

/*global define */

/**
 * Tiny "mixin" that can be used by an interactive component. It's temporal workaround before we
 * refactor all interactive components to inherit from one common base class that should provide
 * such basic functionality. Mixins are inconvenient in this case, as they force us to modify
 * implementation of every single component (require and use mixin).
 */
define(function () {

  return function disablable(component, componentDef) {
    // Extend Public API of a component.
    component.setDisabled = function(v) {
      var $element = this.getViewContainer();
      if (v) {
        $element.addClass("lab-disabled");
        $element.append('<div class="lab-disabled-overlay"/>');
      } else {
        $element.removeClass("lab-disabled");
        $element.find(".lab-disabled-overlay").remove();
      }
    };
    // Set initial value if componentDef is provided.
    if (arguments.length > 1) {
      component.setDisabled(componentDef.disabled);
    }
  };
});

/*global define */

/**
 * Tiny "mixin" that can be used by an interactive component.
 */
export default function helpIconSupport(component, componentDef, helpSystem) {
  if (componentDef.helpIcon) {
    var $helpIcon = $('<i class="icon-question-sign lab-help-icon lab-component-help-icon"></i>');
    $helpIcon.on('click', function() {
      if (!helpSystem.isActive()) {
        helpSystem.showSingle(componentDef.id);
      }
    });
    $helpIcon.appendTo(component.getViewContainer());
  }
};

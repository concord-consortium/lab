
/**
 * Tiny "mixin" that can be used by an interactive component. It's temporal workaround before we
 * refactor all interactive components to inherit from one common base class that should provide
 * such basic functionality. Mixins are inconvenient in this case, as they force us to modify
 * implementation of every single component (require and use mixin).
 */
import viewState from 'common/views/view-state';

var enableView = viewState.enableView;
var disableView = viewState.disableView;

export default function disablable(component, componentDef) {
  // Extend Public API of a component.
  component.setDisabled = function(v) {
    var $element = this.getViewContainer();
    if (v) {
      disableView($element);
      this.isDisabled = true;
    } else {
      enableView($element);
      this.isDisabled = false;
    }
  };

  // Components are effectively enabled until we take specific action to disable them, so:
  component.isDisabled = false;

  // Set initial value if componentDef is provided.
  if (componentDef) {
    component.setDisabled(componentDef.disabled);
  }
};

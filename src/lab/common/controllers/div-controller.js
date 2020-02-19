
import inherit from 'common/inherit';
import InteractiveComponent from 'common/controllers/interactive-component';
import alert from 'common/alert';


/**
 * Simplest component controller which just inherits from InteractiveComponent, simply
 * creating a div element. Component can have dimensions, css classes and on onClick
 * function.
 * @param {Object} component Component JSON definition.
 * @param {ScriptingAPI} scriptingAPI
 * @param {InteractiveController} controller
 */
function DivController(component, scriptingAPI, controller) {
  // Call super constructor.
  InteractiveComponent.call(this, "div", component, scriptingAPI, controller);
  var content = component.content;
  var divController = this;
  if (component.url) {
    // make sure the user sets the width and height because otherwise the layout
    // will be broken
    if (component.width === "auto" || component.height === "auto") {
      alert("This interactive has a remote div component.\n" +
        "The width and/or height is not set.\n" +
        "Please set both the width and height.");
    }


    $.ajax(component.url, {
      dataType: "html",
      complete: function(data) {
        divController.$element.append(data.responseText);
      }
    });
  } else {
    if (content && content.join) {
      content = content.join("\n");
    }
    this.$element.append(content);
  }
}
inherit(DivController, InteractiveComponent);

export default DivController;

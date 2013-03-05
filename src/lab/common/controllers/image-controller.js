/*global define, $ */

define(function (require) {

  var inherit              = require('common/inherit'),
      InteractiveComponent = require('common/controllers/interactive-component');

  /**
   * Image controller.
   *
   * @constructor
   * @extends InteractiveComponent
   * @param {Object} component Component JSON definition.
   */
  function ImageController(component) {
    var $img = $("<img>");

    // Call super constructor.
    InteractiveComponent.call(this, "image", component);

    $img.attr("src", component.src);

    // Whem dimension is different from "auto",
    // ensure that image fits its parent container.
    if (this.component.width !== "auto") {
      $img.css("width", "100%");
    }
    if (this.component.height !== "auto") {
      $img.css("height", "100%");
    }
    $img.appendTo(this.$element);
  }
  inherit(ImageController, InteractiveComponent);

  return ImageController;
});

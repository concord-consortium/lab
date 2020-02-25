
import labConfig from 'lab.config';
import inherit from 'common/inherit';
import InteractiveComponent from 'common/controllers/interactive-component';

var externalUrl = /^https?:\/\//i;

/**
 * Image controller.
 *
 * @constructor
 * @extends InteractiveComponent
 * @param {Object} component Component JSON definition.
 * @param {ScriptingAPI} scriptingAPI
 * @param {InteractiveController} controller
 */
function ImageController(component, controller) {
  // Call super constructor.
  InteractiveComponent.call(this, "image", component, controller);

  /** @private */
  this._controller = controller;
  /** @private */
  this._$img = $("<img>");
  /** @private */
  this._externalUrl = externalUrl.test(this.component.src);

  if (this._externalUrl) {
    // If URL is external, we can setup it just once.
    this._$img.attr("src", this.component.src);
  }

  // When a dimension is different from "auto",
  // ensure that image fits its parent container.
  if (this.component.width !== "auto") {
    this._$img.css("width", "100%");
  }
  if (this.component.height !== "auto") {
    this._$img.css("height", "100%");
  }
  this._$img.appendTo(this.$element);
}
inherit(ImageController, InteractiveComponent);

/**
 * Implements optional callback supported by Interactive Controller.
 */
ImageController.prototype.modelLoadedCallback = function() {
  var src, modelUrl, urlRelativeTo;
  // It's necessary to update path only if its relative (as it's relative to
  // model file).
  if (!this._externalUrl) {
    src = this.component.src;
    // Relative path should be relative to the model definition file, to
    // follow pattern used for images inside model container.
    // TODO: not sure if it makes sense for the Interactive images. When web
    // application is ready, probably it will be changed anyway.
    urlRelativeTo = this.component.urlRelativeTo;

    switch (urlRelativeTo) {
      case 'page':
        modelUrl = '';
        break;
      case 'model':
      default:
        modelUrl = this._controller.modelController.modelUrl || '';
        break;
    }

    // Remove <model-name>.json from url.
    modelUrl = modelUrl.slice(0, modelUrl.lastIndexOf("/") + 1);
    src = labConfig.modelsRootUrl + modelUrl + src;
    this._$img.attr("src", src);
  }
};

export default ImageController;

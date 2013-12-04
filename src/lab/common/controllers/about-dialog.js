/*global define, $ */
define(function (require) {

  var markdownToHTML = require('common/markdown-to-html'),
      inherit        = require('common/inherit'),
      BasicDialog    = require('common/controllers/basic-dialog');

  /**
   * About Dialog. Inherits from Basic Dialog.
   *
   * @constructor
   */
  function AboutDialog(parentSelector) {
    BasicDialog.call(this, {dialogClass: "about-dialog", appendTo: parentSelector});
  }
  inherit(AboutDialog, BasicDialog);

  /**
   * Updates dialog content using interactive JSON definition.
   *
   * @param {Object} interactive Interactive JSON definition.
   */
  AboutDialog.prototype.update = function(interactive) {
    var $aboutContent = $("<div>");

    this.set("title", "About: " + interactive.title);

    if (interactive.subtitle) {
      $aboutContent.append(markdownToHTML(interactive.subtitle));
    }
    $aboutContent.append(markdownToHTML(interactive.about));

    this.setContent($aboutContent);
  };

  return AboutDialog;
});

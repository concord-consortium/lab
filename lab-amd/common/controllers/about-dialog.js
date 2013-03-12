/*global define, $ */
define(function (require) {

  var arrays      = require('arrays'),
      inherit     = require('common/inherit'),
      BasicDialog = require('common/controllers/basic-dialog');

  /**
   * About Dialog. Inherits from Basic Dialog.
   *
   * @constructor
   */
  function AboutDialog() {
    BasicDialog.call(this, {dialogClass: "about-dialog"});
  }
  inherit(AboutDialog, BasicDialog);

  /**
   * Updates dialog content using interactive JSON definition.
   *
   * @param {Object} interactive Interactive JSON definition.
   */
  AboutDialog.prototype.update = function(interactive) {
    var $aboutContent = $("<div>"),
        about;

    this.set("title", "About: " + interactive.title);

    if (interactive.subtitle) {
      $aboutContent.append("<p>" + interactive.subtitle + "</p>");
    }
    about = arrays.isArray(interactive.about) ? interactive.about : [interactive.about];
    $.each(about, function(idx, val) {
      $aboutContent.append("<p>" + val + "</p>");
    });

    this.setContent($aboutContent);
  };

  return AboutDialog;
});

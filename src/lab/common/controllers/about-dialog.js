/*global define, $ */
define(function (require) {

  var arrays      = require('arrays'),
      inherit     = require('common/inherit'),
      BasicDialog = require('common/controllers/basic-dialog');

  /**
   * About Dialog. Inherits from Basic Dialog.
   *
   * @constructor
   * @param {Object} interactive Interactive JSON definition.
   */
  function AboutDialog(interactive) {
    var $aboutContent = $("<div>"),
        about;

    BasicDialog.call(this, {dialogClass: "about-dialog"});

    this.set("title", "About: " + interactive.title);

    if (interactive.subtitle) {
      $aboutContent.append("<p>" + interactive.subtitle + "</p>");
    }
    about = arrays.isArray(interactive.about) ? interactive.about : [interactive.about];
    $.each(about, function(idx, val) {
      $aboutContent.append("<p>" + val + "</p>");
    });

    this.setContent($aboutContent);
  }
  inherit(AboutDialog, BasicDialog);

  return AboutDialog;
});

/*global define, $ */
define(function (require) {

  var arrays      = require('arrays'),
      markdown    = require('markdown'),
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

    // Ensure that common typography for markdown-generated content is used.
    $aboutContent.addClass("markdown-typography");
    if (interactive.subtitle) {
      $aboutContent.append(markdown.toHTML(interactive.subtitle));
    }
    about = arrays.isArray(interactive.about) ? interactive.about : [interactive.about];
    $.each(about, function(idx, val) {
      $aboutContent.append(markdown.toHTML(val));
    });

    this.setContent($aboutContent);
  };

  return AboutDialog;
});

/*global define, $ */
import $__common_markdown_to_html from "common/markdown-to-html";
import $__common_inherit from "common/inherit";
import $__common_controllers_basic_dialog from "common/controllers/basic-dialog";

var markdownToHTML = $__common_markdown_to_html,
  inherit = $__common_inherit,
  BasicDialog = $__common_controllers_basic_dialog;

/**
 * About Dialog. Inherits from Basic Dialog.
 *
 * @constructor
 */
function AboutDialog(parentSelector, i18n, interactive) {
  BasicDialog.call(this, {
    dialogClass: "about-dialog",
    appendTo: parentSelector
  }, i18n);
  this._i18n = i18n;
  if (interactive) {
    this.update(interactive);
  }
}

inherit(AboutDialog, BasicDialog);

/**
 * Updates dialog content using interactive JSON definition.
 *
 * @param {Object} interactive Interactive JSON definition.
 */
AboutDialog.prototype.update = function (interactive) {
  var $aboutContent = $("<div>");

  this.set("title", this._i18n.t("about_dialog.title", {
    interactive_title: interactive.title
  }));

  if (interactive.subtitle) {
    // Bold the subtitle using markdown (**).
    $aboutContent.append(markdownToHTML("**" + interactive.subtitle + "**"));
  }
  $aboutContent.append(markdownToHTML(interactive.about));

  this.setContent($aboutContent);
};

export default AboutDialog;

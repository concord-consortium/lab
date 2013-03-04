/*global define, $ */
/**
  Simple wrapper around the jQuery UI Dialog providing
  some useful defaults and simple interface.
*/
define(function () {

  var defOptions = {
    autoOpen: false,
    dialogClass: "interactive-dialog",
    // Ensure that font is being scaled dynamically!
    appendTo: "#responsive-content",
    width: "80%"
  };

  function BasicDialog(options) {
    // Basic dialog elements.
    this.$element = $('<div>');
    // jQuery UI Dialog.
    this.$element.dialog($.extend({}, defOptions, options));
  }

  BasicDialog.prototype.open = function() {
    this.$element.dialog("open");
  };

  BasicDialog.prototype.set = function(key, value) {
    this.$element.dialog("option", key, value);
  };

  BasicDialog.prototype.setContent = function ($content) {
    this.$element.empty();
    this.$element.append($content);
  };

  return BasicDialog;
});

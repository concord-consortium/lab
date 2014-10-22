/*global define, $ */

define(function () {

  var defOptions = {
    autoOpen: false,
    dialogClass: "interactive-dialog",
    width: "80%"
  };

  /**
   * Simple wrapper around the jQuery UI Dialog,
   * which provides useful defaults and simple interface.
   *
   * @constructor
   * @param {Object} options jQuery UI Dialog options.
   */
  function BasicDialog(options, i18n) {
    /**
     * Basic dialog elements.
     * @type {jQuery}
     */
    var title = options.title || '';
    var id = options.id || '';

    this.$element = $('<div id="'+id+'" title="'+title+'">');
    // Create jQuery UI Dialog.
    this.$element.dialog($.extend({closeText: i18n.t("dialog.close_tooltip")}, defOptions, options));
  }

  /**
   * Opens the dialog.
   */
  BasicDialog.prototype.open = function() {
    this.$element.dialog("open");
  };

  /**
   * Sets jQuery UI Dialog option.
   *
   * @param {string} key
   * @param {Object} value
   */
  BasicDialog.prototype.set = function(key, value) {
    this.$element.dialog("option", key, value);
  };

  /**
   * Sets content of the dialog.
   *
   * @param {jQuery|DOM|string} $content Any value that can be accepted by the jQuery constructor.
   */
  BasicDialog.prototype.setContent = function ($content) {
    this.$element.empty();
    // Not very pretty, but probably the simplest and most reliable way to
    // disable autofocus in jQuery UI dialogs. See:
    // http://jqueryui.com/upgrade-guide/1.10/#added-ability-to-specify-which-element-to-focus-on-open
    this.$element.append('<input type="hidden" autofocus="autofocus" />');
    this.$element.append($content);
  };

  return BasicDialog;
});

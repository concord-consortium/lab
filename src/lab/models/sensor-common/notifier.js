/*global define */
import $__common_controllers_basic_dialog from 'common/controllers/basic-dialog';
var BasicDialog = $__common_controllers_basic_dialog;

function Notifier(i18n) {
  this._i18n = i18n;
}

Notifier.prototype.alert = function(message, buttons, options) {
  var opts = $.extend({
    width: "60%",
    buttons: buttons,
    closeOnEscape: false
  }, options);
  var dialog = new BasicDialog(opts, this._i18n);

  dialog.setContent("<div>" + message + "</div>");
  dialog.open();
};

Notifier.prototype.status = function(message, options) {
  var opts = $.extend({
    width: "60%",
    closeOnEscape: false,
    modal: true
  }, options);
  var dialog = new BasicDialog(opts, this._i18n);

  dialog.setContent("<div>" + message + "</div>");
  dialog.open();
  return dialog;
};

export default Notifier;

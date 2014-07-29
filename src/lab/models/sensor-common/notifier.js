/*global define */
define(function (require) {
  var BasicDialog    = require('common/controllers/basic-dialog');

  function Notifier(i18n){
    this._i18n = i18n;
  }

  Notifier.prototype.alert = function(message, buttons) {
      var dialog = new BasicDialog({
            width: "60%",
            buttons: buttons
          }, this._i18n);

      dialog.setContent(message);
      dialog.open();
  };

  return Notifier;
});
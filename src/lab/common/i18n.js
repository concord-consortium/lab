/*global define */

define(function (require) {
  var i18next       = require('i18next');
  var translations  = JSON.parse(require('text!locales/translations.json'));

  return function i18n(language) {
    i18next.init({
      lng: language,
      resStore: translations,
      fallbackLng: 'en-US',
      useCookie: false
    });
    return i18next;
  };
});

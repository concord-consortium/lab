/*global define */

define(function (require) {
  var i18next       = require('i18next');
  var LabGrapher    = require('lab-grapher');
  var translations  = JSON.parse(require('text!locales/translations.json'));

  return function i18n(language) {
    i18next.init({
      lng: language,
      resStore: translations,
      fallbackLng: 'en-US',
      useCookie: false
    });
    // Grapher has its own i18n support implemented, just set language.
    LabGrapher.i18n.lang = language;
    return i18next;
  };
});

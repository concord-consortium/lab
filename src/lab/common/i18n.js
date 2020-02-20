import i18next from 'i18next';
import LabGrapher from 'lab-grapher';
import translations from 'locales/translations.json';

export default function i18n(language) {
  i18next.init({
    lng: language,
    resources: translations,
    fallbackLng: 'en-US',
    initImmediate: false
  });
  // Grapher has its own i18n support implemented, just set language.
  LabGrapher.i18n.lang = language;
  return i18next;
}

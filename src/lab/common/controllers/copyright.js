/*global define */
define(function () {
  return function getCopyright(i18n) {
    var CC_link = '<a class="opens-in-new-window" href="http://concord.org" target="_blank">The Concord Consortium</a>';
    var MIT_link = '<a class="opens-in-new-window" href="http://opensource.org/licenses/MIT" target="_blank">MIT</a>';
    var concord_org_link = '<a class="opens-in-new-window" href="http://concord.org/" target="_blank">http://concord.org</a>';
    return '<div class="copyright-section">' +
           '<strong>' + i18n.t('copyright.copyright') + ' © 2015</strong> ' + CC_link + '. ' +
           i18n.t('copyright.all_rights_reserved') + ' ' +
           i18n.t('copyright.license', {
             MIT_link: MIT_link
           }) + ' ' +
           i18n.t('copyright.attribution', {
            concord_org_link: concord_org_link
           }) +
           '</div>';
  };
});

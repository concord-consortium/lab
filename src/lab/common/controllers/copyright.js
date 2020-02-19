export default function getCopyright(i18n) {
  var CC_link = '<a class="opens-in-new-window" href="https://concord.org" target="_blank">The Concord Consortium</a>';
  var MIT_link = '<a class="opens-in-new-window" href="http://opensource.org/licenses/MIT" target="_blank">MIT</a>';
  var license_link = '<a class="opens-in-new-window" href="https://github.com/concord-consortium/lab/blob/master/license.md" target="_blank">license.md</a>';
  var concord_org_link = '<a class="opens-in-new-window" href="https://concord.org/" target="_blank">https://concord.org</a>';
  return '<div class="copyright-section">' +
    '<strong>' + i18n.t('copyright.copyright') + ' © ' + new Date().getFullYear() + '</strong> ' + CC_link + '. ' +
    i18n.t('copyright.all_rights_reserved') + ' ' +
    i18n.t('copyright.license', {
      MIT_link: MIT_link,
      license_link: license_link
    }) + ' ' +
    i18n.t('copyright.attribution', {
      concord_org_link: concord_org_link
    }) +
    '</div>';
};

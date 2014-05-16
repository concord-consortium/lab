/*global define, $ */

define(function (require) {
  var resourcesUrl = require('common/resources-url');

  function languageSelect(selector, interactiveController) {
    var metadata = interactiveController.interactive.i18nMetadata;
    if (!metadata) return;

    var metadataDownloaded = $.get(metadata).done(function(results) {
      if (typeof results === 'string') results = JSON.parse(results);
      setupContextMenu(selector, results, interactiveController.interactive.lang,
                       interactiveController);
    });

    var interactiveRendered = new $.Deferred();
    interactiveController.on('interactiveRendered.i18nHelper', function() {
      interactiveRendered.resolve();
    });

    $.when(metadataDownloaded, interactiveRendered).done(function () {
      setupLangIcon(selector, interactiveController.interactive.lang);
    });
  }

  // Private functions used by i18nHelper.

  function code2flag(countryCode) {
    var arr = countryCode.split('-');
    // Handle special cases like "en-US", "en-GB" etc.
    return resourcesUrl('flags/' + arr[arr.length - 1].toLowerCase() + '.png');
  }

  function setupLangIcon(selector, currentLang) {
    var $icon = $(selector);
    $icon.addClass('lang-icon');
    $icon.css('background-image', 'url("' + code2flag(currentLang) + '")');
  }

  function setupContextMenu(selector, i18nMetadata, currentLang, interactiveController) {
    var items = {};
    Object.keys(i18nMetadata).forEach(function (key) {
      if (key === currentLang) return;
      items[key] = {
        name: key,
        className: 'lang-' + key
      };
    });
    if (Object.keys(items).length === 0) return;
    // When 'trigger' is set to 'none' and menu is opened manually using .contextMenu() call,
    // it causes that menu positioning doesn't use mouse pointer coordinates. It's the simplest way
    // to force a menu to always show below the flag.
    $(selector).on('click', function () {
      $(selector).contextMenu(); // ! open manu manually
    });
    $.contextMenu('destroy', selector);
    $.contextMenu({
      selector: selector,
      appendTo: '.lab-responsive-content',
      className: 'lang-menu',
      trigger: 'none', // !
      zIndex: 1000, // avoid conflict with layout containers
      determinePosition: function($menu) {
        // position to the lower left of the trigger element
        // .position() is provided as a jQuery UI utility
        // (...and it won't work on hidden elements)
        $menu.css('display', 'block').position({
            my: "right top",
            at: "right bottom",
            of: this,
            offset: "0 5",
            collision: "fit"
        }).css('display', 'none');
      },
      callback: function(key) {
        interactiveController.requestInteractiveAt(i18nMetadata[key]);
      },
      items: items
    });
    Object.keys(items).forEach(function (key) {
      $('.context-menu-item.lang-' + key).css('background-image', 'url("' + code2flag(key) + '")');
    });
  }

  return languageSelect;
});

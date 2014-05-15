/*global define, $ */

define(function (require) {
  var resourcesUrl = require('common/resources-url');

  function languageSelect(selector, interactiveController) {
    var metadata = interactiveController.interactive.i18nMetadata;
    if (!metadata) return;

    var metadataDownloaded = $.get(metadata).done(function(results) {
      if (typeof results === 'string') results = JSON.parse(results);
      setupContextMenu(selector, results, interactiveController.interactive.lang, interactiveController);
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

    // If set 'trigger': 'none' during its initialization and then open it manually using
    // .contextMenu() call, it will cause that menu will be opened without using mouse pointer
    // coordinates. So it's the simplest workaround to force a menu to show below the flag,
    // instead of below the mouse pointer.
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
            my: "left top",
            at: "left bottom",
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

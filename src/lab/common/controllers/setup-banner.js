/*global define */

define(function () {

  var labConfig      = require('lab.config'),
      TextController = require('common/controllers/text-controller');

  /**
   * Returns a hash containing:
   *  - components,
   *  - containers,
   *  - layout definition (components location).
   * All these things are used to build the interactive banner.
   *
   * @param {Object} interactive Interactive JSON definition.
   * @param {CreditsDialog} creditsDialog
   * @param {AboutDialog} aboutDialog
   * @param {ShareDialog} shareDialog
   */
  return function setupBanner(interactive, creditsDialog, aboutDialog, shareDialog) {
    var components = {},
        template = [],
        layout = {},
        // About link visible if there is about section or subtitle.
        aboutVisible = interactive.about || interactive.subtitle;

    function createLinkInContainer(link, container) {
      components[link.id] = new TextController(link);
      template.push(container);
      layout[container.id] = [link.id];
    }

    creditsDialog.update(interactive);
    createLinkInContainer(
    {
      "type": "text",
      "id": "credits-link",
      "text": "The Concord Consortium",
      "style": "header",
      "onClick": function () { creditsDialog.open(); }
    },
    {
      "id": "banner-left",
      "top": "0",
      "left": "0",
      "align": "left",
      "aboveOthers": true
    });

    // Define about link only if "about" or "subtitle" section is available.
    if (aboutVisible) {
      aboutDialog.update(interactive);
      createLinkInContainer(
      {
        "type": "text",
        "id": "about-link",
        "text": "About",
        "style": "header",
        "onClick": function () { aboutDialog.open(); }
      },
      {
        "id": "banner-right",
        "top": "0",
        "right": "interactive.width",
        "padding-left": "1em",
        "padding-right": "1em",
        "align": "right",
        "aboveOthers": true
      });
    }

    // Define sharing link only if sharing is enabled.
    // Note that due to layout limitations, banner-middle container
    // has to be defined *after* banner-right container which is used
    // in its specification!
    if (labConfig.sharing) {
      shareDialog.update(interactive);
      createLinkInContainer(
      {
        "type": "text",
        "id": "share-link",
        "text": "Share",
        "style": "header",
        "onClick": function () { shareDialog.open(); }
      },
      {
        "id": "banner-middle",
        "top": "0",
        // "banner-right" can be undefined, so check it.
        "right": aboutVisible ? "banner-right.left" : "interactive.width",
        "padding-right": "1em",
        "align": "right",
        "aboveOthers": true
      });
    }

    return {
      components: components,
      template: template,
      layout: layout
    };
  };
});

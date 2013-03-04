/*global define */

define(function () {

  var labConfig      = require('lab.config'),
      TextController = require('common/controllers/text-controller'),
      AboutDialog    = require('common/controllers/about-dialog'),
      ShareDialog    = require('common/controllers/share-dialog'),
      CreditsDialog  = require('common/controllers/credits-dialog');

  /**
   * Returns a hash containing:
   *  - components,
   *  - containers,
   *  - layout definition (components location).
   * All these things are used to build the interactive banner.
   *
   * @param {Object} interactive Interactive JSON definition.
   * @param {InteractivesController} interactivesController
   */
  return function setupBanner(interactive, interactivesController) {
    var components = {},
        template = [],
        layout = {},

        creditsDialog,
        shareDialog,
        aboutDialog;

    function createLinkInContainer(link, container) {
      components[link.id] = new TextController(link);
      template.push(container);
      layout[container.id] = [link.id];
    }

    creditsDialog = new CreditsDialog(interactive);
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
    if (interactive.about || interactive.subtitle) {
      aboutDialog = new AboutDialog(interactive);
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
        "align": "right",
        "aboveOthers": true
      });
    }

    // Define sharing link only if sharing is enabled.
    // Note that due to layout limitations, banner-middle container
    // has to be defined *after* banner-right container which is used
    // in its specification!
    if (labConfig.sharing) {
      shareDialog = new ShareDialog(interactive, interactivesController);
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
        "right": aboutDialog ? "banner-right.left" : "interactive.width",
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

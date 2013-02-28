/*global define, $ */

define(function () {

  var labConfig      = require('lab.config'),
      TextController = require('common/controllers/text-controller');

  return function setupBanner(about) {
    var components = {},
        template = [],
        layout = {};

    function createLinkInContainer(link, container) {
      components[link.id] = new TextController(link);
      template.push(container);
      layout[container.id] = [link.id];
    }

    createLinkInContainer(
    {
      "type": "text",
      "id": "credits-link",
      "text": "The Concord Consortium",
      "style": "header",
      "onClick": function () { $("#credits-pane").show(100); }
    },
    {
      "id": "banner-left",
      "top": "0",
      "left": "0",
      "align": "left",
      "aboveOthers": true
    });

    // Define about link only if "about" section is available.
    if (about) {
      createLinkInContainer(
      {
        "type": "text",
        "id": "about-link",
        "text": "About",
        "style": "header",
        "onClick": function () { $("#about-pane").show(100); }
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
      createLinkInContainer(
      {
        "type": "text",
        "id": "share-link",
        "text": "Share",
        "style": "header",
        "onClick": function () { $("#share-pane").show(100); }
      },
      {
        "id": "banner-middle",
        "top": "0",
        // "banner-right" can be undefined, so check it.
        "right": about ? "banner-right.left" : "interactive.width",
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

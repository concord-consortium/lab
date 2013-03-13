/*global define */

define(function () {

  var labConfig       = require('lab.config'),
      TextController  = require('common/controllers/text-controller'),
      ImageController = require('common/controllers/image-controller'),
      DivController   = require('common/controllers/div-controller');

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
        haveAboutText = interactive.about || interactive.subtitle,
        body, requestFullscreenMethod;

    template.push({
      "id": "top-bar",
      "top": "0",
      "left": "0",
      "width": "container.width",
      "height": "banner-right.height",
      "aboveOthers": true
    });

    template.push({
      "id": "bottom-bar",
      "bottom": "container.height",
      "left": "0",
      "width": "container.width",
      "height": "banner-bottom-left.height",
      "belowOthers": true
    });

    function createElementInContainer(element, container, type) {
      var controller;

      if (element.type === "text") {
        controller = TextController;
      } else if (element.type === "image") {
        controller = ImageController;
      } else if (element.type === "div") {
        controller = DivController;
      }

      components[element.id] = new controller(element);
      template.push(container);
      layout[container.id] = [element.id];
    }

    // Define about link only if "about" or "subtitle" section is available.
    aboutDialog.update(interactive);
    createElementInContainer(
    {
      "type": "text",
      "id": "about-link",
      "text": "About",
      "style": "header",
      "onClick": function () { if (haveAboutText) {aboutDialog.open()} else {creditsDialog.open()}}
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

    // Define sharing link only if sharing is enabled.
    // Note that due to layout limitations, banner-middle container
    // has to be defined *after* banner-right container which is used
    // in its specification!
    if (labConfig.sharing) {
      shareDialog.update(interactive);
      createElementInContainer(
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
        "right": "banner-right.left",
        "padding-right": "1em",
        "align": "right",
        "aboveOthers": true
      });
    }

    // bottom bar
    creditsDialog.update(interactive);
    createElementInContainer(
    {
      "type": "image",
      "id": "credits-link",
      "height": "2.5em",
      "src": "{resources}/layout/cc-logo.png",
      "onClick": function () { creditsDialog.open(); }
    },
    {
      "id": "banner-bottom-left",
      "bottom": "container.height",
      "left": "0",
      "align": "left",
      "belowOthers": true
    });

    // see if we can go fullscreen. If we can, add a fullscreen button.
    // Note: This requires iframe to be embedded with 'allowfullscreen=true' (and
    // browser-specific variants). If iframe is not embedded with this property, button
    // will show but will not work. It is not clear whether we can find out at this moment
    // whether iframe was embedded appropriately.
    body = document.body;

    requestFullscreenMethod =
         body.requestFullScreen
      || body.webkitRequestFullScreen
      || body.mozRequestFullScreen
      || body.msRequestFullScreen

    if (requestFullscreenMethod) {
      createElementInContainer(
      {
        "type": "div",
        "id": "fullsize-link",
        "height": "2.5em",
        "width": "2.5em",
        "classes": ["fullscreen"],
        "onClick": function () {
          requestFullscreenMethod.call(body);
        }
      },
      {
        "id": "banner-bottom-middle",
        "bottom": "container.height",
        "left": "banner-bottom-left.right",
        "align": "left",
        "padding-left": "1em",
        "belowOthers": true
      });
    }

    template.push({
      "id": "interactive-playback-container",
      "bottom": "container.height",
      "left": "container.width/2 - interactive-playback-container.width/2",
      "width": "12em",
      "height": "banner-bottom-left.height",
      "belowOthers": true
    });

    return {
      components: components,
      template: template,
      layout: layout
    };
  };
});

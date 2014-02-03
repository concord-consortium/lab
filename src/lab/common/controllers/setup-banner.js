/*global define, $ */

define(function () {

  var labConfig          = require('lab.config'),
      TextController     = require('common/controllers/text-controller'),
      ImageController    = require('common/controllers/image-controller'),
      DivController      = require('common/controllers/div-controller'),
      PlaybackController = require('common/controllers/playback-controller'),

      topBarHeight    = 1.5,
      topBarFontScale = topBarHeight*0.65,
      topBarVerticalPadding = topBarHeight/10;

  /**
   * Returns a hash containing:
   *  - components,
   *  - containers,
   *  - layout definition (components location).
   * All these things are used to build the interactive banner.
   *
   * @param {InteractivesController} controller
   * @param {Object} interactive Interactive JSON definition.
   * @param {CreditsDialog} creditsDialog
   * @param {AboutDialog} aboutDialog
   * @param {ShareDialog} shareDialog
   */
  return function setupBanner(controller, interactive, creditsDialog, aboutDialog, shareDialog) {
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
      "height": topBarHeight + "em",
      "padding-top": topBarVerticalPadding + "em",
      "padding-bottom": topBarVerticalPadding + "em",
      "width": "container.width",
      "aboveOthers": true
    });

    template.push({
      "id": "bottom-bar",
      "bottom": "container.height",
      "left": "0",
      "width": "container.width",
      "height": "2.5em",
      "belowOthers": true
    });

    function createElementInContainer(element, container) {
      var Controller;

      if (element.type === "text") {
        Controller = TextController;
      } else if (element.type === "image") {
        Controller = ImageController;
      } else if (element.type === "div") {
        Controller = DivController;
      } else if (element.type === "playback") {
        Controller = PlaybackController;
      }

      components[element.id] = new Controller(element, controller);
      template.push(container);
      layout[container.id] = [element.id];
    }

    // Define about link only if "about" or "subtitle" section is available.
    aboutDialog.update(interactive);
    createElementInContainer({
      "type": "text",
      "id": "about-link",
      "text": "About",
      "onClick": function () {
        if (haveAboutText) {
          aboutDialog.open();
        } else {
          creditsDialog.open();
        }
      },
      "tooltip": "Instructions"
    },
    {
      "id": "banner-right",
      "fontScale": topBarFontScale,
      "top": "0",
      "height": topBarHeight + "em",
      "padding-top": topBarVerticalPadding + "em",
      "padding-bottom": topBarVerticalPadding + "em",
      "right": "interactive.width",
      "padding-left": "1em",
      "padding-right": "0.75em",
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
        "onClick": function () { shareDialog.open(); },
        "tooltip": "Share using e-mail, IM or embed in website"
      },
      {
        "id": "banner-middle",
        "fontScale": topBarFontScale,
        "top": "0",
        "height": topBarHeight + "em",
        "padding-top": topBarVerticalPadding + "em",
        "padding-bottom": topBarVerticalPadding + "em",
        // "banner-right" can be undefined, so check it.
        "right": "banner-right.left",
        "padding-right": "1em",
        "align": "right",
        "aboveOthers": true
      });
    }

    createElementInContainer(
    {
      "type": "div",
      "id": "interactive-reload-icon",
      "content": '<i class="icon-repeat"></i>',
      "onClick": function () {
        controller.reloadInteractive();
      },
      "tooltip": "Reload interactive"
    },
    {
      "id": "banner-reload",
      "fontScale": topBarFontScale,
      "top": "0",
      "height": topBarHeight + "em",
      "padding-top": topBarVerticalPadding + "em",
      "padding-bottom": topBarVerticalPadding + "em",
      "left": "0.7em",
      "padding-right": "1em",
      "align": "left",
      "aboveOthers": true
    });

    if (interactive.helpTips.length > 0) {
      createElementInContainer(
      {
        "type": "div",
        "id": "help-icon",
        "content": '<i class="icon-question-sign"></i>',
        "onClick": function () {
          if (!controller.helpSystem.isActive()) {
            controller.helpSystem.start();
          } else {
            controller.helpSystem.stop();
          }
        },
        "tooltip": "Show help tips"
      },
      {
        "id": "banner-help",
        "fontScale": topBarFontScale,
        "top": "0",
        "height": topBarHeight + "em",
        "padding-top": topBarVerticalPadding + "em",
        "padding-bottom": topBarVerticalPadding + "em",
        // "banner-right" can be undefined, so check it.
        "left": "banner-reload.right",
        "padding-right": "1em",
        "align": "left",
        "aboveOthers": true
      });

      // Note that help system has to be initialized before we setup banner!
      controller.helpSystem.on("start.icon", function () {
        var $icon = $("#help-icon > i");
        $icon.addClass("icon-remove-sign active");
        $icon.removeClass("icon-question-sign");
      });
      controller.helpSystem.on("stop.icon", function () {
        var $icon = $("#help-icon > i");
        $icon.addClass("icon-question-sign");
        $icon.removeClass("icon-remove-sign active");
      });
    }

    // bottom bar
    creditsDialog.update(interactive);
    createElementInContainer(
    {
      "type": "div",
      "id": "credits-link",
      "height": "2.5em",
      "width": "8.1em",
      "classes": ["credits"],
      "tooltip": "Learn more about The Concord Consortium",
      "onClick": function () { creditsDialog.open(); }
    },
    {
      "id": "banner-bottom-left",
      "bottom": "container.height",
      "left": "0",
      "padding-left": "0.3em",
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
         body.requestFullScreen ||
         body.webkitRequestFullScreen ||
         body.mozRequestFullScreen ||
         body.msRequestFullScreen;

    document.cancelFullscreenMethod =
         document.cancelFullScreen ||
         document.webkitCancelFullScreen ||
         document.mozCancelFullScreen ||
         document.msCancelFullScreen;

    function isFullscreen() {
      // this doesn't yet exist in Safari
      if (document.fullscreenElement||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement) {
        return true;
      }
      // annoying hack to check Safari
      return ~$(".fullscreen").css("background-image").indexOf("exit");
    }

    if (requestFullscreenMethod) {
      createElementInContainer(
      {
        "type": "div",
        "id": "fullsize-link",
        "height": "2.5em",
        "width": "2.5em",
        "classes": ["fullscreen"],
        "tooltip": "Toggle full-screen",
        "onClick": function () {
          if (!isFullscreen()) {
            requestFullscreenMethod.call(body);
          } else {
            document.cancelFullscreenMethod();
          }
        }
      },
      {
        "id": "banner-bottom-right",
        "bottom": "container.height",
        "right": "container.width",
        "align": "left",
        "padding-left": "1em",
        "belowOthers": true
      });
    }

    createElementInContainer(
      {
        "type": "playback",
        "id": "playback"
      },
      {
        "id": "interactive-playback-container",
        "bottom": "container.height",
        "left": "container.width/2 - interactive-playback-container.width/2",
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

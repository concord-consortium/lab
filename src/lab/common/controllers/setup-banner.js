/*global define, $ */

import $__lab_config from 'lab.config';
import $__common_controllers_text_controller from 'common/controllers/text-controller';
import $__common_controllers_image_controller from 'common/controllers/image-controller';
import $__common_controllers_div_controller from 'common/controllers/div-controller';
import $__common_controllers_playback_controller from 'common/controllers/playback-controller';
import $__screenfull from 'screenfull';

var labConfig = $__lab_config,
  TextController = $__common_controllers_text_controller,
  ImageController = $__common_controllers_image_controller,
  DivController = $__common_controllers_div_controller,
  PlaybackController = $__common_controllers_playback_controller,
  screenfull = $__screenfull,

  topBarHeight = 1.5,
  topBarFontScale = topBarHeight * 0.65,
  topBarVerticalPadding = topBarHeight / 10;

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
export default function setupBanner(controller, interactive, creditsDialog, aboutDialog, shareDialog) {
  var components = {},
    template = [],
    layout = {},
    i18n = controller.i18n,
    body, requestFullscreenMethod;

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

  // Checks if there is a "playback" component in interactive JSON component section.
  function isPlaybackDefinedByAuthor() {
    for (var i = 0; i < interactive.components.length; i++) {
      if (interactive.components[i].type === "playback") return true;
    }
    return false;
  }

  function setupTopBar() {
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

    if (interactive.i18nMetadata) {
      createElementInContainer({
        "type": "div",
        "id": "lang-icon",
        "width": "1.8em",
        "height": "1.35em",
        "tooltip": i18n.t("banner.lang_tooltip")
      }, {
        "id": "banner-lang",
        "top": "0",
        "height": topBarHeight + "em",
        "right": "container.right",
        "padding-top": topBarVerticalPadding + "em",
        "padding-bottom": topBarVerticalPadding + "em",
        "padding-left": "0.75em",
        "padding-right": "0.25em",
        "aboveOthers": true
      });
    }

    createElementInContainer({
      "type": "text",
      "id": "about-link",
      "text": i18n.t("banner.about"),
      "onClick": function() {
        aboutDialog.open();
      },
      "tooltip": i18n.t("banner.about_tooltip")
    }, {
      "id": "banner-right",
      "fontScale": topBarFontScale,
      "top": "0",
      "height": topBarHeight + "em",
      "padding-top": topBarVerticalPadding + "em",
      "padding-bottom": topBarVerticalPadding + "em",
      "right": interactive.i18nMetadata ? "banner-lang.left" : "interactive.right",
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
      createElementInContainer({
        "type": "text",
        "id": "share-link",
        "text": controller.i18n.t("banner.share"),
        "onClick": function() {
          shareDialog.open();
        },
        "tooltip": i18n.t("banner.share_tooltip")
      }, {
        "id": "banner-middle",
        "fontScale": topBarFontScale,
        "top": "0",
        "height": topBarHeight + "em",
        "padding-top": topBarVerticalPadding + "em",
        "padding-bottom": topBarVerticalPadding + "em",
        "right": "banner-right.left",
        "padding-right": "1em",
        "align": "right",
        "aboveOthers": true
      });
    }

    createElementInContainer({
      "type": "div",
      "id": "interactive-reload-icon",
      "content": '<i class="icon-repeat"></i>',
      "onClick": function() {
        controller.reloadInteractive();
      },
      "tooltip": i18n.t("banner.reload_tooltip")
    }, {
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

    if (controller.helpSystem && controller.helpSystem.hasShowcase()) {
      createElementInContainer({
        "type": "div",
        "id": "main-help-icon",
        "content": '<i class="icon-question-sign lab-help-icon"></i>',
        "onClick": function() {
          if (!controller.helpSystem.isActive()) {
            controller.helpSystem.start();
          } else {
            controller.helpSystem.stop();
          }
        },
        "tooltip": i18n.t("banner.help_tooltip")
      }, {
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
      controller.helpSystem.on("start.icon", function() {
        var $icon = $("#main-help-icon .lab-help-icon");
        $icon.addClass("icon-remove-sign active");
        $icon.removeClass("icon-question-sign");
      });
      controller.helpSystem.on("stop.icon", function() {
        var $icon = $("#main-help-icon .lab-help-icon");
        $icon.addClass("icon-question-sign");
        $icon.removeClass("icon-remove-sign active");
      });
    }
  }

  function setupBottomBar() {
    template.push({
      "id": "bottom-bar",
      "bottom": "container.height",
      "left": "0",
      "width": "container.width",
      "height": "2.5em",
      "belowOthers": true
    });

    createElementInContainer({
      "type": "div",
      "id": "credits-link",
      "height": "2.5em",
      "width": "8.1em",
      "classes": ["credits"],
      "tooltip": i18n.t("banner.credits_tooltip"),
      "onClick": function() {
        creditsDialog.open();
      }
    }, {
      "id": "banner-bottom-left",
      "bottom": "container.height",
      "left": "0",
      "padding-left": "0.3em",
      "align": "left",
      "belowOthers": true
    });

    if (screenfull.enabled) {
      // Note: This requires iframe to be embedded with 'allowfullscreen=true'.
      createElementInContainer({
        "type": "div",
        "id": "fullsize-link",
        "height": "2.5em",
        "width": "2.5em",
        "classes": ["fullscreen"],
        "tooltip": i18n.t("banner.fullscreen_tooltip"),
        "onClick": function() {
          if (!screenfull.isFullscreen) {
            screenfull.request(document.body);
            controller.logAction('FullScreenStarted');
          } else {
            screenfull.exit();
          }
        }
      }, {
        "id": "banner-bottom-right",
        "bottom": "container.height",
        "right": "container.width",
        "align": "left",
        "padding-left": "1em",
        "belowOthers": true
      });
    }

    if (!isPlaybackDefinedByAuthor()) {
      // Define playback component automatically only if it hasn't been done by interactive author.
      createElementInContainer({
        "type": "playback",
        "id": "playback"
      }, {
        "id": "interactive-playback-container",
        "bottom": "container.height",
        "height": "banner-bottom-left.height",
        "left": "banner-bottom-left.right",
        // note that banner-bottom-right may not be defined
        "right": template.map(function(o) {
            return o.id;
          }).indexOf('banner-bottom-right') >= 0 ?
          "banner-bottom-right.left" : "container.right",
        "belowOthers": true
      });
    }
  }

  if (interactive.showTopBar) {
    setupTopBar();
  }

  if (interactive.showBottomBar) {
    setupBottomBar();
  }

  return {
    components: components,
    template: template,
    layout: layout
  };
};

/*global define, $ */

define(function () {

  var labConfig      = require('lab.config'),
      arrays         = require('arrays'),
      inherit        = require('common/inherit'),
      TextController = require('common/controllers/text-controller'),
      BasicDialog    = require('common/controllers/basic-dialog'),
      ShareDialog    = require('common/controllers/share-dialog'),

      copyrightDiv = '<div id="share-license"><strong>Copyright © 2013&nbsp;</strong>' +
        '<a class="opens-in-new-window" href="http://concord.org" id="share-license-link" target="_blank">' +
        'The Concord Consortium</a>. All rights reserved. The software is licensed under&nbsp;' +
        '<a class="opens-in-new-window" href="http://opensource.org/licenses/BSD-2-Clause" ' +
        'id="share-license-link" target="_blank">Simplified BSD</a>, <a class="opens-in-new-window" ' +
        'href="http://opensource.org/licenses/MIT" id="share-license-link" target="_blank">MIT</a> or ' +
        '<a class="opens-in-new-window" href="http://opensource.org/licenses/Apache-2.0" id="share-license-link" ' +
        'target="_blank">Apache 2.0</a> licenses. Please provide attribution to the Concord Consortium and the URL&nbsp;' +
        '<a class="opens-in-new-window" href="http://concord.org/" id="share-license-link" target="_blank">http://concord.org</a>.</div>';

  /**
    About Dialog. Private class used only in this module.
    TODO: when markdown support is added, create more generic text dialog component.
  */
  function AboutDialog(interactive) {
    var $aboutContent = $("<div>"),
        about;

    BasicDialog.call(this, {dialogClass: "about-dialog"});

    this.set("title", "About: " + interactive.title);

    if (interactive.subtitle) {
      $aboutContent.append("<p>" + interactive.subtitle + "</p>");
    }
    about = arrays.isArray(interactive.about) ? interactive.about : [interactive.about];
    $.each(about, function(idx, val) {
      $aboutContent.append("<p>" + val + "</p>");
    });

    this.setContent($aboutContent);
  }
  inherit(AboutDialog, BasicDialog);

  /**
    Credits Dialog. Private class used only in this module.
  */
  function CreditsDialog(interactive) {
    var $creditsContent = $("<div>"),
        concordUrl = 'http://concord.org',
        nextGenUrl = 'http://mw.concord.org/nextgen/',
        newWindow = " target='_blank",
        googleOrgLink = "<a href='http://www.google.org/' " + newWindow + "'>Google.org</a>",
        utmString = "utm_source=" + encodeURIComponent(interactive.title.replace(/ /gi,"+")) +
          "&utm_medium=embedded_interactive&utm_campaign=" + labConfig.utmCampaign,
        hash = document.location.hash,
        concordLink, nextGenLink, interactiveCreditsUrl, interactiveCreditsLink;

    BasicDialog.call(this, {dialogClass: "credits-dialog"});

    this.set("title", "Credits: " + interactive.title);

    if (labConfig.homeForSharing) {
      interactiveCreditsUrl = labConfig.homeForSharing + labConfig.homeEmbeddablePath + hash;
    } else {
      interactiveCreditsUrl = labConfig.home + labConfig.homeEmbeddablePath + hash;
    }

    if (labConfig.utmCampaign) {
      concordUrl += "?" + utmString;
      nextGenUrl += "?" + utmString;
      interactiveCreditsUrl += "&" + encodeURI("utm_source=embed_link&utm_medium=embedded_interactive&utm_campaign=" + labConfig.utmCampaign);
    }

    concordLink = "<a href='" + concordUrl + "'" + newWindow + "'>Concord Consortium</a>";
    nextGenLink = "<a href='" + nextGenUrl + "'" + newWindow + "'>Next-Generation Molecular Workbench</a>";
    interactiveCreditsLink = "<a href='" + "'" + interactiveCreditsUrl + newWindow + "'>shareable version</a>";
    $creditsContent.append('<p>This interactive was created by the ' + concordLink + ' using our ' + nextGenLink + ' software, with funding by a grant from ' + googleOrgLink + '.</p>');
    if (!labConfig.sharing) {
      $creditsContent.append('<p>Find a <a href=' + interactiveCreditsUrl +
        ' class="opens-in-new-window" target="_blank">shareable version</a> of this interactive along with dozens of other open-source interactives for science, math and engineering at <a href="' +
        concordUrl + '" class="opens-in-new-window" target="_blank">concord.org</a>.</p>');
    }
    $creditsContent.append(copyrightDiv);

    this.setContent($creditsContent);
  }
  inherit(CreditsDialog, BasicDialog);

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

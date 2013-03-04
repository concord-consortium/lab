/*global define */
define(function (require) {

  var labConfig        = require('lab.config'),
      mustache         = require('mustache'),
      inherit          = require('common/inherit'),
      BasicDialog      = require('common/controllers/basic-dialog'),
      creditsDialogTpl = require('text!common/controllers/credits-dialog.tpl'),
      copyrightTpl     = require('text!common/controllers/copyright.tpl');

  /**
   * Credits Dialog. Inherits from Basic Dialog.
   *
   * @constructor
   * @param {Object} interactive Interactive JSON definition.
   */
  function CreditsDialog(interactive) {
    var view = {
          concordUrl: 'http://concord.org',
          nextGenUrl: 'http://mw.concord.org/nextgen/'
        },
        hash = document.location.hash,
        utmString;

    BasicDialog.call(this, {dialogClass: "credits-dialog"});
    this.set("title", "Credits: " + interactive.title);

    if (labConfig.homeForSharing) {
      view.interactiveCreditsUrl = labConfig.homeForSharing + labConfig.homeEmbeddablePath + hash;
    } else {
      view.interactiveCreditsUrl = labConfig.home + labConfig.homeEmbeddablePath + hash;
    }

    if (labConfig.utmCampaign) {
      utmString = "utm_source=" + encodeURIComponent(interactive.title.replace(/ /gi,"+")) +
        "&utm_medium=embedded_interactive&utm_campaign=" + labConfig.utmCampaign;
      view.concordUrl += "?" + utmString;
      view.nextGenUrl += "?" + utmString;
      view.interactiveCreditsUrl += "&" + encodeURI("utm_source=embed_link&utm_medium=embedded_interactive&utm_campaign=" + labConfig.utmCampaign);
    }

    if (!labConfig.sharing) {
      view.showShareable = true;
    }

    this.setContent(mustache.render(creditsDialogTpl, view, {copyright: copyrightTpl}));
  }
  inherit(CreditsDialog, BasicDialog);

  return CreditsDialog;
});

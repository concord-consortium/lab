/*global define, $ */
define(function (require) {

  var labConfig      = require('lab.config'),
      mustache       = require('mustache'),
      inherit        = require('common/inherit'),
      BasicDialog    = require('common/controllers/basic-dialog'),
      shareDialogTpl = require('text!common/controllers/share-dialog.tpl'),

      location = document.location,

      // A tiny template, so define it inline and compile immediately.
      iframeTpl = mustache.compile('<iframe width="{{width}}px" height="{{height}}px" ' +
        'frameborder="no" scrolling="no" src="{{{embeddableSharingUrl}}}"></iframe>');

  /**
   * Share Dialog. Inherits from Basic Dialog.
   *
   * @constructor
   * @param {Object} interactive Interactive JSON definition.
   * @param {InteractivesController} interactivesController
   */
  function ShareDialog(interactive, interactivesController) {
    var hash           = location.hash,
        origin         = location.href.match(/(.*?\/\/.*?)\//)[1],
        embeddablePath = location.pathname.replace(/\/[^\/]+$/, "/embeddable.html");

    BasicDialog.call(this, {dialogClass: "share-dialog"});
    this.set("title", "Share: " + interactive.title);

    /** @private */
    this._view = {};

    if (labConfig.homeForSharing) {
      this._view.embeddableSharingUrl = labConfig.homeForSharing + labConfig.homeEmbeddablePath + hash;
    } else {
      this._view.embeddableSharingUrl = origin + embeddablePath + hash;
    }

    this.setContent(mustache.render(shareDialogTpl, this._view));

    /** @private */
    this._$interactiveContainer = $("#responsive-content");
    /** @private */
    this._$iframeSize = this.$element.find("#iframe-size");
    /** @private */
    this._$iframeContent = this.$element.find("#share-iframe-content");

    this._$iframeSize.on('change', $.proxy(this.updateIframeSize, this));
    interactivesController.onResize($.proxy(this.updateIframeSize, this));
    this.updateIframeSize();
  }
  inherit(ShareDialog, BasicDialog);

  /**
   * Updates size of the Interactive iframe in the share dialog.
   */
  ShareDialog.prototype.updateIframeSize = function () {
    var actualWidth = this._$interactiveContainer.innerWidth(),
        actualHeight = this._$interactiveContainer.innerHeight(),
        sizeChoice = this._$iframeSize.val();

    switch(sizeChoice) {
    case "smaller":
      this._view.width = Math.floor(actualWidth * 0.7);
      this._view.height = Math.floor(actualHeight  * 0.7);
      break;
    case "larger":
      this._view.width = Math.floor(actualWidth * 1.5);
      this._view.height = Math.floor(actualHeight  * 1.5);
      break;
    default:
      this._view.width = actualWidth;
      this._view.height = actualHeight;
      break;
    }

    this._$iframeContent.val(iframeTpl(this._view));
  };

  return ShareDialog;
});

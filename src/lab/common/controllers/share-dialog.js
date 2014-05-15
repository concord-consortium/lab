/*global define, $ */
define(function (require) {

  var labConfig      = require('lab.config'),
      mustache       = require('mustache'),
      inherit        = require('common/inherit'),
      BasicDialog    = require('common/controllers/basic-dialog'),
      getCopyright   = require('common/controllers/copyright'),
      shareDialogTpl = require('text!common/controllers/share-dialog.tpl'),

      location = document.location,

      // A tiny template, so define it inline and compile immediately.
      iframeTpl = mustache.compile('<iframe width="{{width}}px" height="{{height}}px" ' +
        'frameborder="no" scrolling="no" allowfullscreen="true" webkitallowfullscreen="true"' +
        ' mozallowfullscreen="true" src="{{{embeddableSharingUrl}}}"></iframe>');

  /**
   * Share Dialog. Inherits from Basic Dialog.
   *
   * @constructor
   */
  function ShareDialog(parentSelector, interactiveContainerSelector, i18n) {
    var hash           = location.hash,
        origin         = location.href.match(/(.*?\/\/.*?)\//)[1],
        embeddablePath = location.pathname;

    BasicDialog.call(this, {dialogClass: "share-dialog", appendTo: parentSelector}, i18n);

    /** @private */
    this._view = {
      paste_html: i18n.t("share_dialog.paste_html"),
      select_size: i18n.t("share_dialog.select_size"),
      size_larger: i18n.t("share_dialog.size_larger", {val: 50}),
      size_actual: i18n.t("share_dialog.size_actual"),
      size_smaller: i18n.t("share_dialog.size_smaller", {val: 30}),
      copyright: getCopyright(i18n)
    };
    this._i18n = i18n;

    if (labConfig.homeForSharing) {
      this._view.embeddableSharingUrl = labConfig.homeForSharing + labConfig.homeEmbeddablePath + hash;
    } else {
      this._view.embeddableSharingUrl = origin + embeddablePath + hash;
    }

    var link = "<a class='opens-in-new-window' href='" + this._view.embeddableSharingUrl +
               "' target='_blank'>" + i18n.t("share_dialog.link") + "</a>";
    this._view.paste_email_im = i18n.t("share_dialog.paste_email_im", {link: link});

    this.setContent(mustache.render(shareDialogTpl, this._view));

    /** @private */
    this._$interactiveContainer = $(interactiveContainerSelector);
    /** @private */
    this._$iframeSize = this.$element.find("#iframe-size");
    /** @private */
    this._$iframeContent = this.$element.find("#share-iframe-content");

    this._$iframeSize.on('change', $.proxy(this.updateIframeSize, this));
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

  /**
   * Updates dialog content using interactive JSON definition.
   *
   * @param {Object} interactive Interactive JSON definition.
   */
  ShareDialog.prototype.update = function(interactive) {
    this.set("title", this._i18n.t("share_dialog.title", {interactive_title: interactive.title}));
  };

  return ShareDialog;
});

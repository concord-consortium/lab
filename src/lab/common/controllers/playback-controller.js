/*global define, $ */

define(function (require) {

  var inherit              = require('common/inherit'),
      InteractiveComponent = require('common/controllers/interactive-component');

  /**
   * Playback controller.
   *
   * @constructor
   * @extends InteractiveComponent
   * @param {Object} component Component JSON definition.
   * @param {ScriptingAPI} scriptingAPI
   * @param {InteractiveController} controller
   */
  function PlaybackController(component, scriptingAPI, controller) {
    var stepping;
    // Call super constructor.
    InteractiveComponent.call(this, "playback", component, scriptingAPI);

    stepping = this.component.stepping;

    this.$element.addClass("interactive-playback");

    this._$reset = $('<button><i class="icon-step-backward"></i></button>').appendTo(this.$element);
    this.$element.append('<div class="spacer">');
    this._$play = $('<button><i class="icon-play"></i></button>').appendTo(this.$element);

    if (stepping) {
      this._$stepBackward = $('<button><i class="icon-backward"></i></button>').insertBefore(this._$reset);
      this._$reset.before('<div class="spacer">');
      this._$stepForward = $('<button><i class="icon-forward"></i></button>').insertAfter(this._$play);
      this._$play.after('<div class="spacer">');
    }

    // Bind callbacks.
    this._$reset.on("click", function () {
      scriptingAPI.api.reset();
    });
    this._$play.on("click", function () {
      scriptingAPI.api.start();
    });
    if (stepping) {
      this._$stepBackward.on("click", function () {
        scriptingAPI.api.stepBack();
      });
      this._$stepForward.on("click", function () {
        scriptingAPI.api.stepForward();
      });
    }
  }
  inherit(PlaybackController, InteractiveComponent);

  /**
   * Implements optional callback supported by Interactive Controller.
   */
  PlaybackController.prototype.modelLoadedCallback = function() {
  };

  return PlaybackController;
});

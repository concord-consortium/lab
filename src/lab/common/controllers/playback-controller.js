/*global define, $, model */

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
   */
  function PlaybackController(component, scriptingAPI) {
    var stepping;
    // Call super constructor.
    InteractiveComponent.call(this, "playback", component, scriptingAPI);

    stepping = this.component.stepping;

    this.$element.addClass("interactive-playback");

    /** @private */
    this._modelStopped = true;
    /** @private */
    this._$reset = $('<button><i class="icon-step-backward"></i></button>').appendTo(this.$element);
    /** @private */
    this._$playPause = $('<button class="play-pause"><i class="icon-play"></i><i class="icon-pause"></i></button>').appendTo(this.$element);

    this._$reset.after('<div class="spacer">');

    if (stepping) {
      /** @private */
      this._$stepBackward = $('<button><i class="icon-backward"></i></button>').insertBefore(this._$reset);
      /** @private */
      this._$stepForward = $('<button><i class="icon-forward"></i></button>').insertAfter(this._$playPause);

      this._$reset.before('<div class="spacer">');
      this._$playPause.after('<div class="spacer">');
    }

    // Bind click handlers.
    this._$reset.on("click", function () {
      scriptingAPI.api.reset();
    });
    this._$playPause.on("click", $.proxy(function () {
      if (this._modelStopped) {
        scriptingAPI.api.start();
      } else {
        scriptingAPI.api.stop();
      }
    }, this));
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
   * Updates play / pause button.
   * @private
   */
  PlaybackController.prototype._simulationStateChanged = function () {
    this._modelStopped = model.is_stopped();
    if (this._modelStopped) {
      this._$playPause.removeClass("playing");
    } else {
      this._$playPause.addClass("playing");
    }
  };

  /**
   * Implements optional callback supported by Interactive Controller.
   */
  PlaybackController.prototype.modelLoadedCallback = function () {
    // Update play / pause button.
    model.on('play.playback-controller', $.proxy(this._simulationStateChanged, this));
    model.on('stop.playback-controller', $.proxy(this._simulationStateChanged, this));
    this._simulationStateChanged();
  };

  return PlaybackController;
});

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
    // Call super constructor.
    InteractiveComponent.call(this, "playback", component, scriptingAPI);

    this.$element.addClass("interactive-playback");

    /** @private */
    this._modelStopped = true;
    /** @private */
    this._timeUnits = "";
    /** @private */
    this._$reset = $('<button class="reset"><i class="icon-step-backward"></i></button>').appendTo(this.$element);
    /** @private */
    this._$playPause = $('<button class="play-pause"><i class="icon-play"></i><i class="icon-pause"></i></button>').appendTo(this.$element);
    /** @private */
    this._$timeDisplay = $('<span class="time-display">').appendTo(this._$playPause);

    /** @private */
    this._$stepBackward = $('<button class="step"><i class="icon-backward"></i></button>').insertBefore(this._$reset);
    /** @private */
    this._$stepForward = $('<button class="step"><i class="icon-forward"></i></button>').insertAfter(this._$playPause);

    this._$reset.after('<div class="spacer reset">');
    this._$stepBackward.after('<div class="spacer step">');
    this._$stepForward.before('<div class="spacer step">');

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
    this._$stepBackward.on("click", function () {
      scriptingAPI.api.stepBack();
    });
    this._$stepForward.on("click", function () {
      scriptingAPI.api.stepForward();
    });
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
   * Updates time display.
   * @private
   */
  PlaybackController.prototype._timeChanged = function () {
    var time = model.get("displayTime").toFixed(1);
    this._$timeDisplay.text(time + " " + this._timeUnits);
  };

  /**
   * Updates playback controller mode ("play", "play_reset" or "play_reset_step").
   * @private
   */
  PlaybackController.prototype._displayModeChanged = function () {
    var mode = model.get("controlButtons"),
        $buttons;
    if (!mode) { // mode === "" || mode === null || mode === false
      this.$element.find(".step, .reset, .play-pause").addClass("hidden");
    } else if (mode === "play") {
      this.$element.find(".step, .reset").addClass("hidden");
      this.$element.find(".play-pause").removeClass("hidden");
    } else if (mode === "play_reset") {
      this.$element.find(".step").addClass("hidden");
      this.$element.find(".play-pause, .reset").removeClass("hidden");
    } else if (mode === "play_reset_step") {
      this.$element.find(".step, .reset, .play-pause").removeClass("hidden");
    }
    $buttons = this.$element.find("button");
    $buttons.removeClass("first");
    $buttons.removeClass("last");
    $buttons = $buttons.not(".hidden");
    $buttons.first().addClass("first");
    $buttons.last().addClass("last");
  };

  /**
   * Implements optional callback supported by Interactive Controller.
   */
  PlaybackController.prototype.modelLoadedCallback = function () {
    // Update play / pause button.
    // Use event namespace to let multiple playbacks work fine with one model.
    model.on('play.' + this.component.id, $.proxy(this._simulationStateChanged, this));
    model.on('stop.' + this.component.id, $.proxy(this._simulationStateChanged, this));
    this._simulationStateChanged();
    // Update time units and set time.
    this._timeUnits = model.getPropertyDescription("displayTime").getUnitAbbreviation();
    model.addPropertiesListener(["displayTime"], $.proxy(this._timeChanged, this));
    this._timeChanged();
    // Update display mode (=> buttons are hidden or visible).
    model.addPropertiesListener(["controlButtons"], $.proxy(this._displayModeChanged, this));
    this._displayModeChanged();
  };

  return PlaybackController;
});

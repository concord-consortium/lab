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
    this._showClock = true;
    /** @private */
    this._timeUnits = "";
    /** @private */
    this._$reset = $('<a class="reset"><i class="icon-step-backward"></i></a>').appendTo(this.$element);
    /** @private */
    this._$playPause = $('<a class="play-pause"><i class="icon-play"></i><i class="icon-pause"></i></a>').appendTo(this.$element);
    /** @private */
    this._$timeDisplay = $('<span class="time-display">').appendTo(this._$playPause);

    /** @private */
    this._$stepBackward = $('<a class="step"><i class="icon-backward"></i></a>').insertBefore(this._$playPause);
    /** @private */
    this._$stepForward = $('<a class="step"><i class="icon-forward"></i></a>').insertAfter(this._$playPause);

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
   * Enables or disables time display.
   * @private
   */
  PlaybackController.prototype._showClockChanged = function () {
    this._showClock = model.get("showClock");
    if (this._showClock) {
      this._$playPause.addClass("with-clock");
      // Update clock immediately.
      this._timeChanged();
    } else {
      this._$playPause.removeClass("with-clock");
    }
  };

  /**
   * Updates time display.
   * @private
   */
  PlaybackController.prototype._timeChanged = function () {
    if (!this._showClock) {
      return;
    }
    var time = model.get("displayTime").toFixed(1);
    this._$timeDisplay.html(time + " " + this._timeUnits);
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
    $buttons = this.$element.find("a");
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
    model.addPropertiesListener(["showClock"], $.proxy(this._showClockChanged, this));
    model.addPropertiesListener(["displayTime"], $.proxy(this._timeChanged, this));
    this._showClockChanged();
    // Update display mode (=> buttons are hidden or visible).
    model.addPropertiesListener(["controlButtons"], $.proxy(this._displayModeChanged, this));
    this._displayModeChanged();
  };

  return PlaybackController;
});

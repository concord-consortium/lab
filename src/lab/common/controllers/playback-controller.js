/*global define, $, model */

define(function (require) {

  var inherit              = require('common/inherit'),
      InteractiveComponent = require('common/controllers/interactive-component'),
      tooltip              = require('common/views/tooltip');

  /**
   * Playback controller.
   *
   * @constructor
   * @extends InteractiveComponent
   * @param {Object} component Component JSON definition.
   * @param {ScriptingAPI} scriptingAPI
   * @param {InteractivesController} interactivesController
   */
  function PlaybackController(component, scriptingAPI, interactivesController) {
    // Call super constructor.
    InteractiveComponent.call(this, "playback", component, scriptingAPI);

    this.$element.addClass("interactive-playback");

    /** @private */
    this._modelStopped = true;
    /** @private */
    this._modelPlayable = true;
    /** @private */
    this._showClock = true;
    /** @private */
    this._timeDesc = null;
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
        if (this._modelPlayable) {
          scriptingAPI.api.start();
        }
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

    tooltip(this._$playPause, "Start the simulation", false, interactivesController);
    tooltip(this._$reset, "Reset the simulation", false, interactivesController);
    tooltip(this._$stepBackward, "Step back", false, interactivesController);
    tooltip(this._$stepForward, "Step forward", false, interactivesController);
  }
  inherit(PlaybackController, InteractiveComponent);

  /**
   * Updates play / pause button.
   * @private
   */
  PlaybackController.prototype._simulationStateChanged = function () {
    this._modelStopped = model.isStopped();
    if (this._modelStopped) {
      this._$playPause.removeClass("playing");
      this._$playPause.attr("data-lab-tooltip", "<p>Start the simulation</p>");
      this._$playPause.tooltip("close");
    } else {
      this._$playPause.addClass("playing");
      this._$playPause.attr("data-lab-tooltip", "<p>Pause the simulation</p>");
      this._$playPause.tooltip("close");
    }

    // Coerce undefined to *true* for models that don't have isPlayable property
    this._modelPlayable = model.properties.isPlayable === false ? false : true;
    if (this._modelPlayable) {
      this._$playPause.removeClass("disabled");
    } else {
      this._$playPause.addClass("disabled");
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
      // Update 'displayTime' description (used for formatting).
      this._timeDesc =  model.getPropertyDescription("displayTime");
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
    this._$timeDisplay.html(this._timeDesc.format(model.get("displayTime")));
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
      this.$element.find(".play-pause").removeClass("hidden");
      this.$element.find(".spacer, .step, .reset").addClass("hidden");
    } else if (mode === "reset") {
      this.$element.find(".reset").removeClass("hidden");
      this.$element.find(".spacer, .play-pause, .step").addClass("hidden");
    } else if (mode === "play_reset") {
      this.$element.find(".spacer, .play-pause, .reset").removeClass("hidden");
      this.$element.find(".step").addClass("hidden");
    } else if (mode === "play_reset_step") {
      this.$element.find(".spacer, .step, .reset, .play-pause").removeClass("hidden");
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
    model.addPropertiesListener(["isPlayable"], $.proxy(this._simulationStateChanged, this));
    this._simulationStateChanged();
    model.addPropertiesListener(["showClock"], $.proxy(this._showClockChanged, this));
    model.addPropertiesListener(["displayTime"], $.proxy(this._timeChanged, this));
    this._showClockChanged();
    // Update display mode (=> buttons are hidden or visible).
    model.addPropertiesListener(["controlButtons"], $.proxy(this._displayModeChanged, this));
    this._displayModeChanged();
  };

  return PlaybackController;
});

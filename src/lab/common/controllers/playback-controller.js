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
   * @param {} controller
   * @param {} model
   */
  function PlaybackController(component, scriptingAPI, controller, model) {
    // Call super constructor.
    InteractiveComponent.call(this, "playback", component, scriptingAPI, controller, model);

    this.$element.addClass("interactive-playback");

    /** @private */
    this._modelStopped = true;
    /** @private */
    this._modelPlayable = true;
    /** @private */
    this._showClock = true;
    /** @private */
    this._timeDesc = null;

  }
  inherit(PlaybackController, InteractiveComponent);

  PlaybackController.prototype._createPlayPauseClickHandler = function () {
    var that = this;
    this._playPauseClickHandler = function() {
      if (that._modelStopped) {
        if (that._modelPlayable) {
          that._scriptingAPI.start();
        }
      } else {
        that._scriptingAPI.stop();
      }
    };
  };

  PlaybackController.prototype._bindClickHandlers = function () {
    if (this.controlButtonStyle) {
      // Bind video-playback style click handlers.
      if (this.controlButtonStyle === 'video') {
        this._createPlayPauseClickHandler();
        this._$reset.on("click", this._scriptingAPI.reload);
        this._$playPause.on("click", this._playPauseClickHandler);
        this._$stepBackward.on("click", this._scriptingAPI.stepBack);
        this._$stepForward.on("click", this._scriptingAPI.stepForward);
      } else {
        // Bind text style click handlers
        this._$reset.on("click", this._scriptingAPI.reload);
        this._$start.on('click', this._scriptingAPI.start);
        this._$stop.on('click', this._scriptingAPI.stop);
      }
    }
  };

  PlaybackController.prototype._unBindClickHandlers = function () {
    if (this.controlButtonStyle) {
      // Unbind video-playback style click handlers.
      if (this.controlButtonStyle === 'video') {
        this._$reset.off("click", this._scriptingAPI.reload);
        this._$stepBackward.off("click", this._scriptingAPI.stepBack);
        this._$stepForward.off("click", this._scriptingAPI.stepForward);
        this._$playPause.off("click", this._playPauseClickHandler);
      } else {
        // Unbind text style click handlers
        this._$reset.off("click", this._scriptingAPI.reload);
        this._$start.off('click', this._scriptingAPI.start);
        this._$stop.off('click', this._scriptingAPI.stop);
      }
    }
  };

  // TODO: make 2 delegate classes instead of using this pattern!
  PlaybackController.prototype._createControlsFor = {
    video: function () {
      this.$element.removeClass('text').addClass('video');

      this._$reset = $('<a class="reset"><i class="icon-step-backward"></i></a>').appendTo(this.$element);
      this._$playPause = $('<a class="play-pause"><i class="icon-play"></i><i class="icon-pause"></i></a>').appendTo(this.$element);

      /** @private */
      this._$timeDisplay = $('<span class="time-display">').appendTo(this._$playPause);

      this._$stepBackward = $('<a class="step"><i class="icon-backward"></i></a>').insertBefore(this._$playPause);
      this._$stepForward = $('<a class="step"><i class="icon-forward"></i></a>').insertAfter(this._$playPause);

      this._$reset.after('<div class="spacer reset">');
      this._$stepBackward.after('<div class="spacer step">');
      this._$stepForward.before('<div class="spacer step">');

      this._$playPause.attr("title", "Start / pause the simulation");
      this._$reset.attr("title", "Reset the simulation");
      this._$stepBackward.attr("title", "Step back");
      this._$stepForward.attr("title", "Step forward");
    },

    text: function () {
      this.$element.removeClass('video').addClass('text');

      this._$start = $('<button class-="start">Start</button>').appendTo(this.$element);
      this._$stop = $('<button class="stop">Stop</button>').appendTo(this.$element);
      this._$reset = $('<button class="reset">Reset</button>').appendTo(this.$element);

      this._$start.attr("title", "Start the simulation or data collection");
      this._$stop.attr("title",  "Stop the simulation or data collection");
      this._$reset.attr("title", "Reset the simulation or data collection");
    }
  };

  PlaybackController.prototype._updateButtonStatesFor = {
    video: function () {
      var playing = !this._modelStopped;
      var playable = this._modelPlayable;

      if (playing) {
        this._$playPause.addClass("playing");
      } else {
        this._$playPause.removeClass("playing");
      }

      if (!playable && !playing) {
        this._$playPause.addClass("disabled");
      } else {
        this._$playPause.removeClass("disabled");
      }
    },

    text: function () {
      if (this._modelStopped) {
        this._$stop.addClass("disabled");
      } else {
        this._$stop.removeClass("disabled");
      }

      if (this._modelPlayable) {
        this._$start.removeClass("disabled");
      } else {
        this._$start.addClass("disabled");
      }
    }
  };

  /**
   * Updates play / pause button.
   * @private
   */
  PlaybackController.prototype._simulationStateChanged = function () {
    this._modelStopped = this._model.isStopped();
    // Coerce undefined to *true* for models that don't have isPlayable property
    this._modelPlayable = this._model.properties.isPlayable === false ? false : true;

    this._updateButtonStatesFor[this.controlButtonStyle].call(this);
  };

  /**
   * Enables or disables time display.
   * @private
   */
  PlaybackController.prototype._showClockChanged = function () {
    if (this.controlButtonStyle !== 'video') {
      return;
    }

    this._showClock = this._model.get("showClock");
    if (this._showClock) {
      this._$playPause.addClass("with-clock");
      // Update 'displayTime' description (used for formatting).
      this._timeDesc =  this._model.getPropertyDescription("displayTime");
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
    if (!this._showClock || this.controlButtonStyle !== 'video') {
      return;
    }
    this._$timeDisplay.html(this._timeDesc.format(this._model.get("displayTime")));
  };


  PlaybackController.prototype._updateControlButtonChoicesFor = {
    video: function (mode) {
      var $buttons;

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
    },

    text: function (mode) {
      if (!mode) { // mode === "" || mode === null || mode === false
        this.$element.find(".reset, .start, .stop").addClass("hidden");
      } else if (mode === "play") {
        this.$element.find(".start, .stop").removeClass("hidden");
        this.$element.find(".reset").addClass("hidden");
      } else if (mode === "reset") {
        this.$element.find(".reset").removeClass("hidden");
        this.$element.find(".start, .stop").addClass("hidden");
      } else if (mode === "play_reset") {
        this.$element.find(".start, .stop, .reset").removeClass("hidden");
      } else {
        // no play_reset_step support for text style buttons, yet.
        throw new Error("controlButtons option \"" + mode +
          "\" is not understood or is not compatible with controlButtonStyle \"text\"");
      }
    }
  };

  /**
   * Updates playback controller mode (none, "play", "play_reset" or "play_reset_step").
   * @private
   */
  PlaybackController.prototype._controlButtonChoicesChanged = function () {
    var mode = this._model.properties.controlButtons;
    this._updateControlButtonChoicesFor[this.controlButtonStyle].call(this, mode);
  };

  /**
   * Updates playback controller style (currently, "video" or "text")
   * @private
   */
  PlaybackController.prototype._controlButtonStyleChanged = function () {
    // To handle model types whose metadata don't define controlButtonStyle, default to 'video' here
    var style = this._model.properties.controlButtonStyle || 'video';
    if (this.controlButtonStyle === style) {
      return;
    }
    this.controlButtonStyle = style;
    this.$element.empty();

    if (!this._createControlsFor[style]) {
      throw new Error("Unknown controlButtonStyle \"" + style + "\"");
    }
    this._createControlsFor[style].call(this);
  };

  /**
   * Implements optional callback supported by Interactive Controller.
   */
  PlaybackController.prototype.modelLoadedCallback = function (model, scriptingAPI) {
    // unbind click handler from old model and scriptingAPI
    this._unBindClickHandlers();

    PlaybackController.superClass._modelLoadedCallback.call(this, model, scriptingAPI);

    // Update play / pause button.
    // Use event namespace to let multiple playbacks work fine with one model.
    this._model.on('play.' + this.component.id, $.proxy(this._simulationStateChanged, this));
    this._model.on('stop.' + this.component.id, $.proxy(this._simulationStateChanged, this));
    this._model.addObserver('isPlayable', $.proxy(this._simulationStateChanged, this));

    this._model.addObserver('showClock', $.proxy(this._showClockChanged, this));
    this._model.addObserver('displayTime', $.proxy(this._timeChanged, this));

    // Update display mode (=> buttons are hidden or visible).
    this._model.addObserver('controlButtons', $.proxy(this._controlButtonChoicesChanged, this));
    this._model.addObserver('controlButtonStyle', $.proxy(this._controlButtonStyleChanged, this));

    this._controlButtonStyleChanged();
    this._controlButtonChoicesChanged();
    this._simulationStateChanged();
    this._showClockChanged();

    // update click handler bindings for new model and scriptingAPI
    // Stephen: TODO when we remove the binding between model instance and scripting api, only bind
    // and unbind click handlers in _controlButtonStyleChanged; there should be no need to do so
    // when a model loads
    this._bindClickHandlers();

  };

  return PlaybackController;
});

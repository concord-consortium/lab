/*global define, $ */

define(function (require) {

  var inherit              = require('common/inherit'),
      detectFontChange     = require('common/layout/detect-font-change'),
      InteractiveComponent = require('common/controllers/interactive-component'),

      // Font used by time display
      FONT_SPEC = "bold 2em Lato";

  /**
   * Playback controller.
   *
   * @constructor
   * @extends InteractiveComponent
   * @param {Object} component Component JSON definition.
   * @param {interactivesController} interactives controller that created this playback controller
   */
  function PlaybackController(component, interactivesController) {
    // Call super constructor.
    InteractiveComponent.call(this, "playback", component, interactivesController);

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
    this._model = null;
    /** @private */
    this._scriptingAPI = null;
    /** @private */
    this._interactivesController = interactivesController;

    detectFontChange({
      font: FONT_SPEC,
      onchange: $.proxy(this._showClockChanged, this)
    });
  }
  inherit(PlaybackController, InteractiveComponent);

  // TODO: make 2 delegate classes instead of using this pattern!
  PlaybackController.prototype._createControlsFor = {
    video: function () {
      var scriptingAPI = this._scriptingAPI;

      this.$element.removeClass('text').addClass('video');

      /** @private */
      this._$reset = $('<button class="reset"><i class="icon-step-backward"></i></button>').appendTo(this.$element);
      /** @private */
      this._$playPause = $('<button class="play-pause"><i class="icon-play"></i><i class="icon-pause"></i></button>').appendTo(this.$element);
      /** @private */
      this._$timeDisplay = $('<span class="time-display">').appendTo(this._$playPause);

      // Canvas is much faster that native HTML text, especially on mobile devices. See:
      // https://www.pivotaltracker.com/story/show/58879086
      /** @private */
      this._$timeCanvas = $('<canvas>').appendTo(this._$timeDisplay);
      /** @private */
      this._timeCtx = this._$timeCanvas[0].getContext("2d");

      /** @private */
      this._$stepBackward = $('<button class="step"><i class="icon-backward"></i></button>').insertBefore(this._$playPause);
      /** @private */
      this._$stepForward = $('<button class="step"><i class="icon-forward"></i></button>').insertAfter(this._$playPause);

      this._$reset.after('<div class="spacer reset">');
      this._$stepBackward.after('<div class="spacer step">');
      this._$stepForward.before('<div class="spacer step">');

      // Bind click handlers.
      this._$reset.on("click", scriptingAPI.reload);

      this._$playPause.on("click", $.proxy(function () {
        if (this._modelStopped) {
          if (this._modelPlayable) {
            scriptingAPI.start();
          }
        } else {
          scriptingAPI.stop();
        }
      }, this));

      this._$stepBackward.on("click", scriptingAPI.stepBack);
      this._$stepForward.on("click", scriptingAPI.stepForward);

      this._$playPause.attr("title", "Start / pause the simulation");
      this._$reset.attr("title", "Reset the simulation");
      this._$stepBackward.attr("title", "Step back");
      this._$stepForward.attr("title", "Step forward");
    },

    text: function () {
      var scriptingAPI = this._scriptingAPI;

      this.$element.removeClass('video').addClass('text');

      this._$start = $('<button class="start">Start</button>').appendTo(this.$element);
      this._$stop = $('<button class="stop">Stop</button>').appendTo(this.$element);
      this._$reset = $('<button class="reset">Reset</button>').appendTo(this.$element);

      // Bind click handlers
      this._$reset.on('click', scriptingAPI.reload);
      this._$start.on('click', scriptingAPI.start);
      this._$stop.on('click', scriptingAPI.stop);

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
    var modelStopped = this._model.isStopped();
    // Coerce undefined to *true* for models that don't have isPlayable property
    var modelPlayable = this._model.properties.isPlayable === false ? false : true;

    // Update button states only if modelStopped/modelPlayable actually changed. (Since they're
    // model properties, we are called every tick, unfortunately -- the optimization assumption
    // made by PropertySupport is that all model properties are *physics* properties which are
    // almost certain to change every tick, so it doesn't check to see if they really changed.)
    // update-button-states adds and removes classes, which at the very least adds a distracting
    // entry to Dev Tools timeline view every tick.
    if (modelStopped !== this._modelStopped || modelPlayable !== this._modelPlayable) {
      this._modelStopped = modelStopped;
      this._modelPlayable = modelPlayable;
      this._updateButtonStatesFor[this.controlButtonStyle].call(this);
    }
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
    // Canvas is much faster that native HTML text, especially on mobile devices. See:
    // https://www.pivotaltracker.com/story/show/58879086
    this._timeCtx.clearRect(0, 0, this._canvWidth, this._canvHeigth);
    this._timeCtx.fillText(this._timeDesc.format(this._model.get("displayTime")),
                           this._canvWidth, this._canvHeigth * 0.85);
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
      $buttons = this.$element.find("button");
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
  PlaybackController.prototype.modelLoadedCallback = function () {

    this._model = this._interactivesController.getModel();
    this._scriptingAPI = this._interactivesController.getScriptingAPI().api;

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
  };

  /**
   * Implements optional callback supported by Interactive Controller.
   */
  PlaybackController.prototype.resize = function () {

    if ( !this._$timeCanvas ) {
      return;
    }

    // Oversample canvas, so text will look good on Retina-like displays.
    this._canvWidth = this._$timeCanvas.width() * 2;
    this._canvHeigth = this._$timeCanvas.height() * 2;
    this._$timeCanvas.attr("width", this._canvWidth);
    this._$timeCanvas.attr("height", this._canvHeigth);

    this._timeCtx.font = FONT_SPEC;
    this._timeCtx.fillStyle = "#939598";
    this._timeCtx.textAlign = "right";

    this._showClockChanged();
  };

  return PlaybackController;
});

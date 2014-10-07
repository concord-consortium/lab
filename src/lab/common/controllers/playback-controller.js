/*global define, $ */

define(function (require) {

  var inherit              = require('common/inherit'),
      detectFontChange     = require('common/layout/detect-font-change'),
      InteractiveComponent = require('common/controllers/interactive-component'),
      labConfig            = require('lab.config'),
      // Font used by time display
      FONT_SPEC = "bold 2em " + labConfig.fontface;

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
      onchange: $.proxy(this._updateClockVisibility, this)
    });
  }
  inherit(PlaybackController, InteractiveComponent);

  // These method implementations depend on the controlButtonStyle
  var controlButtonMethods = {
    video: {
      createControls: function() {
        var scriptingAPI = this._scriptingAPI;
        var i18n = this._interactivesController.i18n;

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
        this._$reset.on("click", scriptingAPI.reloadModel);

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

        this._$playPause.attr("title", i18n.t("banner.video_play_pause_tooltip"));
        this._$reset.attr("title", i18n.t("banner.video_reset_tooltip"));
        this._$stepBackward.attr("title", i18n.t("banner.video_step_back_tooltip"));
        this._$stepForward.attr("title", i18n.t("banner.video_step_forward_tooltip"));
      },

      updateButtonStates: function() {
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

      updateControlButtonChoices: function(mode) {
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

      updateClockVisibility: function() {
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
      }
    },

    text: {
      createControls: function() {
        var scriptingAPI = this._scriptingAPI;
        var i18n = this._interactivesController.i18n;

        this.$element.removeClass('video').addClass('text');

        this._$start = $('<button class="start">').text(i18n.t("banner.text_start")).appendTo(this.$element);
        this._$stop = $('<button class="stop">').text(i18n.t("banner.text_stop")).appendTo(this.$element);
        this._$reset = $('<button class="reset">').text(i18n.t("banner.text_reset")).appendTo(this.$element);

        // Bind click handlers
        this._$reset.on('click', scriptingAPI.reloadModel);
        this._$start.on('click', scriptingAPI.start);
        this._$stop.on('click', scriptingAPI.stop);

        this._$start.attr("title", i18n.t("banner.text_start_tooltip"));
        this._$stop.attr("title",  i18n.t("banner.text_stop_tooltip"));
        this._$reset.attr("title", i18n.t("banner.text_reset_tooltip"));
      },

      updateButtonStates: function() {
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
      },

      updateControlButtonChoices: function(mode) {
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
      },

      updateClockVisibility: function() {
        // noop
      }
    }
  };

  PlaybackController.prototype._createControls = function() {
    this._controlButtonMethods.createControls.apply(this, arguments);
  };

  PlaybackController.prototype._updateButtonStates = function() {
    this._controlButtonMethods.updateButtonStates.apply(this, arguments);
  };

  PlaybackController.prototype._updateControlButtonChoices = function() {
    this._controlButtonMethods.updateControlButtonChoices.apply(this, arguments);
  };

  /**
   * Enables or disables time display.
   * @private
   */
  PlaybackController.prototype._updateClockVisibility = function () {
    this._controlButtonMethods.updateClockVisibility.apply(this, arguments);
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
      this._updateButtonStates();
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


  /**
   * Updates playback controller mode (none, "play", "play_reset" or "play_reset_step").
   * @private
   */
  PlaybackController.prototype._controlButtonChoicesChanged = function () {
    this._updateControlButtonChoices(this._model.properties.controlButtons);
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

    if (!controlButtonMethods[style]) {
      throw new Error("Unknown controlButtonStyle \"" + style + "\"");
    }

    this._controlButtonMethods = controlButtonMethods[style];
    this._createControls();
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

    this._model.addObserver('showClock', $.proxy(this._updateClockVisibility, this));
    this._model.addObserver('displayTime', $.proxy(this._timeChanged, this));

    // Update display mode (=> buttons are hidden or visible).
    this._model.addObserver('controlButtons', $.proxy(this._controlButtonChoicesChanged, this));
    this._model.addObserver('controlButtonStyle', $.proxy(this._controlButtonStyleChanged, this));

    this._controlButtonStyleChanged();
    this._controlButtonChoicesChanged();
    this._simulationStateChanged();
    this._updateClockVisibility();
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

    this._updateClockVisibility();
  };

  return PlaybackController;
});

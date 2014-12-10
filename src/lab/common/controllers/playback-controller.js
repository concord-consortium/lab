/*global define, $ */

define(function (require) {

  var inherit              = require('common/inherit'),
      detectFontChange     = require('common/layout/detect-font-change'),
      InteractiveComponent = require('common/controllers/interactive-component'),
      SelectBoxView        = require('common/views/select-box-view'),
      labConfig            = require('lab.config'),
      _                    = require('underscore'),
      // Font used by time display
      FONT_SPEC = "bold 2em " + labConfig.fontface;

  function disable($el) {
    $el.attr('disabled', true).addClass('lab-disabled').css('cursor', 'default');
  }

  function enable($el) {
    $el.attr('disabled', false).removeClass('lab-disabled').css('cursor', 'pointer');
  }

  function enableWhen(condition, $el) {
    if (condition) {
      enable($el);
    } else {
      disable($el);
    }
  }

  function disableWhen(condition, $el) {
    enableWhen(!condition, $el);
  }

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
    this._modelHasPlayed = false;
    /** @private */
    this._dataAreAvailableForExport = false;
    this._timeDesc = null;
    /** @private */
    this._model = null;
    /** @private */
    this._scriptingAPI = null;
    /** @private */
    this._interactivesController = interactivesController;

    detectFontChange({
      font: FONT_SPEC,
      onchange: this._updateClockVisibility.bind(this)
    });
  }
  inherit(PlaybackController, InteractiveComponent);

  // These method implementations depend on the controlButtonStyle
  var controlButtonMethods = {
    video: {
      createControls: function() {
        var scriptingAPI = this._scriptingAPI;
        var i18n = this._interactivesController.i18n;

        this.$element.empty();
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

        this._$playPause.on("click", function() {
          if (this._modelStopped) {
            if (this._modelPlayable) {
              scriptingAPI.start();
            }
          } else {
            scriptingAPI.stop();
          }
        }.bind(this));

        this._$stepBackward.on("click", scriptingAPI.stepBack);
        this._$stepForward.on("click", scriptingAPI.stepForward);

        this._$playPause.attr("title", i18n.t("banner.video_play_pause_tooltip"));
        this._$reset.attr("title", i18n.t("banner.video_reset_tooltip"));
        this._$stepBackward.attr("title", i18n.t("banner.video_step_back_tooltip"));
        this._$stepForward.attr("title", i18n.t("banner.video_step_forward_tooltip"));
      },

      updateButtonStates: function(stopped, playable) {
        var playing = ! stopped;
        this._$playPause.toggleClass('playing', playing);
        disableWhen(stopped && ! playable, this._$playPause);
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

      setClockVisibility: function(showClock) {
        if (showClock) {
          this._$playPause.addClass("with-clock");
          // Update 'displayTime' description (used for formatting).
          this._timeDesc =  this._model.getPropertyDescription("displayTime");
          // Update clock immediately.
          this._timeChanged();
        } else {
          this._$playPause.removeClass("with-clock");
        }
      },

      setClockValue: function(value) {
        // Canvas is much faster that native HTML text, especially on mobile devices. See:
        // https://www.pivotaltracker.com/story/show/58879086
        this._timeCtx.clearRect(0, 0, this._canvWidth, this._canvHeigth);
        this._timeCtx.fillText(
          this._timeDesc.format(value), this._canvWidth, this._canvHeigth * 0.85);
      }
    },

    text: {
      createControls: function() {
        var scriptingAPI = this._scriptingAPI;
        var i18n = this._interactivesController.i18n;

        this.$element.empty();
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

      updateButtonStates: function(stopped, playable) {
        disableWhen(stopped, this._$stop);
        enableWhen(playable, this._$start);
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

      setClockVisibility: function() {
        // noop
      },

      setClockValue: function() {
        // noop
      }
    },

    codap: {
      createControls: function() {
        var scriptingAPI = this._scriptingAPI;
        var i18n = this._interactivesController.i18n;

        this.$element.removeClass('video').addClass('text wide');
        this.$element.empty();

        this._$start = $('<button class="start">').
          text(i18n.t('banner.text_start')).
          attr("title", i18n.t('banner.text_start_tooltip')).
          appendTo(this.$element);

        this._$stop = $('<button class="stop">').
          text(i18n.t('banner.text_stop')).
          attr('title', i18n.t('banner.text_start_tooltip')).
          appendTo(this.$element);

        this._$analyzeData = $('<button class="analyze-data">').
          text(i18n.t('banner.text_analyze_data')).
          attr('title', i18n.t('banner.text_analyze_data_tooltip')).
          appendTo(this.$element);

        this._$newRun = $('<button class="new-run">').
          text(i18n.t('banner.text_new_run')).
          attr('title', i18n.t('banner.text_new_run_tooltip')).
          appendTo(this.$element);

        // Bind click handlers
        this._$start.on('click', scriptingAPI.start);
        this._$stop.on('click', scriptingAPI.stop);
        this._$analyzeData.on('click', function() {
          scriptingAPI.exportData();
          // Export controller may or may not want us to wait for a new run before re-enabling the
          // analyze data button:
          this._dataAreAvailableForExport = scriptingAPI.dataAreAvailableForExport();
          if ( ! this._dataAreAvailableForExport ) {
            disable($(this));
          }
        });

        this._$newRun.on('click', function() {
          scriptingAPI.reloadModel({ cause: 'new-run' });
        });
      },

      updateButtonStates: function(stopped, playable, hasPlayed, dataAreAvailableForExport) {
        disableWhen(hasPlayed, this._$start);
        disableWhen(stopped, this._$stop);
        enableWhen(hasPlayed && stopped, this._$newRun);
        enableWhen(dataAreAvailableForExport, this._$analyzeData);
      },

      updateControlButtonChoices: function(mode) {
        // mode is one of: null, 'play', 'reset', 'play_reset', 'play_reset_step'
        // only show start/stop buttons in 'play', 'play_reset', 'play_reset_step'
        // only show new-run button if reset button is requested AND play button is requested:
        // (i.e., in play_reset and play_reset_step)

        if (mode && mode.indexOf('play') >= 0) {
          this._$start.show();
          this._$stop.show();
          if (mode.indexOf('reset') >= 0) {
            this._$newRun.show();
          } else {
            this._$newRun.hide();
          }
        } else {
          this._$start.hide();
          this._$stop.hide();
          this._$newRun.hide();
        }
      },

      setClockVisibility: function() {
        // noop
      },

      setClockValue: function() {
        // noop
      }
    }
  };

  PlaybackController.prototype._createControls = function() {
    this._controlButtonMethods.createControls.apply(this, arguments);
    this._updateButtonStates();
    this._fitButtons();
  };

  PlaybackController.prototype._updateButtonStates = function() {
    this._controlButtonMethods.updateButtonStates.call(this,
       this._modelStopped, this._modelPlayable, this._modelHasPlayed, this._dataAreAvailableForExport );
  };

  PlaybackController.prototype._updateControlButtonChoices = function() {
    this._controlButtonMethods.updateControlButtonChoices.apply(this, arguments);
    this._fitButtons();
  };

  PlaybackController.prototype._setClockVisibility = function() {
    this._controlButtonMethods.setClockVisibility.apply(this, arguments);
  };

  PlaybackController.prototype._setClockValue = function() {
    this._controlButtonMethods.setClockValue.apply(this, arguments);
  };

  PlaybackController.prototype._updateCachedSimulationState = function() {
    var modelStopped = this._model.isStopped();
    // Coerce undefined to *true* for models that don't have isPlayable property
    var modelPlayable = this._model.properties.isPlayable === false ? false : true;
    var modelHasPlayed = this._model.properties.hasPlayed;
    var dataAreAvailableForExport = this._scriptingAPI.dataAreAvailableForExport();

    // Update button states only if modelStopped/modelPlayable actually changed. (Since they're
    // model properties, we are called every tick, unfortunately -- the optimization assumption
    // made by PropertySupport is that all model properties are *physics* properties which are
    // almost certain to change every tick, so it doesn't check to see if they really changed.)
    // update-button-states adds and removes classes, which at the very least adds a distracting
    // entry to Dev Tools timeline view every tick.
    if (modelStopped !== this._modelStopped ||
        modelPlayable !== this._modelPlayable ||
        modelHasPlayed !== this._modelHasPlayed ||
        dataAreAvailableForExport !== this._dataAreAvailableForExport) {
      this._modelStopped = modelStopped;
      this._modelPlayable = modelPlayable;
      this._modelHasPlayed = modelHasPlayed;
      this._dataAreAvailableForExport = dataAreAvailableForExport;

      return true;
    }
    return false;
  };

  /**
   * Updates play / pause button.
   * @private
   */
  PlaybackController.prototype._simulationStateChanged = function () {
    if (this._updateCachedSimulationState()) {
      this._updateButtonStates();
    }
  };

  /**
   * Updates time display.
   * @private
   */
  PlaybackController.prototype._timeChanged = function () {
    if (this._model.properties.showClock) {
      this._setClockValue(this._model.properties.displayTime);
    }
  };

  PlaybackController.prototype._useDurationChanged = function() {
    // Reminder. Output properties are notified every tick (due to obsolete assumption that they
    // are necessarily physical properties.)
    // Thus, dirty check before doing anything.

    if (this._useDuration !== this._model.properties.actualUseDuration) {
      this._useDuration = this._model.properties.actualUseDuration;
      this._updateDurationControl();
    }
  };

  PlaybackController.prototype._updateDurationControl = function() {
    var model = this._model;
    var useDuration = this._useDuration;
    var durationOptions = model.properties.durationOptions;
    var actualDuration = model.properties.actualDuration;
    var selectOptions = [];

    if (this.durationControl) {
      this.durationControl.destroy();
      this.durationControl = null;
    }

    if (useDuration && durationOptions.length > 0) {

      durationOptions.forEach(function(duration) {
        // Sneak actualDuration in before 'duration', if that's where it belongs in the sorted list
        // and it was not previously added.
        if (actualDuration < duration &&
            (selectOptions.length === 0 || actualDuration > selectOptions[selectOptions.length-1].value) ) {

          selectOptions.push({
            value: actualDuration,
            text: model.formatTime(actualDuration),
            selected: true
          });
        }

        selectOptions.push({
          value: duration,
          text: model.formatTime(duration),
          selected: duration === actualDuration
        });
      });

      this.durationControl = new SelectBoxView({
        id: 'duration-control',
        options: selectOptions,
        onChange: function(option) {
          // use this._model here, not the possibly-stale closure value 'model'!
          this._model.properties.requestedDuration = option.value;
        }.bind(this)
      });

      this.durationControl.render(this.$element.parent());
      this.durationControl.$element.addClass('duration-control interactive-pulldown component component-spacing');
      this.$element.parent().append(this.durationControl.$element);
    }

    this._fitButtons();
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
    this._updateCachedSimulationState();
    this._createControls();
    this._controlButtonChoicesChanged();
  };

  PlaybackController.prototype._updateClockVisibility = function() {
    this._setClockVisibility(this._model.properties.showClock);
  };

  /*
    Adjusts the font-size of the playback buttons so that they fit within the available
    width. The default font-size (set by the interactive's layout engine) is honored by default,
    but if using this size would cause the buttons to overflow our containing element, the
    relative font-size of the button container is adjusted so that they just fit. (The button
    widths are specified in ems.)

    A minimum font-size of 10px is used; when this might cause the buttons to overflow, the buttons
    are srunched together (by use of the 'scrunched-buttons' CSS class).

    This is a relatively "heavy" operation involving DOM manipulation and relayout, so
    it should not be called during a window resize. Instead, call _fitButtonsOnResize, which
    uses a debounced version of this method which delays until the end of the first 200ms
    window that passes without a resize event.
  */
  PlaybackController.prototype._fitButtons = function() {
    // Get the width of the element we need to fit into
    var parentWidth = this.$element.parent().width();
    var MIN_FONT_SIZE = 10; // px
    var relativeFontSize;
    var absoluteFontSize;
    var fontSizeStyle;

    var $durationControl = this.durationControl && this.durationControl.$element;

    // Temporarily undo any positioning that prevents overlap of buttons & duration control
    this.$element.css('left', '');

    // Get the width the buttons would have in the absence of the font-sizing and
    // margin adjustments that may have been previously applied by this method.
    var elementWidth = this.$element.measure(function() {
      // account for the width of the duration dropdown
      if ($durationControl) {
        this.prepend($durationControl.clone());
      }
      this.removeClass('scrunched-buttons');
      return this.width();
    }, null, $('#bottom-bar'));

    this.$element.parent().css('fontSize', '');

    if (elementWidth < parentWidth) {
      this.$element.removeClass('scrunched-buttons');
    } else {
      relativeFontSize = parentWidth / elementWidth;
      absoluteFontSize = parseFloat(this.$element.parent().css('font-size')) * relativeFontSize;
      fontSizeStyle = absoluteFontSize < MIN_FONT_SIZE ? (MIN_FONT_SIZE + 'px') : (relativeFontSize + 'em');
      this.$element.parent().css('fontSize', fontSizeStyle);

      // Remove scrunched-buttons before testing width...
      this.$element.removeClass('scrunched-buttons');

      // and then add it back if needed to make the buttons (more likely to) fit.
      // (The magic 10 is a guesstimate of the allowable slop/margin on the buttons; a
      // more precise value could be derived from button's calculated margin, but that
      // seems like overkill.)
      if (this.$element.width() - 10 >= parentWidth) {
        this.$element.addClass('scrunched-buttons');
      }
    }

    // Finally, make room for the duration control. Need to make sure left margin of leftmost button
    // doesn't bump into it, however.
    if ($durationControl) {
      var $b = this.$element.find('button:visible').first();

      if ($b.length > 0) {
        var right = $b.offset().left - parseFloat($b.css('padding-left')) - parseFloat($b.css('margin-left'));
        var left = $durationControl.offset().left + $durationControl.outerWidth(true);

        if (right < left) {
          this.$element.css('left', left - right + 'px');
        }
      }
    }
  };

  PlaybackController.prototype._fitButtonsOnResize = function() {
    if ( ! this._debouncedFitButtons ) {
      this._debouncedFitButtons = _.debounce(this._fitButtons.bind(this), 200);
    }

    // Prevent visual chaos by "locking" the playback control's fontsize to its current px
    // value while the interactive font-size changes during the resize operation.
    this.$element.parent().css('fontSize', this.$element.parent().css('fontSize'));

    // After 500ms of no resize events, set the playback controls' font-size so they fit
    this._debouncedFitButtons();
  };

  /**
   * Implements optional callback supported by Interactive Controller.
   */
  PlaybackController.prototype.modelLoadedCallback = function () {

    this._model = this._interactivesController.getModel();
    this._scriptingAPI = this._interactivesController.getScriptingAPI().api;

    var simulationStateChanged = this._simulationStateChanged.bind(this);

    // Update play / pause button.
    // Use event namespace to let multiple playbacks work fine with one model.
    this._model.on('play.' + this.component.id, simulationStateChanged);
    this._model.on('stop.' + this.component.id, simulationStateChanged);
    this._model.addObserver('isPlayable', simulationStateChanged);
    this._model.addObserver('showClock', this._updateClockVisibility.bind(this));
    this._model.addObserver('displayTime', this._timeChanged.bind(this));

    // Update which controls/style to display
    this._model.addObserver('actualUseDuration', this._useDurationChanged.bind(this));
    this._model.addObserver('controlButtons', this._controlButtonChoicesChanged.bind(this));
    this._model.addObserver('controlButtonStyle', this._controlButtonStyleChanged.bind(this));

    this._useDuration = null;
    this._useDurationChanged();
    this._controlButtonStyleChanged();
    this._controlButtonChoicesChanged();
    this._simulationStateChanged();
    this._updateClockVisibility();
  };

  /**
   * Implements optional callback supported by Interactive Controller.
     (*Could* be dispatched to controlButtonMethods, but is that really necessary?)
   */
  PlaybackController.prototype.resize = function () {

    this._fitButtonsOnResize();

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

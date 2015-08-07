/*global define, $ */

define(function () {
  var inherit              = require('common/inherit'),
      InteractiveComponent = require('common/controllers/interactive-component'),

      QuantumDynamics      = require('models/md2d/models/engine/plugins/quantum-dynamics'),
      INFRARED             = QuantumDynamics.INFRARED,
      ULTRAVIOLET          = QuantumDynamics.ULTRAVIOLET,

      // Performance optimization - photon mark is not rendered if there is already another
      // photon mark at the same position. Positions are rounded to the PHOTON_MARKS_PRECISION.
      PHOTON_MARKS_PRECISION = 2,

      // Visible light spectrum image (297px x 1px). Covers area from INFRARED to ULTRAVIOLET.
      // It's based on the Classic MW spectrometer.
      VISIBLE_LIGHT_IMG_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASkAAAABCAYAAACCEVhtAAAAmUlEQVQ4T8WUw' +
                               'Q6DIBBEn1Wr+P/fCnjCbGuTLe4GbphMnH0ZhkiIUymlMOo5T0jpXzk/mWQ097zusnpihBXYgP1+i38rL/NP' +
                               'HteZVl72mYBXp3qzjdwJpErZYJLR3PO6y+qJnzskhxEqyQHUTGbNPa/XWT0HDPjQhe81EmnfM3vrWnzeYAm' +
                               'VdoNJRvPbrwFmI+/yY9RP4bnvBfEAd/7c+ytNAAAAAElFTkSuQmCC';

  function SpectrometerController(component, interactivesController) {
    // Call super constructor.
    InteractiveComponent.call(this, 'spectrometer', component, interactivesController);

    this.$element
      .addClass('interactive-spectrometer')
      .css('border', this.component.border);

    this.lowerBound = this.component.lowerBound;
    this.upperBound = this.component.upperBound;

    // Helper objects that prevents spectrometer from drawing multiple photon marks at the same position.
    this._existingPhotonMarks = {};
    
    this.renderBackground();
    this.renderTickMarks();
    this.$photonMarksContainer = $('<div>').appendTo(this.$element);
  }

  inherit(SpectrometerController, InteractiveComponent);

  SpectrometerController.prototype.modelLoadedCallback = function () {
    SpectrometerController.superClass._modelLoadedCallback.call(this);
    this._model.onPhotonAbsorbed(this.onPhotonAbsorbed.bind(this));
    if (this.component.clearOnModelLoad) {
      this.$photonMarksContainer.empty();
    }
  };

  SpectrometerController.prototype.renderBackground = function () {
    var position = (INFRARED - this.lowerBound) / (this.upperBound - this.lowerBound) * 100;
    var width = (ULTRAVIOLET - INFRARED) / (this.upperBound - this.lowerBound) * 100;
    $('<img>')
      .addClass('spectrometer-bg')
      .attr('src', VISIBLE_LIGHT_IMG_DATA)
      .css('left', position + '%')
      .css('width', width + '%')
      .appendTo(this.$element);
  };

  SpectrometerController.prototype.renderTickMarks = function () {
    if (!this.component.ticks || this.component.ticks < 2) return;

    var $tickMarksContainer = $('<div>').appendTo(this.$element);
    var spacing = 100 / this.component.ticks;
    for (var i = 1; i < this.component.ticks; i++) {
      $('<div class="tick-mark">').css('left', (i * spacing) + '%').appendTo($tickMarksContainer);
    }
  };

  SpectrometerController.prototype.onPhotonAbsorbed = function (frequency) {
    if (frequency > this.upperBound || frequency < this.lowerBound) return;

    var position = (frequency - this.lowerBound) / (this.upperBound - this.lowerBound) * 100;
    // Check existing photon marks, so we don't render hundreds of lines in the same place.
    if (!this.photonMarkExists(position)) {
      this.addPhotonMark(position);
    }
  };

  SpectrometerController.prototype.photonMarkExists = function (position) {
    return !!this._existingPhotonMarks[position.toFixed(PHOTON_MARKS_PRECISION)];
  };

  SpectrometerController.prototype.addPhotonMark = function (position) {
    $('<div class="photon-mark">').css('left', position + '%').appendTo(this.$photonMarksContainer);
    this._existingPhotonMarks[position.toFixed(PHOTON_MARKS_PRECISION)] = true;
  };

  return SpectrometerController;
});

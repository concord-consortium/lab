/*global define, $ */

define(function () {
  var inherit              = require('common/inherit'),
      InteractiveComponent = require('common/controllers/interactive-component'),

      INFRARED = 2.5,
      ULTRAVIOLET = 14.5,
      // Visible light spectrum image (297px x 1px). Covers area from INFRARED to ULTRAVIOLET.
      VISIBLE_LIGHT_IMG_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASkAAAABCAYAAACCEVhtAAAAmUlEQVQ4T8WUw" +
                               "Q6DIBBEn1Wr+P/fCnjCbGuTLe4GbphMnH0ZhkiIUymlMOo5T0jpXzk/mWQ097zusnpihBXYgP1+i38rL/NP" +
                               "HteZVl72mYBXp3qzjdwJpErZYJLR3PO6y+qJnzskhxEqyQHUTGbNPa/XWT0HDPjQhe81EmnfM3vrWnzeYAm" +
                               "VdoNJRvPbrwFmI+/yY9RP4bnvBfEAd/7c+ytNAAAAAElFTkSuQmCC";

  function SpectrometerController(component, interactivesController) {
    // Call super constructor.
    InteractiveComponent.call(this, "spectrometer", component, interactivesController);
    this.$element.addClass("interactive-spectrometer");
    this.$background = $('<img>')
      .addClass("spectrometer-bg")
      .attr("src", VISIBLE_LIGHT_IMG_DATA)
      .appendTo(this.$element);
    this.$outputContainer = $('<div>').appendTo(this.$element);

    this.lowerBound = this.component.lowerBound;
    this.upperBound = this.component.upperBound;

    this._existingPhotonMarks = {};
    this.positionBackground();
  }

  inherit(SpectrometerController, InteractiveComponent);

  SpectrometerController.prototype.modelLoadedCallback = function () {
    SpectrometerController.superClass._modelLoadedCallback.call(this);
    this._model.onPhotonAbsorbed(this.onPhotonAbsorbed.bind(this));
  };

  SpectrometerController.prototype.modelLoadedCallback = function () {
    SpectrometerController.superClass._modelLoadedCallback.call(this);
    this._model.onPhotonAbsorbed(this.onPhotonAbsorbed.bind(this));
    if (this.component.clearOnModelLoad) {
      this.$outputContainer.empty();
    }
  };

  SpectrometerController.prototype.positionBackground = function () {
    var position = (INFRARED - this.lowerBound) / (this.upperBound - this.lowerBound) * 100; // [0%, 100%]
    var width = (ULTRAVIOLET - INFRARED) / (this.upperBound - this.lowerBound) * 100; // [0%, 100%]
    this.$background.css({
      left: position + '%',
      width: width + '%'
    });
  };

  SpectrometerController.prototype.onPhotonAbsorbed = function (frequency) {
    if (frequency > this.upperBound || frequency < this.lowerBound) return;

    var position = (frequency - this.lowerBound) / (this.upperBound - this.lowerBound) * 100; // [0%, 100%]
    // Check existing photon marks, so we don't render hundreds of lines in the same place.
    if (this._existingPhotonMarks[position.toFixed(1)]) return;
    this._existingPhotonMarks[position.toFixed(1)] = true;

    $('<div class="photon-mark">').css({
      left: position + '%'
    }).appendTo(this.$outputContainer);
  };

  return SpectrometerController;
});

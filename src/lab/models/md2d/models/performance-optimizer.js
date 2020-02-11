/*global define, $ */

var MIN_FPS = 2.5;

function PerformanceOptimizer(model) {
  /** @private */
  this._model = model;
  /** @private */
  this._initialTimeStep = this._model.get('timeStep');
  /** @private */
  this._maxTimeStep = this._initialTimeStep * 2;
  /** @private */
  this._targetProgressRate = this._initialTimeStep * this._model.get('timeStepsPerTick') * 60; // 60fps
  /**
   * Indicates whether performance optimizer is enabled or not.
   * @type {Boolean}
   */
  this.enabled = false;
}

PerformanceOptimizer.prototype._assessPerformance = function() {
  if (!this.enabled || this._model.isStopped()) {
    return;
  }

  var progressRate = this._model.getSimulationProgressRate(),
    fps = this._model.getFPS(),
    timeStep = this._model.get('timeStep'),
    timeStepsPerTick = this._model.get('timeStepsPerTick'),
    currentMaxTimeStep = this._model.get('temperatureControl') ? this._maxTimeStep * 2.5 : this._maxTimeStep;

  if (progressRate < 0.9 * this._targetProgressRate) {
    // Try to increase timeStep and if it's impossible,
    // touch timeStepsPerTick (what probably decrease FPS and
    // animation smoothness).
    if (1.1 * timeStep < currentMaxTimeStep) {
      this._model.set('timeStep', 1.1 * timeStep);
    } else if (fps > MIN_FPS) {
      this._model.set('timeStepsPerTick', Math.round(1.1 * timeStepsPerTick + 0.5));
    }
  } else if (progressRate > 1.1 * this._targetProgressRate) {
    // If simulation is going to fast, decrease timeStepsPerTick
    // what should make animations smoother.
    this._model.set('timeStepsPerTick', Math.round(0.9 * timeStepsPerTick - 0.5));
  }
  setTimeout($.proxy(this._assessPerformance, this), 250);
};

PerformanceOptimizer.prototype.enable = function() {
  if (this.enabled) {
    return;
  }
  this._model.start();
  this.enabled = true;
  this._model.set('timeStepsPerTick', 5);
  setTimeout($.proxy(this._assessPerformance, this), 250);
};

PerformanceOptimizer.prototype.disable = function() {
  this.enabled = false;
};

export default PerformanceOptimizer;

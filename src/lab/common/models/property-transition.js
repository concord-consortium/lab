/*global define, d3 */

/**
 * Abstract class, which defines basic interface for property transition.
 * It allows to smoothly change property over desired time period.
 *
 * Note that this class *can't* be instantiated. It should be used
 * as a base class for other classes, which should implement following
 * interface:
 *  - getObjectProperties(id)
 *  - setObjectProperties(id, props)
 *
 * Note that under the hood D3 ease and interpolate methods are used.
 * Also interface is similar to D3 transitions.
 */
function PropertyTransition() {
  this.isFinished = false;
  this._duration = 0;
  this._easeFunc = d3.ease("cubic-in-out"); // also default in d3
  this._elapsedTime = 0;
  this._id = null;
  this._propName = null;
  this._endValue = null;
  this._interpolator = null;

  // Check whether required methods are implemented.
  // This class can't be instantiated, only subclasses
  // implementing specified interface:
  if (this.getObjectProperties == null) {
    throw new Error("getObjectProperties method must be implemented by descendant!");
  }
  if (this.setObjectProperties == null) {
    throw new Error("setObjectProperties method must be implemented by descendant!");
  }
}

/**
 * Sets ID of processed object. It will be passed to
 * getObjectProperties and setObjectProperties.
 * @param  {*} id
 * @return {PropertyTransition} this (method chaining).
 */
PropertyTransition.prototype.id = function(id) {
  this._id = id;
  return this;
};

/**
 * Sets property name and its final value.
 * @param  {String} propName
 * @param  {*}      endValue
 * @return {PropertyTransition} this (method chaining).
 */
PropertyTransition.prototype.prop = function(propName, endValue) {
  this._propName = propName;
  this._endValue = endValue;
  return this;
};

/**
 * Sets transition duration.
 * @param  {number} duration Transition duration.
 * @return {PropertyTransition} this (method chaining).
 */
PropertyTransition.prototype.duration = function(duration) {
  this._duration = duration;
  return this;
};

/**
 * Sets transition delay.
 * @param  {number} delay Transition delay.
 * @return {PropertyTransition} this (method chaining).
 */
PropertyTransition.prototype.delay = function(delay) {
  this._elapsedTime = -delay;
  return this;
};

/**
 * Sets easing function duration. Note that under the hood
 * d3.ease function is used to generate easing function.
 * Please see:
 * https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_ease
 *
 * @param  {string} funcName Function name.
 * @return {PropertyTransition} this (method chaining).
 */
PropertyTransition.prototype.ease = function(funcName) {
  this._easeFunc = d3.ease(funcName);
  return this;
};

/**
 * Processes the transition. This should be used by the model
 * implementing transitions support. When transition is finished,
 * isFinished field will be set to true.
 * @param  {number} elapsedTime elapsed time, units have to be
 *                              consistent with duration time.
 */
PropertyTransition.prototype.process = function(elapsedTime) {
  if (this.isFinished || this._incompleteSpec()) {
    return;
  }
  var t, props;

  this._elapsedTime += elapsedTime;
  if (this._elapsedTime < 0) {
    // Elapsed time can be negative when there was a delay specified (which
    // sets elapsedTime to -delay).
    return;
  }
  if (this._interpolator == null) {
    this._interpolator = d3.interpolate(this.getObjectProperties(this._id)[this._propName], this._endValue);
  }
  t = Math.min(1, this._elapsedTime / this._duration);
  t = this._easeFunc(t);
  props = {};
  props[this._propName] = this._interpolator(t);
  // Update object properties.
  this.setObjectProperties(this._id, props);
  if (t >= 1) {
    // This ensures that 1 value is always reached.
    this.isFinished = true;
  }
};

/**
 * getObjectProperties method must be implemented by descendant!
 * Required interface:
 * @param  {*}      id Object ID, value passed
 *                     to .id() method will be used.
 * @return {Object} Properties hash.
 */
PropertyTransition.prototype.getObjectProperties = null;

/**
 * setObjectProperties method must be implemented by descendant!
 * Required interface:
 * @param  {*}      id Object ID, value passed
 *                     to .id() method will be used.
 * @param  {Object} props Properties hash.
 */
PropertyTransition.prototype.setObjectProperties = null;

/**
 * @private
 * @return {boolean} true when transition specification is incomplete.
 */
PropertyTransition.prototype._incompleteSpec = function() {
  return this._id == null || this._propName == null || this._endValue == null;
};

export default PropertyTransition;
/*global define, d3 */

define(function() {

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
    if (this._propName != null) {
      // Update interpolator if .prop() has been already called.
      this.prop(this._propName, this._endValue);
    }
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
    if (this._id != null) { // undefined or null, but 0 should be ofc accepted.
      this._interpolator = d3.interpolate(this.getObjectProperties(this._id)[propName], endValue);
    }
  };

  /**
   * Sets transition duration.
   * @param  {number} duration Transition duration.
   * @return {PropertyTransition} this (method chaining).
   */
  PropertyTransition.prototype.duration = function (duration) {
    this._duration = duration;
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
  PropertyTransition.prototype.ease = function (funcName) {
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
  PropertyTransition.prototype.process = function (elapsedTime) {
    if (this.isFinished || this._interpolator == null) {
      return;
    }

    var props = {}, t;
    this._elapsedTime += elapsedTime;
    t = Math.min(1, this._elapsedTime / this._duration);
    t = this._easeFunc(t);
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

  return PropertyTransition;
});
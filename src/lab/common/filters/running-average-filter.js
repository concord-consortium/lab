 /*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
/*
Filter implementing running average.
This filter assumes that provided samples are samples of some unknown function.
The function is interpolated using linear interpolation. Later, integration is
used to get mean value of the function on the given time period.
*/
let RunningAverageFilter;
export default RunningAverageFilter = class RunningAverageFilter {

  /*
  Construct new Running Average Filter.
  @periodLength - length of time period, in fs, which is used to calculate averaged value.
  */
  constructor(periodLength) {
    this.periodLength = periodLength;
    this._value = [];
    this._time = [];
    this._idx = -1;
    // By default, max length of buffer is equal to periodLength.
    // You can adjust it using #setMaxBufferLength.
    this._maxBufferLength = this.periodLength;
  }

  /*
  Add a new sample of a function which is going to be averaged.
  Note that samples must be provided in order, sorted by time.
  @t - time
  @val - value of the sample
  */
  addSample(t, val) {
    if (this._time[this._idx] === t) {
      // Overwrite last @_value.
      this._value[this._idx] = val;
      return;
    } else if (this._time[this._idx] > t) {
      throw new Error("RunningAverageFilter: cannot add sample with @_time less than previous sample.");
    }

    // Add new value and time.
    this._idx++;
    this._value.push(val);
    this._time.push(t);

    return (() => {
      const result = [];
      while (this._value.length > this._maxBufferLength) {
        // Remove first elements if buffers are too long.
        this._time.shift();
        this._value.shift();
        result.push(this._idx--);
      }
      return result;
    })();
  }

  /*
  Return averaged value n the specified time period (using available samples).
  */
  calculate() {
    // To get average value on [t - periodLength, t], we use
    // intuitive "first mean value theorem for integration". See:
    // http://en.wikipedia.org/wiki/Mean_value_theorem#Mean_value_theorems_for_integration

    // Limit lower bound of time period to 0.
    let timeDiff;
    const minTime = Math.max(this._time[this._idx] - this.periodLength, 0);

    let valSum = 0;
    let timeSum = 0;
    let i = this._idx;

    // Perform very simple integration.
    while ((i > 0) && (this._time[i - 1] >= minTime)) {
      timeDiff = this._time[i] - this._time[i - 1];
      timeSum += timeDiff;
      // timeDiff * avg from @_value[i-1] and @_value[i]
      valSum += (timeDiff * (this._value[i - 1] + this._value[i])) / 2.0;
      i--;
    }

    // Last, optional step of integration.
    // It occurs when end of integration period is between two samples.
    // Linear interpolation needs to be performed.
    // In most cases, probably it won't be performed.
    if ((i > 0) && (this._time[i] > minTime) && (this._time[i - 1] < minTime)) {
      timeDiff = this._time[i] - minTime;
      timeSum += timeDiff;
      // Linear interpolation.
      const minVal = this._value[i - 1] + (((this._value[i] - this._value[i - 1]) * (minTime - this._time[i - 1])) / (this._time[i] - this._time[i - 1]));
      valSum += (timeDiff * (this._value[i] + minVal)) / 2.0;
    }

    // Return mean value using mentioned theorem.
    if (timeSum) {
      return valSum / timeSum;
    } else {
      return this._value[0] || 0;
    }
  }

  /*
  Return current length of the buffers used to store samples.
  */
  getCurrentBufferLength() {
    return this._value.length;
  }

  /*
  Set limit of the buffer which stores samples.
  */
  setMaxBufferLength(maxLength) {
    return this._maxBufferLength = maxLength;
  }

  /*
  Return current time.
  */
  getCurrentTime() {
    return this._time[this._idx];
  }

  /*
  Return current step index.
  */
  getCurrentStep() {
    return this._idx;
  }

  /*
  Set current step to @location.
  It allows to get average value of the function in various moments in time.
  */
  setCurrentStep(location) {
    // Note that location can be -1, e.g. while reseting buffers and starting from initial state.
    if ((location < -1) || (location >= this._value.length)) {
      throw new Error("RunningAverageFilter: cannot seek, location outside available range.");
    }
    return this._idx = location;
  }

  /*
  Remove all samples *after* @location.
  */
  invalidate(location) {
    this._value.length = location + 1;
    this._time.length = location + 1;
    return this._idx = location;
  }

  /*
  Reset filter
  */
  reset() {
    this._values.length = 0;
    this._time = 0;
    return this._idx = 0;
  }
};


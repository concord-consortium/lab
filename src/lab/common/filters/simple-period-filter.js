/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(function(require) {

  /*
  Filter implementing that calculates period for a simple period data.
  */
  let SimplePeriodFilter;
  return SimplePeriodFilter = class SimplePeriodFilter {

    /*
    Construct new Running Average Filter.
    @periodLength - length of time period, in fs, which is used to calculate averaged value.
    */
    constructor() {
      this._values = [];
      this._time = [];
      this._idx = -1;
      this._zero_crossing_buffer = [];
      this._period_buffer = [];
      // By default, max length of buffer is equal to periodLength.
      // You can adjust it using #setMaxBufferLength.
      this._maxBufferLength = 8192;
    }

    /*
    Add a new sample of a function which is going to be averaged.
    Note that samples must be provided in order, sorted by time.
    @t - time
    @val - value of the sample
    */
    addSample(t, val) {
      let previous_value;
      if (this._time[this._idx] === t) {
        // Overwrite last @_values.
        this._values[this._idx] = val;
        return;
      } else if (this._time[this._idx] > t) {
        console.log("Error: RunningAverageFilter: cannot add sample with @_time less than previous sample.");
        // throw new Error "RunningAverageFilter: cannot add sample with @_time less than previous sample."
        return;
      }

      // Add new value and time.
      this._idx++;
      this._values.push(val);
      this._time.push(t);
      if (this._values.length > 1) {
        previous_value = this._values[this._values.length-2];
      }

      while (this._values.length > this._maxBufferLength) {
        // Remove first elements if buffers are too long.
        this._time.shift();
        this._values.shift();
        this._idx--;
      }

      // save zero-crossing times and zero-to-zero times
      if (((previous_value  < 0) && (val > 0)) || ((previous_value  > 0) && (val < 0))) {
        this._zero_crossing_buffer.push(t);
        if (this._zero_crossing_buffer.length > 1) {
          const previous_zero_crossing = this._zero_crossing_buffer[this._zero_crossing_buffer.length-2];
          this._period_buffer.push(t - previous_zero_crossing );
        }
        while (this._zero_crossing_buffer.length > 128) {
          this._zero_crossing_buffer.shift();
          this._period_buffer.shift();
        }
      }

    }

    /*
    Return averaged period.
    */
    calculate() {
      if (this._period_buffer.length < 1) {
        return 0;
      }
      if (this._period_buffer.length === 1) {
        return this._period_buffer[0] * 2;
      }
      const sum = this._period_buffer.reduce((x, y) => x + y);
      const average = sum / this._period_buffer.length;
      return average * 2;
    }

    /*
    Return current length of the buffers used to store samples.
    */
    getCurrentBufferLength() {
      return this._values.length;
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
      if ((location < -1) || (location >= this._values.length)) {
        throw new Error("SimplePeriodFilter: cannot seek, location outside available range.");
      }
      return this._idx = location;
    }

    /*
    Remove all samples *after* @location.
    */
    invalidate(location) {
      if (location) {
        this._values.length = location + 1;
        this._time.length = location + 1;
        return this._idx = location;
      } else {
        return this.reset();
      }
    }

    /*
    Reset filter
    */
    reset() {
      this._values.length = 0;
      this._time.length = 0;
      this._idx = 0;
      this._zero_crossing_buffer.length = 0;
      this._period_buffer.length = 0;
    }
  };
});


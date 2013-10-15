define (require) ->

  ###
  Filter implementing running average.
  This filter assumes that provided samples are samples of some unknown function.
  The function is interpolated using linear interpolation. Later, integration is
  used to get mean value of the function on the given time period.
  ###
  class RunningAverageFilter

    ###
    Construct new Running Average Filter.
    @periodLength - length of time period, in fs, which is used to calculate averaged value.
    ###
    constructor: (@periodLength) ->
      @_value = []
      @_time = []
      @_idx = -1
      # By default, max length of buffer is equal to periodLength.
      # You can adjust it using #setMaxBufferLength.
      @_maxBufferLength = @periodLength

    ###
    Add a new sample of a function which is going to be averaged.
    Note that samples must be provided in order, sorted by time.
    @t - time
    @val - value of the sample
    ###
    addSample: (t, val) ->
      if @_time[@_idx] == t
        # Overwrite last @_value.
        @_value[@_idx] = val
        return
      else if @_time[@_idx] > t
        throw new Error "RunningAverageFilter: cannot add sample with @_time less than previous sample."

      # Add new value and time.
      @_idx++
      @_value.push val
      @_time.push t

      while @_value.length > @_maxBufferLength
        # Remove first elements if buffers are too long.
        @_time.shift()
        @_value.shift()
        @_idx--

    ###
    Return averaged value n the specified time period (using available samples).
    ###
    calculate: ->
      # To get average value on [t - periodLength, t], we use
      # intuitive "first mean value theorem for integration". See:
      # http://en.wikipedia.org/wiki/Mean_value_theorem#Mean_value_theorems_for_integration

      # Limit lower bound of time period to 0.
      minTime = Math.max @_time[@_idx] - @periodLength, 0

      valSum = 0
      timeSum = 0
      i = @_idx

      # Perform very simple integration.
      while i > 0 && @_time[i - 1] >= minTime
        timeDiff = @_time[i] - @_time[i - 1]
        timeSum += timeDiff
        # timeDiff * avg from @_value[i-1] and @_value[i]
        valSum += timeDiff * (@_value[i - 1] + @_value[i]) / 2.0
        i--

      # Last, optional step of integration.
      # It occurs when end of integration period is between two samples.
      # Linear interpolation needs to be performed.
      # In most cases, probably it won't be performed.
      if i > 0 && @_time[i] > minTime && @_time[i - 1] < minTime
        timeDiff = @_time[i] - minTime
        timeSum += timeDiff
        # Linear interpolation.
        minVal = @_value[i - 1] + (@_value[i] - @_value[i - 1]) * (minTime - @_time[i - 1]) / (@_time[i] - @_time[i - 1])
        valSum += timeDiff * (@_value[i] + minVal) / 2.0

      # Return mean value using mentioned theorem.
      if timeSum
        valSum / timeSum
      else
        @_value[0] || 0

    ###
    Return current length of the buffers used to store samples.
    ###
    getCurrentBufferLength: ->
      @_value.length

    ###
    Set limit of the buffer which stores samples.
    ###
    setMaxBufferLength: (maxLength) ->
      @_maxBufferLength = maxLength

    ###
    Return current time.
    ###
    getCurrentTime: ->
      @_time[@_idx]

    ###
    Return current step index.
    ###
    getCurrentStep: ->
      @_idx

    ###
    Set current step to @location.
    It allows to get average value of the function in various moments in time.
    ###
    setCurrentStep: (location) ->
      # Note that location can be -1, e.g. while reseting buffers and starting from initial state.
      if location < -1 || location >= @_value.length
        throw new Error "RunningAverageFilter: cannot seek, location outside available range."
      @_idx = location

    ###
    Remove all samples *after* @location.
    ###
    invalidate: (location) ->
      @_value.length = location + 1
      @_time.length = location + 1
      @_idx = location

    ###
    Reset filter
    ###
    reset: ->
      @_values.length = 0
      @_time = 0
      @_idx = 0


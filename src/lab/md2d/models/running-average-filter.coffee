define (require) ->

  ###
  Filter implementing running average.
  This filter assumes that provided samples are samples of some unknown function.
  The function is interpolated using linear interpolation. Later, integration is
  used to get mean value of the function on the given time period.
  ###
  class RunningAverageFilter
    # Private variables:
    value = null
    time = null
    idx = null
    maxBufferLength = null

    # Private methods:
    removeDataAfter = (index) ->
      value.length = index + 1
      time.length = index + 1

    # Public members:

    ###
    Construct new Running Average Filter.
    @periodLength - length of time period, in fs, which is used to calculate averaged value.
    ###
    constructor: (@periodLength) ->
      value = []
      time = []
      idx = -1
      # By default, max length of buffer is equal to periodLength.
      # You can adjust it using #setMaxBufferLength.
      maxBufferLength = @periodLength

    ###
    Add a new sample of a function which is going to be averaged.
    Note that samples must be provided in order, sorted by time.
    @t - time
    @val - value of the sample
    ###
    addSample: (t, val) ->
      if time[idx] == t
        # Overwrite last value.
        value[idx] = val
        return
      else if time[idx] > t
        throw new Error "RunningAverageFilter: cannot add sample with time less than previous sample."

      # Add new value and time.
      idx++
      value.push val
      time.push t

      while value.length > maxBufferLength
        # Remove first elements if buffers are too long.
        time.shift()
        value.shift()
        idx--

    ###
    Return averaged value n the specified time period (using available samples).
    ###
    calculate: ->
      # To get average value on [t - periodLength, t], we use
      # intuitive "first mean value theorem for integration". See:
      # http://en.wikipedia.org/wiki/Mean_value_theorem#Mean_value_theorems_for_integration

      # Limit lower bound of time period to 0.
      minTime = Math.max time[idx] - @periodLength, 0

      valSum = 0
      timeSum = 0
      i = idx

      # Perform very simple integration.
      while i > 0 && time[i - 1] >= minTime
        timeDiff = time[i] - time[i - 1]
        timeSum += timeDiff
        # timeDiff * avg from value[i-1] and value[i]
        valSum += timeDiff * (value[i - 1] + value[i]) / 2.0
        i--

      # Last, optional step of integration.
      # It occurs when end of integration period is between two samples.
      # Linear interpolation needs to be performed.
      # In most cases, probably it won't be performed.
      if i > 0 && time[i] > minTime && time[i - 1] < minTime
        timeDiff = time[i] - minTime
        timeSum += timeDiff
        # Linear interpolation.
        minVal = value[i - 1] + (value[i] - value[i - 1]) * (minTime - time[i - 1]) / (time[i] - time[i - 1])
        valSum += timeDiff * (value[i] + minVal) / 2.0

      # Return mean value using mentioned theorem.
      if timeSum
        valSum / timeSum
      else
        value[0] || 0

    ###
    Return current length of the buffers used to store samples.
    ###
    getCurrentBufferLength: ->
      value.length

    ###
    Set limit of the buffer which stores samples.
    ###
    setMaxBufferLength: (maxLength) ->
      maxBufferLength = maxLength

    ###
    Return current time.
    ###
    getCurrentTime: ->
      time[idx]

    ###
    Return current step index.
    ###
    getCurrentStep: ->
      idx

    ###
    Set current step to @location.
    It allows to get average value of the function in various moments in time.
    ###
    setCurrentStep: (location) ->
      # Note that location can be -1, e.g. while reseting buffers and starting from initial state.
      if location < -1 || location >= value.length
        throw new Error "RunningAverageFilter: cannot seek, location outside available range."
      idx = location

    ###
    Remove all samples *after* @location.
    ###
    invalidate: (location) ->
      removeDataAfter location
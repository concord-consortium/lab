define (require) ->

  ###
  Filter implementing that calculates period for a simple period data.
  ###
  class SimplePeriodFilter

    ###
    Construct new Running Average Filter.
    @periodLength - length of time period, in fs, which is used to calculate averaged value.
    ###
    constructor: () ->
      @_values = []
      @_time = []
      @_idx = -1
      @_zero_crossing_buffer = []
      @_period_buffer = []
      # By default, max length of buffer is equal to periodLength.
      # You can adjust it using #setMaxBufferLength.
      @_maxBufferLength = 8192

    ###
    Add a new sample of a function which is going to be averaged.
    Note that samples must be provided in order, sorted by time.
    @t - time
    @val - value of the sample
    ###
    addSample: (t, val) ->
      if @_time[@_idx] == t
        # Overwrite last @_values.
        @_values[@_idx] = val
        return
      else if @_time[@_idx] > t
        console.log "Error: RunningAverageFilter: cannot add sample with @_time less than previous sample."
        # throw new Error "RunningAverageFilter: cannot add sample with @_time less than previous sample."
        return

      # Add new value and time.
      @_idx++
      @_values.push val
      @_time.push t
      if @_values.length > 1
        previous_value = @_values[@_values.length-2]

      while @_values.length > @_maxBufferLength
        # Remove first elements if buffers are too long.
        @_time.shift()
        @_values.shift()
        @_idx--

      # save zero-crossing times and zero-to-zero times
      if (previous_value  < 0 && val > 0) || (previous_value  > 0 && val < 0)
        @_zero_crossing_buffer.push(t)
        if @_zero_crossing_buffer.length > 1
          previous_zero_crossing = @_zero_crossing_buffer[@_zero_crossing_buffer.length-2]
          @_period_buffer.push(t - previous_zero_crossing )
        while @_zero_crossing_buffer.length > 128
          @_zero_crossing_buffer.shift()
          @_period_buffer.shift()

      return

    ###
    Return averaged period.
    ###
    calculate: ->
      if @_period_buffer.length < 1
        return 0
      if @_period_buffer.length == 1
        return @_period_buffer[0] * 2
      sum = @_period_buffer.reduce (x,y) -> x + y
      average = sum / @_period_buffer.length
      average * 2

    ###
    Return current length of the buffers used to store samples.
    ###
    getCurrentBufferLength: ->
      @_values.length

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
      if location < -1 || location >= @_values.length
        throw new Error "SimplePeriodFilter: cannot seek, location outside available range."
      @_idx = location

    ###
    Remove all samples *after* @location.
    ###
    invalidate: (location) ->
      if location
        @_values.length = location + 1
        @_time.length = location + 1
        @_idx = location
      else
        this.reset()

    ###
    Reset filter
    ###
    reset:  ->
      @_values.length = 0
      @_time.length = 0
      @_idx = 0
      @_zero_crossing_buffer.length = 0
      @_period_buffer.length = 0
      return


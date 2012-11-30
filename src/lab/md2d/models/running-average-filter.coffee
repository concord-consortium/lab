define (require) ->

  arrays      = require 'arrays'
  arrayTypes  = require 'common/array-types'
  BasicFilter = require 'cs!md2d/models/basic-filter'

  ###
  Filter implementing running average.
  Number of samples should be defined in @spec as 'samples'.
  ###
  class RunningAverageFilter extends BasicFilter
    # Private variables:
    bufferLen = null
    buffer = null
    idx = null
    partial = null

    # Public members:
    constructor: ->
      super
      throw new Error "Invalid 'samples' property value!" if @spec.samples < 1
      bufferLen = @spec.samples
      buffer = arrays.create bufferLen, 0, arrayTypes.float
      idx = 0
      partial = true

    ###
    Return running average of @basicCalculate function.
    Use @spec.samples to define number of samples.
    ###
    calculate: ->
      # Implement circular buffer.
      if idx >= bufferLen
        idx = 0
        partial = false

      buffer[idx] = @basicCalculate()
      idx++

      # Return average.
      if partial
        arrays.average buffer.subarray 0, idx
      else
        arrays.average buffer

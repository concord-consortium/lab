define ->

  ###
  This class specify basic interface for filters.
  Subclasses should overwrite @calculate method.
  ###
  class BasicFilter

    ###
    Create new filter.
    @spec - filter specification.
    @basicCalculate - function which should be filtered.
      It is expected to return numeric value and take no
      arguments.
    ###
    constructor: (@spec, @basicCalculate) ->

    ###
    Return filtered value of @basicCalculate function.
    ###
    calculate: ->
      @basicCalculate()

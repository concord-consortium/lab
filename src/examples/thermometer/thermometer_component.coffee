class Thermometer

  constructor: (@dom_id="#thermometer") ->
    @dom_element = @dom_id
    @d3          = d3.select(@dom_id)
    @max         = 100
    @min         = 0
    @value       = 0

  set_value: (new_value) ->
    @value = new_value
    this.redraw()

  set_max: (new_max) ->
    @max = new_max

  set_min: (new_min) ->
    @min = new_min

  redraw: ->
    @d3.text(@value)

# make this class available globally as Thermometer
root = exports ? this
root.Thermometer = Thermometer

class Thermometer

  constructor: (@model,@dom_id="#thermometer") ->
    @dom_element = @dom_id
    @d3 = d3.select(@dom_id)

  generate_speed_data: ->
    @speed_data = []
    @model.get_speed @speed_data
    @avg_speed = d3.median @speed_data

  redraw: ->
    this.update()

  update: ->
    this.generate_speed_data()
    @d3.text(@avg_speed)

# make this class available globally as Thermometer
root = exports ? this
root.Thermometer = Thermometer

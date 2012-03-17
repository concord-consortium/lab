class Thermometer

  constructor: (@dom_id="#thermometer") ->
    @dom_element = d3.select(@dom_id).attr('class','thermometer')
    @width   = 10
    @height  = 200
    @max     = 0.7
    @samples = []

    @last_draw_time = new Date().getTime()
    @sample_interval_ms = 250
    @last_draw_time -= @sample_interval_ms
    this.init_svg()

  init_svg: ->
    @dom_element.style("border", "1px solid black;")
    @svg = @dom_element.append("svg:svg")
      .attr("width", @width)
      .attr("height",@height)
      .append("svg:g")

    @thermometer = @svg.append('svg:rect')
    @thermometer.attr("width",@width)
    @thermometer.attr("height", @height)
    @thermometer.style("fill","#f4b626")
    d3.select('#therm_text').attr('class','therm_text')

  time_to_redraw: ->
    timestamp = new Date().getTime()
    timestamp > @last_draw_time + @sample_interval_ms

  add_value: (new_value) ->
    @samples.push new_value
    if this.time_to_redraw()
      this.redraw()
      @samples = []

  get_avg: ->
    total = 0
    for sample in @samples
      total = total + sample
    total / @samples.length

  scaled_display_value: ->
    (this.get_avg() / @max) * @height

  redraw: ->
    avg = this.get_avg().toFixed(4)
    value = this.scaled_display_value()
    @thermometer.attr("y", @height - value)
    @thermometer.attr("height",value)
    @last_draw_time = new Date().getTime()
    d3.select('#therm_text').text("Temperature")

# make this class available globally as Thermometer
# use like:
#  meter = new Thermometer();
root = exports ? this
root.Thermometer = Thermometer


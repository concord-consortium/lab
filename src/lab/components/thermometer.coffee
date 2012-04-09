class Thermometer

  constructor: (@dom_id="#thermometer", @max) ->
    @dom_element = $(@dom_id)
    @dom_element.addClass('thermometer')
    @samples = [0]
    @last_draw_time = new Date().getTime()
    @sample_interval_ms = 250
    @last_draw_time -= @sample_interval_ms
    this.init_view()

  init_view: ->
    @width  = @dom_element.width()
    @height = @dom_element.height()
    midpoint = @width/2
    @y1 = @height
    @y2 = 0
    @x1 = @x2 = midpoint
    this.init_thermometer_fill()
    d3.select('#therm_text').attr('class','therm_text')

  init_thermometer_fill: ->
    @thermometer_fill = $('<div>').addClass('thermometer_fill')
    @dom_element.append(@thermometer_fill)
    # @thermometer_fill.addClass('vertical')
    this.redraw()

  set_scaled_value: (v) ->
    results = @value
    results = results * (@max - @min)
    results = results + @min
    results

  scaled_value: ->
    results = @value
    results = results * (@max - @min)
    results = results + @min
    results

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
    @width  = @dom_element.width()
    @height = @dom_element.height()
    midpoint = @width/2
    @y1 = @height
    @y2 = 0
    @x1 = @x2 = midpoint
    avg = this.get_avg().toFixed(4)
    value = this.scaled_display_value()
    # @thermometer_fill.attr("height", value)
    @thermometer_fill.css("bottom", "#{value-@height}px")
    @thermometer_fill.height("#{value}px")
    @last_draw_time = new Date().getTime()
    d3.select('#therm_text').text("Temperature")

# make this class available globally as Thermometer
# use like:
#  meter = new Thermometer();
root = exports ? this
root.Thermometer = Thermometer


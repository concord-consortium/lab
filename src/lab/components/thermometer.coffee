class Thermometer

  constructor: (@dom_id="#thermometer", initial_value, @min, @max) ->
    @dom_element = if typeof @dom_id == "string" then $(@dom_id) else @dom_id
    @dom_element.addClass('thermometer')
    @samples = []
    @samples.push initial_value
    @value = initial_value
    @first_sample = true
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
    # @dom_element.onresize this.resize
    d3.select('#therm_text').attr('class','therm_text')

  init_thermometer_fill: ->
    @thermometer_fill = $('<div>').addClass('thermometer_fill')
    @dom_element.append(@thermometer_fill)
    # @thermometer_fill.addClass('vertical')
    this.redraw()

  resize: =>
    @width  = @dom_element.width()
    @height = @dom_element.height()
    midpoint = @width/2
    @y1 = @height
    @y2 = 0
    @x1 = @x2 = midpoint
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
    @value = new_value
    if this.time_to_redraw() || @first_sample
      @first_sample = false
      this.redraw()
      @samples = []

  get_avg: ->
    if @samples.length > 0
      total = 0
      for sample in @samples
        total = total + sample
      @value = total / @samples.length
    else
      @value

  scaled_display_value: ->
    (this.get_avg() / (@max - @min)) * @height

  redraw: ->
    @width  = @dom_element.width()
    @height = @dom_element.height()
    midpoint = @width/2
    @y1 = @height
    @y2 = 0
    @x1 = @x2 = midpoint
    # avg = this.get_avg().toFixed(4)
    value = this.scaled_display_value()
    @thermometer_fill.css("bottom", "#{value-@height}px")
    @thermometer_fill.height("#{value}px")
    @last_draw_time = new Date().getTime()
    d3.select('#therm_text').text("Temperature")

# make this class available globally as Thermometer
# use like:
#  meter = new Thermometer();
root = exports ? this
root.Thermometer = Thermometer


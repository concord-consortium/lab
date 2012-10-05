define (require) ->

  class Thermometer

    constructor: (@dom_selector="#thermometer", @value, @min, @max) ->
      @dom_element = if typeof @dom_selector is "string" then $(@dom_selector) else @dom_selector
      @dom_element.addClass('thermometer')
      @thermometer_fill = $('<div>').addClass('thermometer_fill')
      @dom_element.append(@thermometer_fill)
      @redraw()

    add_value: (@value) ->
      @redraw()

    # return @value, scaled to 0..1 where 0 corresponds to @min, 1 corresponds to @max
    scaled_value: ->
      (@value - @min) / (@max - @min)

    resize: =>
      @redraw()

    redraw: ->
      @thermometer_fill.height("#{@scaled_value() * @dom_element.height()}px")

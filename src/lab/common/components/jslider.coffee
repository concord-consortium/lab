define (require) ->
  # Dependencies.
  console = require 'common/console'

  class JSliderComponent

    constructor: (@dom_id="#slider", @value_changed_function) ->
      @dom_element = $(@dom_id)
      # use html5 data-attributes to configure components
      @precision   = @dom_element.attr('data-precision') || 3
      @min         = @dom_element.attr('data-min')       || 0
      @max         = @dom_element.attr('data-max')       || 1
      @step        = @dom_element.attr('data-stop')      || 0.01
      @value       = @dom_element.attr('data-value')     || 0.5
      @label       = @dom_element.attr('data-label')
      @label_id    = @dom_element.attr('data-label-id')
      @orientation = @dom_element.attr('data-orientation')  || "horizontal"

      @dom_element.slider()
      this.update_options()

      @dom_element.bind "slide", (event, ui) =>
        console.log "slider value: #{ui.value}"
        this.update_label ui.value
        if @value_changed_function
          @value_changed_function ui.value
      this.update_label @value

    set_max: (max) ->
      @max = max
      this.update_options()

    set_min: (min) ->
      @min = min
      this.update_options()

    update_options: ->
      opts =
        orientation: @orientation
        min: @min
        max: @max
        value: @value
        step: @step
        range: "min"
      @dom_element.slider('option',opts)

    update_label: (value) ->
      if @label_id
        $(@label_id).text("#{@label} #{value}")

define (require) ->
  # Dependencies.
  ButtonComponent = require 'cs!components/button_component'

  class ToggleButtonComponent extends ButtonComponent

    constructor: (@dom_id, _buttons=[]) ->
      super(@dom_id, 'toggle')
      @buttons = []
      for button in _buttons
        this.add_button(button)
      @button_index = 0
      this.enable_button(0)

    add_button: (button) ->
      button.dom_element.remove()
      button.dom_element.css('margin','0px')
      @dom_element.append(button.dom_element)
      @buttons.push button
      this.add_width(button.dom_element)
      this.add_height(button.dom_element)
      self = this
      index = @buttons.length-1
      unless index == @button_index
        this.disable_button(index)

    add_width: (element) ->
      width = @dom_element.width()
      elem_width = element.outerWidth(true)
      if width < elem_width
        @dom_element.width("#{elem_width}px")

    add_height: (element) ->
      height = @dom_element.height()
      elem_height = element.outerHeight(true)
      if height < elem_height
        @dom_element.height("#{elem_height}px")

    disable_button: (index) ->
      button = @buttons[index]
      if button
        button.dom_element.addClass('hidden')

    enable_button: (index) ->
      button = @buttons[index]
      if button
        button.dom_element.removeClass('hidden')

    set_active: (index) ->
      this.disable_button(@button_index)
      @button_index = index
      @button_index = @button_index % @buttons.length
      this.enable_button(@button_index)

    enable_next_button: ->
      this.set_active(@button_index + 1)

    current_button: ->
      if @button_index < @buttons.length
        return @buttons[@button_index]
      return null

    do_action: ->
      if (this.current_button())
        this.current_button().do_action()
        this.enable_next_button()

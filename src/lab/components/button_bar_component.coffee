define (require) ->
  # Dependencies.
  Component = require 'cs!components/component'

  class ButtonBarComponent extends Component

    constructor: (@dom_id, _buttons=[]) ->
      super(@dom_id)
      @dom_element.addClass('button_bar')
      @buttons = []
      @dom_element.width('1px')
      @dom_element.height('1px')
      for button in _buttons
        this.add_button(button)

    # recalculate our size based on #button
    add_button: (button) ->
      elem = button.dom_element
      # elem.css('margin','2px')
      @dom_element.append(elem)
      this.add_width(elem)
      this.add_height(elem)
      @buttons.push button

    add_width: (element) ->
      width = @dom_element.width()
      width = width + element.outerWidth(true)
      @dom_element.width("#{width}px")

    add_height: (element) ->
      height = @dom_element.height()
      elem_height = element.outerHeight(true)
      if height < elem_height
        @dom_element.height("#{elem_height}px")

root = exports ? this
class Component
  constructor: (@dom_id) ->
    if @dom_id
      @dom_element = $(@dom_id)
    else
      @dom_element = $('<div>')
    @dom_element.addClass('component')


class ButtonComponent extends Component
  constructor: (@dom_id,@name='play',@actions = []) ->
    super(@dom_id)
    @dom_element.addClass('button').addClass(@name).addClass('up')
    @state       = 'up'
    this.init_mouse_handlers()

  set_state: (newstate) ->
    @dom_element.removeClass(@state)
    @state = newstate
    @dom_element.addClass(@state)

  init_mouse_handlers: ->
    self = this
    @dom_element.mousedown  (e) =>
      self.set_state "down"

    @dom_element.mouseup =>
      self.set_state "up"
      self.do_action()
    @dom_element.mouseleave =>
      self.set_state "up"

  add_action: (action) ->
    @actions.push action

  do_action: ->
    for action in @actions
      action()

root.ButtonComponent = ButtonComponent


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

root.ToggleButtonComponent = ToggleButtonComponent


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

root.ButtonBarComponent = ButtonBarComponent


class PlaybackBarComponent extends ButtonBarComponent
  constructor: (@dom_id, @playable, simplified=true) ->
    super(@dom_id)
    play = new ButtonComponent(null,'play')
    play.add_action =>
      @playable.play()
    pause = new ButtonComponent(null,'pause')
    pause.add_action =>
      @playable.stop()
    @toggle = new ToggleButtonComponent(null, [play,pause])
    @play_index = 0
    @stop_index = 1
    reset  = new ButtonComponent(null,'reset')
    reset.add_action =>
      @playable.seek(1)
      this.play()
    this.add_button(reset)
    unless simplified
      forward = new ButtonComponent(null,'forward')
      forward.add_action =>
        @playable.forward()
        this.stop()
      this.add_button(forward)
    this.add_button(@toggle)
    unless simplified
      back = new ButtonComponent(null,'back')
      back.add_action =>
        @playable.back()
        this.stop()
      this.add_button(back)
    this.play()

  stop: ->
    @toggle.set_active(@play_index)

  play: ->
    @toggle.set_active(@stop_index)

root.PlaybackBarComponent = PlaybackBarComponent


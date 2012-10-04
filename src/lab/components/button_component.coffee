define (require) ->
  # Dependencies.
  Component = require 'cs!components/component'

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
        self.start_down_ticker()

      @dom_element.mouseup =>
        clearInterval(@ticker)
        self.set_state "up"
        self.do_action()

      @dom_element.mouseleave =>
        clearInterval(@ticker)
        self.set_state "up"

    add_action: (action) ->
      @actions.push action

    do_action: ->
      for action in @actions
        action()

    start_down_ticker: ->
      self = this
      @ticker_count = 0
      @ticker = setInterval ->
        self.do_action()
        self.ticker_count += 1
        if self.ticker_count > 4
          self.do_action()
        if self.ticker_count > 8
          self.do_action()
          self.do_action()
      , 250

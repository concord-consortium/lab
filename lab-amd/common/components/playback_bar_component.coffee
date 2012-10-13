define (require) ->
  # Dependencies.
  ButtonBarComponent = require 'cs!common/components/button_bar_component'

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

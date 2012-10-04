############################################
# The player UI
############################################
define (require) ->
  # Dependencies.
  ModelControllerComponent = require 'cs!components/model_controller_component'

  class PlaybackComponentSVG extends ModelControllerComponent

    setup_buttons: ->

      @reset = this.make_button
        action: 'reset'
        offset: 0

      @back = this.make_button
        action: 'back'
        offset: 1

      @play = this.make_button
        action: 'play'
        offset: 2

      @stop = this.make_button
        action: 'stop'
        offset: 2

      @forward = this.make_button
        action: 'forward'
        offset: 3

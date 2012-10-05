############################################
# The player UI
############################################
define (require) ->
  # Dependencies.
  ModelControllerComponent = require 'cs!common/components/model_controller_component'

  class PlayOnlyComponentSVG extends ModelControllerComponent

    setup_buttons: ->

      @play = this.make_button
        action: 'play'
        offset: 0

      @stop = this.make_button
        action: 'stop'
        offset: 0

############################################
# The player UI
############################################
class PlayResetComponentSVG extends ModelControllerComponent

  setup_buttons: ->

    @reset = this.make_button
      action: 'reset'
      offset: 0

    @play = this.make_button
      action: 'play'
      offset: 1

    @stop = this.make_button
      action: 'stop'
      offset: 1

root = exports ? this
root.PlayResetComponentSVG = PlayResetComponentSVG

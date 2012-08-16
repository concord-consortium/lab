############################################
# The player UI
############################################
class PlayOnlyComponentSVG extends ModelControllerComponent

  setup_buttons: ->

    @play = this.make_button
      action: 'play'
      offset: 0

    @stop = this.make_button
      action: 'stop'
      offset: 0

root = exports ? this
root.PlayOnlyComponentSVG = PlayOnlyComponentSVG

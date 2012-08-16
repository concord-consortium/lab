############################################
# The player UI
############################################
class PlayOnlyComponentSVG extends ModelControllerComponent

  setup_buttons: ->

    @play = this.make_button
      action: 'play'
      offset: 0
      point_set: [[
        {x: 0, y: 0  }
        {x: 1, y: 0.5}
        {x: 0, y: 1  }
      ]]

    @stop = this.make_button
      action: 'stop'
      offset: 0
      point_set: [[
        {x: 0, y: 0  }
        {x: 1, y: 0  }
        {x: 1, y: 1  }
        {x: 0, y: 1  }
        {x: 0, y: 0  }
      ]]

root = exports ? this
root.PlayOnlyComponentSVG = PlayOnlyComponentSVG

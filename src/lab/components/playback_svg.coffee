
############################################
# The player UI
############################################
class PlaybackComponentSVG extends ModelControllerComponent

  setup_buttons: ->

    @reset = this.make_button
      action: 'reset'
      offset: 0
      point_set: [[
        {x: 0,    y: 0}
        {x: 0,    y: 1}
        {x: 1,    y: 1}
        {x: 1,    y: 0}
        {x: 0.25, y: 0}
        {x: 0.5,  y: 0.25}
      ]]

    @back = this.make_button
      action: 'back'
      offset: 1
      point_set: [[
        {x: 0.5, y: 0    }
        {x: 0,   y: 0.5  }
        {x: 0.5, y: 1    }
      ],[
        {x: 1  , y: 0    }
        {x: 0.5, y: 0.5  }
        {x: 1,   y: 1    }
      ]]

    @play = this.make_button
      action: 'play'
      offset: 2
      point_set: [[
        {x: 0, y: 0  }
        {x: 1, y: 0.5}
        {x: 0, y: 1  }
      ]]

    @stop = this.make_button
      action: 'stop'
      offset: 2
      point_set: [[
        {x: 0, y: 0  }
        {x: 1, y: 0  }
        {x: 1, y: 1  }
        {x: 0, y: 1  }
        {x: 0, y: 0  }
      ]]

    @forward = this.make_button
      action: 'forward'
      offset: 3
      point_set: [[
        {x: 0.5, y: 0    }
        {x: 1,   y: 0.5  }
        {x: 0.5, y: 1    }
      ], [
        {x: 0,   y: 0    }
        {x: 0.5, y: 0.5  }
        {x: 0,   y: 1    }
      ]]

root = exports ? this
root.PlaybackComponentSVG = PlaybackComponentSVG

############################################
# The player UI
############################################
class PlaybackComponentSVG extends ModelControllerComponent
  # playable must accept play(), stop(), forward(), back(), and seek(0..1)
  constructor: (@svg_element,@playable = null, xpos, ypos, scale) ->
    @offsets      = {'reset': 0, 'back': 1, 'play': 2, 'stop': 2, 'forward': 3}
    super(@svg_element,@playable, xpos, ypos, scale)

  # <-
  init_reset_button: ->
    points = [[
      {x: 0,    y: 0},
      {x: 0,    y: 1},
      {x: 1,    y: 1},
      {x: 1,    y: 0},
      {x: 0.25, y: 0},
      {x: 0.5,  y: 0.25}
    ]]
    @reset = this.make_button('reset', 'svg:polyline', points)

  # |>
  init_play_button: ->
    points = [[
      {x: 0, y: 0  },
      {x: 1, y: 0.5},
      {x: 0, y: 1  }
    ]]
    @play = this.make_button('play', 'svg:polygon', points)

  # []
  init_stop_button: ->
    points = [[
      {x: 0, y: 0  },
      {x: 1, y: 0  },
      {x: 1, y: 1  },
      {x: 0, y: 1  },
      {x: 0, y: 0  }
    ]]
    @stop = this.make_button('stop', 'svg:polygon', points)

  # ||
  init_pause_button: ->
    points = [[
      {x: .5, y: .5  },
      {x: .5, y: 0  },
      {x: .5, y: 1  },
      {x: 0, y: 1  },
      {x: 0, y: 0  }
    ]]
    @pause = this.make_button('pause', 'svg:polygon', points)

  # <<
  init_back_button:  ->
    points = [[
      {x: 0.5, y: 0    },
      {x: 0,   y: 0.5  },
      {x: 0.5, y: 1    }
    ],[
      {x: 1  , y: 0    },
      {x: 0.5, y: 0.5  },
      {x: 1,   y: 1    }
    ]]
    @back = this.make_button('back', 'svg:polyline', points)

  # >>
  init_forward_button: ->
    points = [[
      {x: 0.5, y: 0    },
      {x: 1,   y: 0.5  },
      {x: 0.5, y: 1    }
    ], [
      {x: 0,   y: 0    },
      {x: 0.5, y: 0.5  },
      {x: 0,   y: 1    }
    ]]
    @forward = this.make_button('forward','svg:polyline', points)

  init_view: ->
    @svg = @svg_element.append("svg:svg")
      .attr("class", "component model-controller playbacksvg")
        .attr("x", @xpos)
        .attr("y", @ypos);

    @group = @svg.append("g")
        .attr("transform", "scale(" + @scale + "," + @scale + ")")
        .attr("width", @width)
        .attr("height",@height);

    this.init_reset_button()
    this.init_back_button()
    this.init_play_button()
    this.init_stop_button()
    this.init_forward_button()
    if @playable.playing
      this.hide(@play)
    else
      this.hide(@stop)

# these next lines make the classes available on the window.
# use like this:
#  player  = new ModelPlayer(model);
#  playback = new PlaybackComponentSVG(@svg_element,player xpos, ypos);
#  appends SVG plaback controller into @svg_element and positions it
root = exports ? this
root.PlaybackComponentSVG = PlaybackComponentSVG

class ModelPlayer
  constructor: (@model)->
  play: ->
  stop: ->
  foward: ->
  back:   ->
  seek: (float_index) ->


class PlaybackComponent
  # playable must accept play(), stop(), forward(), back(), and seek(0..1)
  constructor: (@dom_id="#playback",@playable = null) ->
    @dom_element = d3.select(@dom_id)
    @offsets      = {'reset': 0, 'back': 1, 'play': 2, 'stop': 2, 'forward': 3}
    @width       = parseInt(@dom_element.style("width"))
    @height      = parseInt(@dom_element.style("height"))
    @unit_width  = @width / 9
    if (@height < @unit_width)
      @height = @unit_width + 2
      @dom_element.style("height", @height)

    @vertical_padding = (@height - @unit_width) / 2
    @stroke_width= @unit_width / 10
    @handle_size = 5
    @label       = @dom_element.attr('data-label')     || "playback button"

    @mouse_down  = false
    this.init_view()

  # return pixel offset of button (key)
  offset: (key) ->
    return @offsets[key] * (@unit_width * 2)  + @unit_width

  common_attributes: (elem) ->
    elem.attr('stroke', '#000')
    elem.attr('fill','none')
    elem.attr('stroke-width',@stroke_width)
    elem.attr('linecap','round')
    elem.attr('line-join','round')

  setup_button: (button, button_name, points) ->
    points_string = ""
    for point in points
      x = this.offset(button_name) + (point['x'] * @unit_width)
      y = point['y'] * @unit_width + @vertical_padding
      points_string = points_string + " #{x},#{y}"
    button.attr('points',points_string)
    this.common_attributes(button)

  # |>
  init_play_button: ->
    @play_button = @svg.append('svg:polygon')
    points = [
      {x: 0, y: 0  },
      {x: 1, y: 0.5},
      {x: 0, y: 1  }
    ]
    this.setup_button(@play_button,'play',points)

  # []
  init_stop_button: ->
    @stop_button= @svg.append('svg:polygon')
    points = [
      {x: 0, y: 0  },
      {x: 1, y: 0  },
      {x: 1, y: 1  },
      {x: 0, y: 1  }
    ]
    this.setup_button(@stop_button,'stop',points)

  # <<
  init_back_button:  ->
    @back = @svg.append('svg:g')
    @back.attr('class','back')
    a = @back.append('svg:polyline')
    points = [
      {x: 0.5, y: 0    },
      {x: 0,   y: 0.5  },
      {x: 0.5, y: 1    }
    ]
    this.setup_button(a, 'back',points)
    b = @back.append('svg:polyline')
    points = [
      {x: 1  , y: 0    },
      {x: 0.5, y: 0.5  },
      {x: 1,   y: 1    }
    ]
    this.setup_button(b,'back',points)
  
  # >>
  init_forward_button: ->
    @forward = @svg.append('svg:g')
    a = @forward.append('svg:polyline')
    b = @forward.append('svg:polyline')
    points = [
      {x: 0,   y: 0    },
      {x: 0.5, y: 0.5  },
      {x: 0,   y: 1    }
    ]
    this.setup_button(a,'forward',points)
    points = [
      {x: 0.5, y: 0    },
      {x: 1,   y: 0.5  },
      {x: 0.5, y: 1    }
    ]
    this.setup_button(b,'forward',points)

  init_view: ->
    @svg = @dom_element.append("svg:svg")
      .attr("width", @width)
      .attr("height",@height)
    this.init_play_button()
    # this.init_stop_button()
    this.init_forward_button()
    this.init_back_button()

# make this class available globally as PlaybackComponent
# use like this:
#  playback = new PlaybackComponent();
root = exports ? this
root.PlaybackComponent = PlaybackComponent


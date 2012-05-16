############################################
# A simplistic player-wrapper for the model
############################################
class ModelPlayer
  constructor: (@model, playing)->
    if (arguments.length > 1)
      @playing = playing
    else
      @playing = true

  play: ->
    @model.resume()
    @playing = true

  stop: ->
    @model.stop()
    @playing = false

  forward: ->
    this.stop()
    @model.stepForward()

  back: ->
    this.stop()
    @model.stepBack()

  seek: (float_index) ->
    this.stop()
    @model.seek(float_index)

############################################
# The player UI
############################################
class PlaybackComponent
  # playable must accept play(), stop(), forward(), back(), and seek(0..1)
  constructor: (@dom_id="#playback",@playable = null) ->
    @dom_element  = d3.select(@dom_id).attr('class','component playback')
    @offsets      = {'reset': 0, 'back': 1, 'play': 2, 'stop': 2, 'forward': 3}
    @width        = parseInt(@dom_element.style("width"))
    @height       = parseInt(@dom_element.style("height"))
    @unit_width   = @width / 9
    if (@height < @unit_width)
      @height = @unit_width + 2
      @dom_element.style("height", @height + "px")

    @vertical_padding = (@height - @unit_width) / 2
    @stroke_width     = @unit_width / 10
    this.init_view()

  # return pixel offset of button (key)
  offset: (key) ->
    return @offsets[key] * (@unit_width * 2)  + @unit_width

  # TODO: make a button class
  make_button: (button_name, type, point_set) ->
    button_group = @svg.append('svg:g')
    x = this.offset(button_name)
    button_group.attr('x', x)
      .attr('y',@vertical_padding)
      .attr('width',@unit_width)
      .attr('height',@unit_width)
    for points in point_set
      art = button_group.append(type)
      art.attr('class', "#{button_name} button-art")
      points_string = ""
      for point in points
        x = this.offset(button_name) + point['x'] * @unit_width
        y = @vertical_padding + point['y'] * @unit_width
        points_string = points_string + " #{x},#{y}"
        art.attr('points',points_string)
    button_group.on 'click',  => this.action(button_name)
    return button_group

  action: (action)->
    console.log("running #{action} ")
    if @playable
      switch action
        when 'play'    then @playable.play()
        when 'stop'    then @playable.stop()
        when 'forward' then @playable.forward()
        when 'back'    then @playable.back()
        when 'reset'   then @playable.seek(1)
        else console.log("cant find action for #{action}")
    else console.log("no @playable defined")
    this.update_ui()


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
    @svg = @dom_element.append("svg:svg")
      .attr("width", @width)
      .attr("height",@height)
    this.init_reset_button()
    this.init_play_button()
    this.init_stop_button()
    this.init_forward_button()
    this.init_back_button()
    this.hide(@play)

  update_ui: ->
    if @playable
      if @playable.playing
        this.hide(@play)
        this.show(@stop)
      else
        this.hide(@stop)
        this.show(@play)

  hide: (thing) ->
    thing.style('visibility', 'hidden')
  show: (thing) ->
    thing.style('visibility', 'visible')

# these next lines make the classes available on the window.
# use like this:
#  player  = new ModelPlayer(model);
#  playback = new PlaybackComponent('#domid',player);
root = exports ? this
root.PlaybackComponent = PlaybackComponent
root.ModelPlayer = ModelPlayer

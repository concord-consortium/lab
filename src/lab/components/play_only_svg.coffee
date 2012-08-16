############################################
# The player UI
############################################
class PlayOnlyComponentSVG
  # playable must accept play(), stop(), forward(), back(), and seek(0..1)
  constructor: (@svg_element,@playable = null, xpos, ypos, scale) ->
    @offsets      = {'play': 1, 'stop': 1}
    @width        = 200
    @height       = 34
    @xpos         = xpos
    @ypos         = ypos
    @scale        = scale || 1
    @unit_width   = @width / 9

    @vertical_padding = (@height - @unit_width) / 2
    @stroke_width     = @unit_width / 10
    this.init_view()

  # return pixel offset of button (key)
  offset: (key) ->
    return @offsets[key] * (@unit_width * 2)  + @unit_width

  # TODO: make a button class
  make_button: (button_name, type, point_set) ->
    button_group = @group.append('svg:g')
    x = this.offset(button_name)
    button_group
      .attr("class", "component playbacksvgbutton")
      .attr('x', x)
      .attr('y',@vertical_padding)
      .attr('width',@unit_width)
      .attr('height',@unit_width*2)
      .attr('style','fill: #cccccc')
    # button background
    button_bg = button_group.append('rect')
    button_bg.attr('class', 'bg')
      .attr('x', this.offset(button_name)/1.20)
      .attr('y', @vertical_padding/3)
      .attr('width', @unit_width*2)
      .attr('height', @unit_width*1.5)
      .attr('rx', '0')
    # button symbol
    for points in point_set
      art = button_group.append(type)
      art.attr('class', "#{button_name} button-art")
      points_string = ""
      for point in points
        x = this.offset(button_name) + point['x'] * @unit_width
        y = @vertical_padding/.75 + point['y'] * @unit_width
        points_string = points_string + " #{x},#{y}"
        art.attr('points',points_string)
      if button_name == 'stop'
        art2 = button_group.append('rect')
        art2.attr('class','pause-center')
          .attr('x',x + @unit_width/3)
          .attr('y',@vertical_padding/.75-1)
          .attr('width',@unit_width/3)
          .attr('height',@unit_width+2)
    # button highlight
    button_highlight = button_group.append('rect')
    button_highlight.attr('class', 'highlight')
      .attr('x', this.offset(button_name)/1.20+1)
      .attr('y', @vertical_padding/1.85)
      .attr('width', @unit_width*2-2)
      .attr('height', @unit_width/1.4)
      .attr('rx', '0')
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

  init_view: ->
    @svg = @svg_element.append("svg:svg")
      .attr("class", "component model-controller playbacksvg")
      .attr("x", @xpos)
      .attr("y", @ypos);

    @group = @svg.append("g")
        .attr("transform", "scale(" + @scale + "," + @scale + ")")
        .attr("width", @width)
        .attr("height",@height);

    this.init_play_button()
    this.init_stop_button()
    if @playable.playing
      this.hide(@play)
    else
      this.hide(@stop)

  position: (xpos, ypos, scale) ->
    @xpos = xpos
    @ypos = ypos
    @scale = scale || 1
    @svg.attr("x", @xpos).attr("y", @ypos)

    @group.attr("transform", "scale(" + @scale + "," + @scale + ")")
      .attr("width", @width)
      .attr("height",@height);

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
#  playback = new PlayOnlyComponentSVG(@svg_element,player xpos, ypos);
#  appends SVG plaback controller into @svg_element and positions it
root = exports ? this
root.PlayOnlyComponentSVG = PlayOnlyComponentSVG
root.ModelPlayer = ModelPlayer

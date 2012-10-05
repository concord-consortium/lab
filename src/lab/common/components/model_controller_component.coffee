############################################
# The player UI
############################################
define (require) ->

  class ModelControllerComponent

    # playable must accept play(), stop(), forward(), back(), and seek(0..1)
    constructor: (@svg_element,@playable = null, xpos, ypos, scale) ->
      @width        = 200
      @height       = 34
      @xpos         = xpos
      @ypos         = ypos
      @scale        = scale || 1
      @unit_width   = @width / 9

      @vertical_padding = (@height - @unit_width) / 2
      @stroke_width     = @unit_width / 10

      this.init_view()
      this.setup_buttons()

      if @playable.isPlaying()
        this.hide(@play)
      else
        this.hide(@stop)


      model.on 'play', => this.update_ui()
      model.on 'stop', => this.update_ui()

    # return pixel offset of button (key)
    offset: (offset) ->
      return offset * (@unit_width * 2)  + @unit_width

    # overwrite this function to define buttons
    setup_buttons: ->

    # TODO: make a button class
    make_button: ({action, offset, type, point_set}) ->
      type ?= "svg:polyline"
      point_set ?= @icon_shapes[action]
      offset = this.offset(offset)

      button_group = @group.append('svg:g')
      button_group
        .attr("class", "component playbacksvgbutton")
        .attr('x', offset)
        .attr('y',@vertical_padding)
        .attr('width',@unit_width)
        .attr('height',@unit_width*2)
        .attr('style','fill: #cccccc')
      # button background
      button_bg = button_group.append('rect')
      button_bg.attr('class', 'bg')
        .attr('x', offset)
        .attr('y', @vertical_padding/3)
        .attr('width', @unit_width*2)
        .attr('height', @unit_width*1.5)
        .attr('rx', '0')
      # button symbol
      for points in point_set
        art = button_group.append(type)
        art.attr('class', "#{action} button-art")
        points_string = ""
        for point in points
          x = offset + 10 + point['x'] * @unit_width
          y = @vertical_padding/.75 + point['y'] * @unit_width
          points_string = points_string + " #{x},#{y}"
          art.attr('points',points_string)
        if action == 'stop'
          art2 = button_group.append('rect')
          art2.attr('class','pause-center')
            .attr('x',x + @unit_width/3)
            .attr('y',@vertical_padding/.75-1)
            .attr('width',@unit_width/3)
            .attr('height',@unit_width+2)
      # button highlight
      button_highlight = button_group.append('rect')
      button_highlight.attr('class', 'highlight')
        .attr('x', offset + 1)
        .attr('y', @vertical_padding/1.85)
        .attr('width', @unit_width*2-2)
        .attr('height', @unit_width/1.4)
        .attr('rx', '0')
      button_group.on 'click',  => this.action(action)
      return button_group

    action: (action)->
      console.log("running #{action} ")
      if @playable
        switch action
          when 'play'    then @playable.play()
          when 'stop'    then @playable.stop()
          when 'forward' then @playable.forward()
          when 'back'    then @playable.back()
          when 'seek'    then @playable.seek(1)
          when 'reset'   then @playable.reset()
          else console.log("cant find action for #{action}")
      else console.log("no @playable defined")
      this.update_ui()

    init_view: ->
      @svg = @svg_element.append("svg:svg")
        .attr("class", "component model-controller playbacksvg")
        .attr("x", @xpos)
        .attr("y", @ypos);

      @group = @svg.append("g")
          .attr("transform", "scale(" + @scale + "," + @scale + ")")
          .attr("width", @width)
          .attr("height",@height);

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
        if @playable.isPlaying()
          this.hide(@play)
          this.show(@stop)
        else
          this.hide(@stop)
          this.show(@play)

    hide: (thing) ->
      thing.style('visibility', 'hidden')
    show: (thing) ->
      thing.style('visibility', 'visible')

    icon_shapes:
      play: [[
          {x: 0, y: 0  }
          {x: 1, y: 0.5}
          {x: 0, y: 1  }
        ]]
      stop: [[
          {x: 0, y: 0  }
          {x: 1, y: 0  }
          {x: 1, y: 1  }
          {x: 0, y: 1  }
          {x: 0, y: 0  }
        ]]
      reset: [[
          {x: 1  , y: 0    }
          {x: 0.3, y: 0.5  }
          {x: 1,   y: 1    }
        ], [
          {x: 0, y: 0  }
          {x: 0.3, y: 0  }
          {x: 0.3, y: 1  }
          {x: 0, y: 1  }
          {x: 0, y: 0  }
        ]]
      back: [[
          {x: 0.5, y: 0    }
          {x: 0,   y: 0.5  }
          {x: 0.5, y: 1    }
        ],[
          {x: 1  , y: 0    }
          {x: 0.5, y: 0.5  }
          {x: 1,   y: 1    }
        ]]
      forward: [[
          {x: 0.5, y: 0    }
          {x: 1,   y: 0.5  }
          {x: 0.5, y: 1    }
        ], [
          {x: 0,   y: 0    }
          {x: 0.5, y: 0.5  }
          {x: 0,   y: 1    }
        ]]

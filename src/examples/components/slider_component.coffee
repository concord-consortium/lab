class SliderComponent

  constructor: (@dom_id="#slider", @value_changed_function, @max=1, @min=0) ->
    @dom_element = d3.select(@dom_id)

    # TODO: better to use jquery?
    @width   = parseInt(@dom_element.style("width"))
    @height  = parseInt(@dom_element.style("height"))
    @handle_size = 5
    @mouse_down = false
    this.init_view()
    this.init_mouse_handlers()
    @value = 0.5

  horizontal_orientation: ->
    true if @width > @height

  init_view: ->
    @svg = @dom_element.append("svg:svg")
      .attr("width", @width)
      .attr("height",@height)
      .style("margin","0px")
      .style("padding","0px")
    if this.horizontal_orientation()
      midpoint = @height/2
      @y1 = @y2 = midpoint
      @x1 = 0
      @x2 = @width
    else
      midpoint = @width/2
      @y1 = @height
      @y2 = 0
      @x1 = @x2 = midpoint

    @handle_y = (@y1 + @y2) / 2
    @handle_x = (@x1 + @x2) / 2

    @filled_rect = @svg.append('svg:rect')
    if this.horizontal_orientation()
      @filled_rect
        .attr("x",0)
        .attr("y",0)
        .attr("width", @handle_x)
        .attr("height",@height)
    else
      @filled_rect
        .attr("x",0)
        .attr("y",@handle_y)
        .attr("width", @width)
        .attr("height",@height - @handle_y)

    @handle = @svg.append('svg:circle')
    @handle
      .attr("cx",@handle_x)
      .attr("cy",@handle_y)
      .attr("r", @handle_size)

  clip_mouse: ->
    mouse = d3.svg.mouse(@svg.node())
    mx = mouse[0]
    my = mouse[1]
    { x: mx, y: my}

  scaled_value: ->
    results = @value
    results = results * (@max - @min)
    results = results + @min
    results

  handle_drag: ->
    if this.horizontal_orientation()
      @handle_x = this.clip_mouse().x
      @handle.attr('cx',@handle_x)
      @filled_rect.attr('width',@handle_x)
      @value = @handle_x / @width
    else
      @handle_y = this.clip_mouse().y
      @handle.attr('cy',@handle_y)
      @filled_rect
        .attr("y",@handle_y)
        .attr("height",@height - @handle_y)
      @value = @handle_y / @height
    if (typeof @value_changed_function == 'function')
      @value_changed_function(this.scaled_value())

  init_mouse_handlers: ->
    self = this
    @svg.on "mousedown", =>
      self.handle_drag()
      self.mousedown = true

    @svg.on "mousemove", =>
      if self.mousedown
        self.handle_drag()

    @svg.on "mouseup", =>
      self.mousedown = false

# make this class available globally as SliderComponent
# use like this:
#  slider = new SliderComponent();
root = exports ? this
root.SliderComponent = SliderComponent



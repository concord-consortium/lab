class SliderComponent

  constructor: (@dom_id="#slider", @value_changed_function) ->
    @dom_element = $(@dom_id)
    @dom_element.addClass('component').addClass('slider')

    
    # use html5 data-attributes to configure components
    @precision   = @dom_element.attr('data-precision') || 3
    @min         = @dom_element.attr('data-min')       || 0
    @max         = @dom_element.attr('data-max')       || 1
    @value       = @dom_element.attr('data-value')     || 0.5
    @label       = @dom_element.attr('data-label')

    @mouse_down  = false

    @width       = @dom_element.width()
    @height      = @dom_element.height()

    this.init_view()
    this.init_mouse_handlers()

  horizontal_orientation: ->
    true if @width > @height

  init_view: ->
    @slider_well = $('<div>').addClass('slider_well')
    @dom_element.append(@slider_well)
    midpoint = @width/2
    @y1 = @height
    @y2 = 0
    @x1 = @x2 = midpoint
    if this.horizontal_orientation()
      midpoint = @height/4 
      @y1 = @y2 = midpoint
      @x1 = 0
      @x2 = @width

    @handle_y = (@y1 + @y2) / 2
    @handle_x = (@x1 + @x2) / 2
    this.init_slider_fill()
    this.init_handle()
    this.init_label()

  init_slider_fill: ->
    @slider_fill = $('<div>').addClass('slider_fill')
    @slider_well.append(@slider_fill)
    if this.horizontal_orientation()
      @slider_fill.addClass('horizontal')
    else
      @slider_fill.addClass('vertical')
    this.update_slider_filled()

  update_slider_filled: ->
    if this.horizontal_orientation()
      @slider_fill.width("#{@handle_x}px")
    else
      @slider_fill.height("#{@handle_y}px")

  init_handle: ->
    @handle = $('<div>')
      .addClass('handle')
    @slider_well.append(@handle)
    @handle_width  = parseInt(@handle.width())
    @handle_height = parseInt(@handle.height())
    this.update_handle()

  update_handle: ->
    @handle
      .css('left',"#{@handle_x - (@handle_width /2) }px")
      .css('top', "#{@handle_y - (@handle_height/2) }px")

  init_label: ->
    @text_label = $('<div/>')
      .addClass('label')
    @dom_element.append(@text_label)
    this.update_label()

  scaled_value: ->
    results = @value
    results = results * (@max - @min)
    results = results + @min
    results

  update_label: ->
    if @label
      fomatted_value = this.scaled_value().toFixed(@precision)
      @text_label.text("#{@label}: #{fomatted_value}")
    else
      @text_label.hide()
  handle_drag: (e)->
    x = e.pageX - @slider_well.position().left
    y = e.pageY - @slider_well.position().top

    if this.horizontal_orientation()
      max_x = @width - (@handle_width /4)
      min_x = @handle_width / 4
      @handle_x = x
      @handle_x = min_x if @handle_x < min_x
      @handle_x = max_x if @handle_x > max_x
      @value = @handle_x / @width
    else
      @handle_y = e.y
      @handle.attr('cy',@handle_y)
      @slider_fill
        .attr("y",@handle_y)
        .attr("height",@height - @handle_y)
      @value = @handle_y / @height
    if (typeof @value_changed_function == 'function')
      @value_changed_function(this.scaled_value())
    
    this.update_handle()
    this.update_slider_filled()
    this.update_label()


  init_mouse_handlers: ->
    self = this
    @slider_well.mousedown  (e) =>
      self.handle_drag(e)
      self.mousedown = true
    
    @slider_well.mousemove (e) =>
      if self.mousedown
        self.handle_drag(e)

    @slider_well.mouseup =>
      self.mousedown = false
    
    @slider_well.mouseleave =>
      self.mousedown = false

# make this class available globally as SliderComponent
# use like this:
#  slider = new SliderComponent();
root = exports ? this
root.SliderComponent = SliderComponent



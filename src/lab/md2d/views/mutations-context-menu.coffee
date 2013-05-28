###
Simple module which provides mutations context menu for DNA nucleotides.

CSS style definition: sass/lab/_context-menu.sass
###
define (require) ->

  ###
  Registers context menu for DOM elements defined by @selector.
  @model should be an instance of Modeler class (MD2D Modeler).
  @DNAComplement indicates whether this menu is registered for
  DNA or DNA complementary strand.
  ###
  register: (selector, model, DNAComplement) ->
    # Unregister the same menu first.
    $.contextMenu "destroy", selector
    # Register new one.
    $.contextMenu
      # Selector defines DOM elements which can trigger this menu.
      selector: selector
      # Append to "#responsive-content" to enable dynamic font-scaling.
      appendTo: "#responsive-content"
      # Class of the menu.
      className: "mutations-menu lab-contextmenu"
      # Disable animation of the whole menu. Use standard show/hide instead
      # of slideDown/slideUp.
      animation:
        show: "show"
        hide: "hide"
      # Default callback for every item.
      callback: (key, options) ->
        # Get nucleotide type
        d = d3.select(options.$trigger[0]).datum()
        # Mutate
        model.geneticEngine().mutate(d.idx, key, DNAComplement);

      # Note that this function is almost the same as the default implementation
      # in jQuery.contextMenu. However, there is a small fix. Very often the height of menu was
      # reported incorrectly what was causing incorrect positioning.
      # For example menu was rendered at the bottom of the screen and truncated or scrollbars were needed,
      # when there was a lot of free place above.
      position: (opt, x, y) ->
        $win = $(window)
        # determine contextMenu position
        if !x && !y
          opt.determinePosition.call this, opt.$menu
          return
        else if x == "maintain" && y == "maintain"
          # x and y must not be changed (after re-show on command click)
          offset = opt.$menu.position();
        else
          # x and y are given (by mouse event)
          triggerIsFixed = opt.$trigger.parents().andSelf()
            .filter ->
              return $(this).css('position') == "fixed";
            .length

          if triggerIsFixed
            y -= $win.scrollTop()
            x -= $win.scrollLeft()

          offset = top: y, left: x

        # correct offset if viewport demands it
        bottom = $win.scrollTop() + $win.height()
        right = $win.scrollLeft() + $win.width()

        ###
        !!! Workaround for the correct positioning:
        Use scrollHeight / scrollWidth as these functions return correct height / width
        in contrast to opt.$menu.height() / opt.$menu.width().
        ###
        height = opt.$menu[0].scrollHeight
        width = opt.$menu[0].scrollWidth

        if offset.top + height > bottom
          offset.top -= height

        if offset.left + width > right
          offset.left -= width

        # Increase offset to prevent accidental clicks.
        offset.left += 1
        opt.$menu.css(offset)

      items:
        "A": name: "-> A"
        "T": name: "-> T"
        "G": name: "-> G"
        "C": name: "-> C"
###
Simple module which provides context menu for amino acids. It allows
to dynamically change type of amino acids in a convenient way.
It uses jQuery.contextMenu plug-in.

CSS style definition: sass/lab/_context-menu.sass
###
define (require) ->

  aminoacids = require 'cs!models/md2d/models/aminoacids-helper'

  # Classes for styling. Note that CSS is used for styling, see header.
  MENU_CLASS = "aminoacids-menu"
  HYDROPHOBIC_CLASS = "hydrophobic"
  HYDROPHOBIC_CAT_CLASS = "hydrophobic-category"
  HYDROPHILIC_CLASS = "hydrophilic"
  HYDROPHILIC_CAT_CLASS = "hydrophilic-category"
  POS_CHARGE_CLASS = "pos-charge"
  NEG_CHARGE_CLASS = "neg-charge"
  MARKED_CLASS = "marked"

  # Shows given category.
  showCategory = (type, animate) ->
    func =
      show: if animate then "slideDown" else "show"
      hide: if animate then "slideUp" else "hide"
    if type == "hydrophobic"
      $(".#{HYDROPHOBIC_CLASS}")[func.show]()
      $(".#{HYDROPHILIC_CLASS}")[func.hide]()
      $(".#{HYDROPHOBIC_CAT_CLASS}").addClass "expanded"
      $(".#{HYDROPHILIC_CAT_CLASS}").removeClass "expanded"
    else
      $(".#{HYDROPHOBIC_CLASS}")[func.hide]()
      $(".#{HYDROPHILIC_CLASS}")[func.show]()
      $(".#{HYDROPHOBIC_CAT_CLASS}").removeClass "expanded"
      $(".#{HYDROPHILIC_CAT_CLASS}").addClass "expanded"

  ###
  Register context menu for DOM elements defined by @selector.
  @model, @view are associated model and view, used to set
  properties and redraw view.
  ###
  register: (model, view, selector) ->
    # Unregister the same menu first.
    $.contextMenu "destroy", selector
    # Register new one.
    $.contextMenu
      # Selector defines DOM elements which can trigger this menu.
      selector: selector
      # Append to "#responsive-content" to enable dynamic font-scaling.
      appendTo: "#responsive-content"
      # Class of the menu.
      className: MENU_CLASS
      # Disable animation of the whole menu. Use standard show/hide instead
      # of slideDown/slideUp.
      animation:
        show: "show"
        hide: "hide"
      # Default callback for every item.
      callback: (key, options) ->
        # Get properties of atom representing amino acid.
        props = d3.select(options.$trigger[0]).datum()
        # Remove current selection. It won't be handled by events.#hide callback defined below,
        # because we modify element property. Also, do not setup new selection, as it makes
        # no sense - after click the menu is hidden.
        marked = aminoacids.getAminoAcidByElement(props.element).abbreviation
        options.items[marked].$node.removeClass MARKED_CLASS
        # Translate abbreviation to element ID.
        elemId = aminoacids.abbrToElement key
        # Set amino acid type.
        model.setAtomProperties props.idx, element: elemId
        # Redraw view.
        # TODO: model should dispatch appropriate event, which should trigger repaint automatically.
        view.repaint()

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

      events:
        # Mark currently selected AA type.
        show: (options) ->
          props = d3.select(options.$trigger[0]).datum()
          key = aminoacids.getAminoAcidByElement(props.element).abbreviation
          $node = options.items[key].$node
          $node.addClass MARKED_CLASS
          if $node.hasClass HYDROPHOBIC_CLASS
            showCategory "hydrophobic"
          else
            showCategory "hydrophilic"
          # Ensure that this callback returns true (required to show menu).
          true

        # Remove marker added above.
        hide: (options) ->
          props = d3.select(options.$trigger[0]).datum()
          key = aminoacids.getAminoAcidByElement(props.element).abbreviation
          options.items[key].$node.removeClass MARKED_CLASS
          # Ensure that this callback returns true (required to hide menu).
          true

      items:
        # Category header.
        "Hydrophobic": name: "Hydrophobic", className: "#{HYDROPHOBIC_CAT_CLASS}", callback: ->
          showCategory "hydrophobic", true
          # Return false to prevent menu from being hidden.
          false
        # Items below use default callback.
        "Gly": name: "Glycine", className: "#{HYDROPHOBIC_CLASS}"
        "Ala": name: "Alanine", className: "#{HYDROPHOBIC_CLASS}"
        "Val": name: "Valine", className: "#{HYDROPHOBIC_CLASS}"
        "Leu": name: "Leucine", className: "#{HYDROPHOBIC_CLASS}"
        "Ile": name: "Isoleucine", className: "#{HYDROPHOBIC_CLASS}"
        "Phe": name: "Phenylalanine", className: "#{HYDROPHOBIC_CLASS}"
        "Pro": name: "Proline", className: "#{HYDROPHOBIC_CLASS}"
        "Trp": name: "Tryptophan", className: "#{HYDROPHOBIC_CLASS}"
        "Met": name: "Methionine", className: "#{HYDROPHOBIC_CLASS}"
        "Cys": name: "Cysteine", className: "#{HYDROPHOBIC_CLASS}"
        "Tyr": name: "Tyrosine", className: "#{HYDROPHOBIC_CLASS}"
        # Category header.
        "Hydrophilic": name: "Hydrophilic", className: "#{HYDROPHILIC_CAT_CLASS}", callback: ->
          showCategory "hydrophilic", true
          # Return false to prevent menu from being hidden.
          false
        # Items below use default callback.
        "Asn": name: "Asparagine", className: "#{HYDROPHILIC_CLASS}"
        "Gln": name: "Glutamine", className: "#{HYDROPHILIC_CLASS}"
        "Ser": name: "Serine", className: "#{HYDROPHILIC_CLASS}"
        "Thr": name: "Threonine", className: "#{HYDROPHILIC_CLASS}"
        "Asp": name: "Asparticacid", className: "#{HYDROPHILIC_CLASS} #{NEG_CHARGE_CLASS}"
        "Glu": name: "Glutamicacid", className: "#{HYDROPHILIC_CLASS} #{NEG_CHARGE_CLASS}"
        "Lys": name: "Lysine", className: "#{HYDROPHILIC_CLASS} #{POS_CHARGE_CLASS}"
        "Arg": name: "Arginine", className: "#{HYDROPHILIC_CLASS} #{POS_CHARGE_CLASS}"
        "His": name: "Histidine", className: "#{HYDROPHILIC_CLASS} #{POS_CHARGE_CLASS}"

    # Initially show only one category (longer) to ensure that menu has a real-life height.
    # It can be useful for determining of position.
    showCategory "hydrophobic"
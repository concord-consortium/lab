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
  properties and redraw view. @getClickedAtom should return data
  of the clicked atom.
  ###
  register: (model, view, selector, getClickedAtom) ->
    i18n = view.i18n
    # Unregister the same menu first.
    $.contextMenu "destroy", selector
    # Register new one.
    $.contextMenu
      # Selector defines DOM elements which can trigger this menu.
      selector: selector
      # Append to ".lab-responsive-content" to enable dynamic font-scaling.
      appendTo: ".lab-responsive-content"
      # Class of the menu.
      className: MENU_CLASS
      # Disable animation of the whole menu. Use standard show/hide instead
      # of slideDown/slideUp.
      animation:
        show: "show"
        hide: "hide"
      # Left click.
      trigger: "left"
      # Default callback for every item.
      callback: (key, options) ->
        # Get properties of atom representing amino acid.
        props = getClickedAtom()
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
          props = getClickedAtom()
          if !props
            return false

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
          props = getClickedAtom()
          key = aminoacids.getAminoAcidByElement(props.element).abbreviation
          options.items[key].$node.removeClass MARKED_CLASS
          # Ensure that this callback returns true (required to hide menu).
          true

      items:
        # Category header.
        "Hydrophobic": name: i18n.t("aminoacid_menu.hydrophobic"), className: "#{HYDROPHOBIC_CAT_CLASS}", callback: ->
          showCategory "hydrophobic", true
          # Return false to prevent menu from being hidden.
          false
        # Items below use default callback.
        "Gly": name: i18n.t("aminoacid_menu.glycine"), className: "#{HYDROPHOBIC_CLASS}"
        "Ala": name: i18n.t("aminoacid_menu.alanine"), className: "#{HYDROPHOBIC_CLASS}"
        "Val": name: i18n.t("aminoacid_menu.valine"), className: "#{HYDROPHOBIC_CLASS}"
        "Leu": name: i18n.t("aminoacid_menu.leucine"), className: "#{HYDROPHOBIC_CLASS}"
        "Ile": name: i18n.t("aminoacid_menu.isoleucine"), className: "#{HYDROPHOBIC_CLASS}"
        "Phe": name: i18n.t("aminoacid_menu.phenylalanine"), className: "#{HYDROPHOBIC_CLASS}"
        "Pro": name: i18n.t("aminoacid_menu.proline"), className: "#{HYDROPHOBIC_CLASS}"
        "Trp": name: i18n.t("aminoacid_menu.tryptophan"), className: "#{HYDROPHOBIC_CLASS}"
        "Met": name: i18n.t("aminoacid_menu.methionine"), className: "#{HYDROPHOBIC_CLASS}"
        "Cys": name: i18n.t("aminoacid_menu.cysteine"), className: "#{HYDROPHOBIC_CLASS}"
        "Tyr": name: i18n.t("aminoacid_menu.tyrosine"), className: "#{HYDROPHOBIC_CLASS}"
        # Category header.
        "Hydrophilic": name: i18n.t("aminoacid_menu.hydrophilic"), className: "#{HYDROPHILIC_CAT_CLASS}", callback: ->
          showCategory "hydrophilic", true
          # Return false to prevent menu from being hidden.
          false
        # Items below use default callback.
        "Asn": name: i18n.t("aminoacid_menu.asparagine"), className: "#{HYDROPHILIC_CLASS}"
        "Gln": name: i18n.t("aminoacid_menu.glutamine"), className: "#{HYDROPHILIC_CLASS}"
        "Ser": name: i18n.t("aminoacid_menu.serine"), className: "#{HYDROPHILIC_CLASS}"
        "Thr": name: i18n.t("aminoacid_menu.threonine"), className: "#{HYDROPHILIC_CLASS}"
        "Asp": name: i18n.t("aminoacid_menu.asparticacid"), className: "#{HYDROPHILIC_CLASS} #{NEG_CHARGE_CLASS}"
        "Glu": name: i18n.t("aminoacid_menu.glutamicacid"), className: "#{HYDROPHILIC_CLASS} #{NEG_CHARGE_CLASS}"
        "Lys": name: i18n.t("aminoacid_menu.lysine"), className: "#{HYDROPHILIC_CLASS} #{POS_CHARGE_CLASS}"
        "Arg": name: i18n.t("aminoacid_menu.arginine"), className: "#{HYDROPHILIC_CLASS} #{POS_CHARGE_CLASS}"
        "His": name: i18n.t("aminoacid_menu.histidine"), className: "#{HYDROPHILIC_CLASS} #{POS_CHARGE_CLASS}"

    # Initially show only one category (longer) to ensure that menu has a real-life height.
    # It can be useful for determining of position.
    showCategory "hydrophobic"
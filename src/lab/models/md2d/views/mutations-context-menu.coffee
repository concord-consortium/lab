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
    # Define handler for menu show and hide events. They setup classes of
    # substitution sub-menu items. One  item is hidden (X-to-X - as such
    # mutation is useless), other items receive correct classes dynamically
    # (e.g. A-to-G, A-to-C, A-to-T). They are used to set appropriate icons.
    clickedNucleoType = null
    onMenuShow = (options) ->
      # Update closure variable containing current nucleotide type. As it can
      # be changed by the mutation, it's important to save it.
      clickedNucleoType = d3.select(options.$trigger[0]).datum().type
      subsItems = options.items["Substitution"].items
      for own key, item of subsItems
        key = key.split(":")[1]
        item.$node.addClass "#{clickedNucleoType}-to-#{key}"
      # Nucleotide should glow as long as menu is open. The trigger is SVG
      # element, so use d3 to add class, jQuery won't work.
      d3.select(options.$trigger[0]).classed "glowing", true
      # Ensure that this callback returns true (required to show menu).
      true
    onMenuHide = (options) ->
      # Note that we can't read d3 data again and check nucleotide type, as it
      # could be changed by the mutation. The function relies on closure
      # variable set by the onMenuShow function.
      subsItems = options.items["Substitution"].items
      for own key, item of subsItems
        key = key.split(":")[1]
        item.$node.removeClass "#{clickedNucleoType}-to-#{key}"
      # Make sure that clicked nucleotide is no longer glowing. The trigger is
      # SVG element, so use d3 to remove class, jQuery won't work.
      d3.select(options.$trigger[0]).classed "glowing", false
      # Ensure that this callback returns true (required to hide menu).
      true

    # Unregister the same menu first.
    $.contextMenu "destroy", selector
    # Register new one.
    $.contextMenu
      # Selector defines DOM elements which can trigger this menu.
      selector: selector
      # Append to "#responsive-content" to enable dynamic font-scaling.
      appendTo: "#responsive-content"
      # Class of the menu.
      className: "mutations-menu"
      # Left click.
      trigger: "left"

      events:
        show: onMenuShow
        hide: onMenuHide

      callback: (key, options) ->
        key = key.split ":"
        # Get nucleotide.
        d = d3.select(options.$trigger[0]).datum()
        switch key[0]
          when "substitute" then model.geneticEngine().mutate d.idx, key[1], DNAComplement
          when "insert"     then model.geneticEngine().insert d.idx, key[1], DNAComplement
          when "delete"     then model.geneticEngine().delete d.idx

      items:
        "Substitution":
          name: "Substitution mutation"
          className: "substitution-submenu"
          items:
            "substitute:A": name: ""
            "substitute:T": name: ""
            "substitute:G": name: ""
            "substitute:C": name: ""
        "Insertion":
          name: "Insertion mutation"
          className: "insertion-submenu"
          items:
            "insert:A": name: "Insert", className: "A"
            "insert:T": name: "Insert", className: "T"
            "insert:G": name: "Insert", className: "G"
            "insert:C": name: "Insert", className: "C"
        "delete": name: "Deletion mutation"
    # Don't return anything.
    return

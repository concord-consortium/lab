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

    substCallback = (key, options) ->
      # Get nucleotide type
      d = d3.select(options.$trigger[0]).datum()
      # Mutate
      model.geneticEngine().mutate(d.idx, key, DNAComplement);

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
        show: (options) ->
          type = d3.select(options.$trigger[0]).datum().type
          subsItems = options.items["Substitution"].items
          for own key, item of subsItems
            item.$node.addClass "#{type}-to-#{key}"
          # Ensure that this callback returns true (required to show menu).
          true

        hide: (options) ->
          type = d3.select(options.$trigger[0]).datum().type
          subsItems = options.items["Substitution"].items
          for own key, item of subsItems
            item.$node.removeClass "#{type}-to-#{key}"
          # Ensure that this callback returns true (required to hide menu).
          true

      items:
        "Substitution":
          name: "Substitution mutation"
          className: "submenu"
          items:
            "A": name: "", callback: substCallback, className: "submenu-item"
            "T": name: "", callback: substCallback, className: "submenu-item"
            "G": name: "", callback: substCallback, className: "submenu-item"
            "C": name: "", callback: substCallback, className: "submenu-item"
        # "Insertion":
        #   name: "Insertion mutation"
        #   className: "submenu"
        #   items:
        #     "A": name: "", callback: substCallback, className: "submenu-item"
        #     "T": name: "", callback: substCallback, className: "submenu-item"
        #     "G": name: "", callback: substCallback, className: "submenu-item"
        #     "C": name: "", callback: substCallback, className: "submenu-item"
        # "Deletion": name: "Deletion mutation"

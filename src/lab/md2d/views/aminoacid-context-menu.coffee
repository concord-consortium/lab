###
Simple module which provides context menu for amino acids. It allows
to dynamically change type of amino acids in a convenient way.
It uses jQuery.contextMenu plug-in.
###
define (require) ->

  aminoacids = require 'cs!md2d/models/aminoacids-helper'

  MENU_CLASS = "aminoacids-menu"
  HYDROPHOBIC_CLASS = "hydrophobic"
  HYDROPHILIC_CLASS = "hydrophilic"
  POS_CHARGE_CLASS = "pos-charge"
  NEG_CHARGE_CLASS = "neg-charge"

  style = () ->
    # TODO: move it to CSS?
    # However most of the styling so far is done in JS.
    $(".#{MENU_CLASS}").css
      # "min-width": "9em" is a workaround... However elements of this menu aren't dynamic,
      # so we can use it. Without that hack width is always set to 120px by the jquery.contextMenu
      # library. We are dynamically scaling font, so this was causing problems and text truncation.
      "min-width": "9em"
      "font-size": "0.9em"
      "font-family": "inherit"

    $(".#{MENU_CLASS} .#{HYDROPHOBIC_CLASS}").css
      "padding": "0 0 0 19%"
      "background": "#E0A21B"

    $(".#{MENU_CLASS} .#{HYDROPHILIC_CLASS}").css
      "padding": "0 0 0 19%"
      "background": "#75a643"

    $(".#{MENU_CLASS} .#{POS_CHARGE_CLASS}").css
      "background-repeat": "no-repeat"
      "background-position": "1%"
      "background-size": "Auto 100%"
      "background-image": "url(../../resources/plus.svg)"

    $(".#{MENU_CLASS} .#{NEG_CHARGE_CLASS}").css
      "background-repeat": "no-repeat"
      "background-position": "1%"
      "background-size": "Auto 100%"
      "background-image": "url(../../resources/minus.svg)"

  markNode = ($node) ->
    $node.css
      "border-top": "3px solid #777"
      "border-bottom": "3px solid #777"

  unmarkNode = ($node) ->
    $node.css
      "border-top": ""
      "border-bottom": ""

  getAminoProps = (node) ->


  ###
  Register context menu for DOM elements defined by @selector.
  @model, @view are associated model and view, used to set
  properties and redraw view.
  ###
  register: (model, view, selector) ->
    $.contextMenu
      # Selector defines DOM elements which can trigger this menu.
      selector: selector
      # Class of the menu.
      className: MENU_CLASS
      callback: (key, options) ->
        # Get properties of atom representing amino acid.
        props = d3.select(options.$trigger[0]).datum()
        # Remove current selection. It won't be handled by events.#hide callback defined below,
        # because we modify element property. Also, do not setup new selection, as it makes
        # no sense - after click the menu is hidden.
        marked = aminoacids.getAminoAcidByElement(props.element).abbreviation
        unmarkNode options.items[marked].$node
        # Translate abbreviation to element ID.
        elemId = aminoacids.abbrToElement key
        # Set amino acid type.
        model.setAtomProperties props.idx, element: elemId
        # Redraw view.
        # TODO: model should dispatch appropriate event, which should trigger repaint automatically.
        view.setup_drawables()
      events:
        # Mark currently selected AA type.
        show: (options) ->
          props = d3.select(options.$trigger[0]).datum()
          key = aminoacids.getAminoAcidByElement(props.element).abbreviation
          markNode options.items[key].$node

        # Remove marker added above.
        hide: (options) ->
          props = d3.select(options.$trigger[0]).datum()
          key = aminoacids.getAminoAcidByElement(props.element).abbreviation
          unmarkNode options.items[key].$node

      items:
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
        "Asn": name: "Asparagine", className: "#{HYDROPHILIC_CLASS}"
        "Gln": name: "Glutamine", className: "#{HYDROPHILIC_CLASS}"
        "Ser": name: "Serine", className: "#{HYDROPHILIC_CLASS}"
        "Thr": name: "Threonine", className: "#{HYDROPHILIC_CLASS}"
        "Asp": name: "Asparticacid", className: "#{HYDROPHILIC_CLASS} #{NEG_CHARGE_CLASS}"
        "Glu": name: "Glutamicacid", className: "#{HYDROPHILIC_CLASS} #{NEG_CHARGE_CLASS}"
        "Lys": name: "Lysine", className: "#{HYDROPHILIC_CLASS} #{POS_CHARGE_CLASS}"
        "Arg": name: "Arginine", className: "#{HYDROPHILIC_CLASS} #{POS_CHARGE_CLASS}"
        "His": name: "Histidine", className: "#{HYDROPHILIC_CLASS} #{POS_CHARGE_CLASS}"

      # Style context menu.
      style()

  ###
  Return class name (e.g. for custom styling by the client code).
  ###
  getClass: ->
    MENU_CLASS

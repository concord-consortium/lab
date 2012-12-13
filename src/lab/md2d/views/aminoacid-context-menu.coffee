###
Simple module which provides context menu for amino acids. It allows
to dynamically change type of amino acids in a convenient way.
It uses jQuery.contextMenu plug-in.

CSS style definition: sass/lab/_aminoacid-context-menu.sass
###
define (require) ->

  aminoacids = require 'cs!md2d/models/aminoacids-helper'

  # Classes for styling. Note that CSS is used for styling, see header.
  MENU_CLASS = "aminoacids-menu"
  HYDROPHOBIC_CLASS = "hydrophobic"
  HYDROPHILIC_CLASS = "hydrophilic"
  POS_CHARGE_CLASS = "pos-charge"
  NEG_CHARGE_CLASS = "neg-charge"
  MARKED_CLASS = "marked"

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
        options.items[marked].$node.removeClass MARKED_CLASS
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
          options.items[key].$node.addClass MARKED_CLASS

        # Remove marker added above.
        hide: (options) ->
          props = d3.select(options.$trigger[0]).datum()
          key = aminoacids.getAminoAcidByElement(props.element).abbreviation
          options.items[key].$node.removeClass MARKED_CLASS

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

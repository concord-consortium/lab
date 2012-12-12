###
Simple module which provides context menu for amino acids. It allows
to dynamically change type of amino acids in a convenient way.
It uses jQuery.contextMenu plug-in.
###
define (require) ->

  aminoacids = require 'cs!md2d/models/aminoacids-helper'

  CLASS_NAME = "aminoacids-menu"

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
      className: CLASS_NAME
      callback: (key, options) ->
        # Get properties of atom representing amino acid.
        props = d3.select(options.$trigger[0]).datum()
        # Translate abbreviation to element ID.
        elemId = aminoacids.abbrToElement key
        # Set amino acid type.
        model.setAtomProperties props.idx, element: elemId
        # Redraw view.
        # TODO: model should dispatch appropriate event, which should trigger repaint automatically.
        view.setup_drawables()
      items:
        "Gly": name: "Glycine"
        "Ala": name: "Alanine"
        "Val": name: "Valine"
        "Leu": name: "Leucine"
        "Ile": name: "Isoleucine"
        "Phe": name: "Phenylalanine"
        "Pro": name: "Proline"
        "Trp": name: "Tryptophan"
        "Met": name: "Methionine"
        "Cys": name: "Cysteine"
        "Tyr": name: "Tyrosine"
        "separator1": "---------"
        "Asn": name: "Asparagine"
        "Gln": name: "Glutamine"
        "Ser": name: "Serine"
        "Thr": name: "Threonine"
        "separator2": "---------"
        "Asp": name: "Asparticacid"
        "Glu": name: "Glutamicacid"
        "separator3": "---------"
        "Lys": name: "Lysine"
        "Arg": name: "Arginine"
        "His": name: "Histidine"

  ###
  Return class name (e.g. for styling).
  ###
  getClass: ->
    CLASS_NAME

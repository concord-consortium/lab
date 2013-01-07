###
Module which provides convenience functions related to amino acids.
###
define (require) ->

  aminoacidsProps = require 'md2d/models/aminoacids-props'

  # Elements from 0 to 4 are typical, editable elements representing atoms.
  FIST_ELEMENT_ID = 5

  ###
  ID of an element representing the first amino acid in the elements collection.
  ###
  firstElementID: FIST_ELEMENT_ID

  ###
  ID of an element representing the last amino acid in the elements collection.
  ###
  lastElementID: FIST_ELEMENT_ID + aminoacidsProps.length - 1

  ###
  Converts @abbreviation of amino acid to element ID.
  ###
  abbrToElement: (abbreviation) ->
    for aminoacid, i in aminoacidsProps
      return i + @firstElementID if aminoacid.abbreviation == abbreviation

  ###
  Returns properties (hash) of amino acid which is represented by a given @elementID.
  ###
  getAminoAcidByElement: (elementID) ->
    aminoacidsProps[elementID - @firstElementID]

  ###
  Checks if given @elementID represents amino acid.
  ###
  isAminoAcid: (elementID) ->
    elementID >= @firstElementID && elementID <= @lastElementID

  ###
  Gets polar amino acids (array of their element IDs).
  ###
  getPolarAminoAcids: () ->
    results = []
    for aminoacid, i in aminoacidsProps
      results.push i + @firstElementID if aminoacid.charge != 0

    results

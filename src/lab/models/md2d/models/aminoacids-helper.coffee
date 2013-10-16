###
Module which provides convenience functions related to amino acids.
###
define (require) ->

  aminoacidsProps = require 'models/md2d/models/aminoacids-props'

  # Elements from 0 to 4 are typical, editable elements representing atoms.
  FIST_ELEMENT_ID = 5

  RNA_CODON_TABLE =
    "UUU": "Phe"
    "UUC": "Phe"

    "UUA": "Leu"
    "UUG": "Leu"
    "CUU": "Leu"
    "CUC": "Leu"
    "CUA": "Leu"
    "CUG": "Leu"

    "AUU": "Ile"
    "AUC": "Ile"
    "AUA": "Ile"

    "AUG": "Met"

    "GUU": "Val"
    "GUC": "Val"
    "GUA": "Val"
    "GUG": "Val"

    "UCU": "Ser"
    "UCC": "Ser"
    "UCA": "Ser"
    "UCG": "Ser"
    "AGU": "Ser"
    "AGC": "Ser"

    "CCU": "Pro"
    "CCC": "Pro"
    "CCA": "Pro"
    "CCG": "Pro"

    "ACU": "Thr"
    "ACC": "Thr"
    "ACA": "Thr"
    "ACG": "Thr"

    "GCU": "Ala"
    "GCC": "Ala"
    "GCA": "Ala"
    "GCG": "Ala"

    "UAU": "Tyr"
    "UAC": "Tyr"

    "CAU": "His"
    "CAC": "His"

    "CAA": "Gln"
    "CAG": "Gln"

    "AAU": "Asn"
    "AAC": "Asn"

    "AAA": "Lys"
    "AAG": "Lys"

    "GAU": "Asp"
    "GAC": "Asp"

    "GAA": "Glu"
    "GAG": "Glu"

    "UGU": "Cys"
    "UGC": "Cys"

    "UGG": "Trp"

    "CGU": "Arg"
    "CGC": "Arg"
    "CGA": "Arg"
    "CGG": "Arg"
    "AGA": "Arg"
    "AGG": "Arg"

    "GGU": "Gly"
    "GGC": "Gly"
    "GGA": "Gly"
    "GGG": "Gly"

    "UAA": "STOP"
    "UAG": "STOP"
    "UGA": "STOP"

  ###
  ID of an element representing the first amino acid in the elements collection.
  ###
  firstElementID: FIST_ELEMENT_ID

  ###
  ID of an element representing the last amino acid in the elements collection.
  ###
  lastElementID: FIST_ELEMENT_ID + aminoacidsProps.length - 1

  ###
  Element ID of the cysteine amino acid.
  Note that it should be stored in this class (instead of hard-coded in the engine),
  as it can be changed in the future.
  ###
  cysteineElement: 9

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
  Returns polar amino acids (array of their element IDs).
  ###
  getPolarAminoAcids: () ->
    # Get element IDs representing Asparagine, Glutamine, Serine, Threonine.
    # See categorization charge for AAs with polar sidechain here:
    # http://upload.wikimedia.org/wikipedia/commons/a/a9/Amino_Acids.svg
    @abbrToElement abbr for abbr in ["Asn", "Gln", "Ser", "Thr"]

  ###
  Converts RNA Codon to amino acid abbreviation
  ###
  codonToAbbr: (codon) ->
    if (codon.length != 3)
      "STOP"
    else
      RNA_CODON_TABLE[codon]

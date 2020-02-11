/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
/*
Module which provides convenience functions related to amino acids.
*/
import $__models_md_d_models_aminoacids_props from 'models/md2d/models/aminoacids-props';

const aminoacidsProps = $__models_md_d_models_aminoacids_props;

// Elements from 0 to 4 are typical, editable elements representing atoms.
const FIST_ELEMENT_ID = 5;

const RNA_CODON_TABLE = {
  "UUU": "Phe",
  "UUC": "Phe",

  "UUA": "Leu",
  "UUG": "Leu",
  "CUU": "Leu",
  "CUC": "Leu",
  "CUA": "Leu",
  "CUG": "Leu",

  "AUU": "Ile",
  "AUC": "Ile",
  "AUA": "Ile",

  "AUG": "Met",

  "GUU": "Val",
  "GUC": "Val",
  "GUA": "Val",
  "GUG": "Val",

  "UCU": "Ser",
  "UCC": "Ser",
  "UCA": "Ser",
  "UCG": "Ser",
  "AGU": "Ser",
  "AGC": "Ser",

  "CCU": "Pro",
  "CCC": "Pro",
  "CCA": "Pro",
  "CCG": "Pro",

  "ACU": "Thr",
  "ACC": "Thr",
  "ACA": "Thr",
  "ACG": "Thr",

  "GCU": "Ala",
  "GCC": "Ala",
  "GCA": "Ala",
  "GCG": "Ala",

  "UAU": "Tyr",
  "UAC": "Tyr",

  "CAU": "His",
  "CAC": "His",

  "CAA": "Gln",
  "CAG": "Gln",

  "AAU": "Asn",
  "AAC": "Asn",

  "AAA": "Lys",
  "AAG": "Lys",

  "GAU": "Asp",
  "GAC": "Asp",

  "GAA": "Glu",
  "GAG": "Glu",

  "UGU": "Cys",
  "UGC": "Cys",

  "UGG": "Trp",

  "CGU": "Arg",
  "CGC": "Arg",
  "CGA": "Arg",
  "CGG": "Arg",
  "AGA": "Arg",
  "AGG": "Arg",

  "GGU": "Gly",
  "GGC": "Gly",
  "GGA": "Gly",
  "GGG": "Gly",

  "UAA": "STOP",
  "UAG": "STOP",
  "UGA": "STOP"
};

export default {
  /*
  ID of an element representing the first amino acid in the elements collection.
  */
  firstElementID: FIST_ELEMENT_ID,

  /*
  ID of an element representing the last amino acid in the elements collection.
  */
  lastElementID: (FIST_ELEMENT_ID + aminoacidsProps.length) - 1,

  /*
  Element ID of the cysteine amino acid.
  Note that it should be stored in this class (instead of hard-coded in the engine),
  as it can be changed in the future.
  */
  cysteineElement: 9,

  /*
  Converts @abbreviation of amino acid to element ID.
  */
  abbrToElement(abbreviation) {
    for (let i = 0; i < aminoacidsProps.length; i++) {
      const aminoacid = aminoacidsProps[i];
      if (aminoacid.abbreviation === abbreviation) {
        return i + this.firstElementID;
      }
    }
  },

  /*
  Returns properties (hash) of amino acid which is represented by a given @elementID.
  */
  getAminoAcidByElement(elementID) {
    return aminoacidsProps[elementID - this.firstElementID];
  },

  /*
  Checks if given @elementID represents amino acid.
  */
  isAminoAcid(elementID) {
    return (elementID >= this.firstElementID) && (elementID <= this.lastElementID);
  },

  /*
  Returns polar amino acids (array of their element IDs).
  */
  getPolarAminoAcids() {
    // Get element IDs representing Asparagine, Glutamine, Serine, Threonine.
    // See categorization charge for AAs with polar sidechain here:
    // http://upload.wikimedia.org/wikipedia/commons/a/a9/Amino_Acids.svg
    return ["Asn", "Gln", "Ser", "Thr"].map((abbr) => this.abbrToElement(abbr));
  },

  /*
  Converts RNA Codon to amino acid abbreviation
  */
  codonToAbbr(codon) {
    if (codon.length !== 3) {
      return "STOP";
    } else {
      return RNA_CODON_TABLE[codon];
    }
  }
};

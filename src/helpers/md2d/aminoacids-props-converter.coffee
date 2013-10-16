###
Simple script converting amino acids properties to JS file.
###

# Content of "org.concord.molbio.engine.aminoacids.properties" file (Classic MW).
aminoacidsProps =
"""
ALA = Alanine,          Ala,    A,  89.09,      0,     2.15,  0,    115,    88.6,       16.65,      1,    Total aliphatic; hydrophobic
ARG = Arginine,         Arg,    R,  174.20,     1,     2.23,  12.0, 225,   173.4,       15,        -2,    Acidic side chains; strongly polar; cationic
ASN = Asparagine,       Asn,    N,  132.12,     0,     1.05,  0,    160,    114.1,       3.53,     -1,    Strongly polar
ASP = Aspartic acid,    Asp,    D,  133.10,    -1,     1.13,  4.4,  150,    111.1,       0.778,    -2,    Acidic side chains; strongly polar; anionic
CYS = Cysteine,         Cys,    C,  121.15,     0,     1.20,  8.5,  135,    108.5,    1000.0,       1,    Polar side chains; semipolar
GLN = Glutamine,        Gln,    Q,  146.15,     0,     1.65,  0,    180,    143.8,       2.5,      -1,    Strongly polar
GLU = Glutamic acid,    Glu,    E,  147.13,    -1,     1.73,  4.4,  190,    138.4,       0.864,    -2,    Acidic side chains; strongly polar; anionic
GLY = Glycine,          Gly,    G,  75.07,      0,     1.18,  0,     75,     60.1,      24.99,      1,    Semipolar
HIS = Histidine,        His,    H,  155.16,     1,     2.45,  6.5,  195,    153.2,       4.19,     -2,    Basic side chains; strongly polar; cationic
ILE = Isoleucine,       Ile,    I,  131.17,     0,     3.88,  0,    175,    166.7,       4.117,     1,    Branched chain aliphatic; hydrophobic
LEU = Leucine,          Leu,    L,  131.17,     0,     4.10,  10.0, 170,    166.7,       2.426,     1,    Branched chain aliphatic; hydrophobic
LYS = Lysine,           Lys,    K,  146.19,     1,     3.05,  0,    200,    168.6,    1000.0,      -2,    Acidic side chains; strongly polar; cationic
MET = Methionine,       Met,    M,  149.21,     0,     3.43,  0,    185,    162.9,       3.81,      1,    Totally alyphatic
PHE = Phenylalanine,    Phe,    F,  165.19,     0,     3.46,  0,    210,    189.9,       2.965,     2,    Totally aromatic
PRO = Proline,          Pro,    P,  115.13,     0,     3.10,  0,    145,    112.7,     162.3,       1,    Totally alyphatic
SER = Serine,           Ser,    S,  105.09,     0,     1.40,  0,    115,     89,         5.023,    -1,    Semipolar
THR = Threonine,        Thr,    T,  119.12,     0,     2.25,  0,    140,    116.1,    1000.0,      -1,    Semipolar
TRP = Tryptophan,       Trp,    W,  204.23,     0,     4.11,  0,    255,    227.8,       1.136,     2,    Totally aromatic
TYR = Tyrosine,         Tyr,    Y,  181.19,     0,     2.81,  10.0, 230,    193.6,       0.045,     1,    Hydrophobic; total aromatic
VAL = Valine,           Val,    V,  117.15,     0,     3.38,  0,    155,    140,         8.85,      1,    Branched chain aliphatic; hydrophobic
names=Full name,Abbreviation,Symbol,Molecular weight,Charge,Hydrophobicity (RB),pK,Surface,Volume,Solubility,Hydrophobicity,Property
"""

fs = require 'fs'

lines = aminoacidsProps.split "\n"
aminoProps = []
propNames = []

for line in lines
  continue if line.length == 0
  names = if line[0] == "n" then true else false
  # Remove beginning of the line (key).
  line = line.substring 6, line.length
  props = line.split ","

  if names
    for prop, i in props
      prop = "fullName" if prop == "Full name"
      prop = "hydrophobicityRB" if prop == "Hydrophobicity (RB)"
      prop = "molWeight" if prop == "Molecular weight"
      prop = prop.charAt(0).toLowerCase() + prop.substr 1
      propNames[i] = prop.replace /\s+/g, ""
  else
    for prop, i in props
      if i != props.length - 1
        props[i] = prop.replace /\s+/g, ""
      else
        props[i] = prop.replace /^\s\s*/g, ""
      if not isNaN Number props[i]
        props[i] = Number props[i]
    aminoProps.push props

objects = []
for amino in aminoProps
  obj = {}
  for prop, i in propNames
    obj[prop] = amino[i]
  objects.push obj

finalContent =
"""
/*global define: false */
define(function() {
  return #{JSON.stringify objects, null, 2};
});

"""

fs.writeFileSync '../../lab/models/md2d/models/aminoacids-props.js', finalContent

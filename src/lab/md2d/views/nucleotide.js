/*global define */

define(function (require) {
  var SCALE = 0.007,
      W = {
        "BACKB": 52,
        "A": 28.151,
        "C": 21.2,
        "G": 21.2,
        "T": 28.651,
        "U": 28.651
      },
      H = {
        "BACKB": 14,
        "A": 31.15,
        "C": 25.3,
        "G": 30.3,
        "T": 25.007,
        "U": 25.007
      };

  (function () {
    var name;
    for (name in W) {
      if (W.hasOwnProperty(name)) {
        W[name] *= SCALE;
      }
    }
    for (name in H) {
      if (H.hasOwnProperty(name)) {
        H[name] *= SCALE;
      }
    }
  }());

  function Nucleotide(parent, ms2px, type, direction, index, mRNA) {
    this._ms2px = ms2px;
    this.type = type;
    this._wrapper = parent.append("g").attr("class", "nucleotide");
    this._g = this._wrapper.append("g");
    this._bonds = this._g.append("path").attr({
      "class": "bonds",
      "x": 0,
      "y": 0,
      "d": this._bondsPath()
    }).style({
      "stroke-width": ms2px(0.01),
      "stroke": "#fff"
    });
    this._nucleo = this._g.append("image").attr({
      "class": "nucleotide-img",
      "x": ms2px(W.BACKB) / 2 - ms2px(W[type]) / 2,
      "y": ms2px(H.BACKB) * 0.9,
      "width": ms2px(W[type]),
      "height": ms2px(H[type]),
      "preserveAspectRatio": "none",
      "xlink:href": "resources/dna/Nucleotide" + type + "_Direction" + direction + "_noBonds.svg"
    });
    this._backbone = this._g.append("image").attr({
      "x": 0,
      "y": 0,
      "width": ms2px(W.BACKB),
      "height": ms2px(H.BACKB),
      "preserveAspectRatio": "none",
      "xlink:href": "resources/dna/Backbone_" + (mRNA ? "RNA" : "DNA") + ".svg"
    });

    if (direction === 1) {
      this._g.attr("transform", "translate(" + ms2px(Nucleotide.WIDTH) * index + ")");
    } else if (direction === 2) {
      this._g.attr("transform", "translate(" + ms2px(Nucleotide.WIDTH) * index + ") scale(1,-1)");
    }
  }

  Nucleotide.prototype.hideBonds = function(suppressAnimation) {
    var selection;
    if (!suppressAnimation) {
      selection = this._bonds.transition();
    } else {
      selection = this._bonds;
    }
    selection.style("opacity", 0);
  };

  Nucleotide.prototype.showBonds = function(suppressAnimation) {
    var selection;
    if (!suppressAnimation) {
      selection = this._bonds.transition();
    } else {
      selection = this._bonds;
    }
    selection.style("opacity", 1);
  };

  /**
   * Returns path defining bonds of nucleotide.
   * Note that values used to draw it are strictly connected
   * with current Nucleotide width, which is equal to 48!
   * @private
   * @return {string} SVG path description.
   */
  Nucleotide.prototype._bondsPath = function() {
    var yStart = this._ms2px(SCALE * 20),
        yEnd = this._ms2px(Nucleotide.HEIGHT);

    if (this.type === "C" || this.type === "G") {
      return "M" + this._ms2px(SCALE * 20) + " " + yStart + " L " + this._ms2px(SCALE * 20) + " " + yEnd +
             "M" + this._ms2px(SCALE * 26) + " " + yStart + " L " + this._ms2px(SCALE * 26) + " " + yEnd +
             "M" + this._ms2px(SCALE * 32) + " " + yStart + " L " + this._ms2px(SCALE * 32) + " " + yEnd;
    } else {
      return "M" + this._ms2px(SCALE * 22) + " " + yStart + " L " + this._ms2px(SCALE * 22) + " " + yEnd +
             "M" + this._ms2px(SCALE * 30) + " " + yStart + " L " + this._ms2px(SCALE * 30) + " " + yEnd;
    }
  };

  // Width of the nucleotide is width of the DNA backbone.
  // * 0.92 to ensure that DNA backbone doesn't contain any visual discontinuities.
  // There are two bugs connected with it. First is in Chrome, where preserveAspectRatio
  // is ignored for images, the second one is in Safari, which has problems with correct
  // width of the images. Please see:
  // https://www.pivotaltracker.com/story/show/48453261
  Nucleotide.WIDTH  = W.BACKB * 0.92;
  // Height of the nucleotide is height of the DNA backbone + A nucleotide (tallest one).
  // * 0.9 because it simply... looks better. This value is used to determine distance
  // between two strands of DNA and this multiplier causes that they are closer to each other.
  Nucleotide.HEIGHT = H.BACKB + H.A * 0.9;

  return Nucleotide;
});

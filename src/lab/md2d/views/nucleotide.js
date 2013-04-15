/*global define */

define(function (require) {
  // Dependencies.
  var labConfig = require('lab.config'),

      SCALE = 0.007,
      W = {
        "BACKB": 48.05,
        "A": 28.151,
        "C": 21.2,
        "G": 21.2,
        "T": 28.651
      },
      H = {
        "BACKB": 14,
        "A": 31.15,
        "C": 25.3,
        "G": 30.3,
        "T": 25.007
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

  function Nucleotide(parent, ms2px, type, direction, index) {
    this._ms2px = ms2px;
    this._g = parent.append("g").attr("class", "nucleotide");
    this._backbone = this._g.append("image").attr({
      "x": 0,
      "y": 0,
      "width": ms2px(W.BACKB),
      "height": ms2px(H.BACKB),
      "preserveAspectRatio": "xMidYMid",
      "xlink:href": labConfig.actualRoot + "../../resources/transcription/Backbone_DNA.svg"
    });
    this._nucleo = this._g.append("image").attr({
      "x": ms2px(W.BACKB) / 2 - ms2px(W[type]) / 2,
      "y": ms2px(H.BACKB),
      "width": ms2px(W[type]),
      "height": ms2px(H[type]),
      "preserveAspectRatio": "xMidYMid",
      "xlink:href": labConfig.actualRoot + "../../resources/transcription/Nucleotide" + type + "_Direction" + direction + "_noBonds.svg"
    });

    if (direction === 1) {
      this._g.attr("transform", "translate(" + 0.95 * ms2px(W.BACKB) * index + ")");
    } else if (direction === 2) {
      this._g.attr("transform", "translate(" + 0.95 * ms2px(W.BACKB) * index + ") scale(1,-1)");
    }
  }

  // Width of the nucleotide is width of the DNA backbone.
  Nucleotide.WIDTH  = W.BACKB;
  // Height of the nucleotide is height of the DNA backbone + A nucleotide (tallest one).
  Nucleotide.HEIGHT = H.BACKB + H.A;

  return Nucleotide;
});

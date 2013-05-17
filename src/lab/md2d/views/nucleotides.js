/*global define, d3 */

define(function (require) {
  var nucleotidePaths = require('md2d/views/nucleotide-paths'),

      SCALE = 0.007,
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

  function nucleotides() {
    var m2px = null,
        sequence = "",
        direction = 1,
        startingPos = 0,
        backbone = "DNA"; // if enabled, "RNA" or "DNA" is expected.

    function nucleo(g) {
      g.each(function() {
        var g = d3.select(this),

            nucleo = g.selectAll("g.nucleotide").data(sequence.split("")),
            nucleoEnter = nucleo.enter()
                            .append("g").attr("class", "nucleotide")
                            .append("g").attr("class", "pos")
                            .append("g").attr("class", "scale"),
            yOffset = backbone ? 0.9 * H.BACKB : 0,
            yStart = m2px(yOffset + 0.5 * H.A),
            yEnd = m2px(yOffset + H.A),
            nucleoSVG;

        // Enter.
        nucleoEnter.append("path").attr({
          "class": "bonds",
          "d": function (d) {
            if (d === "C" || d === "G") {
              return "M" + m2px(SCALE * 20) + " " + yStart + " L " + m2px(SCALE * 20) + " " + yEnd +
                     "M" + m2px(SCALE * 26) + " " + yStart + " L " + m2px(SCALE * 26) + " " + yEnd +
                     "M" + m2px(SCALE * 32) + " " + yStart + " L " + m2px(SCALE * 32) + " " + yEnd;
            } else {
              return "M" + m2px(SCALE * 22) + " " + yStart + " L " + m2px(SCALE * 22) + " " + yEnd +
                     "M" + m2px(SCALE * 30) + " " + yStart + " L " + m2px(SCALE * 30) + " " + yEnd;
            }
          }
        }).style({
          "stroke-width": m2px(0.01),
          "stroke": "#fff"
        });
        nucleoSVG = nucleoEnter.append("svg").attr({
          "class": function (d) { return "type-" + d; },
          "viewBox": function (d) { return "0 0 " + (W[d] / SCALE) + " " + (H[d] / SCALE); },
          "x": function (d) { return m2px(W.BACKB) / 2 - m2px(W[d]) / 2; },
          "y": m2px(yOffset),
          "width": function (d) { return m2px(W[d]); },
          "height": function (d) { return m2px(H[d]); },
          "preserveAspectRatio": "none"
        });
        nucleoSVG.append("path").attr({
          "class": "outline",
          "fill-rule": "evenodd",
          "clip-rule": "evenodd",
          "d": function (d) { return nucleotidePaths.outline[d]; }
        });
        nucleoSVG.append("path").attr({
          "class": "interior",
          "fill-rule": "evenodd",
          "clip-rule": "evenodd",
          "d": function (d) { return nucleotidePaths.interior[d]; }
        });
        nucleoSVG.append("path").attr({
          "class": "letter",
          "fill-rule": "evenodd",
          "clip-rule": "evenodd"
        });

        if (backbone) {
          nucleoEnter.append("image").attr({
            "class": "backbone",
            "x": 0,
            "y": 0,
            "width": m2px(W.BACKB),
            "height": m2px(H.BACKB),
            "preserveAspectRatio": "none",
            "xlink:href": "resources/dna/Backbone_" + backbone + ".svg"
          });
        }

        // Update.
        // Note that we update things related only to direction, as for now
        // this is the only use case for update operation. In theory we could
        // update also other properties (e.g. assuming that type of nucletoide
        // can change), but this is not used now, so don't do it (hopefully,
        // we gain some performance).
        nucleo.selectAll("path.letter").attr("d", function (d) { return nucleotidePaths.letter[d][direction]; });
        nucleo.select("g.pos").attr("transform", function (d, i) { return "translate(" + m2px(nucleotides.WIDTH) * (startingPos + i) + ")"; });
        nucleo.select("g.scale").attr("transform", "scale(1, " + (direction  === 1 ? 1 : -1) + ")");
      });
    }

    nucleo.sequence = function (s) {
      if (!arguments.length) return sequence;
      sequence = s;
      return nucleo;
    };

    nucleo.model2px = function (m) {
      if (!arguments.length) return m2px;
      m2px = m;
      return nucleo;
    };

    nucleo.direction = function (d) {
      if (!arguments.length) return direction;
      direction = d;
      return nucleo;
    };

    nucleo.startingPos = function (p) {
      if (!arguments.length) return startingPos;
      startingPos = p;
      return nucleo;
    };

    nucleo.backbone = function (b) {
      if (!arguments.length) return backbone;
      backbone = b;
      return nucleo;
    };

    return nucleo;
  }

  // Width of the nucleotide is width of the DNA backbone.
  // * 0.92 to ensure that DNA backbone doesn't contain any visual discontinuities.
  // There are two bugs connected with it. First is in Chrome, where preserveAspectRatio
  // is ignored for images, the second one is in Safari, which has problems with correct
  // width of the images. Please see:
  // https://www.pivotaltracker.com/story/show/48453261
  nucleotides.WIDTH  = W.BACKB * 0.92;
  // Height of the nucleotide is height of the DNA backbone + A nucleotide (tallest one).
  // * 0.9 because it simply... looks better. This value is used to determine distance
  // between two strands of DNA and this multiplier causes that they are closer to each other.
  nucleotides.HEIGHT = H.BACKB + H.A * 0.9;

  return nucleotides;
});

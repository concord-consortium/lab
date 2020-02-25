
import nucleotidePaths from 'models/md2d/views/nucleotide-paths';
import resourcesUrl from 'common/resources-url';
var SCALE = 0.007,
  W = {
    "BACKB": 52,
    "A": 28.151,
    "C": 21.2,
    "G": 21.2,
    "T": 28.651,
    "U": 28.651,
    "A_GLOW": 44.125,
    "C_GLOW": 37.2,
    "G_GLOW": 36.2,
    "T_GLOW": 45.566
  },
  H = {
    "BACKB": 14,
    "A": 31.15,
    "C": 25.3,
    "G": 30.3,
    "T": 25.007,
    "U": 25.007,
    "A_GLOW": 44.55,
    "C_GLOW": 41.417,
    "G_GLOW": 45.3,
    "T_GLOW": 40.65
  };

(function() {
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
    bonds = 1,
    backbone = "DNA", // if enabled, "RNA" or "DNA" is expected.
    stopCodonsHash = null,
    randomEnter = true,
    glow = false,
    enterExitOnly = false,

    xShift = 0,
    yShift = 0;

  function shift(enabled) {
    var t, r;
    if (enabled) {
      // While adding a new mRNA segment, choose a random starting point along a
      // circle with a certain radius that extends beyond the top DNA strand.
      // Use parametric circle equation: x = r cos(t), y = r sin(t)
      // Limit range of the "t" parameter to: [0.25 * PI, 0.75 * PI) and [1.25 * PI, 1.75 * PI),
      // so new mRNA segments will come only from the top or bottom side of the container.
      t = Math.random() >= 0.5 ? Math.PI * 0.25 : Math.PI * 1.25;
      t += Math.random() * Math.PI * 0.5;
      r = nucleotides.HEIGHT * 6;
      xShift = r * Math.cos(t);
      yShift = r * Math.sin(t);
    } else {
      xShift = yShift = 0;
    }
  }

  function translate(d) {
    return "translate(" + m2px(xShift + nucleotides.WIDTH * (d.idx)) + " " + m2px(yShift) + ")";
  }

  function nucleo(g) {
    g.each(function(d, i) {
      var g = d3.select(this),

        yOffset = backbone ? 0.9 * H.BACKB : 0,
        yStart = m2px(yOffset + 0.5 * H.A),
        yEnd = m2px(yOffset + H.A * 0.97),

        seq = typeof sequence === "function" ? sequence(d, i) : sequence,

        nucleo, nucleoEnter, nucleoExit, nucleoGEnter, backboneEnter,
        nucleoShape, nucleoSVG, nucleoSVGUpdate, nucleoTrans, targetScale;

      if (typeof seq === "string") {
        // seq is a string, generate data array. Change it to array of objects.
        // e.g. "AG" will be change to [{idx: 0, type: "A"}, {idx: 1, type: "G"}].
        seq = seq.split("");
        seq.forEach(function(val, i) {
          seq[i] = {
            id: i,
            idx: i,
            type: val
          };
        });
      }

      // Join data by ID.
      nucleo = g.selectAll(".nucleotide").data(seq, function(d) {
        return d.id;
      });
      nucleoEnter = nucleo.enter();
      nucleoExit = nucleo.exit();

      // Enter.
      // Random initial positions of the new mRNAs.
      shift(randomEnter);
      nucleoEnter = nucleoEnter.append("g").attr({
        "transform": translate
      }).style({
        "opacity": randomEnter ? 0 : 1
      });
      // Additional container for scaling.
      nucleoGEnter = nucleoEnter.append("g").attr({
        "class": "scale",
        "transform": "scale(1, " + (direction === 1 ? 1 : -1) + ")",
      });
      // Bonds.
      nucleoGEnter.append("path").attr("class", "bonds")
        .style({
          "stroke-width": m2px(0.01),
          "stroke": "#fff"
        });
      // Main shape.
      nucleoShape = nucleoGEnter.append("g")
        .classed("nucleo-shape", true)
        .classed("clickable-nucleo", function(d) {
          return d.region === "c" && glow;
        }).on("click", function() {
          // Mobile Safari will only produce mouse events when the user taps
          // on a clickable element, like a link. You can make an element
          // clickable by adding an onClick event handler to it, even if that
          // handler does nothing. It's necessary, as nucleotides should be
          // clickable, e.g. to show context menu.
        });
      // Optional glow image.
      if (glow) {
        nucleoShape.append("image").attr({
          "class": "glow",
          "y": m2px(yOffset - 0.17 * W.G_GLOW), // move glow closer to the backbone
          "preserveAspectRatio": "none"
        });
      }
      // Parts of nucleotide shape (outline, interior, letter).
      nucleoSVG = nucleoShape.append("svg").attr({
        "y": m2px(yOffset),
        "preserveAspectRatio": "none",
      });
      nucleoSVG.append("path").attr({
        "class": "outline",
        "fill-rule": "evenodd",
        "clip-rule": "evenodd"
      });
      nucleoSVG.append("path").attr({
        "class": "interior",
        "fill-rule": "evenodd",
        "clip-rule": "evenodd"
      });
      nucleoSVG.append("path").attr({
        "class": "letter",
        "fill-rule": "evenodd",
        "clip-rule": "evenodd",
        "d": function(d) {
          return nucleotidePaths.letter[d.type][direction];
        }
      });
      // Optional backbone.
      if (backbone) {
        backboneEnter = nucleoGEnter.append("image").attr({
          "class": "backbone",
          "x": 0,
          "y": 0,
          "width": m2px(W.BACKB),
          "height": m2px(H.BACKB),
          "preserveAspectRatio": "none",
          "xlink:href": resourcesUrl("dna/Backbone_" + backbone + ".svg")
        });
      }

      // Update.
      if (enterExitOnly) {
        // Special mode when we update ONLY nucleotides from enter and exit
        // subselections. It's useful to add new nucleotides while other
        // are being modified by transition at the same time, so it won't
        // be affected.
        nucleo = nucleoEnter;
      }

      // Update without transition.
      nucleo.attr("class", function(d) {
        var regionClass = "";
        switch (d.region) {
          case "c":
            regionClass = "coding-region";
            break;
          case "j":
            regionClass = "junk-region";
            break;
          case "p":
            regionClass = "promoter-region";
            break;
          case "t":
            regionClass = "terminator-region";
            break;
        }
        return "nucleotide " + regionClass;
      });
      nucleo.select(".bonds").attr("d", function(d) {
        if (d.type === "C" || d.type === "G") {
          return "M" + m2px(SCALE * 20) + " " + yStart + " L " + m2px(SCALE * 20) + " " + yEnd +
            "M" + m2px(SCALE * 26) + " " + yStart + " L " + m2px(SCALE * 26) + " " + yEnd +
            "M" + m2px(SCALE * 32) + " " + yStart + " L " + m2px(SCALE * 32) + " " + yEnd;
        } else {
          return "M" + m2px(SCALE * 22) + " " + yStart + " L " + m2px(SCALE * 22) + " " + yEnd +
            "M" + m2px(SCALE * 30) + " " + yStart + " L " + m2px(SCALE * 30) + " " + yEnd;
        }
      });
      nucleo.select(".glow").attr({
        "x": function(d) {
          return m2px(W.BACKB) / 2 - m2px(W[d.type + "_GLOW"]) / 2;
        },
        "width": function(d) {
          return m2px(W[d.type + "_GLOW"]);
        },
        "height": function(d) {
          return m2px(H[d.type + "_GLOW"]);
        },
        "xlink:href": function(d) {
          return resourcesUrl("dna/NucleotideGlow_" + d.type + ".svg");
        }
      });
      nucleoSVGUpdate = nucleo.select(".nucleo-shape > svg");
      nucleoSVGUpdate.attr({
        "class": function(d) {
          var className = "type-" + d.type;
          if (stopCodonsHash && stopCodonsHash[d.idx]) {
            className += " stop-codon";
          }
          return className;
        },
        "viewBox": function(d) {
          return "0 0 " + (W[d.type] / SCALE) + " " + (H[d.type] / SCALE);
        },
        "x": function(d) {
          return m2px(W.BACKB) / 2 - m2px(W[d.type]) / 2;
        },
        "width": function(d) {
          return m2px(W[d.type]);
        },
        "height": function(d) {
          return m2px(H[d.type]);
        }
      });
      nucleoSVGUpdate.select("path.interior").attr("d", function(d) {
        return nucleotidePaths.interior[d.type];
      });
      nucleoSVGUpdate.select("path.outline").attr("d", function(d) {
        return nucleotidePaths.outline[d.type];
      });

      // Update with transition.
      shift(false);
      nucleoTrans = d3.transition(nucleo)
        .attr("transform", translate)
        .style("opacity", 1);

      // Animate also bonds opacity.
      nucleoTrans.select(".bonds").style("opacity", bonds);

      // Duck test whether nucleoTrans is really translation. See D3 API
      // Reference - d3.transition(selection) returns transition only when
      // called in the context of other transition. Otherwise it returns
      // selection.
      if (nucleoTrans.attrTween) {
        // Scale. We can't simply use .attr, as rotation is used (to make
        // scale change fancier?). attrTween enforces simple change from
        // scale(1,1) to scale(1,-1) without using rotation.
        targetScale = "scale(1, " + (direction === 1 ? 1 : -1) + ")";
        nucleoTrans.select("g.scale").attrTween("transform", function(d, i, a) {
          return d3.interpolateString(a, targetScale);
        });
        // Letters. Default d3 interpolator creates some
        // results which can't be parsed. Use custom interpolator,
        // which changes letters in the middle of transition.
        nucleoTrans.select("path.letter").attrTween("d", function(d, i, a) {
          return function(t) {
            return t < 0.5 ? a : nucleotidePaths.letter[d.type][direction];
          };
        });
      } else {
        // The same operations, but without using transition.
        nucleo.select("g.scale").attr("transform", "scale(1, " + (direction === 1 ? 1 : -1) + ")");
        nucleo.select("path.letter")
          .attr("d", function(d) {
            return nucleotidePaths.letter[d.type][direction];
          });
      }

      // Exit.
      shift(true);
      d3.transition(nucleoExit)
        .attr("transform", translate)
        .style("opacity", 0)
        .remove();
    });
  }

  nucleo.sequence = function(s) {
    if (!arguments.length) return sequence;
    sequence = s;
    return nucleo;
  };

  nucleo.model2px = function(m) {
    if (!arguments.length) return m2px;
    m2px = m;
    return nucleo;
  };

  nucleo.direction = function(d) {
    if (!arguments.length) return direction;
    direction = d;
    return nucleo;
  };

  nucleo.bonds = function(b) {
    if (!arguments.length) return bonds;
    bonds = b;
    return nucleo;
  };

  nucleo.randomEnter = function(r) {
    if (!arguments.length) return randomEnter;
    randomEnter = r;
    return nucleo;
  };

  /**
   * Enables or disables nucleotide glowing on hover.
   * @param  {boolean} g
   */
  nucleo.glow = function(g) {
    if (!arguments.length) return glow;
    glow = g;
    return nucleo;
  };

  /**
   * @param  {String} b "DNA" or "RNA".
   */
  nucleo.backbone = function(b) {
    if (!arguments.length) return backbone;
    backbone = b;
    return nucleo;
  };

  nucleo.stopCodonsHash = function(s) {
    if (!arguments.length) return stopCodonsHash;
    stopCodonsHash = s;
    return nucleo;
  };

  /**
   * Special mode for quick update of rendered nucleotides number.
   * When this option is set to true, only new nucleotides will be
   * added and other possibly removed. None of existing
   * nucleotides will be updated. It's useful to add new nucleotides
   * while there is an ongoing transition on existing nucleoties.
   * @param  {boolean} ee
   */
  nucleo.enterExitOnly = function(ee) {
    if (!arguments.length) return enterExitOnly;
    enterExitOnly = ee;
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
nucleotides.WIDTH = W.BACKB * 0.92;
// Height of the nucleotide is height of the DNA backbone + A nucleotide (tallest one).
// * 0.96 because it simply... looks better. This value is used to determine distance
// between two strands of DNA and this multiplier causes that they are closer to each other.
nucleotides.HEIGHT = (H.BACKB * 0.9 + H.A) * 0.96;

export default nucleotides;

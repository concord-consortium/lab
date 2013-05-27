/*global define, d3 */

define(function (require) {
  var nucleotides  = require('md2d/views/nucleotides'),

      SCALE = 0.007,
      W = {
        "CELLS": 720,
        "DNA1": 661,
        "DNA2": 720,
        "DNA3": 337.4,
        "POLY_UNDER": 426.15,
        "POLY_OVER": 402.525,
        "NUCLEUS": 729.45,
        "RIBO_TOP": 550.7,
        "RIBO_BOTTOM": 509.031,
        "RIBO_UNDER": 550.55,
        "RIBO_OVER": 550.7,
        "TRNA": 117.325,
        "TRNA_NECK": 15.925
      },
      H = {
        "CELLS": 500,
        "DNA1": 550,
        "DNA2": 414.263,
        "DNA3": 89.824,
        "POLY_UNDER": 368.6,
        "POLY_OVER": 368.6,
        "NUCLEUS": 543.199,
        "RIBO_TOP": 250,
        "RIBO_BOTTOM": 147.15,
        "RIBO_UNDER": 311.6,
        "RIBO_OVER": 311.6,
        "TRNA": 67.9,
        "TRNA_NECK": 21.14,
        "A": 31.15
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

  function GeneticElementsRenderer(model, model2px, model2pxInv) {

    function scaleFunc(d) {
      return "scale(" + d.scale + ")";
    }
    function opacityFunc(d) {
      return d.opacity;
    }
    function translateFuncInv(d) {
      var x = d.translateX || 0,
          y = d.translateY || 0;
      return "translate(" + model2px(x) + " " + model2pxInv(y) + ")";
    }
    function translateScaleFuncInv(d) {
      return translateFuncInv(d) + " " + scaleFunc(d);
    }

    return {
      cells: function (parent, data) {
        var cells = parent.select(".background-layer").selectAll(".cells").data(data.cells);
        cells.enter().append("image").attr({
          "class": "cells",
          "x": model2px(W.CELLS * -0.567),
          "y": model2px(H.CELLS * -0.445),
          "width": model2px(W.CELLS),
          "height": model2px(H.CELLS),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/Cells.svg",
          "transform": translateScaleFuncInv
        }).style("opacity", opacityFunc);
        d3.transition(cells)
          .attr("transform", translateScaleFuncInv)
          .style("opacity", opacityFunc);
        d3.transition(cells.exit()).remove();
      },

      dna1: function (parent, data) {
        var dna1 = parent.select(".dna-layer").selectAll(".dna1").data(data.dna1);
        dna1.enter().append("image").attr({
          "class": "dna1",
          "x": model2px(W.DNA1 * -0.5),
          "y": model2px(H.DNA1 * -0.5),
          "width": model2px(W.DNA1),
          "height": model2px(H.DNA1),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/DNA_InsideNucleus_1.svg",
          "transform": translateScaleFuncInv
        }).style("opacity", opacityFunc);
        d3.transition(dna1)
          .attr("transform", translateScaleFuncInv)
          .style("opacity", opacityFunc);
        d3.transition(dna1.exit()).remove();
      },

      dna2: function (parent, data) {
        var dna2 = parent.select(".dna-layer").selectAll(".dna2").data(data.dna2);
        dna2.enter().append("image").attr({
          "class": "dna2",
          "x": model2px(W.DNA2 * -0.5),
          "y": model2px(H.DNA2 * -0.404),
          "width": model2px(W.DNA2),
          "height": model2px(H.DNA2),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/DNA_InsideNucleus_2.svg",
          "transform": translateScaleFuncInv
        }).style("opacity", opacityFunc);
        d3.transition(dna2)
          .attr("transform", translateScaleFuncInv)
          .style("opacity", opacityFunc);
        d3.transition(dna2.exit()).remove();
      },

      dna3: function (parent, data) {
        var dna3units = 14,
            dna3, dna3Enter;
        dna3 = parent.select(".dna-layer").selectAll(".dna3").data(data.dna3);
        dna3Enter = dna3.enter().append("g").attr({
          "class": "dna3 main-dna",
          "transform": translateScaleFuncInv
        }).style("opacity", opacityFunc);
        dna3Enter.selectAll("dna3-unit").data(new Array(dna3units)).enter().append("image").attr({
          "class": "dna3-unit",
          "x": function (d, i) { return (i - dna3units * 0.5) * model2px(W.DNA3) * 0.98; },
          "y": model2px(H.DNA3 * -0.5),
          "width": model2px(W.DNA3),
          "height": model2px(H.DNA3),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/DoubleHelix_Unit.svg"
        });
        d3.transition(dna3)
          .attr("transform", translateScaleFuncInv)
          .style("opacity", opacityFunc);
        d3.transition(dna3.exit()).remove();
      },

      dna: function (parent, data) {
        var dnaSequence    = model.get("DNA"),
            dnaLength      = dnaSequence.length,
            geneticEngine  = model.geneticEngine(),
            junkDNA        = geneticEngine.junkSequence(),
            bonds          = data.dna[0] ? data.dna[0].bonds : 0,
            n              = nucleotides(),
            dna, dnaEnter;

        // DNA enter:
        dna = parent.select(".dna-layer").selectAll(".dna").data(data.dna);
        dnaEnter = dna.enter().append("g").attr({
          "class": "dna main-dna",
          "transform": translateFuncInv
        });
        // Coding sequence.
        n.model2px(model2px);
        n.sequence(dnaSequence);
        dnaEnter.append("g").attr("class", "coding-region").call(n);
        // Promoter sequence.
        n.sequence(geneticEngine.promoterSequence);
        n.startingPos(-geneticEngine.promoterSequence.length);
        dnaEnter.append("g").attr("class", "promoter-region").call(n);
        // Terminator sequence.
        n.sequence(geneticEngine.terminatorSequence);
        n.startingPos(dnaLength);
        dnaEnter.append("g").attr("class", "terminator-region").call(n);
        // Junk sequence.
        n.sequence(junkDNA.sequence);
        n.startingPos(-geneticEngine.promoterSequence.length - junkDNA.sequence.length);
        dnaEnter.append("g").attr("class", "junk-region").call(n);
        n.sequence(junkDNA.sequence);
        n.startingPos(dnaLength + geneticEngine.terminatorSequence.length);
        dnaEnter.append("g").attr("class", "junk-region").call(n);
        // DNA update:
        d3.transition(dna).attr("transform", translateFuncInv)
          .selectAll(".bonds").style("opacity", bonds);
        // DNA exit:
        d3.transition(dna.exit()).remove();
      },

      dnaComp: function (parent, data) {
        var dnaComplement  = model.get("DNAComplement"),
            dnaLength      = dnaComplement.length,
            geneticEngine  = model.geneticEngine(),
            junkDNA        = geneticEngine.junkSequence(),
            bonds          = data.dnaComp[0] ? data.dnaComp[0].bonds : 0,
            n              = nucleotides(),
            dnaComp, dnaCompEnter;

        // DNA Comp enter:
        dnaComp = parent.select(".dna-layer").selectAll(".dna-comp").data(data.dnaComp);
        dnaCompEnter = dnaComp.enter().append("g").attr({
          "class": "dna-comp",
          "transform": translateFuncInv
        });

        n.model2px(model2px).direction(2);
        // Coding sequence.
        n.sequence(dnaComplement);
        n.startingPos(0);
        dnaCompEnter.append("g").attr("class", "coding-region").call(n);
        // Promoter sequence.
        n.sequence(geneticEngine.promoterCompSequence);
        n.startingPos(-geneticEngine.promoterCompSequence.length);
        dnaCompEnter.append("g").attr("class", "promoter-region").call(n);
        // Terminator sequence.
        n.sequence(geneticEngine.terminatorCompSequence);
        n.startingPos(dnaLength);
        dnaCompEnter.append("g").attr("class", "terminator-region").call(n);
        // Junk sequence.
        n.sequence(junkDNA.compSequence);
        n.startingPos(-geneticEngine.promoterCompSequence.length - junkDNA.compSequence.length);
        dnaCompEnter.append("g").attr("class", "junk-region").call(n);
        n.sequence(junkDNA.compSequence);
        n.startingPos(dnaLength + geneticEngine.terminatorCompSequence.length);
        dnaCompEnter.append("g").attr("class", "junk-region").call(n);
        // DNA Comp update:
        d3.transition(dnaComp).attr("transform", translateFuncInv)
          .selectAll(".bonds").style("opacity", bonds);
        // DNA Comp exit:
        d3.transition(dnaComp.exit()).remove();
      },


      mrna: function (parent, data) {
        var mrnaSequence  = model.get("mRNA"),
            geneticEngine = model.geneticEngine(),
            stopCodons    = geneticEngine.stopCodonsHash(),
            bonds         = data.mrna[0] ? data.mrna[0].bonds : 0,
            dir           = data.mrna[0] ? data.mrna[0].direction : 1,
            mrna;

        // mRNA enter:
        mrna = parent.select(".dna-layer").selectAll(".mrna").data(data.mrna);
        mrna.enter().append("g").attr({
          "class": "mrna",
          "transform": translateFuncInv
        });
        // mRNA update:
        // (note that there is significant difference between DNA enter/update - for mRNA we call nucleotides()
        // also during update operation, as it will constantly change).
        mrna.call(nucleotides().model2px(model2px).sequence(mrnaSequence).backbone("RNA").direction(dir).stopCodonsHash(stopCodons));
        d3.transition(mrna).attr("transform", translateFuncInv)
          .selectAll(".bonds").style("opacity", bonds);
        // mRNA exit:
        d3.transition(mrna.exit()).remove();
      },

      polymeraseUnder: function (parent, data) {
        var polyUnder = parent.select(".under-dna-layer").selectAll(".polymerase-under").data(data.polymeraseUnder);
        polyUnder.enter().append("image").attr({
          "class": "polymerase-under",
          "x": model2px(W.POLY_UNDER * -0.5),
          "y": model2px(H.POLY_UNDER * -0.5),
          "width": model2px(W.POLY_UNDER),
          "height": model2px(H.POLY_UNDER),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/Polymerase_Under.svg",
          "transform": translateScaleFuncInv
        }).style("opacity", opacityFunc);
        d3.transition(polyUnder)
          .attr("transform", translateScaleFuncInv)
          .style("opacity", opacityFunc);
        d3.transition(polyUnder.exit()).remove();
      },

      polymeraseOver: function (parent, data) {
        var polyOver = parent.select(".over-dna-layer").selectAll(".polymerase-over").data(data.polymeraseOver);
        polyOver.enter().append("image").attr({
          "class": "polymerase-over",
          "x": model2px(W.POLY_OVER * -0.5),
          "y": model2px(H.POLY_OVER * -0.5),
          "width": model2px(W.POLY_OVER),
          "height": model2px(H.POLY_OVER),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/Polymerase_Over.svg",
          "transform": translateScaleFuncInv
        }).style("opacity", opacityFunc);
        d3.transition(polyOver)
          .attr("transform", translateScaleFuncInv)
          .style("opacity", opacityFunc);
        d3.transition(polyOver.exit()).remove();
      },

      nucleus: function (parent, data) {
        var nucleus = parent.select(".background-layer").selectAll(".nucleus").data(data.nucleus);
        nucleus.enter().append("image").attr({
          "class": "nucleus",
          "x": model2px(W.NUCLEUS * -0.5),
          "y": model2px(H.NUCLEUS * -0.5),
          "width": model2px(W.NUCLEUS),
          "height": model2px(H.NUCLEUS),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/BG_Nucleus.svg",
          "transform": translateFuncInv
        }).style("opacity", opacityFunc);
        d3.transition(nucleus)
          .attr("transform", translateFuncInv)
          .style("opacity", opacityFunc);
        d3.transition(nucleus.exit()).remove();
      },

      ribosomeBottom: function (parent, data) {
        var selection = parent.select(".over-dna-layer").selectAll(".ribosome-bottom").data(data.ribosomeBottom);
        selection.enter().append("image").attr({
          "class": "ribosome-bottom",
          "x": model2px(W.RIBO_BOTTOM * -0.5),
          "y": model2px(H.RIBO_BOTTOM * -0.5),
          "width": model2px(W.RIBO_BOTTOM),
          "height": model2px(H.RIBO_BOTTOM),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/Ribosome_bottom1.svg",
          "transform": translateFuncInv
        }).style("opacity", 0);
        d3.transition(selection)
          .attr("transform", translateFuncInv)
          .style("opacity", opacityFunc);
        d3.transition(selection.exit())
          .style("opacity", 0)
          .remove();
      },

      ribosomeTop: function (parent, data) {
        var selection = parent.select(".over-dna-layer").selectAll(".ribosome-top").data(data.ribosomeTop);
        selection.enter().append("image").attr({
          "class": "ribosome-top",
          "x": model2px(W.RIBO_TOP * -0.5),
          "y": model2px(H.RIBO_TOP * -0.5),
          "width": model2px(W.RIBO_TOP),
          "height": model2px(H.RIBO_TOP),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/Ribosome_top1.svg",
          "transform": translateFuncInv
        }).style("opacity", 0);
        d3.transition(selection)
          .attr("transform", translateFuncInv)
          .style("opacity", opacityFunc);
        d3.transition(selection.exit())
          .style("opacity", 0)
          .remove();
      },

      ribosomeUnder: function (parent, data) {
        var selection = parent.select(".under-dna-layer").selectAll(".ribosome-under").data(data.ribosomeUnder);
        selection.enter().append("image").attr({
          "class": "ribosome-under",
          "x": model2px(W.RIBO_UNDER * -0.5),
          "y": model2px(H.RIBO_UNDER * -0.5),
          "width": model2px(W.RIBO_UNDER),
          "height": model2px(H.RIBO_UNDER),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/Ribosome_under.svg",
          "transform": translateFuncInv
        }).style({
          "opacity": opacityFunc
        });
        d3.transition(selection)
          .attr("transform", translateFuncInv)
          .style("opacity", opacityFunc);
        d3.transition(selection.exit()).remove();
      },

      ribosomeOver: function (parent, data) {
        var selection = parent.select(".over-dna-layer").selectAll(".ribosome-over").data(data.ribosomeOver);
        selection.enter().append("image").attr({
          "class": "ribosome-over",
          "x": model2px(W.RIBO_OVER * -0.5),
          "y": model2px(H.RIBO_OVER * -0.5),
          "width": model2px(W.RIBO_OVER),
          "height": model2px(H.RIBO_OVER),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/Ribosome_over.svg",
          "transform": translateFuncInv
        }).style("opacity", opacityFunc);
        d3.transition(selection)
          .attr("transform", translateFuncInv)
          .style("opacity", opacityFunc);
        d3.transition(selection.exit()).remove();
      },

      trna: function (parent, data) {
        var geneticEngine = model.geneticEngine(),

            codonWidth = 3 * nucleotides.WIDTH,
            offset = (codonWidth - W.TRNA) * 0.55,

            selection, enter, update, exit;

        selection = parent.select(".top-layer").selectAll(".trna").data(data.trna, function (d) { return d.index; });
        // The most outer container can be used to set easily position offset.
        // While the inner g elements provides translation for "ideal" tRNA position
        // close to the mRNA and optional rotation.
        enter = selection.enter().append("g").attr({
          "class": "trna",
          "display": function (d) { return d.index < 0 ? "none" : "inline"; },
          "transform": function (d, i) {
            return "translate(" + model2px(nucleotides.HEIGHT * 2) + ", " + model2px(-2.78) + ") " +
                    translateFuncInv(d, i) + " rotate(30)";
          }
        }).style("opacity", opacityFunc);

        enter.append("g")
          .attr("transform", "translate(0, " + model2px(-H.A) + ")")
          .call(nucleotides()
                  .model2px(model2px)
                  .sequence(function (d) { return geneticEngine.codonComplement(d.index); })
                  .backbone(false)
                  .randomEnter(false));

        enter.append("image").attr({
          "class": "trna-neck",
          "x": model2px(0.52 * (codonWidth - W.TRNA_NECK)),
          "y": model2px(-H.TRNA_NECK -H.TRNA * 0.95 - H.A * 0.92),
          "width": model2px(W.TRNA_NECK),
          "height": model2px(H.TRNA_NECK),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/tRNA_neck.svg"
        });
        enter.append("image").attr({
          "class": "trna-base",
          "x": model2px(offset),
          "y": model2px(-H.TRNA - H.A * 0.92),
          "width": model2px(W.TRNA),
          "height": model2px(H.TRNA),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/tRNA_base.svg"
        });

        update = d3.transition(selection)
          .attr("transform", translateFuncInv)
          .style("opacity", opacityFunc);
        update.select(".trna-neck").style("opacity", function (d) { return d.neck; });

        exit = d3.transition(selection.exit())
          .attr("transform", function (d, i) {
            return "translate(" + model2px(nucleotides.HEIGHT * -5) + ", " + model2px(nucleotides.HEIGHT * -4) + ") " +
                    translateFuncInv(d, i) + " rotate(-30)";
          })
          .style("opacity", 0);
        exit.selectAll(".bonds").style("opacity", 0);
        exit.remove();
      },

      viewPort: function (parent, data) {
        var position   = data.viewPort[0].position,
            xy         = data.viewPort[0].xy || [],
            ease       = data.viewPort[0].ease,
            height     = model.get("viewPortHeight"),
            viewport, viewBox;

        function updateModel() {
          // TODO: this is slow as it triggers recalculation
          // of the model state!
          model.set({
            "viewPortX": xy[0] || position * nucleotides.WIDTH,
            "viewPortY": xy[1] || 0
          });
        }

        viewport = d3.select(".viewport");
        viewBox = viewport.attr("viewBox").split(" ");
        // Update viewport X coordinate.
        viewBox[0] = model2px(xy[0] ? xy[0] : position * nucleotides.WIDTH);
        viewBox[1] = model2pxInv(xy[1] ? xy[1] + height : height);
        viewport = d3.transition(viewport).attr("viewBox", viewBox.join(" "));
        // Duck test whether viewportUpdate is a transition or selection.
        // See D3 API Reference - d3.transition(selection) returns  transition
        // only when called in the context of other transition. Otherwise it
        // returns selection.
        if (typeof viewport.duration === "function") {
          // Transition!
          viewport.ease(ease);
          viewport.each("end.viewport-update", updateModel);
        } else {
          // Selection!
          updateModel();
        }
      },

      background: function (parent, data) {
        var gradient;

        if (parent.select("#transcription-bg").empty()) {
          // Transcription.
          gradient = parent.append("defs").append("linearGradient")
            .attr("id", "transcription-bg")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%");
          gradient.append("stop")
            .attr("stop-color", "#C8DD69")
            .attr("offset", "0%");
          gradient.append("stop")
            .attr("stop-color", "#778B3D")
            .attr("offset", "100%");
        }
        d3.transition(d3.select(".plot")).style("fill", data.background[0].color);
      }
    };
  }

  GeneticElementsRenderer.W = W;
  GeneticElementsRenderer.H = H;

  return GeneticElementsRenderer;
});

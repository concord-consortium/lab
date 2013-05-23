/*global define, $, d3 */

define(function (require) {
  var console      = require('common/console'),
      nucleotides  = require('md2d/views/nucleotides'),
      StateManager = require('common/views/state-manager'),

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
      },

      MAIN_STATE = {
        "intro-cells":      "intro",
        "intro-zoom1":      "intro",
        "intro-zoom2":      "intro",
        "intro-zoom3":      "intro",
        "intro-polymerase": "intro",
        "dna":                 "transcription",
        "transcription":       "transcription",
        "transcription-end":   "transcription",
        "after-transcription": "transcription",
        "before-translation":     "translation",
        "translation":            "translation",
        "translation-end":        "translation"
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

  function GeneticRenderer(container, parent, model) {
    var api,
        model2px = parent.model2px,
        model2pxInv = parent.model2pxInv,

        g = null,
        trnaG = null,
        currentTrans = null,
        currentMainState = null,

        stateMgr = new StateManager([
          "dnaIntro", "cells",
          "dna1", "dna2", "dna3",
          "polymeraseUnder", "polymeraseOver",
          "dna", "dnaComp", "mrna"
        ]);

    function init() {
      // Redraw DNA / mRNA when genetic engine state is changed.
      model.geneticEngine().on("change", render);
      // Play animation when there is a "transition" event.
      model.geneticEngine().on("transition", stateTransition);

      defineStates();
    }

    function defineStates() {
      var viewPortWidth  = model.get("viewPortWidth"),
          viewPortHeight = model.get("viewPortHeight");

      stateMgr.newState("intro-cells", {
        dnaIntro: [{
          translateX: W.CELLS * 0.567,
          translateY: H.CELLS * 0.445
        }],
        cells: [{
          x: -W.CELLS * 0.567,
          y: -H.CELLS * 0.445,
          scale: 1
        }],
        dna1: [{
          scale: 0.13,
          opacity: 0
        }]
      });
      stateMgr.extendLastState("intro-zoom1", {
        dnaIntro: [{
          translateX: 2.5,
          translateY: 1.5
        }],
        cells: [{
          scale: 6
        }],
        dna1: [{
          scale: 0.78,
          opacity: 5
        }],
        dna2: [{
          scale: 0.5,
          opacity: 0
        }]
      });
      stateMgr.extendLastState("intro-zoom2", {
        dnaIntro: [], // keep, but do not update.
        cells: [{
          scale: 24
        }],
        dna1: [{
          scale: 3.12,
          opacity: 0
        }],
        dna2: [{
          scale: 2,
          opacity: 1
        }],
        dna3: [{
          scale: 0.2,
          opacity: 0
        }]
      });
      stateMgr.extendLastState("intro-zoom3-s0", {
        dnaIntro: [],
        cells: [],
        dna2: [{
          scale: 3.8,
          opacity: 0
        }],
        dna3: [{
          scale: 0.4,
          opacity: 1
        }]
      });
      stateMgr.extendLastState("intro-zoom3", {
        dnaIntro: [],
        cells: [],
        dna3: [{
          scale: 0.6
        }],
        polymeraseUnder: [{
          scale: 0.2,
          translateX: -0.65 * viewPortWidth,
          translateY: -0.5 * viewPortHeight,
          opacity: 0
        }]
      });
      stateMgr.extendLastState("intro-polymerase-s0", {
        dnaIntro: [],
        cells: [],
        dna3: [],
        polymeraseUnder: [{
          scale: 0.8,
          translateX: 0,
          translateY: 0,
          opacity: 1
        }],
        polymeraseOver: [{
          scale: 0.8,
          opacity: 0
        }]
      });
      stateMgr.extendLastState("intro-polymerase", {
        dnaIntro: [],
        cells: [],
        dna3: [],
        polymeraseUnder: [{
          scale: 1,
        }],
        polymeraseOver: [{
          scale: 1,
          opacity: 1
        }]
      });
      stateMgr.extendLastState("dna-s0", {
        dnaIntro: [],
        cells: [],
        dna3: [{
          scale: 1.5
        }],
        polymeraseUnder: [{
          scale: 2.5
        }],
        polymeraseOver: [{
          scale: 2.5
        }]
      });
      stateMgr.extendLastState("dna", {
        dnaIntro: [{
          opacity: 0
        }],
        dna: [{
          translateY: viewPortHeight / 2 + nucleotides.HEIGHT,
          bonds: 1
        }],
        dnaComp: [{
          translateY: viewPortHeight / 2 - nucleotides.HEIGHT,
          bonds: 1
        }]
      });
      stateMgr.extendLastState("transcription", {
        dna: [{
          translateY: viewPortHeight / 2 + 2.5 * nucleotides.HEIGHT,
          bonds: 0
        }],
        dnaComp: [{
          translateY: viewPortHeight / 2 - 2.5 * nucleotides.HEIGHT,
          bonds: function (i, mrnaLen) { return i < mrnaLen ? 1 : 0; }
        }],
        mrna: [{
          translateY: viewPortHeight / 2 - 0.5 * nucleotides.HEIGHT,
          bonds: 1,
          direction: 1
        }]
      });
      stateMgr.extendLastState("transcription-end", {
        dna: [],
        dnaComp: [],
        mrna: [],
        polymeraseOver: [{
          translateX: function () { return model.get("viewPortX") + 0.5 * viewPortWidth; },
          translateY: 0.5 * viewPortHeight,
          scale: 2.5,
          opacity: 0
        }]
      });
      stateMgr.extendLastState("after-transcription", {
        dna: [],
        dnaComp: [],
        mrna: [],
        polymeraseOver: [{
          opacity: 1
        }]
      });
      stateMgr.extendLastState("before-translation", {
        mrna: [{
          translateY: 1.5 * nucleotides.HEIGHT,
          direction: 2,
          bonds: 0
        }],
      });
    }

    function stateTransition() {
      var state = getState(),
          geneticEngine = model.geneticEngine();

      switch(state.name) {
        case "intro-zoom1":
          introZoom1();
          break;
        case "intro-zoom2":
          introZoom2();
          break;
        case "intro-zoom3":
          introZoom3();
          break;
        case "intro-polymerase":
          introPolymerase();
          break;
        case "dna":
          dna();
          break;
        case "transcription":
          if (state.step === 0) {
            transcription0();
          } else {
            transcription();
          }
          break;
        case "transcription-end":
          transcription();
          break;
        case "after-transcription":
          afterTranscription();
          break;
        case "before-translation":
          prepareForTranslation();
          break;
        case "translation":
          if (state.step === 0) {
            attachRibosome();
          } else {
            translateStep(state.step);
          }
          break;
        case "translation-end":
          finishTranslation();
          break;
      }

      currentTrans.each("end.trans-end", function() {
        // Notify engine that transition has ended.
        geneticEngine.transitionEnded();
      });
    }

    /**
     * Renders DNA-related graphics using "DNA" and "geneticEngineState"
     * options of the model.
     */
    function render() {
      var state     = getState(),
          stateData = stateMgr.getState(state.name),
          mainState = MAIN_STATE[state.name];

      // Trick to cancel all current transitions. It isn't possible explicitly
      // so we have to start new, fake transitions, which will cancel previous
      // ones. Note that some transitions can be applied to elements that live
      // outside g.genetics element, e.g. viewport and background. So, it isn't
      // enough to use d3.selectAll("g.genetics *").
      d3.selectAll("*").transition().delay(0);
      currentTrans = null;

      if (g === null) {
        // Create a new container.
        g = container.append("g").attr("class", "genetics");
      }

      if (currentMainState !== mainState) {
        // cleanup();
        renderIntroElements(g, stateData);
        renderTranscriptionElements(g, stateData);
        renderTranslationElements(g, stateData);
        // Update current main state!
        currentMainState = mainState;
      }

      renderBackground();
      scrollContainer(true);

      switch(state.name) {
        case "intro-cells":
        case "intro-zoom1":
        case "intro-zoom2":
        case "intro-zoom3":
        case "intro-polymerase":
          renderIntroElements(g, stateData);
          break;
        case "dna":
        case "transcription":
        case "transcription-end":
        case "after-transcription":
          renderAll(g, stateData);
          break;
        case "before-translation":
          renderTranslationElements(g, stateData);
          break;
        case "translation":
          renderTranslationElements(g, stateData);
          break;
      }
    }

    function cleanup() {
      var state = getState();

      // Cleanup.
      container.selectAll("g.genetics").remove();

      if (!model.get("DNA") || state.name === "translation-end") {
        // When DNA is not defined (=== "", undefined or null) or
        // translation is ended, genetic renderer doesn't have to do
        // anything.
        return;
      }

      // Create a new container.
      g       = container.append("g").attr("class", "genetics");
      trnaG   = g.append("g").attr("class", "trna-cont");

      preloadImages();
    }

    function preloadImages() {
      var defs = g.append("defs");

      defs.append("image").attr({
        "id": "trna-neck-img",
        "width": model2px(W.TRNA_NECK),
        "height": model2px(H.TRNA_NECK),
        "preserveAspectRatio": "none",
        "xlink:href": "resources/dna/tRNA_neck.svg"
      });
      defs.append("image").attr({
        "id": "trna-base-img",
        "width": model2px(W.TRNA),
        "height": model2px(H.TRNA),
        "preserveAspectRatio": "none",
        "xlink:href": "resources/dna/tRNA_base.svg"
      });
    }

    /**
     * Returns genetic engine state object, already parsed.
     * e.g.
     * {
     *   "name": "translation",
     *   "step": 10
     * }
     *
     * @private
     * @return {Object} parsed genetic engine state object.
     */
    function getState() {
      return model.geneticEngine().state();
    }

    /**
     * Returns a new, chained transition.
     * This transition will be executed when previous one ends.
     *
     * @private
     * @return {d3 transtion} d3 transtion object.
     */
    function nextTrans() {
      var newTrans;
      // TODO: this first check is a workaround.
      // Ideal scenario would be to call always:
      // currentTrans[name] = currentTrans[name].transition();
      // but it seems to fail when transition has already ended.
      if (currentTrans && currentTrans.node().__transition__) {
        // Some transition is currently in progress, chain a new transition.
        newTrans = currentTrans.transition();
      } else {
        // All transitions ended, just create a new one.
        newTrans = d3.transition();
      }
      currentTrans = newTrans;
      return newTrans;
    }

    /**
     * Scrolls the container. When 'shift' is not provided,
     * viewport position is based on the current state.
     *
     * @private
     * @param  {boolean} suppressAnimation when true, there is no animation.
     * @param  {number} shift              desired scroll position (optional).
     */
    function scrollContainer(suppressAnimation, shift, ease) {
      var dnaLen = model.get("DNA").length,
          state = getState(),
          viewBox;

      function updateViewPort() {
        model.set("viewPortX", shift * nucleotides.WIDTH);
      }

      function calculateViewportPos(sateName) {
        switch(sateName) {
          case "dna":
          case "before-translation":
            return -2;
          case "transcription":
            return Math.min(dnaLen - 10, Math.max(0, state.step - 6)) - 2;
          case "transcription-end":
          case "after-transcription":
            return Math.max(0, dnaLen - 10) - 2;
          case "translation":
            return Math.max(0, 3 * (state.step - 3)) - 2;
          default:
            return 0;
        }
      }

      if (arguments.length < 2) {
        // shift undefined, calculate it.
        shift = calculateViewportPos(state.name);
      }
      if (!suppressAnimation) {
        ease = ease || "linear";
        viewBox = d3.select(".viewport").attr("viewBox").split(" ");
        viewBox[0] = model2px(shift * nucleotides.WIDTH); // update viewport X coordinate.
        currentTrans.select(".viewport").ease(ease).attr("viewBox", viewBox.join(" "));
        currentTrans.each("end.viewport-update", updateViewPort);
      } else {
        updateViewPort();
      }
    }

    /**
     * Sets color of the background using current state to determine it.
     * @private
     */
    function renderBackground() {
      var ge = model.geneticEngine(),
          gradient;

      if (g.select("#transcription-bg").empty()) {
        // Transcription.
        gradient = g.append("defs").append("linearGradient")
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

      if (ge.stateBefore("after-transcription")) {
        d3.select(".plot").style("fill", "url(#transcription-bg)");
      } else if (ge.stateBefore("before-translation")) {
        // Transition between transcription and translation.
        d3.select(".plot").style("fill", "#8492ef");
      } else {
        // Translation.
        d3.select(".plot").style("fill", "#B8EBF0");
      }
    }

    /******************************************************
     *                  Render methods                    *
     ******************************************************
     * They are called from .render() method and are used
     * to render a given state without any animation.
     */

    function scaleFunc(d) {
      return "scale(" + d.scale + ")";
    }
    function opacityFunc(d) {
      return d.opacity;
    }
    function translateFunc(d) {
      var x = d.translateX || 0,
          y = d.translateY || 0;
      x = typeof x === "number" ? x : x(); // used by polymerase!
      return "translate(" + model2px(x) + " " + model2px(y) + ")";
    }
    function translateFuncInv(d) {
      var x = d.translateX || 0,
          y = d.translateY || 0;
      return "translate(" + model2px(x) + " " + model2pxInv(y) + ")";
    }
    function translateScaleFunc(d) {
      return translateFunc(d) + " " + scaleFunc(d);
    }
    function xFunc(d) {
      return model2px(d.x);
    }
    function yFunc(d) {
      return model2px(d.y);
    }

    function renderAll(parent, data) {
      console.time("dna-render");
      // renderIntroElements(parent, data);
      renderTranscriptionElements(parent, data);
      // renderTranslationElements(parent, data);
      console.timeEnd("dna-render");
    }

    function renderIntroElements(parent, data) {
      parent.each(function() {
        var dna3units = 14,
            introG, introGEnter, cells,
            dna1, dna2, dna3, dna3Enter,
            polyUnder;

        console.log("rendering...");

        introG = g.selectAll(".dna-intro").data(data.dnaIntro);
        introGEnter = introG.enter().append("g").attr({
          "class": "dna-intro",
          "transform": translateFunc
        }).style({
          "opacity": opacityFunc
        });
        d3.transition(introG).attr({
          "transform": translateFunc
        }).style({
          "opacity": opacityFunc
        });
        d3.transition(introG.exit()).remove();

        cells = introG.selectAll(".cells").data(data.cells);
        cells.enter().append("image").attr({
          "class": "cells",
          "width": model2px(W.CELLS),
          "height": model2px(H.CELLS),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/Cells.svg",
          "x": xFunc,
          "y": yFunc,
          "transform": scaleFunc
        });
        d3.transition(cells).attr({
          "x": xFunc,
          "y": yFunc,
          "transform": scaleFunc
        });
        d3.transition(cells.exit()).remove();

        dna1 = introG.selectAll(".dna1").data(data.dna1);
        dna1.enter().append("image").attr({
          "class": "dna1",
          "x": model2px(W.DNA1 * -0.5),
          "y": model2px(H.DNA1 * -0.5),
          "width": model2px(W.DNA1),
          "height": model2px(H.DNA1),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/DNA_InsideNucleus_1.svg",
          "transform": scaleFunc
        }).style({
          "opacity": opacityFunc
        });
        d3.transition(dna1).attr({
          "transform": scaleFunc
        }).style({
          "opacity": opacityFunc
        });
        d3.transition(dna1.exit()).remove();

        dna2 = introG.selectAll(".dna2").data(data.dna2);
        dna2.enter().append("image").attr({
          "class": "dna2",
          "x": model2px(W.DNA2 * -0.5),
          "y": model2px(H.DNA2 * -0.404),
          "width": model2px(W.DNA2),
          "height": model2px(H.DNA2),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/DNA_InsideNucleus_2.svg",
          "transform": scaleFunc
        }).style({
          "opacity": opacityFunc
        });
        d3.transition(dna2).attr({
          "transform": scaleFunc
        }).style({
          "opacity": opacityFunc
        });
        d3.transition(dna2.exit()).remove();

        dna3 = introG.selectAll(".dna3").data(data.dna3);
        dna3Enter = dna3.enter().append("g").attr({
          "class": "dna3",
          "transform": scaleFunc
        }).style({
          "opacity": opacityFunc
        });
        dna3Enter.selectAll("dna3-unit").data(new Array(dna3units)).enter().append("image").attr({
          "class": "dna3-unit",
          "x": function (d, i) { return (i - dna3units * 0.5) * model2px(W.DNA3) * 0.98; },
          "y": model2px(H.DNA3 * -0.5),
          "width": model2px(W.DNA3),
          "height": model2px(H.DNA3),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/DoubleHelix_Unit.svg"
        });
        d3.transition(dna3).attr({
          "transform": scaleFunc
        }).style({
          "opacity": opacityFunc
        });
        d3.transition(dna3.exit()).remove();

        polyUnder = introG.selectAll(".polymerase-under").data(data.polymeraseUnder);
        polyUnder.enter().insert("image", ".dna3").attr({
          "class": "polymerase-under",
          "x": model2px(W.POLY_UNDER * -0.5),
          "y": model2px(H.POLY_UNDER * -0.5),
          "width": model2px(W.POLY_UNDER),
          "height": model2px(H.POLY_UNDER),
          "preserveAspectRatio": "none",
          "xlink:href": "resources/dna/Polymerase_Under.svg",
          "transform": translateScaleFunc
        }).style({
          "opacity": opacityFunc
        });
        d3.transition(polyUnder).attr({
          "transform": translateScaleFunc
        }).style({
          "opacity": opacityFunc
        });
        d3.transition(polyUnder.exit()).remove();

        renderPolymeraseOver(introG, data);
      });
    }

    function renderTranscriptionElements(parent, data) {
      parent.each(function() {
        var dnaSequence    = model.get("DNA"),
            mrnaSequence   = model.get("mRNA"),
            dnaComplement  = model.get("DNAComplement"),
            dnaLength      = dnaSequence.length,
            mrnaLength     = mrnaSequence.length,
            geneticEngine  = model.geneticEngine(),
            junkDNA        = geneticEngine.junkSequence(50),
            n              = nucleotides(),
            dna, dnaEnter,
            dnaComp, dnaCompEnter;

        // DNA enter:
        dna = g.selectAll(".dna").data(data.dna);
        dnaEnter = dna.enter().insert("g", ".dna-intro").attr({
          "class": "dna",
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
          .selectAll(".bonds")
            .style("opacity", function () {
              return data.dna[0].bonds;
            });
        // DNA exit:
        d3.transition(dna.exit()).remove();

        // DNA Comp enter:
        dnaComp = g.selectAll(".dna-comp").data(data.dnaComp);
        dnaCompEnter = dnaComp.enter().insert("g", ".dna-intro").attr({
          "class": "dna-comp",
          "transform": translateFuncInv
        });

        n.direction(2);
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
          .selectAll(".bonds")
            .style("opacity", function (d, i) {
              var bonds = data.dnaComp[0].bonds;
              return typeof bonds === "number" ? bonds : bonds(i, mrnaLength);
            });
        // DNA Comp exit:
        d3.transition(dnaComp.exit()).remove();

        renderMRNA(g, data);

        renderPolymeraseOver(g, data);
      });
    }

    function renderTranslationElements(parent, data) {
      renderMRNA(parent, data);
    }

    // It's common both for transcription and translation.
    function renderPolymeraseOver(parent, data) {
      var polyOver;

      polyOver = parent.selectAll(".polymerase-over").data(data.polymeraseOver);
      polyOver.enter().append("image").attr({
        "class": "polymerase-over",
        "x": model2px(W.POLY_OVER * -0.5),
        "y": model2px(H.POLY_OVER * -0.5),
        "width": model2px(W.POLY_OVER),
        "height": model2px(H.POLY_OVER),
        "preserveAspectRatio": "none",
        "xlink:href": "resources/dna/Polymerase_Over.svg",
        "transform": translateScaleFunc
      }).style({
        "opacity": opacityFunc
      });
      d3.transition(polyOver).attr({
        "transform": translateScaleFunc
      }).style({
        "opacity": opacityFunc
      });
      d3.transition(polyOver.exit()).remove();
    }

    function renderMRNA(parent, data) {
      var mrnaSequence  = model.get("mRNA"),
          geneticEngine = model.geneticEngine(),
          stopCodons    = geneticEngine.stopCodonsHash(),
          mrnaData      = data.mrna[0],
          dir           = mrnaData ? mrnaData.direction : 1;

      // mRNA enter:
      mrna = parent.selectAll(".mrna").data(data.mrna);
      mrna.enter().append("g").attr({
        "class": "mrna",
        "transform": translateFuncInv
      });
      // mRNA update:
      // (note that there is significant difference between DNA enter/update - for mRNA we call nucleotides()
      // also during update operation, as it will constantly change).
      mrna.call(nucleotides().model2px(model2px).sequence(mrnaSequence).backbone("RNA").direction(dir).stopCodonsHash(stopCodons));
      d3.transition(mrna).attr("transform", translateFuncInv)
        .selectAll(".bonds")
          .style("opacity", function () {
            return mrnaData.bonds;
          });
      // mRNA exit:
      d3.transition(mrna.exit()).remove();
    }

    function transitionTo(t, renderFunc, state, bgEnd) {
      renderFunc(t, stateMgr.getState(state));
      t.each("start", function () {
        console.log("transition to :: " + state + " START");
        if (!bgEnd) renderBackground();
      });
      t.each("end", function() {
        console.log("transition to :: " + state + " END");
        if (bgEnd) renderBackground();
      });
    }

    function introZoom1() {
      var t = nextTrans().ease("cubic").duration(3000);
      transitionTo(t, renderIntroElements, "intro-zoom1");
    }

    function introZoom2() {
      var t = nextTrans().ease("linear").duration(3000);
      transitionTo(t, renderIntroElements, "intro-zoom2");
    }

    function introZoom3() {
      var t = nextTrans().ease("linear").duration(2000);
      transitionTo(t, renderIntroElements, "intro-zoom3-s0");

      t = nextTrans().ease("quad-out").duration(3300);
      transitionTo(t, renderIntroElements, "intro-zoom3");
    }

    function introPolymerase() {
      var t = nextTrans().ease("quad-out").duration(3000);
      transitionTo(t, renderIntroElements, "intro-polymerase-s0");

      t = nextTrans().ease("cubic-in-out").duration(1000);
      transitionTo(t, renderIntroElements, "intro-polymerase");
    }

    function dna() {
      var t = nextTrans().duration(2000);
      transitionTo(t, renderIntroElements, "dna-s0");

      t = nextTrans().duration(700);
      transitionTo(t, renderIntroElements, "dna");
      transitionTo(t, renderTranscriptionElements, "dna");
    }

    function transcription0() {
      var t = nextTrans().duration(1500);
      transitionTo(t, renderTranscriptionElements, "transcription");
      // Reselect bonds transition, change duration to 250.
      t.selectAll(".bonds").duration(250);
    }

    function transcription() {
      var t = nextTrans().duration(500);
      transitionTo(t, renderTranscriptionElements, "transcription");
      // Reselect bonds transition, change duration to ease to cubic.
      t.selectAll(".bonds").ease("cubic");
      scrollContainer();
    }

    function afterTranscription() {
      var t = nextTrans().ease("cubic-in-out").duration(700);
      transitionTo(t, renderTranscriptionElements, "after-transcription", true);
    }

    function renderTranscription() {
      renderTranscriptionElements();
      transcription0(true);
    }

    function renderTranscriptionEnd() {
      renderTranscription(model.get("mRNA").length);
    }

    function renderAfterTranscription() {
      renderTranscriptionEnd();
      showPolymerase(true);
    }

    function showPolymerase(suppressAnimation) {
      var t = suppressAnimation ? g : nextTrans().ease("cubic-in-out").duration(700);

      appendNucleusAndPolymerase();
      // Ribosome (top-bottom and under-over).
      appendRibosome();
      // Hide under-over version.
      g.selectAll(".ribosome-under, .ribosome-over").style("opacity", 0);

      t.selectAll(".polymerase-under, .polymerase-over")
        .style("opacity", 1);

      if (!suppressAnimation) {
        t.each("end", function () {
          renderBackground();
        });
      }
    }

    function renderBeforeTranslation() {
      renderTranslationElements(0);
      g.selectAll(".ribosome-under, .ribosome-over").style("opacity", 0);
    }

    function renderTranslationElementsOLD(step) {
      var mRNA       = model.get("mRNA"),
          stopCodons = model.geneticEngine().stopCodonsHash();

      mrnaG.call(nucleotides().model2px(model2px).sequence(mRNA).direction(2).backbone("RNA").stopCodonsHash(stopCodons));
      mrnaG.selectAll(".nucleotide .bonds").style("opacity", function (d, i) {
        // Show bonds only of 6 nucleotides with tRNAs above them.
        return i < 3 * (step - 2) || i >= 3 * step ? 0 : 1;
      });

      mrnaG.attr("transform", "translate(0, " + model2pxInv(1.5 * nucleotides.HEIGHT) + ")");
      appendRibosome();

      moveRibosome(step, true);

      // Note that order of these if statement is important.
      // It ensures that tRNA on the left is the first child,
      // while the second tRNA is the last child.
      if (step > 1) {
        appendTRNA(step - 2);
        // Hide tRNA neck of the first tRNA (there are two visible only).
        trnaG.select(".trna:first-child .trna-neck").style("opacity", 0);
      }
      if (step > 0) {
        appendTRNA(step - 1);
      }
    }

    /******************************************************
     *                Transition methods                  *
     ******************************************************
     * They are called from .stateTransition() method and
     * are used to transition from one state to another
     * using animations.
     */

    function prepareForTranslation() {
      var cx = model2px(5 * 0.5 - 2 * nucleotides.WIDTH),
          vx = model2px((model.get("viewPortX") + 0.5 * model.get("viewPortWidth"))),
          cy = model2pxInv(3 * 0.5),
          t;

      t = nextTrans().ease("cubic-in-out").duration(1000);

      // Show nucleus image and set appropriate background.
      t.each("start", function () {
        d3.select(".genetics .nucleus").style("opacity", 1);
        d3.select(".plot").style("fill", "#8492ef");
      });

      t.selectAll(".polymerase-under, .polymerase-over")
        .attr("transform", "translate(" + vx + ", " + cy + ") scale(1.4)");
      t.select(".polymerase-over")
        .style("opacity", 0);

      nextTrans().ease("cubic-in-out").duration(1500)
        .selectAll(".polymerase-under, .polymerase-over")
          .attr("transform", "translate(" + (vx + model2px(5)) + ", " + (cy - model2px(2)) + ") scale(0.7)");

      t = nextTrans().ease("cubic-in-out").duration(1500);
      scrollContainer(false, -2, "cubic-in-out");

      // Set background for translation.
      currentTrans.each("end", function () {
        d3.select(".genetics .nucleus").style("opacity", 1);
        d3.select(".plot").style("fill", "#B8EBF0");
      });

      t = nextTrans().ease("cubic").duration(1000);
      t.select(".nucleus")
        .attr("transform", "translate(" + cx + ", " + model2pxInv(0) + ")");
      t.select(".dna")
        .attr("transform", "translate(0, " + model2pxInv(4 * nucleotides.HEIGHT) + ")");
      t.select(".dna-comp")
        .attr("transform", "translate(0, " + model2pxInv(2 * nucleotides.HEIGHT) + ")");
      t.selectAll(".mrna .bonds, .dna-comp .bonds").duration(250)
        .style("opacity", 0);

      t = nextTrans().ease("cubic-out").duration(1000);
      t.select(".nucleus")
        .attr("transform", "translate(" + cx + ", " + model2pxInv(H.NUCLEUS * -0.5) + ")");
      t.select(".dna")
        .attr("transform", "translate(0, " + model2pxInv(-1 * nucleotides.HEIGHT) + ")");
      t.select(".dna-comp")
        .attr("transform", "translate(0, " + model2pxInv(-3 * nucleotides.HEIGHT) + ")");
      t.select(".mrna")
        .attr("transform", "translate(0, " + model2pxInv(2.5 * nucleotides.HEIGHT) + ")");

      // Hacky way to change direction of the nucleotides. If we transform
      // directly from scale(1, 1) to scale(1, -1), resulting transition looks
      // strange (involves rotation etc.). So, first change scale to value very
      // close to 0, than swap sign and finally change it to -1. Everything
      // should look as expected.
      t = nextTrans().ease("cubic-out").duration(250);
      t.selectAll(".mrna .nucleotide g.scale").attr("transform", "scale(1, 1e-10)");

      t.select(".mrna")
        .attr("transform", "translate(0, " + model2pxInv(2 * nucleotides.HEIGHT) + ")");

      // Replace images with rotated versions.
      t.each("end", function () {
        mrnaG.call(nucleotides().model2px(model2px).sequence(model.get("mRNA")).backbone("RNA").direction(2));
        mrnaG.selectAll(".nucleotide g.scale").attr("transform", "scale(1, -1e-10)");
      });

      t = nextTrans().ease("cubic-out").duration(250);
      t.selectAll(".mrna .nucleotide g.scale").attr("transform", "scale(1, -1)");

      t.select(".mrna")
        .attr("transform", "translate(0, " + model2pxInv(1.5 * nucleotides.HEIGHT) + ")");

      t.each("end", function () {
        // This will cleanup a lot of things and ensure that new elements
        // required for translation (but not for this intro) are added.
        render();
      });
    }

    function attachRibosome() {
      var t;
      // Ribosome fade in.
      t = nextTrans().ease("cubic-in-out").duration(1000);
      t.each("start", function () {
        g.selectAll(".ribosome-top, .ribosome-bottom")
          .style("opacity", 1);
      });
      t.select(".ribosome-bottom")
        .attr("transform", ribosomeBottomPos(0));
      t = nextTrans().ease("cubic-in-out").duration(1000);
      t.select(".ribosome-top")
        .attr("transform", ribosomeTopPos(0));


      t = nextTrans().ease("cubic-in-out").duration(500);
      t.selectAll(".ribosome-top, .ribosome-bottom")
        .style("opacity", 0);
      t.selectAll(".ribosome-under, .ribosome-over")
        .style("opacity", 1);
    }

    function translateStep(step) {
      var codonIdx = step - 1,
          geneticEngine = model.geneticEngine(),
          newAADuration = 1000,
          shiftDuration = 400,
          t;

      appendTRNA(codonIdx);
      trnaG.select(".trna:last-child")
        .attr("transform", "translate(" + model2px(nucleotides.HEIGHT * 2) + ", " + model2px(-2.78) + ")")
          .select(".rot")
            .attr("transform", "rotate(30)")
            // Bonds subselection.
            .selectAll(".bonds")
              .style("opacity", 0);

      t = nextTrans().duration(newAADuration);
      t.each("start", function () {
        geneticEngine.translationStepStarted(codonIdx, 1.45 + codonIdx * 3 * nucleotides.WIDTH, 3.95,
            0.53 + codonIdx * 3 * nucleotides.WIDTH, 1.57, newAADuration);
      });

      t.select(".trna-cont .trna:last-child")
        .attr("transform", "translate(0, 0)")
          // Rotation g element subselection.
          .select(".rot")
            .attr("transform", "")
            // Bonds subselection.
            .selectAll(".bonds").ease("cubic")
              .style("opacity", 1);

      t.selectAll(".mrna .nucleotide:nth-child(" + (3 * codonIdx + 1) + ") .bonds, " +
                  ".mrna .nucleotide:nth-child(" + (3 * codonIdx + 2) + ") .bonds, " +
                  ".mrna .nucleotide:nth-child(" + (3 * codonIdx + 3) + ") .bonds")
        .ease("cubic")
        .style("opacity", 1);

      moveRibosome(step);
      scrollContainer();

      if (step > 1) {
        t = nextTrans().duration(100);
        t.select(".trna-cont .trna:nth-child(" + (step === 2 ? 1 : 2) + ") .trna-neck")
          .style("opacity", 0);

        t = nextTrans().duration(shiftDuration);
        t.each("start", function () {
          geneticEngine.shiftAminoAcids(codonIdx, 2 * nucleotides.WIDTH, shiftDuration);
        });
        t.each("end", function () {
          geneticEngine.connectAminoAcid(codonIdx);
        });
        // Empty translation. Reserve some time for the protein folding, as D3
        // animations are slowing down simulation significantly.
        // t = nextTrans().duration(600);
      }

      if (step > 2) {
        removeTRNA(step - 3);
      }
    }

    function finishTranslation() {
      var geneticEngine = model.geneticEngine(),
          aaCount = model.getNumberOfAtoms(),
          dnaLen = model.get("DNA").length,
          cm, viewBox, t;

      if (aaCount >= 2) {
        removeTRNA(aaCount - 2);
      }
      if (aaCount >= 1) {
        t = nextTrans().duration(100);
        t.select(".trna-cont .trna:last-child .trna-neck").style("opacity", 0);
        currentTrans.each("end", function () {
          geneticEngine.translationCompleted();
        });
        removeTRNA(aaCount - 1);
      }

      // Ensure that aaCount is >= 2, due to some assumptions used below.
      aaCount = Math.max(2, aaCount);

      // Show top-over.
      t = nextTrans().duration(500);
      t.each("start", function () {
        // Move top-bottom into a correct position.
        d3.select(".ribosome-top")
          .attr("transform", ribosomeTopPos(aaCount));
        d3.select(".ribosome-bottom")
          .attr("transform", ribosomeBottomPos(aaCount));
      });
      t.selectAll(".ribosome-top, .ribosome-bottom").style("opacity", 1);
      t.selectAll(".ribosome-under, .ribosome-over").style("opacity", 0);

      // Detach two parts of ribosome.
      t = nextTrans().duration(300);
      t.select(".ribosome-top")
        .attr("transform", ribosomeTopPos(aaCount, 0, 0.5));
      t.select(".ribosome-bottom")
        .attr("transform", ribosomeBottomPos(aaCount, 0, -0.3));

      // Move ribosome away.
      t = nextTrans().duration(1000);
      t.select(".ribosome-top")
        .attr("transform", ribosomeTopPos(aaCount, 8, 5));
      t.select(".ribosome-bottom")
        .attr("transform", ribosomeBottomPos(aaCount, 8, -0.5));

      // Slide out mRNA.
      t.select(".mrna")
        .attr("transform", "translate(" + model2px(-(dnaLen + 4) * nucleotides.WIDTH) + ", " + model2pxInv(1.5 * nucleotides.HEIGHT) + ")");

      // Center viewport at protein's center of mass.
      t = nextTrans().duration(700);
      t.each("start", function () {
        cm = geneticEngine.proteinCenterOfMass();
        if (cm) { // null when there are no proteins.
          viewBox = d3.select(".viewport").attr("viewBox").split(" ");
          viewBox[0] = model2px(cm.x - 0.5 * model.get("viewPortWidth"));
          // Note that there is + instead of -, as native viewBox attribute uses
          // *top*-left cordner of a viewBox to define its position. Only our
          // model property "viewPortY" defines bottom Y coordinate to be
          // consistent with the general coordinate system used in MD2D.
          viewBox[1] = model2pxInv(cm.y + 0.5 * model.get("viewPortHeight"));
          t.select(".viewport").attr("viewBox", viewBox.join(" "));
        }
      });
      // Update model description of the viewport when animation ends.
      t.each("end", function () {
        if (cm) {
          model.set("viewPortX", cm.x - 0.5 * model.get("viewPortWidth"));
          model.set("viewPortY", cm.y - 0.5 * model.get("viewPortHeight"));
        }
      });

      t.each("end", function () {
        // Nothing will be rendered, but this will simply cleanup everything, as
        // DNA animation is completed.
        render();
      });
    }


    /******************************************************
     *                   Helper methods                   *
     ******************************************************
     * They provide some common functionality, which can be
     * used both during static rendering or transition.
     * Sometimes they accept suppressAnimation argument.
     */

    function appendNucleusAndPolymerase() {
      var cx = model2px(5 * 0.5 - 2 * nucleotides.WIDTH),
          vx = model2px(model.get("viewPortX") + 0.5 * model.get("viewPortWidth")),
          cy = model2pxInv(3 * 0.5);
      // Nucleus.
      g.insert("image", ".dna").attr({
        "class": "nucleus",
        "x": model2px(W.NUCLEUS * -0.5),
        "y": model2px(H.NUCLEUS * -0.5),
        "width": model2px(W.NUCLEUS),
        "height": model2px(H.NUCLEUS),
        "preserveAspectRatio": "none",
        "transform": "translate(" + cx + ", " + cy + ")",
        "xlink:href": "resources/dna/BG_Nucleus.svg"
      }).style("opacity", 0);

      // Polymerase.
      g.insert("image", ".dna").attr({
        "class": "polymerase-under",
        "x": model2px(W.POLY_UNDER * -0.5),
        "y": model2px(H.POLY_UNDER * -0.5),
        "width": model2px(W.POLY_UNDER),
        "height": model2px(H.POLY_UNDER),
        "preserveAspectRatio": "none",
        "transform": "translate(" + vx + ", " + cy + ") scale(2.5)",
        "xlink:href": "resources/dna/Polymerase_Under.svg"
      }).style("opacity", 0);

      g.append("image").attr({
        "class": "polymerase-over",
        "x": model2px(W.POLY_OVER * -0.5),
        "y": model2px(H.POLY_OVER * -0.5),
        "width": model2px(W.POLY_OVER),
        "height": model2px(H.POLY_OVER),
        "preserveAspectRatio": "none",
        "transform": "translate(" + vx + ", " + cy + ") scale(2.5)",
        "xlink:href": "resources/dna/Polymerase_Over.svg"
      }).style("opacity", 0);
    }

    function appendRibosome() {
      var cy = model2pxInv(model.get("viewPortHeight") * 0.5);
      // Ribosome top-bottom.
      g.append("image").attr({
        "class": "ribosome-bottom",
        "x": model2px(W.RIBO_BOTTOM * -0.5),
        "y": model2px(H.RIBO_BOTTOM * -0.5),
        "width": model2px(W.RIBO_BOTTOM),
        "height": model2px(H.RIBO_BOTTOM),
        "preserveAspectRatio": "none",
        "transform": "translate(" + model2px(-3) + ", " + cy + ")",
        "xlink:href": "resources/dna/Ribosome_bottom1.svg"
      }).style("opacity", 0);

      g.append("image").attr({
        "class": "ribosome-top",
        "x": model2px(W.RIBO_TOP * -0.5),
        "y": model2px(H.RIBO_TOP * -0.5),
        "width": model2px(W.RIBO_TOP),
        "height": model2px(H.RIBO_TOP),
        "preserveAspectRatio": "none",
        "transform": "translate(" + model2px(-3) + ", " + model2pxInv(6) + ")",
        "xlink:href": "resources/dna/Ribosome_top1.svg"
      }).style("opacity", 0);

      g.insert("image", ".mrna").attr({
        "class": "ribosome-under",
        "x": model2px(W.RIBO_UNDER * -0.5),
        "y": model2pxInv(3.7 * nucleotides.HEIGHT + 0.5 * H.RIBO_UNDER),
        "width": model2px(W.RIBO_UNDER),
        "height": model2px(H.RIBO_UNDER),
        "preserveAspectRatio": "none",
        "transform": ribosomeUnderOverPos(0),
        "xlink:href": "resources/dna/Ribosome_under.svg"
      });

      g.append("image").attr({
        "class": "ribosome-over",
        "x": model2px(W.RIBO_OVER * -0.5),
        "y": model2pxInv(3.7 * nucleotides.HEIGHT + 0.5 * H.RIBO_UNDER),
        "width": model2px(W.RIBO_OVER),
        "height": model2px(H.RIBO_OVER),
        "preserveAspectRatio": "none",
        "transform": ribosomeUnderOverPos(0),
        "xlink:href": "resources/dna/Ribosome_over.svg"
      });
    }

    function ribosomeTopPos(step, xShift, yShift) {
      step = Math.max(0, step - 2);
      xShift = xShift || 0;
      yShift = yShift || 0;
      return "translate(" + model2px((2 + step * 3) * nucleotides.WIDTH + xShift) + ", " +
                            model2pxInv(4.52 * nucleotides.HEIGHT + yShift) + ")";
    }

    function ribosomeBottomPos(step, xShift, yShift) {
      step = Math.max(0, step - 2);
      xShift = xShift || 0;
      yShift = yShift || 0;
      return "translate(" + model2px((1.95 + step * 3) * nucleotides.WIDTH + xShift) + ", " +
                            model2pxInv(1.75 * nucleotides.HEIGHT + yShift) + ")";
    }

    function ribosomeUnderOverPos(step) {
      step = Math.max(0, step - 2);
      return "translate(" + model2px((2 + step * 3) * nucleotides.WIDTH) + ")";
    }

    function moveRibosome(pos, suppressAnimation) {
      (suppressAnimation ? g : currentTrans)
        .selectAll(".ribosome-under, .ribosome-over")
          .attr("transform", ribosomeUnderOverPos(pos));
    }

    function appendTRNA(index) {
          // The most outer container can be used to set easily position offset.
          // While the inner g elements provides translation for "ideal" tRNA position
          // close to the mRNA and optional rotation.
      var trnaPosG = trnaG.append("g").attr("class", "trna").append("g"),
          trna = trnaPosG.append("g").attr("class", "rot"),
          type = model.geneticEngine().codonComplement(index),

          m2px    = model2px,
          m2pxInv = model2pxInv,

          codonWidth = 3 * nucleotides.WIDTH,
          offset = (codonWidth - W.TRNA) * 0.55;

      trna.append("g")
        .attr("transform", "translate(0, " + m2px(-H.A) + ")")
        .call(nucleotides().model2px(model2px).sequence(type).backbone(false));

      trna.append("use").attr({
        "class": "trna-neck",
        "x": m2px(0.52 * (codonWidth - W.TRNA_NECK)),
        "y": m2px(-H.TRNA_NECK -H.TRNA * 0.95 - H.A * 0.92),
        "width": m2px(W.TRNA_NECK),
        "height": m2px(H.TRNA_NECK),
        "xlink:href": "#trna-neck-img"
      });

      trna.append("use").attr({
        "class": "trna-base",
        "x": m2px(offset),
        "y": m2px(-H.TRNA - H.A * 0.92),
        "width": m2px(W.TRNA),
        "height": m2px(H.TRNA),
        "xlink:href": "#trna-base-img"
      });

      trnaPosG.attr("transform", "translate(" + m2px(index * codonWidth) + ", " + m2pxInv(2.5 * nucleotides.HEIGHT) + ")");
    }

    /**
     * Removes nth tRNA during DNA translation.
     *
     * @private
     * @param  {[type]} i tRNA index (starting from 0).
     */
    function removeTRNA(i, suppressAnimation) {
      var bondsSelString = ".trna-cont .trna:first-child .bonds, " +      // tRNA bonds
                           ".mrna .nucleotide:nth-child(" + (3 * i + 1) + ") .bonds, " + // mRNA bonds
                           ".mrna .nucleotide:nth-child(" + (3 * i + 2) + ") .bonds, " +
                           ".mrna .nucleotide:nth-child(" + (3 * i + 3) + ") .bonds",
          t;

      if (!suppressAnimation) {
        t = nextTrans().duration(900);
        // Remove the first tRNA.
        // Note that due to the fact that we use relative ("first") selector,
        // it has to be inside "start" callback, as only at the beginning of this
        // transition given tRNA will be first one. Otherwise, when you called _removeTRNA
        // twice, both transition would be applied to the same tRNA.
        t.each("start", function () {
          t.select(".trna-cont .trna:first-child")
            .attr("transform", "translate(" + model2px(nucleotides.HEIGHT * -5) + ", " + model2px(nucleotides.HEIGHT * -4) + ")")
            .style("opacity", 0)
              .select(".rot")
                .attr("transform", "rotate(-30)");
          // Hide tRNA and mRNA bonds.
          t.selectAll(bondsSelString).duration(200).style("opacity", 0);
        });
        t.each("end", function () {
          d3.select(".trna-cont .trna:first-child").remove();
        });
      } else {
        g.selectAll(bondsSelString).style("opacity", 0);
        g.select(".trna-cont .trna:first-child").remove();
      }
    }

    api = {
      render: render
    };

    init();
    return api;
  }

  return GeneticRenderer;
});

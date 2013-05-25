/*global define, $, d3 */

define(function (require) {
  var console      = require('common/console'),
      nucleotides  = require('md2d/views/nucleotides'),
      GeneticElementsRenderer = require('md2d/views/genetic-elements-renderer'),
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
        prevState = null,

        stateMgr = new StateManager([
          "cells",
          "dna1", "dna2", "dna3",
          "polymeraseUnder", "polymeraseOver",
          "polymeraseUnder", "polymeraseOver",
          "dna", "dnaComp", "mrna", "nucleus",
          "viewPort", "background"
        ]),

        objectRenderer = new GeneticElementsRenderer(model, model2px, model2pxInv);

    function init() {
      // Redraw DNA / mRNA when genetic engine state is changed.
      model.geneticEngine().on("change", render);
      // Play animation when there is a "transition" event.
      model.geneticEngine().on("transition", stateTransition);

      defineStates();
    }

    function defineStates() {
      var viewPortWidth  = model.get("viewPortWidth"),
          viewPortHeight = model.get("viewPortHeight"),
          vx = viewPortWidth * 0.5,
          vy = viewPortHeight * 0.5;

      stateMgr.newState("intro-cells", {
        cells: [{
          translateX: vx + 0.33,
          translateY: vy,
          scale: 1
        }],
        dna1: [{
          translateX: vx + 0.33,
          translateY: vy,
          scale: 0.13,
          opacity: 0
        }],
        viewPort: [{
          position: function() { return 0; },
          ease: "cubic-in-out"
        }],
        background: [{
          color: function() { return "#fff"; } // it doesn't matter, as it isn't visible for now.
        }]
      });
      stateMgr.extendLastState("intro-zoom1", {
        cells: [{
          translateX: vx,
          scale: 6
        }],
        dna1: [{
          translateX: vx,
          scale: 0.78,
          opacity: 5
        }],
        dna2: [{
          translateX: vx,
          translateY: vy,
          scale: 0.5,
          opacity: 0
        }],
        viewPort: [],
        background: []
      });
      stateMgr.extendLastState("intro-zoom2", {
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
          translateX: vx,
          translateY: vy,
          scale: 0.2,
          opacity: 0
        }],
        viewPort: [],
        background: []
      });
      stateMgr.extendLastState("intro-zoom3-s0", {
        cells: [],
        dna2: [{
          scale: 3.8,
          opacity: 0
        }],
        dna3: [{
          scale: 0.4,
          opacity: 1
        }],
        viewPort: [],
        background: []
      });
      stateMgr.extendLastState("intro-zoom3", {
        cells: [],
        dna3: [{
          scale: 0.6
        }],
        polymeraseUnder: [{
          scale: 0.2,
          translateX: -2,
          translateY: 4,
          opacity: 0
        }],
        viewPort: [],
        background: []
      });
      stateMgr.extendLastState("intro-polymerase-s0", {
        cells: [],
        dna3: [],
        polymeraseUnder: [{
          scale: 0.8,
          translateX: vx,
          translateY: vy,
          opacity: 1
        }],
        polymeraseOver: [{
          translateX: vx,
          translateY: vy,
          scale: 0.8,
          opacity: 0
        }],
        viewPort: [],
        background: []
      });
      stateMgr.extendLastState("intro-polymerase", {
        cells: [],
        dna3: [],
        polymeraseUnder: [{
          scale: 1,
        }],
        polymeraseOver: [{
          scale: 1,
          opacity: 1
        }],
        viewPort: [],
        background: []
      });
      stateMgr.extendLastState("dna-s0", {
        cells: [{
          opacity: 0
        }],
        dna3: [{
          scale: 1.5
        }],
        polymeraseUnder: [{
          scale: 2.5
        }],
        polymeraseOver: [{
          scale: 2.5
        }],
        viewPort: [],
        background: [{
          color: function() { return "url(#transcription-bg)"; }
        }]
      });
      stateMgr.extendLastState("dna", {
        polymeraseUnder: [{
          opacity: 0
        }],
        polymeraseOver: [{
          opacity: 0
        }],
        dna3: [{
          opacity: 0
        }],
        dna: [{
          translateY: viewPortHeight / 2 + nucleotides.HEIGHT,
          bonds: 1
        }],
        dnaComp: [{
          translateY: viewPortHeight / 2 - nucleotides.HEIGHT,
          bonds: 1
        }],
        viewPort: [{
          position: function () { return - 2; }
        }],
        background: []
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
        }],
        viewPort: [{
          position: function () {
            return Math.min(model.get("DNA").length - 10, Math.max(0, getState().step - 6)) - 2;
          },
          ease: "linear"
        }],
        background: []
      });
      stateMgr.extendLastState("transcription-end", {
        dna: [],
        dnaComp: [],
        mrna: [],
        polymeraseUnder: [{
          translateX: function () { return model.get("viewPortX") + 0.5 * viewPortWidth; },
          translateY: 0.5 * viewPortHeight,
          scale: 2.5,
          opacity: 0
        }],
        polymeraseOver: [{
          translateX: function () { return model.get("viewPortX") + 0.5 * viewPortWidth; },
          translateY: 0.5 * viewPortHeight,
          scale: 2.5,
          opacity: 0
        }],
        viewPort: [{
          position: function () { return Math.max(0, model.get("DNA").length - 10) - 2; },
          ease: "linear"
        }],
        background: []
      });
      stateMgr.extendLastState("after-transcription", {
        dna: [],
        dnaComp: [],
        mrna: [],
        polymeraseUnder: [{
          opacity: 1
        }],
        polymeraseOver: [{
          opacity: 1
        }],
        viewPort: [],
        background: []
      });
      stateMgr.extendLastState("before-translation-s0", {
        dna: [],
        dnaComp: [],
        mrna: [],
        polymeraseUnder: [{
          scale: 1.4
        }],
        polymeraseOver: [{
          scale: 1.4,
          opacity: 0
        }],
        viewPort: [],
        background: [{
          color: function() { return "#8492ef"; }
        }]
      });
      stateMgr.extendLastState("before-translation-s1", {
        dna: [],
        dnaComp: [],
        mrna: [],
        polymeraseUnder: [{
          translateX: function () { return model.get("viewPortX") + 0.5 * viewPortWidth + 5; }, // + 5!
          translateY: 0.5 * viewPortHeight - 2,
          scale: 0.7
        }],
        viewPort: [],
        background: []
      });
      stateMgr.extendLastState("before-translation-s2", {
        dna: [],
        dnaComp: [],
        mrna: [],
        nucleus: [{
          translateX: 0.5 * viewPortWidth - 2 * nucleotides.WIDTH,
          translateY: 0.5 * viewPortHeight
        }],
        viewPort: [{
          position: function() { return -2; }
        }],
        background: []
      });
      stateMgr.extendLastState("before-translation-s3", {
        dna: [{
          translateY: 4 * nucleotides.HEIGHT
        }],
        dnaComp: [{
          translateY: 2 * nucleotides.HEIGHT,
          bonds: 0
        }],
        mrna: [{
          bonds: 0
        }],
        nucleus: [{
          translateY: 0
        }],
        viewPort: [],
        background: [{
          color: function() { return model.get("backgroundColor"); }
        }]
      });
      stateMgr.extendLastState("before-translation-s4", {
        dna: [{
          translateY: -1 * nucleotides.HEIGHT
        }],
        dnaComp: [{
          translateY: -3 * nucleotides.HEIGHT,
        }],
        mrna: [{
          translateY: 2.5 * nucleotides.HEIGHT
        }],
        nucleus: [{
          translateY: H.NUCLEUS * -0.5
        }],
        viewPort: [],
        background: []
      });
      stateMgr.extendLastState("before-translation", {
        mrna: [{
          translateY: 1.5 * nucleotides.HEIGHT,
          direction: 2,
          bonds: 0
        }],
        viewPort: [],
        background: []
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
          transcriptionEnd();
          break;
        case "after-transcription":
          afterTranscription();
          break;
        case "before-translation":
          beforeTranslation();
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
      var state         = getState(),
          stateData     = stateMgr.getState(state.name);

      console.time("[genetic-renderer] render");

      cancelTransitions();

      console.time("[genetic-renderer] objects update");
      smartRender(g, stateData);
      // renderAll(g, stateData);
      console.timeEnd("[genetic-renderer] objects update");

      // Update prevState!
      prevState = state;

      console.timeEnd("[genetic-renderer] render");
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
        newTrans = g.transition();
      }
      currentTrans = newTrans;
      return newTrans;
    }

    function cancelTransitions() {
      // Trick to cancel all current transitions. It isn't possible explicitly
      // so we have to start new, fake transitions, which will cancel previous
      // ones. Note that some transitions can be applied to elements that live
      // outside g.genetics element, e.g. viewport and background. So, it isn't
      // enough to use d3.selectAll("g.genetics *").
      var g = d3.select("g.genetics");
      if (!g.empty() && g.node().__transition__) {
        d3.selectAll("g.genetics, g.genetics *").transition().delay(0);
        d3.select(".viewport").transition().delay(0);
        d3.select(".plot").transition().delay(0);     // background
        currentTrans = null;
      }
    }

    function setup() {
      var state = getState();

      // Cleanup.
      cancelTransitions();
      container.selectAll("g.genetics").remove();

      if (!model.get("DNA") || state.name === "translation-end") {
        // When DNA is not defined (=== "", undefined or null) or
        // translation is ended, genetic renderer doesn't have to do
        // anything.
        return;
      }

      // Create a new container.
      g = container.append("g").attr("class", "genetics");
      g.append("g").attr("class", "background-layer");
      g.append("g").attr("class", "under-dna-layer");
      g.append("g").attr("class", "dna-layer");
      g.append("g").attr("class", "over-dna-layer");
      trnaG   = g.append("g").attr("class", "trna-cont");

      preloadImages();

      render();
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
     * Scrolls the container. When 'position' is not provided,
     * viewport position is based on the current state.
     *
     * @private
     */
    function updateViewPort(data) {
      var position = data.viewPort[0].position(),
          ease     = data.viewPort[0].ease,
          viewport, viewBox;

      function transcription() {
        // TODO: this is slow as it triggers recalculation
        // of the model state!
        model.set("viewPortX", position * nucleotides.WIDTH);
      }

      viewport = d3.select(".viewport");
      viewBox = viewport.attr("viewBox").split(" ");
      // Update viewport X coordinate.
      viewBox[0] = model2px(position * nucleotides.WIDTH);
      viewport = d3.transition(viewport).attr("viewBox", viewBox.join(" "));
      // Duck test whether viewportUpdate is a transition or selection.
      // See D3 API Reference - d3.transition(selection) returns  transition
      // only when called in the context of other transition. Otherwise it
      // returns selection.
      if (typeof viewport.duration === "function") {
        // Transition!
        viewport.ease(ease);
        currentTrans.each("end.viewport-update", transcription);
      } else {
        // Selection!
        transcription();
      }
    }

    /**
     * Sets color of the background.
     * @private
     */
    function updateBackground(data) {
      var gradient;

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
      d3.transition(d3.select(".plot")).style("fill", data.background[0].color());
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
      return "translate(" + model2px(x) + " " + model2px(y) + ")";
    }
    function translateFuncInv(d) {
      var x = d.translateX || 0,
          y = d.translateY || 0;
      x = typeof x === "number" ? x : x(); // used by polymerase!
      return "translate(" + model2px(x) + " " + model2pxInv(y) + ")";
    }
    function translateScaleFunc(d) {
      return translateFunc(d) + " " + scaleFunc(d);
    }
    function translateScaleFuncInv(d) {
      return translateFuncInv(d) + " " + scaleFunc(d);
    }
    function xFunc(d) {
      return model2px(d.x);
    }
    function yFunc(d) {
      return model2px(d.y);
    }

    function renderAll(parent, data) {
      parent.each(function() {
        var parent = d3.select(this);
        updateViewPort(data);
        updateBackground(data);
        renderIntroElements(parent, data);
        renderTranscriptionElements(parent, data);
        renderMRNA(parent, data);
        renderNucleus(parent, data);
        renderPolymerase(parent, data);
      });
    }

    function smartRender(parent, data) {
      var prevStateData = prevState ? stateMgr.getState(prevState.name) : {},
          objectsToUpdate;
      parent.each(function() {
        var parent = d3.select(this);
        // Save names of all object visible in these two states.
        objectsToUpdate = Object.keys(data).concat(Object.keys(prevStateData));
        // Of course they can be duplicated to create set from these names.
        objectsToUpdate = d3.set(objectsToUpdate);
        objectsToUpdate.forEach(function (objectName) {
          // Render!
          objectRenderer[objectName](parent, data);
        });
      });
    }

    function renderIntroElements(parent, data) {
      var dna3units = 14,
          cells, dna1, dna2, dna3, dna3Enter;


      cells = parent.select(".background-layer").selectAll(".cells").data(data.cells);
      cells.enter().append("image").attr({
        "class": "cells",
        "x": model2px(W.CELLS * -0.567),
        "y": model2px(H.CELLS * -0.445),
        "width": model2px(W.CELLS),
        "height": model2px(H.CELLS),
        "preserveAspectRatio": "none",
        "xlink:href": "resources/dna/Cells.svg",
        "transform": translateScaleFuncInv
      }).style({
        "opacity": opacityFunc
      });;
      d3.transition(cells).attr({
        "transform": translateScaleFuncInv
      }).style({
        "opacity": opacityFunc
      });;
      d3.transition(cells.exit()).remove();

      dna1 = parent.select(".dna-layer").selectAll(".dna1").data(data.dna1);
      dna1.enter().append("image").attr({
        "class": "dna1",
        "x": model2px(W.DNA1 * -0.5),
        "y": model2px(H.DNA1 * -0.5),
        "width": model2px(W.DNA1),
        "height": model2px(H.DNA1),
        "preserveAspectRatio": "none",
        "xlink:href": "resources/dna/DNA_InsideNucleus_1.svg",
        "transform": translateScaleFuncInv
      }).style({
        "opacity": opacityFunc
      });
      d3.transition(dna1).attr({
        "transform": translateScaleFuncInv
      }).style({
        "opacity": opacityFunc
      });
      d3.transition(dna1.exit()).remove();

      dna2 = parent.select(".dna-layer").selectAll(".dna2").data(data.dna2);
      dna2.enter().append("image").attr({
        "class": "dna2",
        "x": model2px(W.DNA2 * -0.5),
        "y": model2px(H.DNA2 * -0.404),
        "width": model2px(W.DNA2),
        "height": model2px(H.DNA2),
        "preserveAspectRatio": "none",
        "xlink:href": "resources/dna/DNA_InsideNucleus_2.svg",
        "transform": translateScaleFuncInv
      }).style({
        "opacity": opacityFunc
      });
      d3.transition(dna2).attr({
        "transform": translateScaleFuncInv
      }).style({
        "opacity": opacityFunc
      });
      d3.transition(dna2.exit()).remove();

      dna3 = parent.select(".dna-layer").selectAll(".dna3").data(data.dna3);
      dna3Enter = dna3.enter().append("g").attr({
        "class": "dna3 main-dna",
        "transform": translateScaleFuncInv
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
        "transform": translateScaleFuncInv
      }).style({
        "opacity": opacityFunc
      });
      d3.transition(dna3.exit()).remove();
    }

    function renderTranscriptionElements(parent, data) {
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
        .selectAll(".bonds")
          .style("opacity", function () {
            return data.dna[0].bonds;
          });
      // DNA exit:
      d3.transition(dna.exit()).remove();

      // DNA Comp enter:
      dnaComp = parent.select(".dna-layer").selectAll(".dna-comp").data(data.dnaComp);
      dnaCompEnter = dnaComp.enter().append("g").attr({
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
    }

    function renderTranslationElements(parent, data) {
      renderMRNA(parent, data);
    }

    // It's common both for transcription and translation.
    function renderPolymerase(parent, data) {
      var polyUnder, polyOver;

      polyUnder = parent.select(".under-dna-layer").selectAll(".polymerase-under").data(data.polymeraseUnder);
      polyUnder.enter().append("image").attr({
        "class": "polymerase-under",
        "x": model2px(W.POLY_UNDER * -0.5),
        "y": model2px(H.POLY_UNDER * -0.5),
        "width": model2px(W.POLY_UNDER),
        "height": model2px(H.POLY_UNDER),
        "preserveAspectRatio": "none",
        "xlink:href": "resources/dna/Polymerase_Under.svg",
        "transform": translateScaleFuncInv
      }).style({
        "opacity": opacityFunc
      });
      d3.transition(polyUnder).attr({
        "transform": translateScaleFuncInv
      }).style({
        "opacity": opacityFunc
      });
      d3.transition(polyUnder.exit()).remove();

      polyOver = parent.select(".over-dna-layer").selectAll(".polymerase-over").data(data.polymeraseOver);
      polyOver.enter().append("image").attr({
        "class": "polymerase-over",
        "x": model2px(W.POLY_OVER * -0.5),
        "y": model2px(H.POLY_OVER * -0.5),
        "width": model2px(W.POLY_OVER),
        "height": model2px(H.POLY_OVER),
        "preserveAspectRatio": "none",
        "xlink:href": "resources/dna/Polymerase_Over.svg",
        "transform": translateScaleFuncInv
      }).style({
        "opacity": opacityFunc
      });
      d3.transition(polyOver).attr({
        "transform": translateScaleFuncInv
      }).style({
        "opacity": opacityFunc
      });
      d3.transition(polyOver.exit()).remove();
    }

    function renderNucleus(parent, data) {
      var nucleus;

      nucleus = parent.select(".background-layer").selectAll(".nucleus").data(data.nucleus);
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
      d3.transition(nucleus).attr({
        "transform": translateFuncInv
      }).style({
        "opacity": opacityFunc
      });
      d3.transition(nucleus.exit()).remove();
    }

    function renderMRNA(parent, data) {
      var mrnaSequence  = model.get("mRNA"),
          geneticEngine = model.geneticEngine(),
          stopCodons    = geneticEngine.stopCodonsHash(),
          mrnaData      = data.mrna[0],
          dir           = mrnaData ? mrnaData.direction : 1,
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
        .selectAll(".bonds")
          .style("opacity", function () {
            return mrnaData.bonds;
          });
      // mRNA exit:
      d3.transition(mrna.exit()).remove();
    }

    function transitionTo(t, state) {
      smartRender(t, stateMgr.getState(state));
    }

    function introZoom1() {
      var t = nextTrans().ease("cubic").duration(3000);
      transitionTo(t, "intro-zoom1");
    }

    function introZoom2() {
      var t = nextTrans().ease("linear").duration(3000);
      transitionTo(t, "intro-zoom2");
    }

    function introZoom3() {
      var t = nextTrans().ease("linear").duration(2000);
      transitionTo(t, "intro-zoom3-s0");

      t = nextTrans().ease("quad-out").duration(3300);
      transitionTo(t, "intro-zoom3");
    }

    function introPolymerase() {
      var t = nextTrans().ease("quad-out").duration(3000);
      transitionTo(t, "intro-polymerase-s0");

      t = nextTrans().ease("cubic-in-out").duration(1000);
      transitionTo(t, "intro-polymerase");
    }

    function dna() {
      var t = nextTrans().duration(2000);
      transitionTo(t, "dna-s0");

      t = nextTrans().duration(700);
      transitionTo(t, "dna");
      // Enter transition connected with new nucleotides,
      // we don't want it this time.
      t.selectAll(".nucleotide").duration(15);
    }

    function transcription0() {
      var t = nextTrans().duration(1500);
      transitionTo(t, "transcription");
      // Reselect bonds transition, change duration to 250.
      t.selectAll(".bonds").duration(250);
    }

    function transcription() {
      var t = nextTrans().duration(500);
      transitionTo(t, "transcription");
      // Reselect bonds transition, change duration to ease to cubic.
      t.selectAll(".bonds").ease("cubic");
    }

    function transcriptionEnd() {
      var t = nextTrans().duration(500);
      transitionTo(t, "transcription-end");
      // Reselect bonds transition, change duration to ease to cubic.
      t.selectAll(".bonds").ease("cubic");
    }

    function afterTranscription() {
      var t = nextTrans().ease("cubic-in-out").duration(700);
      transitionTo(t, "after-transcription");
    }

    function beforeTranslation() {
      var t = nextTrans().ease("cubic-in-out").duration(1000);
      transitionTo(t, "before-translation-s0");
      t.selectAll(".plot").duration(20);

      t = nextTrans().ease("cubic-in-out").duration(1500);
      transitionTo(t, "before-translation-s1");

      t = nextTrans().ease("cubic-in-out").duration(1500);
      transitionTo(t, "before-translation-s2");

      t = nextTrans().ease("cubic").duration(1000);
      transitionTo(t, "before-translation-s3");
      t.selectAll(".bonds").duration(250);
      t.selectAll(".plot").duration(20);

      t = nextTrans().ease("cubic-out").duration(1000);
      transitionTo(t, "before-translation-s4");

      t = nextTrans().ease("cubic-out").duration(500);
      transitionTo(t, "before-translation");
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
      updateViewPort();

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
     * @privatef
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
      setup: setup,
      render: render
    };

    init();
    return api;
  }

  return GeneticRenderer;
});

/*global define, $, d3 */

define(function (require) {
  var nucleotides = require('md2d/views/nucleotides'),

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

  function GeneticRenderer(container, parentView, model) {
    this.container = container;
    this.parent = parentView;
    this.model = model;
    this.model2px = parentView.model2px;
    this.model2pxInv = parentView.model2pxInv;

    this._g = null;
    this._dnaView = null;
    this._dnaG = null;
    this._dnaCompG = null;
    this._mrnaG = null;
    this._trnaG = null;
    this._currentTrans = null;

    // Redraw DNA / mRNA when genetic engine state is changed.
    this.model.geneticEngine().on("change", $.proxy(this.render, this));
    // Play animation when there is a "transition" event.
    this.model.geneticEngine().on("transition", $.proxy(this.stateTransition, this));
  }

  GeneticRenderer.prototype.stateTransition = function () {
    var state = this._state(),
        geneticEngine = this.model.geneticEngine();

    switch(state.name) {
      case "intro-zoom1":
        this._cellsZoom1();
        break;
      case "intro-zoom2":
        this._cellsZoom2();
        break;
      case "intro-zoom3":
        this._cellsZoom3();
        break;
      case "intro-polymerase":
        this._attachPolymerase();
        break;
      case "dna":
        this._polymeraseZoom();
        break;
      case "transcription":
        if (state.step === 0) {
          this.separateDNA();
        } else {
          this.transcribeStep(state.step);
        }
        break;
      case "transcription-end":
        this.transcribeStep(this.model.get("mRNA").length);
        break;
      case "translation":
        if (state.step === 0) {
          this.prepareForTranslation();
        } else {
          this.translateStep(state.step);
        }
        break;
      case "translation-end":
        this.finishTranslation();
        break;
    }

    this._currentTrans.each("end.trans-end", function() {
      // Notify engine that transition has ended.
      geneticEngine.transitionEnded();
    });
  };

  /**
   * Renders DNA-related graphics using "DNA" and "geneticEngineState"
   * options of the model.
   */
  GeneticRenderer.prototype.render = function () {
    var state = this._state();

    // Trick to cancel all current transitions. It isn't possible explicitly
    // so we have to start new, fake transitions, which will cancel previous
    // ones. Note that some transitions can be applied to elements that live
    // outside g.genetics element, e.g. viewport and background. So, it isn't
    // enough to use d3.selectAll("g.genetics *").
    d3.selectAll("*").transition().delay(0);
    // Cleanup.
    this.container.selectAll("g.genetics").remove();
    this._currentTrans = null;

    if (!this.model.get("DNA") || state.name === "translation-end") {
      // When DNA is not defined (=== "", undefined or null) or
      // translation is ended, genetic renderer doesn't have to do
      // anything.
      return;
    }

    // Create a new container.
    this._g       = this.container.append("g").attr("class", "genetics");
    this._dnaView = this._g.append("g").attr("class", "dna-view");
    this._mrnaG   = this._dnaView.append("g").attr("class", "mrna");
    this._trnaG   = this._dnaView.append("g").attr("class", "trna-cont");

    this._renderBackground();
    this._scrollContainer(true);

    switch(state.name) {
      case "intro-cells":
        this._renderCells();
        break;
      case "intro-zoom1":
        this._renderCellsZoom1();
        break;
      case "intro-zoom2":
        this._renderCellsZoom2();
        break;
      case "intro-zoom3":
        this._renderCellsZoom3();
        break;
      case "intro-polymerase":
        this._renderDNAWithPolymerase();
        break;
      case "dna":
        this._renderDNA();
        break;
      case "transcription":
        this._renderTranscription(state.step);
        break;
      case "transcription-end":
        this._renderTranscription(this.model.get("mRNA").length);
        break;
      case "translation":
        this._renderTranslation(state.step);
        break;
    }
  };

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
  GeneticRenderer.prototype._state = function () {
    return this.model.geneticEngine().state();
  };

  /**
   * Returns a new, chained transition.
   * This transition will be executed when previous one ends.
   *
   * @private
   * @return {d3 transtion} d3 transtion object.
   */
  GeneticRenderer.prototype._nextTrans = function () {
    // TODO: this first check is a workaround.
    // Ideal scenario would be to call always:
    // this._currentTrans[name] = this._currentTrans[name].transition();
    // but it seems to fail when transition has already ended.
    if (this._currentTrans && this._currentTrans.node().__transition__) {
      // Some transition is currently in progress, chain a new transition.
      this._currentTrans = this._currentTrans.transition();
    } else {
      // All transitions ended, just create a new one.
      this._currentTrans = d3.transition();
    }
    return this._currentTrans;
  };

  /**
   * Scrolls the container. When 'shift' is not provided,
   * viewport position is based on the current state.
   *
   * @private
   * @param  {boolean} suppressAnimation when true, there is no animation.
   * @param  {number} shift              desired scroll position (optional).
   */
  GeneticRenderer.prototype._scrollContainer = function (suppressAnimation, shift, ease) {
    var dnaLen = this.model.get("DNA").length,
        state = this._state(),
        self = this,
        viewBox;

    function updateViewPort() {
      self.model.set("viewPortX", shift * nucleotides.WIDTH);
    }

    function calculateViewportPos(sateName) {
      switch(sateName) {
        case "dna":
          return -2;
        case "transcription":
          return Math.min(dnaLen - 10, Math.max(0, state.step - 6)) - 2;
        case "transcription-end":
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
      viewBox[0] = this.model2px(shift * nucleotides.WIDTH); // update viewport X coordinate.
      this._currentTrans.select(".viewport").ease(ease).attr("viewBox", viewBox.join(" "));
      this._currentTrans.each("end.viewport-update", updateViewPort);
    } else {
      updateViewPort();
    }
  };

  /**
   * Sets color of the background using current state to determine it.
   * @private
   */
  GeneticRenderer.prototype._renderBackground = function () {
    var gradient;

    if (this.model.geneticEngine().stateBefore("translation")) {
      // Transcription.
      gradient = this._g.append("defs").append("linearGradient")
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

      d3.select(".plot").style("fill", "url(#transcription-bg)");
    } else {
      // Translation.
      d3.select(".plot").style("fill", "#B8EBF0");
    }
  };

  /******************************************************
   *                  Render methods                    *
   ******************************************************
   * They are called from .render() method and are used
   * to render a given state without any animation.
   */

  GeneticRenderer.prototype._renderCells = function () {
    var ms2px = this.model2px,
        cx = this.model2px(W.CELLS * 0.567),
        cy = this.model2px(H.CELLS * 0.445),
        mWidth  = this.model2px(5),
        mHeight = this.model2px(3),
        dna3units = 14,
        introG, dna3;

    introG = this._g.append("g").attr({
      "class": "dna-intro",
      "transform": "translate(" + cx + " " + cy + ")"
    });

    introG.append("image").attr({
      "class": "cells",
      "x": -cx,
      "y": -cy,
      "width": this.model2px(W.CELLS),
      "height": this.model2px(H.CELLS),
      "preserveAspectRatio": "none",
      "xlink:href": "resources/dna/Cells.svg"
    });

    introG.append("image").attr({
      "class": "dna1",
      "x": this.model2px(W.DNA1 * -0.5),
      "y": this.model2px(H.DNA1 * -0.5),
      "width": this.model2px(W.DNA1),
      "height": this.model2px(H.DNA1),
      "transform": "scale(0.13)",
      "preserveAspectRatio": "none",
      "xlink:href": "resources/dna/DNA_InsideNucleus_1.svg"
    }).style("opacity", 0);

    introG.append("image").attr({
      "class": "dna2",
      "x": this.model2px(W.DNA2 * -0.5),
      "y": this.model2px(H.DNA2 * -0.404),
      "width": this.model2px(W.DNA2),
      "height": this.model2px(H.DNA2),
      "transform": "scale(0.5)",
      "preserveAspectRatio": "none",
      "xlink:href": "resources/dna/DNA_InsideNucleus_2.svg"
    }).style("opacity", 0);

    introG.append("image").attr({
      "class": "polymerase-under",
      "x": this.model2px(W.POLY_UNDER * -0.5),
      "y": this.model2px(H.POLY_UNDER * -0.5),
      "width": this.model2px(W.POLY_UNDER),
      "height": this.model2px(H.POLY_UNDER),
      "preserveAspectRatio": "none",
      "transform": "translate(" + mWidth * -0.65 + ", " + mHeight * -0.5 + ") scale(0.2)",
      "xlink:href": "resources/dna/Polymerase_Under.svg"
    }).style("opacity", 1);

    dna3 = introG.append("g").attr({
      "class": "dna3",
      "transform": "scale(0.2)"
    }).style("opacity", 0);

    dna3.selectAll("dna3-unit").data(new Array(dna3units)).enter().append("image").attr({
      "class": "dna3-unit",
      "x": function (d, i) { return (i - dna3units * 0.5) * ms2px(W.DNA3) * 0.98; },
      "y": this.model2px(H.DNA3 * -0.5),
      "width": this.model2px(W.DNA3),
      "height": this.model2px(H.DNA3),
      "preserveAspectRatio": "none",
      "xlink:href": "resources/dna/DoubleHelix_Unit.svg"
    });

    introG.append("image").attr({
      "class": "polymerase-over",
      "x": this.model2px(W.POLY_OVER * -0.5),
      "y": this.model2px(H.POLY_OVER * -0.5),
      "width": this.model2px(W.POLY_OVER),
      "height": this.model2px(H.POLY_OVER),
      "preserveAspectRatio": "none",
      "transform": "scale(0.8)",
      "xlink:href": "resources/dna/Polymerase_Over.svg"
    }).style("opacity", 0);
  };

  GeneticRenderer.prototype._renderCellsZoom1 = function () {
    this._renderCells();
    this._cellsZoom1(true);
  };

  GeneticRenderer.prototype._renderCellsZoom2 = function () {
    this._renderCells();
    this._cellsZoom1(true);
    this._cellsZoom2(true);
  };

  GeneticRenderer.prototype._renderCellsZoom3 = function () {
    this._renderCells();
    this._cellsZoom1(true);
    this._cellsZoom2(true);
    this._cellsZoom3(true);
  };

  GeneticRenderer.prototype._renderDNAWithPolymerase = function () {
    this._renderCells();
    this._cellsZoom1(true);
    this._cellsZoom2(true);
    this._cellsZoom3(true);
    this._attachPolymerase(true);
  };

  GeneticRenderer.prototype._cellsZoom1 = function (suppressAnimation) {
    var selection = suppressAnimation ? this._g : this._nextTrans().ease("cubic").duration(3000);

    selection.select(".cells")
      .attr("transform", "scale(6)");  // 1.0  * 6
    selection.select(".dna1")
      .attr("transform", "scale(0.78)") // 0.13 * 6
      // Of course max value for opacity is 1. However value bigger than 1
      // affects transition progress and in this case it's helpful.
      .style("opacity", 5);

    selection.select(".dna-intro")
      .attr("transform", "translate(" + this.model2px(2.5) + " " + this.model2px(1.5) + ")");
  };

  GeneticRenderer.prototype._cellsZoom2 = function (suppressAnimation) {
    var selection = suppressAnimation ? this._g : this._nextTrans().ease("linear").duration(3000);

    selection.select(".cells")
      .attr("transform", "scale(24)");  // 6.0  * 4
    selection.select(".dna1")
      .style("opacity", 0)
      .attr("transform", "scale(3.12)"); // 0.78 * 4
    selection.select(".dna2")
      .style("opacity", 1)
      .attr("transform", "scale(2)");    // 0.5  * 4
  };

  GeneticRenderer.prototype._cellsZoom3 = function (suppressAnimation) {
    var selection = suppressAnimation ? this._g : this._nextTrans().ease("linear").duration(2000);

    selection.select(".dna2")
      .style("opacity", 0)
      .attr("transform", "scale(3.8)");
    selection.select(".dna3")
      .style("opacity", 1)
      .attr("transform", "scale(0.4)");

    selection = suppressAnimation ? this._g : this._nextTrans().ease("quad-out").duration(3300);
    selection.select(".dna3")
      .attr("transform", "scale(0.6)");
  };

  GeneticRenderer.prototype._attachPolymerase = function (suppressAnimation) {
    var selection = suppressAnimation ? this._g : this._nextTrans().ease("quad-out").duration(3000);

    selection.select(".polymerase-under")
      .attr("transform", "translate(0, 0) scale(0.8)");

    selection = suppressAnimation ? this._g : this._nextTrans().ease("cubic-in-out").duration(1000);
    selection.select(".polymerase-under")
      .attr("transform", "scale(1)");
    selection.select(".polymerase-over")
      .attr("transform", "scale(1)")
      .style("opacity", 1);
  };

  GeneticRenderer.prototype._polymeraseZoom = function () {
    var t = this._nextTrans().duration(2000),
        self = this;

    t.selectAll(".polymerase-under, .polymerase-over")
      .attr("transform", "scale(2.5)");  // 1.0 * 2.5
    t.selectAll(".dna3")
      .attr("transform", "scale(1.5)");  // 0.6 * 2.5

    t.each("end", function () {
      self._renderDNA();
    })

    t = this._nextTrans().duration(700);
    t.select(".dna-intro")
      .style("opacity", 0)
      .remove();
  };

  GeneticRenderer.prototype._renderDNA = function () {
    var dna            = this.model.get("DNA"),
        dnaComplement  = this.model.get("DNAComplement"),
        dnaLength      = dna.length,
        geneticEngine  = this.model.geneticEngine(),
        junkDNA        = geneticEngine.junkSequence(50),
        n              = nucleotides();

    this._dnaG      = this._dnaView.append("g").attr("class", "dna");
    this._dnaCompG  = this._dnaView.append("g").attr("class", "dna-comp");

    // Coding.
    n.model2px(this.model2px);
    n.sequence(dna);
    this._dnaG.append("g").attr("class", "coding-region").call(n);

    // Promoter.
    n.sequence(geneticEngine.promoterSequence);
    n.startingPos(-geneticEngine.promoterSequence.length);
    this._dnaG.append("g").attr("class", "promoter-region").call(n);

    // Terminator.
    n.sequence(geneticEngine.terminatorSequence);
    n.startingPos(dnaLength);
    this._dnaG.append("g").attr("class", "terminator-region").call(n);

    // Junk.
    n.sequence(junkDNA.sequence);
    n.startingPos(-geneticEngine.promoterSequence.length - junkDNA.sequence.length);
    this._dnaG.append("g").attr("class", "junk-region").call(n);

    n.sequence(junkDNA.sequence);
    n.startingPos(dnaLength + geneticEngine.terminatorSequence.length);
    this._dnaG.append("g").attr("class", "junk-region").call(n);

    this._dnaG.attr("transform", "translate(0, " + this.model2pxInv(this.model.get("viewPortHeight") / 2 + nucleotides.HEIGHT) + ")");

    n.direction(2);
    // Coding.
    n.sequence(dnaComplement);
    n.startingPos(0);
    this._dnaCompG.append("g").attr("class", "coding-region").call(n);

    // Promoter.
    n.sequence(geneticEngine.promoterCompSequence);
    n.startingPos(-geneticEngine.promoterCompSequence.length);
    this._dnaCompG.append("g").attr("class", "promoter-region").call(n);

    // Terminator.
    n.sequence(geneticEngine.terminatorCompSequence);
    n.startingPos(dnaLength);
    this._dnaCompG.append("g").attr("class", "terminator-region").call(n);

    // Junk.
    n.sequence(junkDNA.compSequence);
    n.startingPos(-geneticEngine.promoterCompSequence.length - junkDNA.compSequence.length);
    this._dnaCompG.append("g").attr("class", "junk-region").call(n);

    n.sequence(junkDNA.compSequence);
    n.startingPos(dnaLength + geneticEngine.terminatorCompSequence.length);
    this._dnaCompG.append("g").attr("class", "junk-region").call(n);

    this._dnaCompG.attr("transform", "translate(0, " + this.model2pxInv(this.model.get("viewPortHeight") / 2 - nucleotides.HEIGHT) + ")");

    // Prepare container for mRNA.
    this._mrnaG.attr("transform", "translate(0, " + this.model2pxInv(this.model.get("viewPortHeight") / 2 - 0.5 * nucleotides.HEIGHT) + ")");
  };

  GeneticRenderer.prototype._renderTranscription = function (step) {
    var mRNA = this.model.get("mRNA").substr(0, step);

    this._renderDNA();
    this.separateDNA(true);

    this._mrnaG.call(nucleotides().model2px(this.model2px).sequence(mRNA).backbone("RNA"));
    this._dnaCompG.selectAll(".nucleotide .bonds").style("opacity", function (d, i) {
      return i < step ? 1 : 0;
    });
  };

  GeneticRenderer.prototype._renderTranslation = function (step) {
    var mRNA = this.model.get("mRNA");

    this._mrnaG.call(nucleotides().model2px(this.model2px).sequence(mRNA).direction(2).backbone("RNA"));
    this._mrnaG.selectAll(".nucleotide .bonds").style("opacity", function (d, i) {
      // Show bonds only of 6 nucleotides with tRNAs above them.
      return i < 3 * (step - 2) || i >= 3 * step ? 0 : 1;
    });

    this._mrnaG.attr("transform", "translate(0, " + this.model2pxInv(1.5 * nucleotides.HEIGHT) + ")");
    this._appendRibosome();

    this._moveRibosome(true);

    // Note that order of these if statement is important.
    // It ensures that tRNA on the left is the first child,
    // while the second tRNA is the last child.
    if (step > 1) {
      this._appendTRNA(step - 2);
      // Hide tRNA neck of the first tRNA (there are two visible only).
      this._trnaG.select(".trna:first-child .trna-neck").style("opacity", 0);
    }
    if (step > 0) {
      this._appendTRNA(step - 1);
    }
  };

  /******************************************************
   *                Transition methods                  *
   ******************************************************
   * They are called from .stateTransition() method and
   * are used to transition from one state to another
   * using animations.
   */

  GeneticRenderer.prototype.playIntro = function () {
    var ms2px = this.model2px,
        cx = this.model2px(W.CELLS * 0.567),
        cy = this.model2px(H.CELLS * 0.445),
        mWidth  = this.model2px(5),
        mHeight = this.model2px(3),
        dna3units = 14,
        introG, dna3, t;

    this._g.selectAll(".dna-intro").remove();
    introG = this._g.append("g").attr({
      "class": "dna-intro",
      "transform": "translate(" + cx + " " + cy + ")"
    });

    introG.append("image").attr({
      "class": "cells",
      "x": -cx,
      "y": -cy,
      "width": this.model2px(W.CELLS),
      "height": this.model2px(H.CELLS),
      "preserveAspectRatio": "none",
      "xlink:href": "resources/dna/Cells.svg"
    });

    introG.append("image").attr({
      "class": "dna1",
      "x": this.model2px(W.DNA1 * -0.5),
      "y": this.model2px(H.DNA1 * -0.5),
      "width": this.model2px(W.DNA1),
      "height": this.model2px(H.DNA1),
      "transform": "scale(0.13)",
      "preserveAspectRatio": "none",
      "xlink:href": "resources/dna/DNA_InsideNucleus_1.svg"
    }).style("opacity", 0);

    introG.append("image").attr({
      "class": "dna2",
      "x": this.model2px(W.DNA2 * -0.5),
      "y": this.model2px(H.DNA2 * -0.404),
      "width": this.model2px(W.DNA2),
      "height": this.model2px(H.DNA2),
      "preserveAspectRatio": "none",
      "xlink:href": "resources/dna/DNA_InsideNucleus_2.svg"
    }).style("opacity", 0);

    introG.append("image").attr({
      "class": "polymerase-under",
      "x": this.model2px(W.POLY_UNDER * -0.5),
      "y": this.model2px(H.POLY_UNDER * -0.5),
      "width": this.model2px(W.POLY_UNDER),
      "height": this.model2px(H.POLY_UNDER),
      "preserveAspectRatio": "none",
      "transform": "translate(" + mWidth * -0.65 + ", " + mHeight * -0.5 + ") scale(0.2)",
      "xlink:href": "resources/dna/Polymerase_Under.svg"
    }).style("opacity", 1);

    dna3 = introG.append("g").attr({
      "class": "dna3",
      "transform": "scale(0.2)"
    }).style("opacity", 0);

    dna3.selectAll("dna3-unit").data(new Array(dna3units)).enter().append("image").attr({
      "class": "dna3-unit",
      "x": function (d, i) { return (i - dna3units * 0.5) * ms2px(W.DNA3) * 0.98; },
      "y": this.model2px(H.DNA3 * -0.5),
      "width": this.model2px(W.DNA3),
      "height": this.model2px(H.DNA3),
      "preserveAspectRatio": "none",
      "xlink:href": "resources/dna/DoubleHelix_Unit.svg"
    });

    introG.append("image").attr({
      "class": "polymerase-over",
      "x": this.model2px(W.POLY_OVER * -0.5),
      "y": this.model2px(H.POLY_OVER * -0.5),
      "width": this.model2px(W.POLY_OVER),
      "height": this.model2px(H.POLY_OVER),
      "preserveAspectRatio": "none",
      "transform": "scale(0.8)",
      "xlink:href": "resources/dna/Polymerase_Over.svg"
    }).style("opacity", 0);

    t = this._nextTrans().ease("cubic").duration(5000);
    t.select(".cells")
      .attr("transform", "scale(12)");  // 1.0  * 12
    t.select(".dna1")
      .attr("transform", "scale(1.56)") // 0.13 * 12
      // Of course max value for opacity is 1. However value bigger than 1
      // affects transition progress and in this case it's helpful.
      .style("opacity", 5);


    t.select(".dna-intro").ease("cubic-in-out")
      .attr("transform", "translate(" + mWidth * 0.5 + " " + mHeight * 0.5 + ")");

    t = this._nextTrans().ease("linear").duration(2000);
    t.select(".dna1")
      .style("opacity", 0)
      .attr("transform", "scale(3.12)"); // 1.56 * 2
    t.select(".dna2")
      .style("opacity", 1)
      .attr("transform", "scale(2)");    // 1.0  * 2

    t = this._nextTrans().ease("linear").duration(2000);
    t.select(".dna2")
      .style("opacity", 0)
      .attr("transform", "scale(3.8)");
    t.select(".dna3")
      .style("opacity", 1)
      .attr("transform", "scale(0.4)");

    t = this._nextTrans().ease("quad-out").duration(3500);
    t.select(".dna3")
      .attr("transform", "scale(0.6)");

    t = this._nextTrans().ease("quad-out").duration(3000);
    t.select(".polymerase-under")
      .attr("transform", "translate(0, 0) scale(0.8)");

    t = this._nextTrans().ease("cubic-in-out").duration(1000);
    t.select(".polymerase-under")
      .attr("transform", "scale(1)");
    t.select(".polymerase-over")
      .attr("transform", "scale(1)")
      .style("opacity", 1);

    t = this._nextTrans().duration(2000);
    t.selectAll(".polymerase-under, .polymerase-over")
      .attr("transform", "scale(2.5)");  // 1.0 * 2.5
    t.selectAll(".dna3")
      .attr("transform", "scale(1.5)");  // 0.6 * 2.5

    t = this._nextTrans().duration(700);
    t.select(".dna-intro")
      .style("opacity", 0)
      .remove();

    /*
    // Circle (cx, cy) point. Useful for debugging and fitting objects in a right place.
    introG.append("circle").attr({
      "class": "ctr",
      "cx": 0,
      "cy": 0,
      "r": 10,
      "fill": "red"
    });
    */
  };

  GeneticRenderer.prototype.separateDNA = function (suppressAnimation) {
    // When animation is disabled (e.g. during initial rendering), main group element
    // is used as a root instead of d3 transition object.
    var selection = suppressAnimation ? this._g : this._nextTrans().duration(1500);

    selection.select(".dna").attr("transform",
      "translate(0, " + this.model2pxInv(this.model.get("viewPortHeight") / 2 + 2.5 * nucleotides.HEIGHT) + ")");
    selection.select(".dna-comp").attr("transform",
      "translate(0, " + this.model2pxInv(this.model.get("viewPortHeight") / 2 - 2.5 * nucleotides.HEIGHT) + ")");

    if (suppressAnimation) {
      selection.selectAll(".dna .bonds, .dna-comp .bonds").style("opacity", 0);
    } else {
      selection.selectAll(".dna .bonds, .dna-comp .bonds").duration(250).style("opacity", 0);
    }
  };

  GeneticRenderer.prototype.transcribeStep = function (step) {
    var mRNA  = this.model.get("mRNA").substr(0, step),
        trans = this._nextTrans().duration(500),
        t, r;

    this._mrnaG.call(nucleotides().model2px(this.model2px).sequence(mRNA).backbone("RNA"));

    // While adding a new mRNA segment, choose a random starting point along a
    // circle with a certain radius that extends beyond the top DNA strand.
    // Use parametric circle equation: x = r cos(t), y = r sin(t)
    // Limit range of the "t" parameter to: [0.25 * PI, 0.75 * PI) and [1.25 * PI, 1.75 * PI),
    // so new mRNA segments will come only from the top or bottom side of the container.
    t = Math.random() >= 0.5 ? Math.PI * 0.25 : Math.PI * 1.25;
    t += Math.random() * Math.PI * 0.5;
    r = nucleotides.HEIGHT * 6;
    this._mrnaG.select(".nucleotide:last-child")
      .attr("transform", "translate(" + this.model2px(r * Math.cos(t)) + ", " + this.model2px(r * Math.sin(t)) + ")")
      .style("opacity", 0);

    trans.select(".mrna .nucleotide:last-child")
      .attr("transform", "translate(0, 0)")
      .style("opacity", 1)
        // Subselection of bonds.
        .select(".bonds").ease("cubic")
          .style("opacity", 1);

    trans.select(".dna-comp .coding-region .nucleotide:nth-child(" + step + ") .bonds").ease("cubic")
      .style("opacity", 1);

    this._scrollContainer();
  };

  GeneticRenderer.prototype.prepareForTranslation = function () {
    var cx = this.model2px(5 * 0.5 - 2 * nucleotides.WIDTH),
        vx = this.model2px((this.model.get("viewPortX") + 0.5 * this.model.get("viewPortWidth"))),
        cy = this.model2pxInv(3 * 0.5),
        self = this,
        t;

    // Nucleus.
    this._g.insert("image", ".dna-view").attr({
      "class": "nucleus",
      "x": this.model2px(W.NUCLEUS * -0.5),
      "y": this.model2px(H.NUCLEUS * -0.5),
      "width": this.model2px(W.NUCLEUS),
      "height": this.model2px(H.NUCLEUS),
      "preserveAspectRatio": "none",
      "transform": "translate(" + cx + ", " + cy + ")",
      "xlink:href": "resources/dna/BG_Nucleus.svg"
    }).style("opacity", 0);

    // Polymerase.
    this._g.insert("image", ".dna-view").attr({
      "class": "polymerase-under",
      "x": this.model2px(W.POLY_UNDER * -0.5),
      "y": this.model2px(H.POLY_UNDER * -0.5),
      "width": this.model2px(W.POLY_UNDER),
      "height": this.model2px(H.POLY_UNDER),
      "preserveAspectRatio": "none",
      "transform": "translate(" + vx + ", " + cy + ") scale(2.5)",
      "xlink:href": "resources/dna/Polymerase_Under.svg"
    }).style("opacity", 0);

    this._g.append("image").attr({
      "class": "polymerase-over",
      "x": this.model2px(W.POLY_OVER * -0.5),
      "y": this.model2px(H.POLY_OVER * -0.5),
      "width": this.model2px(W.POLY_OVER),
      "height": this.model2px(H.POLY_OVER),
      "preserveAspectRatio": "none",
      "transform": "translate(" + vx + ", " + cy + ") scale(2.5)",
      "xlink:href": "resources/dna/Polymerase_Over.svg"
    }).style("opacity", 0);

    // Ribosome (top-bottom and under-over).
    this._appendRibosome();

    // Hide under-over version, but show top-bottom.
    this._g.selectAll(".ribosome-under, .ribosome-over").style("opacity", 0);
    this._g.selectAll(".ribosome-top, .ribosome-bottom").style("opacity", 1);

    this._nextTrans().ease("cubic-in-out").duration(700)
      .selectAll(".polymerase-under, .polymerase-over")
        .style("opacity", 1);

    // Show nucleus image and set appropriate background.
    this._currentTrans.each("end", function () {
      d3.select(".genetics .nucleus").style("opacity", 1);
      d3.select(".plot").style("fill", "#8492ef");
    });

    t = this._nextTrans().ease("cubic-in-out").duration(1000)
    t.selectAll(".polymerase-under, .polymerase-over")
      .attr("transform", "translate(" + vx + ", " + cy + ") scale(1.4)");
    t.select(".polymerase-over")
      .style("opacity", 0);

    this._nextTrans().ease("cubic-in-out").duration(1500)
      .selectAll(".polymerase-under, .polymerase-over")
        .attr("transform", "translate(" + (vx + this.model2px(5)) + ", " + (cy - this.model2px(2)) + ") scale(0.7)");

    t = this._nextTrans().ease("cubic-in-out").duration(1500);
    this._scrollContainer(false, -2, "cubic-in-out");

    // Set background for translation.
    this._currentTrans.each("end", function () {
      d3.select(".genetics .nucleus").style("opacity", 1);
      d3.select(".plot").style("fill", "#B8EBF0");
    });

    t = this._nextTrans().ease("cubic").duration(1000);
    t.select(".nucleus")
      .attr("transform", "translate(" + cx + ", " + this.model2pxInv(0) + ")");
    t.select(".dna")
      .attr("transform", "translate(0, " + this.model2pxInv(4 * nucleotides.HEIGHT) + ")");
    t.select(".dna-comp")
      .attr("transform", "translate(0, " + this.model2pxInv(2 * nucleotides.HEIGHT) + ")");
    t.selectAll(".mrna .bonds, .dna-comp .bonds").duration(250)
      .style("opacity", 0);

    t = this._nextTrans().ease("cubic-out").duration(1000);
    t.select(".nucleus")
      .attr("transform", "translate(" + cx + ", " + this.model2pxInv(H.NUCLEUS * -0.5) + ")");
    t.select(".dna")
      .attr("transform", "translate(0, " + this.model2pxInv(-1 * nucleotides.HEIGHT) + ")");
    t.select(".dna-comp")
      .attr("transform", "translate(0, " + this.model2pxInv(-3 * nucleotides.HEIGHT) + ")");
    t.select(".mrna")
      .attr("transform", "translate(0, " + this.model2pxInv(2.5 * nucleotides.HEIGHT) + ")");

    // Hacky way to change direction of the nucleotides. If we transform
    // directly from scale(1, 1) to scale(1, -1), resulting transition looks
    // strange (involves rotation etc.). So, first change scale to value very
    // close to 0, than swap sign and finally change it to -1. Everything
    // should look as expected.
    t = this._nextTrans().ease("cubic-out").duration(250);
    t.selectAll(".mrna .nucleotide g.scale").attr("transform", "scale(1, 1e-10)");

    t.select(".mrna")
      .attr("transform", "translate(0, " + this.model2pxInv(2 * nucleotides.HEIGHT) + ")");

    // Replace images with rotated versions.
    t.each("end", function () {
      self._mrnaG.call(nucleotides().model2px(self.model2px).sequence(self.model.get("mRNA")).backbone("RNA").direction(2));
      self._mrnaG.selectAll(".nucleotide g.scale").attr("transform", "scale(1, -1e-10)");
    });

    t = this._nextTrans().ease("cubic-out").duration(250);
    t.selectAll(".mrna .nucleotide g.scale").attr("transform", "scale(1, -1)");

    t.select(".mrna")
      .attr("transform", "translate(0, " + this.model2pxInv(1.5 * nucleotides.HEIGHT) + ")");

    // Ribosome fade in.
    t = this._nextTrans().ease("cubic-in-out").duration(1000);
    t.select(".ribosome-bottom")
      .attr("transform", this._ribosomeBottomPos(0));
    t = this._nextTrans().ease("cubic-in-out").duration(1000);
    t.select(".ribosome-top")
      .attr("transform", this._ribosomeTopPos(0));


    t = this._nextTrans().ease("cubic-in-out").duration(500);
    t.selectAll(".ribosome-top, .ribosome-bottom")
      .style("opacity", 0);
    t.selectAll(".ribosome-under, .ribosome-over")
      .style("opacity", 1);

    t.each("end", function () {
      // This will cleanup a lot of things and ensure that new elements
      // required for translation (but not for this intro) are added.
      self.render();
    });
  };

  GeneticRenderer.prototype.translateStep = function (step) {
    var codonIdx = step - 1,
        geneticEngine = this.model.geneticEngine(),
        newAADuration = 1000,
        shiftDuration = 400,
        t;

    this._appendTRNA(codonIdx);
    this._trnaG.select(".trna:last-child")
      .attr("transform", "translate(" + this.model2px(nucleotides.HEIGHT * 2) + ", " + this.model2px(-2.78) + ")")
        .select(".rot")
          .attr("transform", "rotate(30)")
          // Bonds subselection.
          .selectAll(".bonds")
            .style("opacity", 0);

    t = this._nextTrans().duration(newAADuration);
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

    this._moveRibosome();
    this._scrollContainer();

    if (step > 1) {
      t = this._nextTrans().duration(100);
      t.select(".trna-cont .trna:nth-child(" + (step === 2 ? 1 : 2) + ") .trna-neck")
        .style("opacity", 0);

      t = this._nextTrans().duration(shiftDuration);
      t.each("start", function () {
        geneticEngine.shiftAminoAcids(codonIdx, 2 * nucleotides.WIDTH, shiftDuration);
      });
      t.each("end", function () {
        geneticEngine.connectAminoAcid(codonIdx);
      });
      // Empty translation. Reserve some time for the protein folding, as D3
      // animations are slowing down simulation significantly.
      // t = this._nextTrans().duration(600);
    }

    if (step > 2) {
      this._removeTRNA(step - 3);
    }
  };

  GeneticRenderer.prototype.finishTranslation = function () {
    var geneticEngine = this.model.geneticEngine(),
        aaCount = this.model.get_num_atoms(),
        dnaLen = this.model.get("DNA").length,
        self = this,
        cm, viewBox, t;

    if (aaCount >= 2) {
      this._removeTRNA(aaCount - 2);
    }
    if (aaCount >= 1) {
      t = this._nextTrans().duration(100);
      t.select(".trna-cont .trna:last-child .trna-neck").style("opacity", 0);
      this._currentTrans.each("end", function () {
        geneticEngine.translationCompleted();
      });
      this._removeTRNA(aaCount - 1);
    }

    // Ensure that aaCount is >= 2, due to some assumptions used below.
    aaCount = Math.max(2, aaCount);

    // Show top-over.
    t = this._nextTrans().duration(500);
    t.each("start", function () {
      // Move top-bottom into a correct position.
      d3.select(".ribosome-top")
        .attr("transform", self._ribosomeTopPos(aaCount));
      d3.select(".ribosome-bottom")
        .attr("transform", self._ribosomeBottomPos(aaCount));
    });
    t.selectAll(".ribosome-top, .ribosome-bottom").style("opacity", 1);
    t.selectAll(".ribosome-under, .ribosome-over").style("opacity", 0);

    // Detach two parts of ribosome.
    t = this._nextTrans().duration(300);
    t.select(".ribosome-top")
      .attr("transform", this._ribosomeTopPos(aaCount, 0, 0.5));
    t.select(".ribosome-bottom")
      .attr("transform", this._ribosomeBottomPos(aaCount, 0, -0.3));

    // Move ribosome away.
    t = this._nextTrans().duration(1000);
    t.select(".ribosome-top")
      .attr("transform", this._ribosomeTopPos(aaCount, 8, 5));
    t.select(".ribosome-bottom")
      .attr("transform", this._ribosomeBottomPos(aaCount, 8, -0.5));

    // Slide out mRNA.
    t.select(".mrna")
      .attr("transform", "translate(" + this.model2px(-(dnaLen + 4) * nucleotides.WIDTH) + ", " + this.model2pxInv(1.5 * nucleotides.HEIGHT) + ")");

    // Center viewport at protein's center of mass.
    t = this._nextTrans().duration(700);
    t.each("start", function () {
      cm = geneticEngine.proteinCenterOfMass();
      if (cm) { // null when there are no proteins.
        viewBox = d3.select(".viewport").attr("viewBox").split(" ");
        viewBox[0] = self.model2px(cm.x - 0.5 * self.model.get("viewPortWidth"));
        // Note that there is + instead of -, as native viewBox attribute uses
        // *top*-left cordner of a viewBox to define its position. Only our
        // model property "viewPortY" defines bottom Y coordinate to be
        // consistent with the general coordinate system used in MD2D.
        viewBox[1] = self.model2pxInv(cm.y + 0.5 * self.model.get("viewPortHeight"));
        t.select(".viewport").attr("viewBox", viewBox.join(" "));
      }
    });
    // Update model description of the viewport when animation ends.
    t.each("end", function () {
      if (cm) {
        self.model.set("viewPortX", cm.x - 0.5 * self.model.get("viewPortWidth"));
        self.model.set("viewPortY", cm.y - 0.5 * self.model.get("viewPortHeight"));
      }
    });

    t.each("end", function () {
      // Nothing will be rendered, but this will simply cleanup everything, as
      // DNA animation is completed.
      self.render();
    });
  };


  /******************************************************
   *                   Helper methods                   *
   ******************************************************
   * They provide some common functionality, which can be
   * used both during static rendering or transition.
   * Sometimes they accept suppressAnimation argument.
   */

  GeneticRenderer.prototype._appendRibosome = function () {
    var cy = this.model2pxInv(this.model.get("viewPortHeight") * 0.5);
    // Ribosome top-bottom.
    this._g.append("image").attr({
      "class": "ribosome-bottom",
      "x": this.model2px(W.RIBO_BOTTOM * -0.5),
      "y": this.model2px(H.RIBO_BOTTOM * -0.5),
      "width": this.model2px(W.RIBO_BOTTOM),
      "height": this.model2px(H.RIBO_BOTTOM),
      "preserveAspectRatio": "none",
      "transform": "translate(" + this.model2px(-3) + ", " + cy + ")",
      "xlink:href": "resources/dna/Ribosome_bottom1.svg"
    }).style("opacity", 0);

    this._g.append("image").attr({
      "class": "ribosome-top",
      "x": this.model2px(W.RIBO_TOP * -0.5),
      "y": this.model2px(H.RIBO_TOP * -0.5),
      "width": this.model2px(W.RIBO_TOP),
      "height": this.model2px(H.RIBO_TOP),
      "preserveAspectRatio": "none",
      "transform": "translate(" + this.model2px(-3) + ", " + this.model2pxInv(6) + ")",
      "xlink:href": "resources/dna/Ribosome_top1.svg"
    }).style("opacity", 0);

    this._dnaView.insert("image", ".mrna").attr({
      "class": "ribosome-under",
      "x": this.model2px(W.RIBO_UNDER * -0.5),
      "y": this.model2pxInv(3.7 * nucleotides.HEIGHT + 0.5 * H.RIBO_UNDER),
      "width": this.model2px(W.RIBO_UNDER),
      "height": this.model2px(H.RIBO_UNDER),
      "preserveAspectRatio": "none",
      "transform": this._ribosomeUnderOverPos(0),
      "xlink:href": "resources/dna/Ribosome_under.svg"
    });

    this._dnaView.append("image").attr({
      "class": "ribosome-over",
      "x": this.model2px(W.RIBO_OVER * -0.5),
      "y": this.model2pxInv(3.7 * nucleotides.HEIGHT + 0.5 * H.RIBO_UNDER),
      "width": this.model2px(W.RIBO_OVER),
      "height": this.model2px(H.RIBO_OVER),
      "preserveAspectRatio": "none",
      "transform": this._ribosomeUnderOverPos(0),
      "xlink:href": "resources/dna/Ribosome_over.svg"
    });
  };

  GeneticRenderer.prototype._ribosomeTopPos = function (step, xShift, yShift) {
    step = Math.max(0, step - 2);
    xShift = xShift || 0;
    yShift = yShift || 0;
    return "translate(" + this.model2px((2 + step * 3) * nucleotides.WIDTH + xShift) + ", "
                        + this.model2pxInv(4.52 * nucleotides.HEIGHT + yShift) + ")";
  };

  GeneticRenderer.prototype._ribosomeBottomPos = function (step, xShift, yShift) {
    step = Math.max(0, step - 2);
    xShift = xShift || 0;
    yShift = yShift || 0;
    return "translate(" + this.model2px((1.95 + step * 3) * nucleotides.WIDTH + xShift) + ", "
                        + this.model2pxInv(1.75 * nucleotides.HEIGHT + yShift) + ")";
  };

  GeneticRenderer.prototype._ribosomeUnderOverPos = function (step) {
    step = Math.max(0, step - 2);
    return "translate(" + this.model2px((2 + step * 3) * nucleotides.WIDTH) + ")";
  };

  GeneticRenderer.prototype._moveRibosome = function (suppressAnimation) {
    (suppressAnimation ? this._g : this._currentTrans)
      .selectAll(".ribosome-under, .ribosome-over")
        .attr("transform", this._ribosomeUnderOverPos(this._state().step));
  };

  GeneticRenderer.prototype._appendTRNA = function (index) {
        // The most outer container can be used to set easily position offset.
        // While the inner g elements provides translation for "ideal" tRNA position
        // close to the mRNA and optional rotation.
    var trnaPosG = this._trnaG.append("g").attr("class", "trna").append("g"),
        trna = trnaPosG.append("g").attr("class", "rot"),
        type = this.model.geneticEngine().codonComplement(index),

        m2px    = this.model2px,
        m2pxInv = this.model2pxInv,

        codonWidth = 3 * nucleotides.WIDTH,
        offset = (codonWidth - W.TRNA) * 0.55;

    trna.append("g")
      .attr("transform", "translate(0, " + m2px(-H.A) + ")")
      .call(nucleotides().model2px(this.model2px).sequence(type).backbone(false));

    trna.append("image").attr({
      "class": "trna-neck",
      "x": m2px(0.52 * (codonWidth - W.TRNA_NECK)),
      "y": m2px(-H.TRNA_NECK -H.TRNA * 0.95 - H.A * 0.92),
      "width": m2px(W.TRNA_NECK),
      "height": m2px(H.TRNA_NECK),
      "preserveAspectRatio": "none",
      "xlink:href": "resources/dna/tRNA_neck.svg"
    });

    trna.append("image").attr({
      "class": "trna-base",
      "x": m2px(offset),
      "y": m2px(-H.TRNA - H.A * 0.92),
      "width": m2px(W.TRNA),
      "height": m2px(H.TRNA),
      "preserveAspectRatio": "none",
      "xlink:href": "resources/dna/tRNA_base.svg"
    });

    trnaPosG.attr("transform", "translate(" + m2px(index * codonWidth) + ", " + m2pxInv(2.5 * nucleotides.HEIGHT) + ")");
  };

  /**
   * Removes nth tRNA during DNA translation.
   *
   * @private
   * @param  {[type]} i tRNA index (starting from 0).
   */
  GeneticRenderer.prototype._removeTRNA = function (i, suppressAnimation) {
    var bondsSelString = ".trna-cont .trna:first-child .bonds, " +      // tRNA bonds
                         ".mrna .nucleotide:nth-child(" + (3 * i + 1) + ") .bonds, " + // mRNA bonds
                         ".mrna .nucleotide:nth-child(" + (3 * i + 2) + ") .bonds, " +
                         ".mrna .nucleotide:nth-child(" + (3 * i + 3) + ") .bonds",
        self = this,
        t;

    if (!suppressAnimation) {
      t = this._nextTrans().duration(900);
      // Remove the first tRNA.
      // Note that due to the fact that we use relative ("first") selector,
      // it has to be inside "start" callback, as only at the beginning of this
      // transition given tRNA will be first one. Otherwise, when you called _removeTRNA
      // twice, both transition would be applied to the same tRNA.
      t.each("start", function () {
        t.select(".trna-cont .trna:first-child")
          .attr("transform", "translate(" + self.model2px(nucleotides.HEIGHT * -5) + ", " + self.model2px(nucleotides.HEIGHT * -4) + ")")
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
      this._g.selectAll(bondsSelString).style("opacity", 0);
      this._g.select(".trna-cont .trna:first-child").remove();
    }
  };

  return GeneticRenderer;
});

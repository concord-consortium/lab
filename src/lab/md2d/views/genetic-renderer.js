/*global define, $, d3 */

define(function (require) {

  var labConfig = require('lab.config'),
      Nucleotide = require('md2d/views/nucleotide');

  function GeneticRenderer(container, parentView, model) {
    this.container = container;
    this.parent = parentView;
    this.model = model;
    this.model2px = parentView.model2px;
    this.model2pxInv = parentView.model2pxInv;
    this.modelSize2px = parentView.modelSize2px;

    this._g = null;
    this._dnaG = null;
    this._dnaCompG = null;
    this._mrnaG = null;
    this._dna = [];
    this._dnaComp = [];
    this._mrna = [];
    this._currentTrans = null;
    // Redraw DNA / mRNA on every genetic properties change.
    this.model.getGeneticProperties().on("change", $.proxy(this.render, this));
    this.model.getGeneticProperties().on("separateDNA", $.proxy(this.separateDNA, this));
    this.model.getGeneticProperties().on("transcribeStep", $.proxy(this.transcribeStep, this));
  }


  GeneticRenderer.prototype.render = function () {
    var props = this.model.getGeneticProperties().get();

    if (props === undefined) {
      return;
    }

    this.container.selectAll("g.genetics").remove();
    this._g = this.container.append("g").attr("class", "genetics");

    this._currentTrans = null;

    this._renderDNA(props.DNA, props.DNAComplement, props.mRNA);
    this._renderBackground();
  };

  GeneticRenderer.prototype.separateDNA = function (suppressAnimation) {
    // When animation is disabled (e.g. during initial rendering), main group element
    // is used as a root instead of d3 transition object.
    var selection = suppressAnimation ? this._g : this._nextTrans().duration(1500),
        i, len;

    selection.select(".dna").attr("transform",
      "translate(0, " + this.model2pxInv(this.model.get("height") / 2 + 2.5 * Nucleotide.HEIGHT) + ")");
    selection.select(".dna-comp").attr("transform",
      "translate(0, " + this.model2pxInv(this.model.get("height") / 2 - 2.5 * Nucleotide.HEIGHT) + ")");

    for (i = 0, len = this._dna.length; i < len; i++) {
      this._dna[i].hideBonds(suppressAnimation);
      this._dnaComp[i].hideBonds(suppressAnimation);
    }
  };

  GeneticRenderer.prototype.transcribeStep = function () {
    var props  = this.model.getGeneticProperties().get(),
        index  = props.mRNA.length - 1, // last element
        type   = props.mRNA[index],
        trans  = this._nextTrans().duration(300);

    this._mrna.push(new Nucleotide(this._mrnaG, this.modelSize2px, type, 1, index, true));
    this._mrna[index].hideBonds(true);

    this._mrnaG.select(".nucleotide:last-child")
        .attr("transform", "translate(" + this.modelSize2px(0.2) + ", " + this.modelSize2px(-0.5) + ")")
        .style("opacity", 0);

    trans
      .select(".mrna .nucleotide:last-child")
        .attr("transform", "translate(0, 0)")
        .style("opacity", 1)
      .select(".bonds")
        .ease("linear")
        .style("opacity", 1);

    trans
      .select(".dna-comp .nucleotide:nth-child(" + (index + 1) + ") .bonds")
        .ease("linear")
        .style("opacity", 1);

    this._scrollContainer();
  };

  GeneticRenderer.prototype._scrollContainer = function (suppressAnimation) {
    var shift = Math.min(this._mrna.length, this._dna.length - 4);

    if (shift > 10) {
      (suppressAnimation ? this._g : this._currentTrans.select(".genetics").ease("linear"))
        .attr("transform", "translate(" + this.modelSize2px(-(shift - 10) * Nucleotide.WIDTH) + ")");
    }
  };

  GeneticRenderer.prototype._renderDNA = function (dna, dnaComplement, mRNA) {
    var i, len;

    this._dnaG     = this._g.append("g").attr("class", "dna"),
    this._dnaCompG = this._g.append("g").attr("class", "dna-comp"),
    this._mrnaG    = this._g.append("g").attr("class", "mrna"),
    this._dna      = [];
    this._dnaComp  = [];
    this._mrna     = [];

    for (i = 0, len = dna.length; i < len; i++) {
      this._dna.push(new Nucleotide(this._dnaG, this.modelSize2px, dna[i], 1, i));
    }
    this._dnaG.attr("transform", "translate(0, " + this.model2pxInv(this.model.get("height") / 2 + Nucleotide.HEIGHT) + ")");

    for (i = 0, len = dnaComplement.length; i < len; i++) {
      this._dnaComp.push(new Nucleotide(this._dnaCompG, this.modelSize2px, dnaComplement[i], 2, i));
    }
    this._dnaCompG.attr("transform", "translate(0, " + this.model2pxInv(this.model.get("height") / 2 - Nucleotide.HEIGHT) + ")");

    if (typeof mRNA !== "undefined") {
      this.separateDNA(true);
      for (i = 0, len = mRNA.length; i < len; i++) {
        this._mrna.push(new Nucleotide(this._mrnaG, this.modelSize2px, mRNA[i], 1, i, true));
        this._dnaComp[i].showBonds(true);
      }
    }
    this._mrnaG.attr("transform", "translate(0, " + this.model2pxInv(this.model.get("height") / 2 - 0.5 * Nucleotide.HEIGHT) + ")");

    this._scrollContainer(true);
  };

  GeneticRenderer.prototype._renderBackground = function () {
    var gradient = this._g.append("defs").append("linearGradient")
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
  };

  /**
   * Returns a new chained transition.
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

  return GeneticRenderer;
});

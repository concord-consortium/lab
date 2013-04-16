/*global define, $ */

define(function (require) {

  var Nucleotide = require('md2d/views/nucleotide');

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

    this._currentTrans = {};

    this._renderDNA(props.DNA, props.DNAComplement, props.mRNA);
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
        .duration(500)
        .style("opacity", 1);

    trans
      .select(".dna-comp .nucleotide:nth-child(" + (index + 1) + ") .bonds")
        .duration(500)
        .style("opacity", 1);
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
  };

  /**
   * Returns a new chained transition.
   * This transition will be executed when previous one ends.
   * Name of the animation chain can be specified, so multiple,
   * independent chains can be created. When name is omitted,
   * the default chain will be used.
   *
   * @private
   * @param  {string} name  name of the animations chain (optional).
   * @return {d3 transtion} d3 transtion object.
   */
  GeneticRenderer.prototype._nextTrans = function (name) {
    if (typeof name === "undefined") {
      name = "__default__";
    }
    // TODO: this first check is a workaround.
    // Ideal scenario would be to call always:
    // this._currentTrans[name] = this._currentTrans[name].transition();
    // but it seems to fail when transition has already ended.
    if (this._currentTrans[name] && this._currentTrans[name].node().__transition__) {
      // Some transition is currently in progress, chain a new transition.
      this._currentTrans[name] = this._currentTrans[name].transition();
    } else {
      // All transition ended, just create a new one.
      this._currentTrans[name] = this._g.transition();
    }
    return this._currentTrans[name];
  };

  return GeneticRenderer;
});

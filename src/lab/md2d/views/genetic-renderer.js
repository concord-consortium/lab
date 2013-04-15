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
    this._dna = [];
    this._dnaComp = [];
    // Redraw DNA / mRNA on every genetic properties change.
    this.model.getGeneticProperties().on("change", $.proxy(this.render, this));
    this.model.getGeneticProperties().on("separateDNA", $.proxy(this.separateDNA, this));
  }


  GeneticRenderer.prototype.render = function () {
    var props = this.model.getGeneticProperties().get();

    if (props === undefined) {
      return;
    }

    this.container.selectAll("g.genetics").remove();
    this._g = this.container.append("g").attr("class", "genetics");

    this._renderDNA(props.DNA, props.DNAComplement);
  };

  GeneticRenderer.prototype.separateDNA = function () {
    var i, len;

    this._dnaG.transition().duration(1500).attr("transform",
      "translate(0, " + this.model2pxInv(this.model.get("height") / 2 - 2.5 * Nucleotide.HEIGHT) + ")");
    this._dnaCompG.transition().duration(1500).attr("transform",
      "translate(0, " + this.model2pxInv(this.model.get("height") / 2 + 2.5 * Nucleotide.HEIGHT) + ")");

    for (i = 0, len = this._dna.length; i < len; i++) {
      this._dna[i].hideBonds();
      this._dnaComp[i].hideBonds();
    }
  };

  GeneticRenderer.prototype._renderDNA = function (dna, dnaComplement) {
    var i, len;

    this._dnaG     = this._g.append("g").attr("class", "dna"),
    this._dnaCompG = this._g.append("g").attr("class", "dna-comp"),
    this._dna      = [];
    this._dnaComp  = [];

    for (i = 0, len = dna.length; i < len; i++) {
      this._dna.push(new Nucleotide(this._dnaG, this.modelSize2px, dna[i], 2, i));
    }
    this._dnaG.attr("transform", "translate(0, " + this.model2pxInv(this.model.get("height") / 2 - Nucleotide.HEIGHT) + ")");

    for (i = 0, len = dnaComplement.length; i < len; i++) {
      this._dnaComp.push(new Nucleotide(this._dnaCompG, this.modelSize2px, dnaComplement[i], 1, i));
    }
    this._dnaCompG.attr("transform", "translate(0, " + this.model2pxInv(this.model.get("height") / 2 + Nucleotide.HEIGHT) + ")");
  };

  return GeneticRenderer;
});

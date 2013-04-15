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
    // Redraw DNA / mRNA on every genetic properties change.
    this.model.getGeneticProperties().on("change", $.proxy(this.render, this));
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

  GeneticRenderer.prototype._renderDNA = function (dna, dnaComplement) {
    var dnaG     = this._g.append("g").attr("class", "dna"),
        dnaCompG = this._g.append("g").attr("class", "dna-comp"),
        i, len;

    for (i = 0, len = dna.length; i < len; i++) {
      new Nucleotide(dnaG, this.modelSize2px, dna[i], 2, i);
    }
    dnaG.attr("transform", "translate(0, " + this.model2pxInv(this.model.get("height") / 2 - Nucleotide.HEIGHT) + ")");

    for (i = 0, len = dnaComplement.length; i < len; i++) {
      new Nucleotide(dnaCompG, this.modelSize2px, dnaComplement[i], 1, i);
    }
    dnaCompG.attr("transform", "translate(0, " + this.model2pxInv(this.model.get("height") / 2 + Nucleotide.HEIGHT) + ")");
  };

  return GeneticRenderer;
});

/*global define: false */

define(function (require) {

  return function GeneticRenderer(container, parentView, model) {
    var api,
        nm2px,
        nm2pxInv,

        init = function() {
          // Save shortcuts.
          nm2px = parentView.nm2px;
          nm2pxInv = parentView.nm2pxInv;
          // Redraw DNA / mRNA on every genetic properties change.
          model.getGeneticProperties().on("change", api.setup);
        },

        renderText = function(container, txt, fontSize, dy) {
          // Text shadow.
          container.append("text")
            .text(txt)
            .attr({
              "class": "shadow",
              "dy": dy
            })
            .style({
                "stroke-width": nm2px(0.01),
                "font-size": fontSize
            });

          // Final text.
          container.append("text")
            .text(txt)
            .attr({
              "class": "front",
              "dy": dy
            })
            .style("font-size", fontSize);
        };

    api = {
      setup: function () {
        var props = model.getGeneticProperties().get(),
            dnaGElement, fontSize;

        if (props === undefined) {
          return;
        }

        container.selectAll("g.dna").remove();

        dnaGElement = container.append("g").attr({
          "class": "dna",
          // (0nm, 0nm) + small, constant offset in px.
          "transform": "translate(" + nm2px(props.x) + "," + nm2pxInv(props.y) + ")"
        });

        fontSize = nm2px(props.height) + "px";

        // DNA code on sense strand.
        // [ fontSize is a string already (with "px" suffix), so simple -fontSize will result in NaN. ]
        renderText(dnaGElement, props.DNA, fontSize, "-" + fontSize);
        // Complementary sequence.
        renderText(dnaGElement, props.DNAComplement, fontSize, 0);
      }
    };

    init();

    return api;
  };
});

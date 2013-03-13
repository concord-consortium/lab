/*global define: false */

define(function (require) {

  return function GeneticRenderer(container, parentView, model) {
    var api,
        model2px,
        model2pxInv,
        modelSize2px,

        init = function() {
          // Save shortcuts.
          model2px = parentView.model2px;
          model2pxInv = parentView.model2pxInv;
          modelSize2px = parentView.modelSize2px;
          // Redraw DNA / mRNA on every genetic properties change.
          model.getGeneticProperties().on("change", api.setup);
        },

        renderText = function(container, txt, fontSize, dx, dy, markerPos) {
          var x = 0,
              xAttr = "",
              textElement,
              i, len;

          // Necessary for example in Firefox.
          fontSize += "px";

          for (i = 0, len = txt.length; i < len; i++) {
            xAttr += x + "px ";
            x += dx;
          }

          if (markerPos === undefined || markerPos === "end") {
            markerPos = txt.length / 3;
          }
          markerPos *= 3;

          // Text shadow.
          container.append("text")
            .text(txt)
            .attr({
              "class": "shadow",
              "x": xAttr,
              "dy": dy
            })
            .style({
                "stroke-width": modelSize2px(0.01),
                "font-size": fontSize
            });

          // Final text.
          textElement = container.append("text")
            .attr({
              "class": "front",
              "x": xAttr,
              "dy": dy
            })
            .style("font-size", fontSize);

          textElement.append("tspan")
            .text(txt.substring(0, markerPos));
          textElement.append("tspan")
            .attr("class", "marked-mrna")
            .text(txt.substring(markerPos, markerPos + 3));
          textElement.append("tspan")
            .text(txt.substring(markerPos + 3));
        };

    api = {
      setup: function () {
        var props = model.getGeneticProperties().get(),
            dnaGElement, fontSize, dx;

        if (props === undefined) {
          return;
        }

        container.selectAll("g.dna").remove();

        dnaGElement = container.append("g").attr({
          "class": "dna",
          // (0nm, 0nm) + small, constant offset in px.
          "transform": "translate(" + model2px(props.x) + "," + model2pxInv(props.y) + ")"
        });

        fontSize = modelSize2px(props.height);
        dx = modelSize2px(props.width);

        // DNA code on sense strand.
        renderText(dnaGElement, props.DNA, fontSize, dx, -fontSize);
        // DNA complementary sequence.
        renderText(dnaGElement, props.DNAComplement, fontSize, dx, 0);
        // mRNA (if available).
        if (props.mRNA !== undefined) {
          renderText(dnaGElement, props.mRNA, fontSize, dx, -2.5 * fontSize, props.translationStep);
        }
      }
    };

    init();

    return api;
  };
});

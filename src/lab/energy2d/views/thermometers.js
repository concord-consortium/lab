/*global define: false, d3: false */

define(function () {
  var W = 0.8,
      H = 1.8;

  return function ThermometersView(SVGContainer, g) {
    var api,

        m2px = SVGContainer.model2px,
        m2pxInv = SVGContainer.model2pxInv,

        thermometers,

        thermBg, // d3.selection
        thermReading, // d3.selection
        thermValScale = d3.scale.linear().clamp(true).domain([0, 50]).range([H, 0]),

        dragBehavior = d3.behavior.drag()
            .on("drag", function (d) {
              d.x = m2px.invert(d3.event.x);
              d.y = m2pxInv.invert(d3.event.y);
            });

    function em(val) { return val + "em"; }
    function transform(d) { return "translate(" + m2px(d.x) + "," + m2pxInv(d.y) + ")"; }
    function labelDx() { return -this.getBBox().width / 2; }
    function labelText(d) { return d.label; }
    function readingText(d) { return d.value.toFixed(1) + " °C"; }
    function bgHeight(d) { return em(thermValScale(d.value)); }

    // Public API.
    api = {
      update: function () {
        thermBg.attr("height", bgHeight);
        thermReading.text(readingText);
      },

      renderThermometers: function () {
        if (!thermometers) return;

        var therm, thermEnter;

        therm = g.selectAll(".e2d-thermometer").data(thermometers);
        thermEnter = therm.enter().append("g")
            // "therometer" class can be useful for onClick handlers.
            .attr("class", "e2d-thermometer thermometer");

        // Note that background and fill are inverted (background covers
        // fill). It's easier to change only height of background instead of
        // manipulating both Y coordinate and height of fill.
        thermEnter.append("rect").attr("class", "e2d-thermometer-fill");
        thermEnter.append("rect").attr("class", "e2d-thermometer-background");
        thermEnter.append("text").attr("class", "e2d-thermometer-label");
        thermEnter.append("text").attr("class", "e2d-thermometer-reading");

        thermEnter.call(dragBehavior);

        therm.attr("transform", transform);
        therm.select(".e2d-thermometer-fill")
          .attr("x", em(-0.5 * W))
          .attr("y", em(-0.5 * H))
          .attr("width", em(W))
          .attr("height", em(H));
        thermBg = therm.select(".e2d-thermometer-background")
          .attr("x", em(-0.5 * W))
          .attr("y", em(-0.5 * H))
          .attr("width", em(W))
          .attr("height", bgHeight);
        therm.select(".e2d-thermometer-label")
          .text(labelText)
          .attr("y", em(0.5 * H))
          .attr("dy", "1.1em")
          .attr("dx", labelDx);
        thermReading = therm.select(".e2d-thermometer-reading")
          .text(readingText)
          .attr("y", em(-0.5 * H))
          .attr("dy", "-.35em")
          .attr("dx", "-.7em");

        therm.exit().remove();
      },

      bindThermometersArray: function (newThermometers) {
        thermometers = newThermometers;
      },

      setMinMaxTemp: function (min, max) {
        thermValScale.domain([min, max]);
      }
    };

    return api;
  };
});

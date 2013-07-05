/*global define: false */

define(function () {
  var W = 0.3,
      H = 0.8;

  return function ThermometersView(SVGContainer, g) {
    var api,

        m2px = SVGContainer.model2px,
        m2pxInv = SVGContainer.model2pxInv,

        thermometers,
        minTemp = 0,
        maxTemp = 50,

        thermBg; // d3.selection

    function transform(d) { return "translate(" + m2px(d.x || 0) + "," + m2pxInv(d.y || 0) + ")"; }
    function bgHeight(d) { return m2px(H * (1 - (d.value - minTemp) / (maxTemp - minTemp))); }

    // Public API.
    api = {
      update: function () {
        thermBg.attr("height", bgHeight);
      },

      renderThermometers: function () {
        if (!thermometers) return;

        var therm, thermEnter;

        therm = g.selectAll(".e2d-thermometer").data(thermometers);
        thermEnter = therm.enter().append("g")
            .attr("class", "e2d-thermometer");

        // Note that background and fill are inverted (background covers
        // fill). It's easier to change only height of background instead of
        // manipulating both Y coordinate and height of fill.
        thermEnter.append("rect").attr("class", "e2d-thermometer-fill");
        thermEnter.append("rect").attr("class", "e2d-thermometer-background");

        therm.attr("transform", transform);
        therm.select(".e2d-thermometer-fill")
          .attr("x", m2px(-0.5 * W))
          .attr("y", m2pxInv(-0.5 * H))
          .attr("width", m2px(W))
          .attr("height", m2px(H));
        thermBg = therm.select(".e2d-thermometer-background")
          .attr("x", m2px(-0.5 * W))
          .attr("y", m2pxInv(-0.5 * H))
          .attr("width", m2px(W))
          .attr("height", bgHeight);

        therm.exit().remove();
      },

      bindThermometersArray: function (newThermometers) {
        thermometers = newThermometers;
      },

      setMinMaxTemp: function (min, max) {
        minTemp = min;
        maxTemp = max;
      }
    };

    return api;
  };
});

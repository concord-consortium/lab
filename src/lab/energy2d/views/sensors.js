/*global define: false, d3: false */

define(function () {
  var W = 2,
      H = 5;

  return function SensorsView(SVGContainer, g) {
    var api,

        m2px = SVGContainer.model2px,
        m2pxInv = SVGContainer.model2pxInv,

        sensors,

        thermBg, // d3.selection
        thermReading, // d3.selection
        thermValScale = d3.scale.linear().clamp(true).domain([0, 50]).range([H, 0]),

        anemoRot, // d3.selection

        dragBehavior = d3.behavior.drag()
            .origin(function (d) {
                return {
                  x: m2px(d.x),
                  y: m2pxInv(d.y)
                };
              })
            .on("drag", function (d) {
              d.x = m2px.invert(d3.event.x);
              d.y = m2pxInv.invert(d3.event.y);
            });

    function thermometerTest(d) { return d.type === "thermometer" ? this : null; }
    function anemometerTest(d) { return d.type === "anemometer" ? this : null; }

    function em(val) { return val + "%"; }
    function transform(d) { return "translate(" + m2px(d.x) + "," + m2pxInv(d.y) + ")"; }
    function labelDx() { return -this.getBBox().width / 2; }
    function labelText(d) { return d.label; }
    function readingText(d) { return d.value.toFixed(1) + " °C"; }
    function bgHeight(d) { return em(thermValScale(d.value)); }

    function anemometerRotation(d) { return "rotate(" + d.value + ")"; }

    function renderThermometers(enter, update) {
      enter = enter.select(thermometerTest);

      // Note that background and fill are inverted (background covers
      // fill). It's easier to change only height of background instead of
      // manipulating both Y coordinate and height of fill.
      enter.append("rect").attr("class", "e2d-thermometer-fill");
      enter.append("rect").attr("class", "e2d-thermometer-background");
      enter.append("text").attr("class", "e2d-thermometer-reading");

      update = update.select(thermometerTest);
      update.select(".e2d-thermometer-fill")
        .attr("x", em(-0.5 * W))
        .attr("y", em(-0.5 * H))
        .attr("width", em(W))
        .attr("height", em(H));
      thermBg = update.select(".e2d-thermometer-background")
        .attr("x", em(-0.5 * W))
        .attr("y", em(-0.5 * H))
        .attr("width", em(W))
        .attr("height", bgHeight);
      thermReading = update.select(".e2d-thermometer-reading")
        .text(readingText)
        .attr("y", em(-0.5 * H))
        .attr("dy", "-.2em")
        .attr("dx", "-.7em");
      update.select(".e2d-sensor-label")
        .attr("dy", "1em")
        .attr("y", em(0.5 * H));
    }

    function renderAnemometer(enter, update) {
      enter = enter.select(anemometerTest);

      var g = enter
        .append("svg")
          .attr("class", "e2d-anemometer-shape")
          .attr("viewBox", "-50 -50 100 100")
          .attr("x", "-3%")
          .attr("y", "-3%")
          .attr("width", "6%")
          .attr("height", "6%")
        .append("g")
          .attr("class", "e2d-anemometer-rot");

      g.append("path")
          .attr("d", "M-10,10 L0,50 L10,10 Z")
          .attr("transform", "rotate(0)");
      g.append("path")
          .attr("d", "M-10,10 L0,50 L10,10 Z")
          .attr("transform", "rotate(120)");
      g.append("path")
          .attr("d", "M-10,10 L0,50 L10,10 Z")
          .attr("transform", "rotate(240)");
      g.append("circle")
          .attr("r", 12);

      update = update.select(anemometerTest);
      anemoRot = update.select(".e2d-anemometer-rot")
          .attr("transform", anemometerRotation);

      update.select(".e2d-sensor-label")
        .attr("dy", "0.7em")
        .attr("y", "3%");
    }

    // Public API.
    api = {
      update: function () {
        thermBg.attr("height", bgHeight);
        thermReading.text(readingText);

        anemoRot.attr("transform", anemometerRotation);
      },

      renderSensors: function () {
        if (!sensors) return;

        var sensor, sensorEnter;

        sensor = g.selectAll(".e2d-sensor").data(sensors);
        sensorEnter = sensor.enter().append("g")
            // "sensor" class can be useful for onClick handlers.
            .attr("class", "e2d-sensor sensor");

        sensorEnter.append("text").attr("class", "e2d-sensor-label");

        renderThermometers(sensorEnter, sensor);
        renderAnemometer(sensorEnter, sensor);

        sensorEnter.call(dragBehavior);

        sensor.attr("transform", transform);
        sensor.select(".e2d-sensor-label")
            .text(labelText)
            .attr("dx", labelDx);

        sensor.exit().remove();
      },

      bindSensorsArray: function (newSensors) {
        sensors = newSensors;
      },

      setMinMaxTemp: function (min, max) {
        thermValScale.domain([min, max]);
      }
    };

    return api;
  };
});

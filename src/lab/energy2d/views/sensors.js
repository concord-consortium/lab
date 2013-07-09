/*global define: false, d3: false */

define(function () {
  var TH_W = 2,
      TH_H = 5;

  return function SensorsView(SVGContainer, g) {
    var api,

        m2px = SVGContainer.model2px,
        m2pxInv = SVGContainer.model2pxInv,

        sensors,

        thermBg, // d3.selection
        thermReading, // d3.selection
        thermValScale = d3.scale.linear().clamp(true).domain([0, 50]).range([TH_H, 0]),

        anemoRot, // d3.selection

        heatFluxReading, // d3.selection

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
    function heatFluxTest(d) { return d.type === "heatFlux" ? this : null; }

    function em(val) { return val + "%"; }
    function transform(d) { return "translate(" + m2px(d.x) + "," + m2pxInv(d.y) + ")"; }
    function labelDx() { return -this.getBBox().width / 2; }
    function labelText(d) { return d.label; }
    function readingText(d) { return d.value.toFixed(1) + " °C"; }
    function bgHeight(d) { return em(thermValScale(d.value)); }

    function anemometerRotation(d) { return "rotate(" + d.value + ")"; }

    function heatFluxReadingText(d) { return d.value.toFixed(1) + " W/m²"; }
    function heatFluxRot(d) { return "rotate(" + d.angle + ")"; }

    function renderThermometers(enter, update) {
      enter = enter.select(thermometerTest);

      // Note that background and fill are inverted (background covers
      // fill). It's easier to change only height of background instead of
      // manipulating both Y coordinate and height of fill.
      enter.append("rect").attr("class", "e2d-thermometer-fill");
      enter.append("rect").attr("class", "e2d-thermometer-background");
      enter.append("text").attr("class", "e2d-thermometer-reading");
      enter.append("text").attr("class", "e2d-sensor-label");

      update = update.select(thermometerTest);
      update.select(".e2d-thermometer-fill")
        .attr("x", em(-0.5 * TH_W))
        .attr("y", em(-0.5 * TH_H))
        .attr("width", em(TH_W))
        .attr("height", em(TH_H));
      thermBg = update.select(".e2d-thermometer-background")
        .attr("x", em(-0.5 * TH_W))
        .attr("y", em(-0.5 * TH_H))
        .attr("width", em(TH_W))
        .attr("height", bgHeight);
      thermReading = update.select(".e2d-thermometer-reading")
        .text(readingText)
        .attr("y", em(-0.5 * TH_H))
        .attr("dy", "-.2em")
        .attr("dx", "-.7em");
      update.select(".e2d-sensor-label")
        .text(labelText)
        .attr("dx", labelDx)
        .attr("dy", "1em")
        .attr("y", em(0.5 * TH_H));
    }

    function renderAnemometer(enter, update) {
      enter = enter.select(anemometerTest);

      enter.append("text").attr("class", "e2d-sensor-label");

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
        .text(labelText)
        .attr("dx", labelDx)
        .attr("dy", "0.7em")
        .attr("y", "3%");
    }

    function renderHeatFluxSensors(enter, update) {
      enter = enter.select(heatFluxTest);

      var g = enter.append("g")
          .attr("transform", heatFluxRot);

      g.append("rect")
          .attr("class", "e2d-heatflux-shape")
          .attr("x", "-3%")
          .attr("y", "-1%")
          .attr("width", "6%")
          .attr("height", "2%");
      g.append("svg")
          .attr("viewBox", "0 0 6 1")
          .attr("x", "-3%")
          .attr("y", "-1%")
          .attr("width", "6%")
          .attr("height", "2%")
        .append("path")
          .attr("class", "e2d-heatflux-pattern")
          .attr("d", "M0,0L1,1L2,0L3,1L4,0L5,1L6,0");
      g.append("text").attr("class", "e2d-heatflux-reading");
      g.append("text").attr("class", "e2d-sensor-label");

      update = update.select(heatFluxTest);
      heatFluxReading = update.select(".e2d-heatflux-reading")
        .text(heatFluxReadingText)
        .attr("y", "-1%")
        .attr("dy", "-.2em")
        .attr("dx", "-1.8em");

      update.select(".e2d-sensor-label")
        .text(labelText)
        .attr("dx", labelDx)
        .attr("dy", "0.9em")
        .attr("y", "1%");
    }

    // Public API.
    api = {
      update: function () {
        thermBg.attr("height", bgHeight);
        thermReading.text(readingText);

        anemoRot.attr("transform", anemometerRotation);

        heatFluxReading.text(heatFluxReadingText);
      },

      renderSensors: function () {
        if (!sensors) return;

        var sensor, sensorEnter;

        sensor = g.selectAll(".e2d-sensor").data(sensors);
        sensorEnter = sensor.enter().append("g")
            // "sensor" class can be useful for onClick handlers.
            .attr("class", "e2d-sensor sensor");

        renderThermometers(sensorEnter, sensor);
        renderAnemometer(sensorEnter, sensor);
        renderHeatFluxSensors(sensorEnter, sensor);

        sensorEnter.call(dragBehavior);

        sensor.attr("transform", transform);

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

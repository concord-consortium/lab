/*global define: false, d3: false */

define(function () {
  var TH_W = 2,
      TH_H = 4;

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

    function em(val) { return val + "%"; }
    function transform(d) { return "translate(" + m2px(d.x) + "," + m2pxInv(d.y) + ")"; }
    function labelDx() { return -this.getBBox().width / 2; }
    function labelText(d) { return d.label; }
    function readingText(d) { return d.value.toFixed(1) + " °C"; }
    function bgHeight(d) { return em(thermValScale(d.value)); }

    function anemometerRotation(d) { return "rotate(" + d.value + ")"; }

    function heatFluxReadingText(d) { return d.value.toFixed(1) + " W/m²"; }
    function heatFluxRot(d) { return "rotate(" + d.angle + ")"; }

    function measuringPoint(g) {
      g = g.append("g").attr("class", "e2d-measuring-point");
      g.append("line")
          .attr("x1", 0)
          .attr("y1", "-0.8%")
          .attr("x2", 0)
          .attr("y2", "0.8%");
      g.append("line")
          .attr("x1", "-0.8%")
          .attr("y1", 0)
          .attr("x2", "0.8%")
          .attr("y2", 0);
      g.append("circle")
          .attr("r", "0.8%");
    }

    function supportLabels(enter, update) {
      enter.append("text").attr("class", "e2d-sensor-reading-shadow");
      enter.append("text").attr("class", "e2d-sensor-reading");
      enter.append("text").attr("class", "e2d-sensor-label-shadow");
      enter.append("text").attr("class", "e2d-sensor-label");

      // Looks strange, but it propagates data from parent to labels.
      // .selectAll() doesn't do it. We can do it here, before rendering.
      // If labels don't exist yet, enter will propagate data. If they
      // exist, data binding will be updated.
      update.select(".e2d-sensor-label");
      update.select(".e2d-sensor-label-shadow");
      update.select(".e2d-sensor-reading");
      update.select(".e2d-sensor-reading-shadow");
    }

    function renderThermometers(data) {
      var update = g.selectAll(".e2d-sensor.thermometer").data(data.filter(function (d) {
            return d.type === "thermometer";
          })),
          enter = update.enter().append("g")
              .attr("class", "e2d-sensor sensor thermometer")
              .call(dragBehavior);
      supportLabels(enter, update);

      // Note that background and fill are inverted (background covers
      // fill). It's easier to change only height of background instead of
      // manipulating both Y coordinate and height of fill.
      enter.append("rect").attr("class", "e2d-thermometer-fill");
      enter.append("rect").attr("class", "e2d-thermometer-background");
      enter.call(measuringPoint);

      update.attr("transform", transform);
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
      thermReading = update.selectAll(".e2d-sensor-reading, .e2d-sensor-reading-shadow")
        .text(readingText)
        .attr("y", em(-0.5 * TH_H))
        .attr("dy", "-.2em")
        .attr("dx", "-.7em");
      update.selectAll(".e2d-sensor-label, .e2d-sensor-label-shadow")
        .text(labelText)
        .attr("dx", labelDx)
        .attr("dy", "1em")
        .attr("y", em(0.5 * TH_H));

      update.exit().remove();
    }

    function renderAnemometer(data) {
      var update = g.selectAll(".e2d-sensor.anemometer").data(data.filter(function (d) {
            return d.type === "anemometer";
          })),
          enter = update.enter().append("g")
              .attr("class", "e2d-sensor sensor anemometer")
              .call(dragBehavior);
      supportLabels(enter, update);

      enter = enter
        .append("svg")
          .attr("class", "e2d-anemometer-shape")
          .attr("viewBox", "-50 -50 100 100")
          .attr("x", "-3%")
          .attr("y", "-3%")
          .attr("width", "6%")
          .attr("height", "6%")
        .append("g")
          .attr("class", "e2d-anemometer-rot");

      enter.append("path")
          .attr("d", "M-10,10 L0,50 L10,10 Z")
          .attr("transform", "rotate(0)");
      enter.append("path")
          .attr("d", "M-10,10 L0,50 L10,10 Z")
          .attr("transform", "rotate(120)");
      enter.append("path")
          .attr("d", "M-10,10 L0,50 L10,10 Z")
          .attr("transform", "rotate(240)");
      enter.append("circle")
          .attr("r", 12);

      update.attr("transform", transform);
      anemoRot = update.select(".e2d-anemometer-rot")
          .attr("transform", anemometerRotation);
      update.selectAll(".e2d-sensor-label, .e2d-sensor-label-shadow")
        .text(labelText)
        .attr("dx", labelDx)
        .attr("dy", "0.7em")
        .attr("y", "3%");

      update.exit().remove();
    }

    function renderHeatFluxSensors(data) {
      var update = g.selectAll(".e2d-sensor.heatFlux").data(data.filter(function (d) {
            return d.type === "heatFlux";
          })),
          enter = update.enter().append("g")
              .attr("class", "e2d-sensor sensor heatFlux")
              .call(dragBehavior);

      enter = enter.append("g")
          .attr("transform", heatFluxRot);
      enter.append("rect")
          .attr("class", "e2d-heatflux-shape")
          .attr("x", "-3%")
          .attr("y", "-1%")
          .attr("width", "6%")
          .attr("height", "2%");
      enter.append("svg")
          .attr("viewBox", "0 0 6 1")
          .attr("x", "-3%")
          .attr("y", "-1%")
          .attr("width", "6%")
          .attr("height", "2%")
        .append("path")
          .attr("class", "e2d-heatflux-pattern")
          .attr("d", "M0,0L1,1L2,0L3,1L4,0L5,1L6,0");
      enter.call(measuringPoint);

      supportLabels(enter, update);

      update.attr("transform", transform);
      heatFluxReading = update.selectAll(".e2d-sensor-reading, .e2d-sensor-reading-shadow")
        .text(heatFluxReadingText)
        .attr("y", "-1%")
        .attr("dy", "-.2em")
        .attr("dx", "-1.8em");
      update.selectAll(".e2d-sensor-label, .e2d-sensor-label-shadow")
        .text(labelText)
        .attr("dx", labelDx)
        .attr("dy", "0.9em")
        .attr("y", "1%");

      update.exit().remove();
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

        renderThermometers(sensors);
        renderAnemometer(sensors);
        renderHeatFluxSensors(sensors);
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

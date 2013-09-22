/*global define, Lab, d3 */

define(function (require) {

  var performance = require("common/performance"),

      TEST_TIME = 5000,
      WARMUP_TIME = 1000;

  return function Benchmarks(controller) {
    var model = controller.model,
        startCounter;

    return [
      {
        name: "atoms",
        numeric: true,
        run: function(done) {
          done(model.getNumberOfAtoms());
        }
      },
      {
        name: "temperature",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          done(model.get("temperature"));
        }
      },
      {
        name: "engine (ms)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          // warmup
          model.start();
          setTimeout(function() {
            model.stop();

            performance.collectData(true);
            startCounter = model.stepCounter();

            setTimeout(function() {
              // actual fps calculation
              model.start();
              setTimeout(function() {
                model.stop();

                performance.collectData(false);
                done(performance.getAvgTime("engine"));

              }, TEST_TIME);
            }, 100);
          }, WARMUP_TIME);
        }
      },
      {
        name: "JS rendering (ms)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          done(performance.getAvgTime("js-rendering"));
        }
      },
      {
        name: "tick (ms)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          done(performance.getAvgTime("tick"));
        }
      },
      {
        name: "gap b/w frames (ms)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          done(performance.getAvgTime("gap"));
        }
      },
      {
        name: "fps",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          done((model.stepCounter() - startCounter) * 1000 / TEST_TIME);
        }
      },
      {
        name: "interactive",
        numeric: false,
        run: function(done) {
          done(window.location.pathname + window.location.hash);
        }
      }
    ];
  };
});

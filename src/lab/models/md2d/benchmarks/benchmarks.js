
import performance from "common/performance";

var TEST_TIME = 5000,
  WARMUP_TIME = 1000;

export default function Benchmarks(controller) {
  var startCounter;

  return [{
    name: "atoms",
    numeric: true,
    run: function(done) {
      done(controller.model.getNumberOfAtoms());
    }
  }, {
    name: "temperature",
    numeric: true,
    formatter: d3.format("5.1f"),
    run: function(done) {
      done(controller.model.get("temperature"));
    }
  }, {
    name: "engine (ms)",
    numeric: true,
    formatter: d3.format("5.1f"),
    run: function(done) {
      // warmup
      controller.model.start();
      setTimeout(function() {
        controller.model.stop();

        performance.collectData(true);
        startCounter = controller.model.stepCounter();

        setTimeout(function() {
          // actual fps calculation
          controller.model.start();
          setTimeout(function() {
            controller.model.stop();

            performance.collectData(false);
            done(performance.getAvgTime("engine"));

          }, TEST_TIME);
        }, 100);
      }, WARMUP_TIME);
    }
  }, {
    name: "JS rendering (ms)",
    numeric: true,
    formatter: d3.format("5.1f"),
    run: function(done) {
      done(performance.getAvgTime("js-rendering"));
    }
  }, {
    name: "tick (ms)",
    numeric: true,
    formatter: d3.format("5.1f"),
    run: function(done) {
      done(performance.getAvgTime("tick"));
    }
  }, {
    name: "gap b/w frames (ms)",
    numeric: true,
    formatter: d3.format("5.1f"),
    run: function(done) {
      done(performance.getAvgTime("gap"));
    }
  }, {
    name: "fps",
    numeric: true,
    formatter: d3.format("5.1f"),
    run: function(done) {
      done((controller.model.stepCounter() - startCounter) * 1000 / TEST_TIME);
    }
  }];
};

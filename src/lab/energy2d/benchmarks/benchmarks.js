/*global define: false, Lab: false, d3: false */

define(function () {

  var performance = require("common/performance"),

      TEST_TIME = 5000,
      WARMUP_TIME = 1000;

  return function Benchmarks(controller) {
    var model = controller.model,
        start;

    var benchmarks = [
      //
      // WebGL OFF
      //
      {
        name: "engine (ms)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          // warmup
          model.start();
          setTimeout(function() {
            model.stop();

            model.properties.use_WebGL = false;
            performance.collectData(true);
            start = model.get("time");

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
          var elapsedModelTime = model.get('time') - start;
          done(elapsedModelTime / (model.get('timeStepsPerTick') * model.get('timeStep')) * 1000 / TEST_TIME);
        }
      },
      //
      // WebGL ON
      //
      {
        name: "engine WebGL (ms)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          // warmup
          model.start();
          setTimeout(function() {
            model.stop();

            model.properties.use_WebGL = true;
            performance.collectData(true);
            start = model.get("time");

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
        name: "JS rendering WebGL (ms)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          done(performance.getAvgTime("js-rendering"));
        }
      },
      {
        name: "tick WebGL (ms)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          done(performance.getAvgTime("tick"));
        }
      },
      {
        name: "gap b/w frames WebGL (ms)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          done(performance.getAvgTime("gap"));
        }
      },
      {
        name: "fps WebGL",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          var elapsedModelTime = model.get('time') - start;
          done(elapsedModelTime / (model.get('timeStepsPerTick') * model.get('timeStep')) * 1000 / TEST_TIME);
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

    return benchmarks;

  };
});

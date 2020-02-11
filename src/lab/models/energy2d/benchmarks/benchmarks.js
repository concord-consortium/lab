/*global define: false, d3: false */

import $__common_performance from "common/performance";

var performance = $__common_performance,

  TEST_TIME = 5000,
  WARMUP_TIME = 1000;

export default function Benchmarks(controller) {
  var start;

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
        controller.model.start();
        setTimeout(function() {
          controller.model.stop();

          controller.model.properties.use_WebGL = false;
          performance.collectData(true);
          start = controller.model.get("time");

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
        var elapsedModelTime = controller.model.get('time') - start;
        done(elapsedModelTime / (controller.model.get('timeStepsPerTick') * controller.model.get('timeStep')) * 1000 / TEST_TIME);
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
        controller.model.start();
        setTimeout(function() {
          controller.model.stop();

          controller.model.properties.use_WebGL = true;
          performance.collectData(true);
          start = controller.model.get("time");

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
      name: "JS rendering WebGL (ms)",
      numeric: true,
      formatter: d3.format("5.1f"),
      run: function(done) {
        done(performance.getAvgTime("js-rendering"));
      }
    }, {
      name: "tick WebGL (ms)",
      numeric: true,
      formatter: d3.format("5.1f"),
      run: function(done) {
        done(performance.getAvgTime("tick"));
      }
    }, {
      name: "gap b/w frames WebGL (ms)",
      numeric: true,
      formatter: d3.format("5.1f"),
      run: function(done) {
        done(performance.getAvgTime("gap"));
      }
    }, {
      name: "fps WebGL",
      numeric: true,
      formatter: d3.format("5.1f"),
      run: function(done) {
        var elapsedModelTime = controller.model.get('time') - start;
        done(elapsedModelTime / (controller.model.get('timeStepsPerTick') * controller.model.get('timeStep')) * 1000 / TEST_TIME);
      }
    }
  ];

  return benchmarks;

};

/*global define: false, Lab: false, d3: false */

define(function () {

  var performance = require("common/performance"),

      TEST_TIME = 5000,
      WARMUP_TIME = 1000;

  return function Benchmarks(controller) {
    var model = controller.model,
        start;

    var benchmarks = [
      {
        name: "commit",
        numeric: false,
        run: function(done) {
          var link = "<a href='"+Lab.version.repo.commit.url+"' class='opens-in-new-window' target='_blank'>"+Lab.version.repo.commit.short_sha+"</a>";
          if (Lab.version.repo.dirty) {
            link += " <i>dirty</i>";
          }
          done(link);
        }
      },
      //
      // WebGL OFF
      //
      {
        name: "model (ms)",
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
                done(performance.getAvgTime("model"));

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
        name: "model WebGL (ms)",
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
                done(performance.getAvgTime("model"));

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

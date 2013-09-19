/*global define, Lab, d3 */

define(function (require) {

  var performance = require("common/performance");

  return function Benchmarks(controller) {
    var model = controller.model,

        gapsSum = 0,
        count = 0,
        lTime = null;

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
        name: "just graphics (steps/s)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          var elapsed, start, i;
          model.stop();
          start = +Date.now();
          i = 0;
          while (i++ < 100) {
            controller.modelContainer.update();
          }
          elapsed = Date.now() - start;
          done(100/elapsed*1000);
        }
      },
      {
        name: "model (steps/s)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          var start, elapsed;
          model.stop();
          start = +Date.now();
          model.suppressEvents(function () {
            var i = 0;
            while (i++ < 100) {
              model.tick();
            }
          });
          elapsed = Date.now() - start;
          done(100/elapsed*1000);
        }
      },
      {
        name: "model+graphics (steps/s)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          var start, elapsed, i;
          model.stop();
          start = +Date.now();
          i = 0;
          while (i++ < 100) {
            model.tick();
          }
          elapsed = Date.now() - start;
          done(100/elapsed*1000);
        }
      },
      {
        name: "fps",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          // Collect data for the next benchmark - "gap b/w frames".
          gapsSum = 0;
          count = 0;
          lTime = null;
          model.on("tickEnd", function () {
            lTime = performance.now();
          });
          model.on("tickStart", function () {
            if (lTime) {
              gapsSum += performance.now() - lTime;
              count += 1;
            }
          });

          // warmup
          model.start();
          setTimeout(function() {
            model.stop();
            var startCounter = model.stepCounter();
            setTimeout(function() {
              // actual fps calculation
              model.start();
              setTimeout(function() {
                model.stop();
                done( (model.stepCounter() - startCounter) / 2 );
              }, 2000);
            }, 100);
          }, 1000);
        }
      },
      {
        name: "gap b/w frames (ms)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          // Data is collected during FPS calculations. We don't have to run model for next X
          // seconds, making the whole process much longer.
          done(gapsSum / count);
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

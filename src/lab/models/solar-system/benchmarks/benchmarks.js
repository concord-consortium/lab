/*global define, model, Lab */

define(function (require) {

  var performance = require("common/performance");

  return function Benchmarks(controller) {
    var gapsSum = 0,
        count = 0,
        lTime = null;

    var benchmarks = [
      {
        name: "bodies",
        numeric: true,
        run: function(done) {
          done(model.get_num_bodies());
        }
      },
      {
        name: "just graphics (steps/s)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          var elapsed, start, i;

          model.stop();
          start = +performance.now();
          i = -1;
          while (i++ < 100) {
            controller.modelContainer.update();
          }
          elapsed = performance.now() - start;
          done(100/elapsed*1000);
        }
      },
      {
        name: "model (steps/s)",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
          var elapsed, start, i;

          model.stop();
          start = +performance.now();
          i = -1;
          while (i++ < 100) {
            // advance model 1 tick, but don't paint the display
            model.tick(1, { dontDispatchTickEvent: true });
          }
          elapsed = performance.now() - start;
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
          start = +performance.now();
          i = -1;
          while (i++ < 100) {
            model.tick();
          }
          elapsed = performance.now() - start;
          done(100/elapsed*1000);
        }
      },
      {
        name: "fps",
        numeric: true,
        formatter: d3.format("5.1f"),
        run: function(done) {
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
            var start = model.get('time');
            setTimeout(function() {
              // actual fps calculation
              model.start();
              setTimeout(function() {
                model.stop();
                var elapsedModelTime = model.get('time') - start;
                done( elapsedModelTime / (model.get('timeStepsPerTick') * model.get('timeStep')) / 2 );
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
      }
    ];

    return benchmarks;
  };

});

/*global define model */

define(function (require) {

  var performance = require("common/performance");

  return function Benchmarks(controller) {

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
        name: "interactive",
        numeric: false,
        run: function(done) {
          done(window.location.pathname + window.location.hash);
        }
      }
    ];

    return benchmarks;

  }

});

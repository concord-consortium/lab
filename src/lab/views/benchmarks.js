// ------------------------------------------------------------
//
// Benchmarks
//
// ------------------------------------------------------------

var start_benchmarks = document.getElementById("start-benchmarks");
var benchmarks_table = document.getElementById("benchmarks-table");

var benchmarks_to_run = [
  {
    name: "molecules",
    run: function() {
      return model.get_num_atoms();
    }
  },
  {
    name: "temperature",
    run: function() {
      return model.get("temperature");
    }
  },
  {
    name: "100 Steps (steps/s)",
    run: function() {
      controller.modelStop();
      var start = +Date.now();
      var i = -1;
      while (i++ < 100) {
        // advance model 1 tick, but don't paint the display
        model.tick(1, { dontDispatchTickEvent: true });
      }
      elapsed = Date.now() - start;
      return d3.format("5.1f")(100/elapsed*1000)
    }
  },
  {
    name: "100 Steps w/graphics",
    run: function() {
      controller.modelStop();
      var start = +Date.now();
      var i = -1;
      while (i++ < 100) {
        model.tick();
      }
      elapsed = Date.now() - start;
      return d3.format("5.1f")(100/elapsed*1000)
    }
  }
];

if (start_benchmarks) {
  start_benchmarks.onclick = function() {
    benchmark.run(benchmarks_table, benchmarks_to_run)
  };
}


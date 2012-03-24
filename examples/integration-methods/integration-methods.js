
// John Schultz: http://www.gamedev.net/topic/374930-thoughts-on-velocity-verlet/

// http://www.biomath.nyu.edu/index/papdir/fulllengths/pap_2_83.pdf

var formatter = d3.format("7.5f");

function newtons_second_law(x, v, a, n) {
  var i, dt = 1/n, t, x0 = x, v0 = v, results = [];
  i = -1; while(++i < n) {
    t = dt * i;
    v = a * t + v0;
    x = 0.5 * a * t * t + v0 * t + x0;
    results.push([formatter(x), formatter(v)])
  }
  return results
}

function simple_euler(x, v, a, n) {
  var i, dt = 1/n, results = [];
  i = -1; while(++i < n) {
    results.push([formatter(x), formatter(v)])
    v += a*dt;
    x += v*dt;
  }
  return results
}

function more_accurate_euler(x, v, a, n) {
  var i, dt = 1/n, results = [];
  i = -1; while(++i < n) {
    results.push([formatter(x), formatter(v)])
    x += v*dt + 0.5*a*dt*dt;
    v += a*dt;
  }
  return results
}

function newton_stormer_verlet(x, v, a, n) {
  var i, dt = 1/n, results = [];
  i = -1; while(++i < n) {
    results.push([formatter(x), formatter(v)])
    v += a*dt;
    x += v*dt;
  }
  return results
}

function velocity_less_verlet(x, v, a, n) {
  var i, dt = 1/n, xc = 0, xo = 0, results = [];
  i = -1; while(++i < n) {
    results.push([formatter(xc), formatter(v/dt)])
    v = xc - xo + a*dt*dt;
    xo = xc;
    xc += v;
  }
  return results
}

function newton_stormer_verlet_variant(x, v, a, n) {
  var i, dt = 1/n, dt2 = dt*dt, results = [];
  i = -1; while(++i < n) {
    results.push([formatter(x), formatter(v/dt)])
    v += a*dt2;
    x += v; // v is prescaled: really a displacement.
  }
  return results
}

function velocity_verlet_leapfrog(x, v, a, n) {
  var i, dt = 1/n, old_a = a, results = [];
  i = -1; while(++i < n) {
    results.push([formatter(x), formatter(v)])
    x += v*dt + 0.5*old_a*dt*dt;
    v +=        0.5*(old_a+a)*dt;
    old_a = a;
  }
  return results
}

// simple_euler(0, 0, 9.81, 100)
// more_accurate_euler(0, 0, 9.81, 100)
// newton_stormer_verlet(0, 0, 9.81, 100)
// velocity_less_verlet(0, 0, 9.81, 100)
// newton_stormer_verlet_variant(0, 0, 9.81, 100)
// velocity_verlet_variant(0, 0, 9.81, 100)

var benchmark_results = document.getElementById("benchmark-results");
var run_benchmarks = document.getElementById("run-benchmarks");

var samples_to_run = [
  {
    name: "",
    columns: ["time"],
    run: function time(x, v, a, n) {
      var i, results = [];
      i = -1; while(++i < n) {
        results.push([i])
      }
      return results
    }
  },
  {
    name: "Newton's Second Law",
    columns: ["position", "velocity"],
    run: newtons_second_law
  },
  {
    name: "Leapfrog Velocity Verlet",
    columns: ["position", "velocity"],
    run: velocity_verlet_leapfrog
  },
  {
    name: "simple Euler",
    columns: ["position", "velocity"],
    run: simple_euler
  },
  {
    name: "More Accurate Euler",
    columns: ["position", "velocity"],
    run: more_accurate_euler
  },
  {
    name: "Newton-Stormer Verlet",
    columns: ["position", "velocity"],
    run: newton_stormer_verlet
  },
  {
    name: "Velocity-Less Verlet",
    columns: ["position", "velocity"],
    run: velocity_less_verlet
  },
  {
    name: "Newton-Stormer Verlet Variant",
    columns: ["position", "velocity"],
    run: newton_stormer_verlet_variant
  }
];

window.onload = function() {
  run_benchmarks.onclick = function() {
    benchmark.run(benchmark_results, samples_to_run, { format: "columns" })
  }
};

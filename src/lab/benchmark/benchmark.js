// ------------------------------------------------------------
//
// Simple benchmark runner and results generator
//
//   see: https://gist.github.com/1364172
//
// ------------------------------------------------------------
//
// Runs benchmarks and generates the results in a table.
//
// Setup benchmarks to run in an array of objects with two properties:
//
//   name: a title for the table column of results
//   run: a function that is called to run the benchmark and returns a value
//
// Start the benchmarks by passing the table element where the results are to
// be placed and an array of benchmarks to run.
//
// Example:
//
//   var benchmarks_table = document.getElementById("benchmarks-table");
//
//   var benchmarks_to_run = [
//     {
//       name: "molecules",
//       run: function() {
//         return mol_number
//       }
//     },
//     {
//       name: "100 Steps (steps/s)",
//       run: function() {
//         modelStop();
//         var start = +Date.now();
//         var i = -1;
//         while (i++ < 100) {
//           model.tick();
//         }
//         elapsed = Date.now() - start;
//         return d3.format("5.1f")(100/elapsed*1000)
//       }
//     },
//   ];
//
//   benchmark.run(benchmarks_table, benchmarks_to_run)
//
// The first four columns in the generated table consist of:
//
//   browser, version, cpu/os, date
//
// These columns are followed by a column for each benchmark passed in.
//
// Subsequent calls to: benchmark.run(benchmarks_table, benchmarks_to_run) will
// add additional rows to the table.
//
// Here are some css styles for the table:
//
//   table {
//     font: 11px/24px Verdana, Arial, Helvetica, sans-serif;
//     border-collapse: collapse; }
//   th {
//     padding: 0 1em;
//     text-align: left; }
//   td {
//     border-top: 1px solid #cccccc;
//     padding: 0 1em; }
//

benchmark = {};
benchmark = { version: "0.0.1" };

benchmark.what_browser = function() {
  return what_browser();
};

benchmark.run = function(benchmarks_table, benchmarks_to_run) {
  run(benchmarks_table, benchmarks_to_run);
};

function what_browser() {
  var chromematch = / (Chrome)\/(.*?) /,
      ffmatch =     / (Firefox)\/([0123456789ab.]+)/,
      safarimatch = / Version\/([0123456789.]+) (Safari)\/([0123456789.]+)/,
      iematch =     / (MSIE) ([0123456789.]+);/,
      ipadmatch =   /([0123456789.]+) \((iPad);.*? Version\/([0123456789.]+) Mobile\/(\S+)/,
      match;

  match = navigator.userAgent.match(chromematch);
  if (match && match[1]) {
    if (navigator.platform.match(/Win/)) {
      return {
        browser: match[1],
        version: match[2],
        oscpu: navigator.platform
      }
    } else {
      return {
        browser: match[1],
        version: match[2],
        oscpu: navigator.appVersion.match(/(Macintosh); (.*?)\)/)[2]
      }
    }
  }
  match = navigator.userAgent.match(ffmatch);
  if (match && match[1]) {
    if (navigator.oscpu.match(/Windows /)) {
      return {
        browser: match[1],
        version: match[2],
        oscpu: navigator.platform
      }
    } else {
      return {
        browser: match[1],
        version: match[2],
        oscpu: navigator.oscpu
      }
    }
  }
  match = navigator.userAgent.match(safarimatch);
  if (match && match[2]) {
    var results = {
      browser: match[2],
      version: match[1],
      oscpu: ""
    };
    if navigator.appVersion.match(/Macintosh/) {
      results.oscpu = navigator.appVersion.match(/(Macintosh); (.*?)\)/)[2];
    } else if (navigator.appVersion.match(/Windows/)) {
      results.oscpu = navigator.platform;
    }
    return results;
  }
  match = navigator.userAgent.match(iematch);
  if (match && match[1]) {
    return {
      browser: match[1],
      version: match[2],
      oscpu: navigator.cpuClass + "/" + navigator.platform
    }
  }
  match = navigator.userAgent.match(ipadmatch);
  if (match && match[2]) {
    return {
      browser: match[2],
      version: match[3] + "/" + match[4],
      oscpu: match[1]
    }
  }
  return {
    browser: "",
    version: navigator.appVersion,
    oscpu:   ""
  }
}

function run(benchmarks_table, benchmarks_to_run) {
  var i = 0, b, browser_info, results = [];
  benchmarks_table.style.display = "";

  var empty_table = benchmarks_table.getElementsByTagName("tr").length == 0;
  function add_row() {
    return benchmarks_table.appendChild(document.createElement("tr"));
  }

  var title_row = add_row(),
      results_row = add_row();

  function add_data(row, content, el) {
    el = el || "td";
    row.appendChild(document.createElement(el))
      .textContent = content;
  }

  function add_column(title, data) {
    if (empty_table) { add_data(title_row, title, "th") };
    add_data(results_row, data)
  }

  browser_info = what_browser();
  add_column("browser", browser_info.browser);
  add_column("version", browser_info.version);
  add_column("cpu/os", browser_info.oscpu);

  var formatter = d3.time.format("%Y-%m-%d %H:%M");
  add_column("date", formatter(new Date()))

  // add_column("molecules", mol_number);
  // add_column("temperature", temperature);

  for (i = 0; i < benchmarks_to_run.length; i++) {
    b = benchmarks_to_run[i];
    add_column(b.name, b.run());
  }
}

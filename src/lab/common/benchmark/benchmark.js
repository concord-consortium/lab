/*global define: false, d3: false */
/*jshint loopfunc: true*/

/*
  ------------------------------------------------------------

  Simple benchmark runner and results generator

    see: https://gist.github.com/1364172

  ------------------------------------------------------------

  Runs benchmarks and generates the results in a table.

  Setup benchmarks to run in an array of objects with two properties:

    name: a title for the table column of results
    numeric: boolean, used to decide what columns should be used to calculate averages
    formatter: (optional) a function that takes a number and returns a formmatted string, example: d3.format("5.1f")
    run: a function that is called to run the benchmark and call back with a value.
         It should accept a single argument, the callback to be called when the
         benchmark completes. It should pass the benchmark value to the callback.

  Start the benchmarks by passing the table element where the results are to
  be placed and an array of benchmarks to run.

  Example:

    var benchmarks_table = document.getElementById("benchmarks-table");

    var benchmarks_to_run = [
      {
        name: "molecules",
        run: function(done) {
          done(mol_number);
        }
      },
      {
        name: "100 Steps (steps/s)",
        run: function(done) {
          modelStop();
          var start = +Date.now();
          var i = -1;
          while (i++ < 100) {
            model.tick();
          }
          elapsed = Date.now() - start;
          done(d3.format("5.1f")(100/elapsed*1000));
        }
      },
    ];

    benchmark.run(benchmarks_table, benchmarks_to_run)

  You can optionally pass two additional arguments to the run method: start_callback, end_callback

    function run(benchmarks_table, benchmarks_to_run, start_callback, end_callback)

  These arguments are used when the last benchmark test is run using the browsers scheduling and re-painting mechanisms.

  For example this test runs a model un the browser and calculates actual frames per second combining the
  model, view, and browser scheduling and repaint operations.

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
    }

  Here's an example calling the benchmark.run method and passing in start_callback, end_callback functions:

    benchmark.run(document.getElementById("model-benchmark-results"), benchmarksToRun, function() {
      $runBenchmarksButton.attr('disabled', true);
    }, function() {
      $runBenchmarksButton.attr('disabled', false);
    });

  The "Run Benchmarks" button is disabled until the browser finishes running thelast queued test.

  The first five columns in the generated table consist of:

    browser, version, cpu/os, date, and commit

  These columns are followed by a column for each benchmark passed in.

  Subsequent calls to: benchmark.run(benchmarks_table, benchmarks_to_run) will
  add additional rows to the table.

  A special second row is created in the table which displays averages of all tests
  that generate numeric results.

  Here are some css styles for the table:

    table {
      font: 11px/24px Verdana, Arial, Helvetica, sans-serif;
      border-collapse: collapse; }
    th {
      padding: 0 1em;
      text-align: left; }
    td {
      border-top: 1px solid #cccccc;
      padding: 0 1em; }

*/

define(function () {

  var version = "0.0.1",
      windows_platform_token = {
        "Windows NT 6.2": "Windows 8",
        "Windows NT 6.1": "Windows 7",
        "Windows NT 6.0": "Windows Vista",
        "Windows NT 5.2": "Windows Server 2003; Windows XP x64 Edition",
        "Windows NT 5.1": "Windows XP",
        "Windows NT 5.01": "Windows 2000, Service Pack 1 (SP1)",
        "Windows NT 5.0": "Windows 2000",
        "Windows NT 4.0": "Microsoft Windows NT 4.0"
      },
      windows_feature_token = {
        "WOW64":       "64/32",
        "Win64; IA64": "64",
        "Win64; x64":  "64"
      },
      average_row;

  function what_browser() {
    var chromematch  = / (Chrome)\/(.*?) /,
        ffmatch      = / (Firefox)\/([0123456789ab.]+)/,
        safarimatch  = / AppleWebKit\/([0123456789.+]+) \(KHTML, like Gecko\) Version\/([0123456789.]+) (Safari)\/([0123456789.]+)/,
        iematch      = / (MSIE) ([0123456789.]+);/,
        operamatch   = /^(Opera)\/.+? Version\/([0123456789.]+)$/,
        iphonematch  = /.+?\((iPhone); CPU.+?OS .+?Version\/([0123456789._]+)/,
        ipadmatch    = /.+?\((iPad); CPU.+?OS .+?Version\/([0123456789._]+)/,
        ipodmatch    = /.+?\((iPod); CPU (iPhone.+?) like.+?Version\/([0123456789ab._]+)/,
        androidchromematch = /.+?(Android) ([0123456789.]+).*?; (.+?)\).+? Chrome\/([0123456789.]+)/,
        androidfirefoxmatch = /.+?(Android.+?\)).+? Firefox\/([0123456789.]+)/,
        androidmatch = /.+?(Android) ([0123456789ab.]+).*?; (.+?)\)/,
        match;

    match = navigator.userAgent.match(chromematch);
    if (match && match[1]) {
      return {
        browser: match[1],
        version: match[2],
        oscpu: os_platform()
      };
    }
    match = navigator.userAgent.match(ffmatch);
    if (match && match[1]) {
      var buildID = navigator.buildID,
          buildDate = "";
      if (buildID && buildID.length >= 8) {
        buildDate = "(" + buildID.slice(0,4) + "-" + buildID.slice(4,6) + "-" + buildID.slice(6,8) + ")";
      }
      return {
        browser: match[1],
        version: match[2] + ' ' + buildDate,
        oscpu: os_platform()
      };
    }
    match = navigator.userAgent.match(androidchromematch);
    if (match && match[1]) {
      return {
        browser: "Chrome",
        version: match[4],
        oscpu: match[1] + "/" + match[2] + "/" + match[3]
      };
    }
    match = navigator.userAgent.match(androidfirefoxmatch);
    if (match && match[1]) {
      return {
        browser: "Firefox",
        version: match[2],
        oscpu: match[1]
      };
    }
    match = navigator.userAgent.match(androidmatch);
    if (match && match[1]) {
      return {
        browser: "Android",
        version: match[2],
        oscpu: match[1] + "/" + match[2] + "/" + match[3]
      };
    }
    match = navigator.userAgent.match(safarimatch);
    if (match && match[3]) {
      return {
        browser: match[3],
        version: match[2] + '/' + match[1],
        oscpu: os_platform()
      };
    }
    match = navigator.userAgent.match(iematch);
    if (match && match[1]) {
      var platform_match = navigator.userAgent.match(/\(.*?(Windows.+?); (.+?)[;)].*/);
      return {
        browser: match[1],
        version: match[2],
        oscpu: windows_platform_token[platform_match[1]] + "/" + navigator.cpuClass + "/" + navigator.platform
      };
    }
    match = navigator.userAgent.match(operamatch);
    if (match && match[1]) {
      return {
        browser: match[1],
        version: match[2],
        oscpu: os_platform()
      };
    }
    match = navigator.userAgent.match(iphonematch);
    if (match && match[1]) {
      return {
        browser: "Mobile Safari",
        version: match[2],
        oscpu: match[1] + "/" + "iOS" + "/" + match[2]
      };
    }
    match = navigator.userAgent.match(ipadmatch);
    if (match && match[1]) {
      return {
        browser: "Mobile Safari",
        version: match[2],
        oscpu: match[1] + "/" + "iOS" + "/" + match[2]
      };
    }
    match = navigator.userAgent.match(ipodmatch);
    if (match && match[1]) {
      return {
        browser: "Mobile Safari",
        version: match[3],
        oscpu: match[1] + "/" + "iOS" + "/" + match[2]
      };
    }
    return {
      browser: "",
      version: navigator.appVersion,
      oscpu:   ""
    };
  }

  function os_platform() {
    var match = navigator.userAgent.match(/\((.+?)[;)] (.+?)[;)].*/);
    if (!match) { return "na"; }
    if (match[1] === "Macintosh") {
      return match[2];
    } else if (match[1].match(/^Windows/)) {
      var arch  = windows_feature_token[match[2]] || "32",
          token = navigator.userAgent.match(/\(.*?(Windows NT.+?)[;)]/);
      return windows_platform_token[token[1]] + "/" + arch;
    }
  }

  function renderToTable(benchmarks_table, benchmarksThatWereRun, results) {
    var i = 0,
        results_row,
        result,
        col_number = 0,
        col_numbers = {},
        title_row,
        title_cells,
        len,
        rows = benchmarks_table.getElementsByTagName("tr");

    benchmarks_table.style.display = "";

    function add_column(title) {
      var title_row = benchmarks_table.getElementsByTagName("tr")[0],
          cell = title_row.appendChild(document.createElement("th"));

      cell.innerHTML = title;
      col_numbers[title] = col_number++;
    }

    function add_row(num_cols) {
      num_cols = num_cols || 0;
      var tr =  benchmarks_table.appendChild(document.createElement("tr")),
          i;

      for (i = 0; i < num_cols; i++) {
        tr.appendChild(document.createElement("td"));
      }
      return tr;
    }

    function add_result(name, content, row) {
      var cell;
      row = row || results_row;
      cell = row.getElementsByTagName("td")[col_numbers[name]];
      if (typeof content === "string" && content.slice(0,1) === "<") {
        cell.innerHTML = content;
      } else {
        cell.textContent = content;
      }
    }

    function update_averages() {
      var i, j,
          b,
          row,
          num_rows = rows.length,
          cell,
          cell_index,
          average_elements = average_row.getElementsByTagName("td"),
          total,
          average,
          genericDecimalFormatter = d3.format("5.1f"),
          genericIntegerFormatter = d3.format("f");

      function isInteger(i) {
        return Math.floor(i) === i;
      }

      for (i = 0; i < benchmarksThatWereRun.length; i++) {
        b = benchmarksThatWereRun[i];
        cell_index = col_numbers[b.name];
        if (b.numeric === false) {
          row = rows[2];
          cell = row.getElementsByTagName("td")[cell_index];
          average_elements[cell_index].innerHTML = cell.innerHTML;
        } else {
          total = 0;
          for (j = 2; j < num_rows; j++) {
            row = rows[j];
            cell = row.getElementsByTagName("td")[cell_index];
            total += (+cell.textContent);
          }
          average = total/(num_rows-2);
          if (b.formatter) {
            average = b.formatter(average);
          } else {
            if (isInteger(average)) {
              average = genericIntegerFormatter(total/(num_rows-2));
            } else {
              average = genericDecimalFormatter(total/(num_rows-2));
            }
          }
          average_elements[cell_index].textContent = average;
        }
      }
    }

    if (rows.length === 0) {
      add_row();
      add_column("browser");
      add_column("version");
      add_column("cpu/os");
      add_column("date");
      for (i = 0; i < benchmarksThatWereRun.length; i++) {
        add_column(benchmarksThatWereRun[i].name);
      }
      average_row = add_row(col_number);
      average_row.className = 'average';
    } else {
      title_row = rows[0];
      title_cells = title_row.getElementsByTagName("th");
      for (i = 0, len = title_cells.length; i < len; i++) {
        col_numbers[title_cells[i].innerHTML] = col_number++;
      }
    }

    results_row = add_row(col_number);
    results_row.className = 'sample';

    for (i = 0; i < 4; i++) {
      result = results[i];
      add_result(result[0], result[1]);
      add_result(result[0], result[1], average_row);
    }

    for(i = 4; i < results.length; i++) {
      result = results[i];
      add_result(result[0], result[1]);
    }
    update_averages();
  }

  function bench(benchmarks_to_run, resultsCallback, start_callback, end_callback) {
    var bencharks_queue = benchmarks_to_run.slice(),
        results = [],
        browser_info = what_browser(),
        formatter = d3.time.format("%Y-%m-%d %H:%M");

    results.push([ "browser", browser_info.browser]);
    results.push([ "version", browser_info.version]);
    results.push([ "cpu/os", browser_info.oscpu]);
    results.push([ "date", formatter(new Date())]);

    if (start_callback) start_callback();

    runBenchmark(bencharks_queue.shift());

    function runBenchmark(b) {
      b.run(doneCallback);

      function doneCallback(result) {
        if (b.formatter) {
          results.push([ b.name, b.formatter(result) ]);
        } else {
          results.push([ b.name, result ]);
        }

        if (bencharks_queue.length > 0) {
          runBenchmark(bencharks_queue.shift());
        } else {
          if (end_callback) end_callback();
          if (resultsCallback) resultsCallback(results);
        }
      }
    }

    return results;
  }

  function run(benchmarks_to_run, benchmarks_table, resultsCallback, start_callback, end_callback) {
    var results;
    bench(benchmarks_to_run, function(results) {
      renderToTable(benchmarks_table, benchmarks_to_run, results);
      resultsCallback(results);
    }, start_callback, end_callback);
    return results;
  }

  // Return Public API.
  return {
    version: version,
    what_browser: function() {
      return what_browser();
    },
    // run benchmarks, add row to table, update averages row
    run: function(benchmarks_to_run, benchmarks_table, resultsCallback, start_callback, end_callback) {
      run(benchmarks_to_run, benchmarks_table, resultsCallback, start_callback, end_callback);
    },
    // run benchmarks, return results in object
    bench: function(benchmarks_to_run, resultsCallback, start_callback, end_callback) {
      return bench(benchmarks_to_run, resultsCallback, start_callback, end_callback);
    },
    // run benchmarks, add row to table, update averages row
    renderToTable: function(benchmarks_table, benchmarksThatWereRun, results) {
      renderToTable(benchmarks_table, benchmarksThatWereRun, results);
    }
  };
});

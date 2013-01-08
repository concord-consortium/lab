/*globals define: false, d3: false */
/*jshint loopfunc: true*/
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
//   run: a function that is called to run the benchmark and call back with a value.
//        It should accept a single argument, the callback to be called when the
//        benchmark completes. It should pass the benchmark value to the callback.
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
//       run: function(done) {
//         done(mol_number);
//       }
//     },
//     {
//       name: "100 Steps (steps/s)",
//       run: function(done) {
//         modelStop();
//         var start = +Date.now();
//         var i = -1;
//         while (i++ < 100) {
//           model.tick();
//         }
//         elapsed = Date.now() - start;
//         done(d3.format("5.1f")(100/elapsed*1000));
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

define(function (require) {

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
      };

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

  function run(benchmarks_table, benchmarks_to_run, start_callback, end_callback) {
    var i = 0,
        browser_info,
        averaged_row,
        results_row,
        formatter,
        col_number = 0,
        col_numbers = {},
        title_row,
        title_cells,
        len,
        rows,
        benchmarks_completed;

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
          samples;

      for (i = 0; i < benchmarks_to_run.length; i++) {
        b = benchmarks_to_run[i];
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
          }
          average_elements[cell_index].textContent = average;
        }
      }
    }

    rows = benchmarks_table.getElementsByTagName("tr");

    if (rows.length === 0) {
      add_row();
      add_column("browser");
      add_column("version");
      add_column("cpu/os");
      add_column("date");
      for (i = 0; i < benchmarks_to_run.length; i++) {
        add_column(benchmarks_to_run[i].name);
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

    browser_info = what_browser();
    formatter = d3.time.format("%Y-%m-%d %H:%M");

    add_result("browser", browser_info.browser);
    add_result("version", browser_info.version);
    add_result("cpu/os", browser_info.oscpu);
    add_result("date", formatter(new Date()));

    add_result("browser", browser_info.browser, average_row);
    add_result("version", browser_info.version, average_row);
    add_result("cpu/os", browser_info.oscpu, average_row);
    add_result("date", formatter(new Date()), average_row);

    benchmarks_completed = 0;
    if (start_callback) start_callback();
    for (i = 0; i < benchmarks_to_run.length; i++) {
      (function(b) {
        b.run(function(result) {
          if (b.formatter) {
            add_result(b.name, b.formatter(result));
          } else {
            add_result(b.name, result);
          }
         if (end_callback && ++benchmarks_completed === benchmarks_to_run.length) {
           end_callback();
           update_averages();
         }
        });
      }(benchmarks_to_run[i]));
      if (end_callback === undefined) {
        update_averages();
      }
    }
  }

  // Return Public API.
  return {
    version: version,
    what_browser: function() {
      return what_browser();
    },
    run: function(benchmarks_table, benchmarks_to_run, start_callback, end_callback) {
      run(benchmarks_table, benchmarks_to_run, start_callback, end_callback);
    }
  };
});

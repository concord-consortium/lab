(function(){ 
  var root = this;
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
      return {
        browser: match[2],
        version: match[1],
        oscpu: navigator.appVersion.match(/(Macintosh); (.*?)\)/)[2]
      }
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

  function run(benchmarks_table, benchmarks_to_run, options) {
    var i = 0, b, browser_info, results = [];
    
    options = options || { format: "columns" };

    benchmarks_table.style.display = "";

    var empty_table = benchmarks_table.getElementsByTagName("tr").length == 0;

    function add_row(kind) {
      kind = kind || "data";
      var row = benchmarks_table.appendChild(document.createElement("tr"));
      row.className = kind;
      return row
    }

    function add_data(row, content, el, colspan) {
      el = el || "td";
      colspan = colspan || 1;
      var d = row.appendChild(document.createElement(el));
      d.textContent = content;
      d.colSpan = colspan;
    }

    function add_data_row(row, data, el) {
      el = el || "td";
      var i;
      i = -1; while (++i < data.length) {
        add_data(row, data[i]);
      }
    }

    function add_column(title, data) {
      if (empty_table) { add_data(add_row("title"), title, "th") };
      add_data(results_row, data)
    }

    function add_column_headings(title_row, titles, colspan) {
      colspan = colspan || 1;
      var i;
      i = -1; while (++i < titles.length) {
        add_data(title_row, titles[i], "th", colspan);
      }
    }

    function add_data_rows(n) {
      var i = -1; while (++i < n) { add_row() }
      return benchmark_results.getElementsByClassName("data")
    }

    function add_data_elements(row, data) {
      var i = -1; while (++i < data.length) { add_data(row, data[i]) }
    }

    function add_column_data(title_rows, data_rows, title, data) {
      var i;
      i = -1; while (++i < data.length) {
        add_data_elements(data_rows[i], data[i])
      }
    }

    browser_info = what_browser();
    if (options.format == "columns") {
      var title_rows = []
      title_rows.push(add_row("title"));
      b = benchmarks_to_run[0];
      add_column_headings(title_rows[0], [b.name])
      for (i = 1; i < benchmarks_to_run.length; i++) {
        b = benchmarks_to_run[i];
        add_column_headings(title_rows[0], [b.name], 2)
      }
      title_rows.push(add_row("title"));
      for (i = 0; i < benchmarks_to_run.length; i++) {
        b = benchmarks_to_run[i];
        add_column_headings(title_rows[1], b.columns)
      }
      var data_rows = add_data_rows(100);
      for (i = 0; i < benchmarks_to_run.length; i++) {
        b = benchmarks_to_run[i];
        add_column_data(title_rows, data_rows, b.name, b.run(0, 0, 9.81, 100));
      }
    }
  }

  // export namespace
  if (root !== 'undefined') { root.benchmark = benchmark; }
})()
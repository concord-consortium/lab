// ------------------------------------------------------------
//
// Data Table
//
// ------------------------------------------------------------

layout.datatable_visible = false;

var toggle_datatable = document.getElementById("toggle-datatable");
var datatable_table = document.getElementById("datatable-table");

layout.hide_datatable = function() {
  if (datatable_table) {
    datatable_table.style.display = "none";
  }
}

layout.render_datatable = function(reset) {
  datatable_table.style.display = "";
  var i,
      nodes = model.get_nodes(),
      atoms = [],
      titlerows = datatable_table.getElementsByClassName("title"),
      datarows = datatable_table.getElementsByClassName("data"),
      column_titles = ['PX', 'PY', 'X', 'Y', 'VX', 'VY', 'AX', 'AY', 'SPEED', 'CHARGE', 'RADIUS', 'ELEMENT'],
      i_formatter = d3.format(" 2d"),
      charge_formatter = d3.format(" 1.1f"),
      f_formatter = d3.format(" 3.4f"),
      formatters = [f_formatter, f_formatter, f_formatter, 
                    f_formatter, f_formatter, f_formatter, f_formatter, 
                    f_formatter, f_formatter, charge_formatter, f_formatter, 
                    i_formatter];

  atoms.length = nodes[0].length;
  reset = reset || false;

  function empty_table() {
    return datatable_table.getElementsByTagName("tr").length == 0;
  }

  function add_row(kind) {
    kind = kind || "data";
    var row = datatable_table.appendChild(document.createElement("tr"));
    row.className = kind;
    return row
  }

  function add_data(row, content, el, colspan) {
    el = el || "td";
    colspan = colspan || 1;
    var d = row.appendChild(document.createElement(el));
    d.textContent = content;
    if (colspan > 1) { d.colSpan = colspan };
  }

  function add_data_row(row, data, el) {
    el = el || "td";
    var i;
    i = -1; while (++i < data.length) {
      add_data(row, data[i]);
    }
  }

  function add_molecule_data(row, index, el) {
    el = el || "td";
    var cells = row.getElementsByTagName(el),
        i = 0;
    if (cells.length > 0) {
      cells[0].textContent = index;
      while (++i < cells.length) {
        cells[i].textContent = formatters[i](nodes[model.INDICES[column_titles[i]]][index])
      }
    }
    i--;
    while (++i < column_titles.length) {
      add_data(row, formatters[i](nodes[model.INDICES[column_titles[i]]][index]));
    }
  }

  function add_column(title, data) {
    if (empty_table()) { add_data(add_row("title"), title, "th") };
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
    var i = -1, j = datarows.length;
    while (++i < n) {
      if (i >= datarows.length) { add_row() }
    }
    while (--j >= i) {
      datatable_table.removeChild(datarows[i])
    }
    return datatable_table.getElementsByClassName("data")
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

  if (titlerows.length == 0) {
    var title_row = add_row("title");
    add_column_headings(title_row, column_titles)
    datarows = add_data_rows(atoms.length);
  }
  if (reset) { datarows = add_data_rows(model.get_num_atoms()); }
  i = -1; while (++i < atoms.length) {
    add_molecule_data(datarows[i], i);
  }
}

if (toggle_datatable) {
  toggle_datatable.onclick = function() {
    if (layout.datatable_visible) {
      layout.datatable_visible = false;
      toggle_datatable.textContent = "Show Data Table";
      datatable_table.style.display = "none";
    } else {
      layout.datatable_visible = true;
      toggle_datatable.textContent = "Hide Data Table";
      layout.render_datatable();
      datatable_table.style.display = "";
    }
  }
};

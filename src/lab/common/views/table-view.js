define(function() {

  return function TableView(opts) {

    var id          = opts.id,
        columns     = opts.columns,
        formatters  = opts.formatters,
        visibleRows = opts.visibleRows,
        tableData   = opts.tableData,
        title       = opts.title,
        $el,
        $tableWrapper,
        $table,
        $titlerow,
        $tbody;

    function renderColumnTitles() {
      var i, $th;
      $titlerow.find('th').remove("th");
      for(i = 0; i < columns.length; i++) {
        $th = $('<th>');
        $th.text(columns[i]);
        $th.click(columnSort);
        $titlerow.append($th);
      }
    }

    function columnSort(e) {
      var $title = $(this),
          ascending = "asc",
          descending = "desc",
          sortOrder;

      sortOrder = ascending;
      if ($title.hasClass(ascending)) {
        $title.removeClass(ascending);
        $title.addClass(descending);
        sortOrder = descending;
      } else if ($title.hasClass(descending)) {
        $title.removeClass(descending);
        $title.addClass(ascending);
        sortOrder = ascending;
      } else {
        $title.addClass(descending);
        sortOrder = descending;
      }
      $title.siblings().removeClass("sorted");
      $tbody.find("tr").tsort('td:eq('+$title.index()+')',
        {
          sortFunction:function(a, b) {
            var anum = Math.abs(parseFloat(a.s)),
                bnum = Math.abs(parseFloat(b.s));
            if (sortOrder === ascending) {
              return anum === bnum ? 0 : (anum > bnum ? 1 : -1);
            } else {
              return anum === bnum ? 0 : (anum < bnum ? 1 : -1);
            }
          }
        }
      );
      $title.addClass("sorted");
      e.preventDefault();
    }

    function renderTableData() {
      var i, j, rowData, $tr, $td;
      $tbody.find('.data').remove();
      if (!tableData) { return; }
      for(i = 0; i < tableData.length; i++) {
        $tr = $('<tr class="data">');
        $tbody.append($tr);
        rowData = tableData[i];
        for(j = 0; j < rowData.length; j++) {
          $td = $('<td>');
          $td.text(rowData[j]);
          $tr.append($td);
        }
      }
    }

    return {

      render: function() {
        var i, j, rowData, $title, $tr, $th, $td;
        $el = $('<div>');
        $table = $('<table>');
        $titlerow  = $('<tr class="header">');
        $tbody = $('<tbody>');
        $table
          .append($('<thead>').append($titlerow))
          .append($tbody);
        renderColumnTitles();
        renderTableData(tableData);
        $tableWrapper = $('<div>')
          .addClass("table-wrapper")
          .append($table);
        $el.attr('id', id);
        if (title) {
          $title = $('<div>')
            .addClass("title")
            .text(title);
          $el.append($title);
        }
        $el.append($tableWrapper);
        return $el;
      },

      appendDataRow: function(rowData) {
        var i;
        $tr = $('<tr class="data">');
        for(i = 0; i < rowData.length; i++) {
          $td = $('<td>');
          $td.text(formatters[i](rowData[i]));
          $tr.append($td);
        }
        $tbody.append($tr);
      },

      updateTable: function(opts) {
        columns     = opts.columns || columns;
        formatters  = opts.formatters || formatters;
        tableData   = opts.tableData || tableData;
        renderColumnTitles();
        renderTableData();
      }

    };
  };
});

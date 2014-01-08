define(function() {

  return function TableView(opts) {

    var id          = opts.id,
        columns     = opts.columns,
        formatters  = opts.formatters,
        visibleRows = opts.visibleRows,
        tableData   = opts.tableData,
        title       = opts.title,
        width       = opts.width,
        height      = opts.height,
        tooltip     = opts.tooltip,
        klasses     = opts.klasses || [],
        headerWidths,
        $el,
        $tableWrapper,
        $table,
        $thead,
        $titlerow,
        $tbody,
        $bodyrows,
        tbodyPos,
        tbodyHeight,
        selected = [];

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
      $bodyrows = $tbody.find("tr");
      $bodyrows.tsort('td:eq('+$title.index()+')',
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

    function alignColumnWidths() {
      headerWidths = $thead.find('tr:first th').map(function() {
        return $(this).width();
      });

      $tbody.find('tr:first td').each(function(i) {
        $(this).width(headerWidths[i]);
      });
    }

    function getRowByIndex(rowIndex) {
      return $($tbody.find('tr')).filter(function() {
        return $(this).data("index") === rowIndex;
      });
    }

    function getRowIndexFromRow($tr) {
      return $tr.data('index');
    }

    function getRowVisiblity($tr) {
      var p = $tr.position();
      if (p.top < tbodyPos.top) return -1;
      if (p.top > tbodyHeight) return 1;
      return 0;
    }

    function removeSelection(rowIndex) {
      var i = selected.indexOf(rowIndex);
      if (i !== -1) {
        selected.splice(i, 1);
        return getRowByIndex(rowIndex).removeClass('selected');
      }
    }

    function addSelection(rowIndex) {
      var $tr;
      if (selected.indexOf(rowIndex) === -1) {
        selected.push(rowIndex);
        $tr = getRowByIndex(rowIndex);
        $tr.addClass('selected');
        var v = getRowVisiblity($tr);
        // if (v === -1) $tr[0].scrollIntoView(true);
        // if (v === 1) $tr[0].scrollIntoView();
        return $tr;
      }
    }

    function getRowOrderIndices() {
      var i, j, indices = [];
      for (i = 0; i < selected.length; i++) {
        j = selected[i];
        indices.push([j, getRowByIndex(j).index()]);
      }
      return indices.sort(function(a, b) {
        return a[1] - b[1];
      });
    }

    function fillSelection() {
      var i, rowOrderIndices, start, end;
      rowOrderIndices = getRowOrderIndices();
      start = rowOrderIndices[0];
      end = rowOrderIndices[rowOrderIndices.length-1];
      $bodyrows = $tbody.find("tr");
      for (i = start[1]; i <= end[1]; i++) {
        addSelection($($bodyrows[i]).data('index'));
      }
    }

    function clearSelection() {
      var i;
      for (i = 0; i < selected.length; i++) {
        getRowByIndex(selected[i]).removeClass('selected');
      }
      selected = [];
    }

    function appendDataRow(rowData, index) {
      var i, datum, $tr, $td;
      $tr = $('<tr class="data">');
      $($tr).data('index', index);
      for(i = 0; i < rowData.length; i++) {
        $td = $('<td>');
        $($td).data('index', i);
        datum = rowData[i];
        if(typeof datum === "string") {
          $td.text(datum);
        } else if(typeof datum === "number") {
          $td.text(formatters[i](datum));
        }
        $tr.append($td);
      }
      $tbody.append($tr);
      if (tableData.length < 2) {
        alignColumnWidths();
      }
      // $tr[0].scrollIntoView();
      clearSelection();
      addSelection(index);
    }

    function removeDataRow(index) {
      var $tr = $($tbody.find('tr')).filter(function() { return $(this).data("index") === index; });
      $tr.remove();
    }

    function replaceDataRow(rowData, index) {
      var $tr = $($tbody.find('tr')).filter(function() {
            return $(this).data("index") === index;
          }),
          $dataElements = $($tr).find('td'),
          dataElementCount = $dataElements.length,
          i;

      for (i = 0; i < rowData.length; i++) {
        if (i < dataElementCount) {
          $($dataElements[i]).text(formatters[i](rowData[i]));
        }
      }
    }

    function renderTableData() {
      var i, rowData, $tr, $td;
      $tbody.find('.data').remove();
      if (!tableData) { return; }
      for(i = 0; i < tableData.length; i++) {
        appendDataRow(tableData[i], i);
      }
    }

    function calculateSizeAndPosition() {
      tbodyPos = $tbody.position();
      tbodyHeight = $tbody.height();
    }

    return {
      render: function() {
        var i, j, rowData, $title, $tr, $th, $td, self = this;
        $el = $('<div>');
        $table = $('<table>');
        $tbody = $('<tbody>');
        $titlerow  = $('<tr class="header">');
        $thead = $('<thead>').append($titlerow);
        $table
          .append($thead)
          .append($tbody);
        renderColumnTitles();
        renderTableData();
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
        for (i = 0; i < klasses.length; i++) {
          $el.addClass(klasses[i]);
        }
        if (tooltip) {
          $el.attr("title", tooltip);
        }
        if (width) {
          $el.css("width", width);
        }
        if (height) {
          $el.css("height", height);
        }
        $tbody.delegate("tr", "click", function(e) {
          var ri = getRowIndexFromRow($(e.currentTarget));
          if (!e.shiftKey && !e.metaKey) {
            clearSelection();
          }
          addSelection(ri);
          if (e.shiftKey) {
            fillSelection();
          }
        });
        $tbody.delegate("td", "click", function(e) {
          var $td      = $(e.currentTarget),
              rowIndex = $td.parent().data('index'),
              colIndex = $td.data('index'),
              data     = tableData[rowIndex][colIndex],
              $input   = $('<input class="editor-text">').val(data);

          $td.empty().append($input);
          $input.focus();

          function commitChange() {
            var val = $input.val();
            if (!isNaN(parseFloat(val)) && isFinite(val)) {
              val = parseFloat(val);
            }
            tableData[rowIndex][colIndex] = val;
            self.updateTable({});
          }

          $input.bind('keypress', function(e) {
            var code = (e.keyCode ? e.keyCode : e.which);
            if(code == 13) { //Enter
               commitChange();
            }
            return true;
          });
          $input.blur(commitChange);
        });
        calculateSizeAndPosition();
        return $el;
      },

      resize: function () {
        var remainingHeight;
        $table.height($tableWrapper.height());
        remainingHeight = $table.height() - ($thead.outerHeight(true));
        $tbody.height(remainingHeight - 6);
        alignColumnWidths();
        calculateSizeAndPosition();
      },

      appendDataRow: appendDataRow,

      removeDataRow: removeDataRow,

      replaceDataRow: replaceDataRow,

      removeSelection: removeSelection,
      addSelection: addSelection,
      clearSelection: clearSelection,

      updateTable: function(opts) {
        columns     = opts.columns || columns;
        formatters  = opts.formatters || formatters;
        tableData   = opts.tableData || tableData;
        renderColumnTitles();
        renderTableData();
        alignColumnWidths();
        calculateSizeAndPosition();
      }

    };
  };
});


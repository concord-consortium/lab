define(function() {

  return function TableView(opts, tableController) {

    var id          = opts.id,
        columns     = opts.columns,
        formatters  = opts.formatters,
        visibleRows = opts.visibleRows,
        blankRow    = opts.showBlankRow,
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
        $th.text(columns[i].name);
        $th.click(columnSort);
        $titlerow.append($th);
      }
    }

    function setFormattedData($td, datum, colIdx) {
      if (typeof datum !== "undefined" && datum !== null) {
        if(typeof datum === "string") {
          $td.text(datum);
        } else if(typeof datum === "number") {
          $td.text(formatters[colIdx](datum));
        }
      } else {
        $td.html("&nbsp;");
      }
    }

    function formatNumericValues() {
      $tbody.find('td').html(function() {
        var $td = $(this);
        var datum = $td.data('datum');
        var colIdx = $td.data('index');
        setFormattedData($td, datum, colIdx);
      });
    }

    function columnSort(e) {
      var $title = $(this),
          ascending = "asc",
          descending = "desc",
          sortOrder;

      // Remove blank row and setup it again after storting to ensure that it's always at the end
      // of the table.
      removeBlankRow();
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
      setupBlankRow();
      e.preventDefault();
    }

    function alignColumnWidths() {
      headerWidths = $thead.find('tr:first th').map(function() {
        return $(this).outerWidth();
      });

      $tbody.find('tr:first td').each(function(i) {
        $(this).outerWidth(headerWidths[i]);
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
      if (!p || !tbodyPos) return 0;
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
      for(i = 0; i < columns.length; i++) {
        $td = $('<td>');
        $($td).data('index', i);
        datum = (rowData[i] && rowData[i].length) ? rowData[i][1] : rowData[i];
        $td.data('datum', datum);
        setFormattedData($td, datum, i);
        $tr.append($td);
      }
      $tbody.append($tr);
      if ($tbody.find("tr").length < 2) {
        alignColumnWidths();
      }
      if (rowData.length > 0) {
        clearSelection();
        addSelection(index);
      }
      setupBlankRow();
      scrollToBottom();
    }

    function removeBlankRow() {
      $tbody.find(".blank").remove();
    }

    function setupBlankRow() {
      // Remove old blank row and add new one.
      removeBlankRow();
      if (!blankRow) return;
      var index = $tbody.find("tr").length;
      var i, $tr, $td;
      $tr = $('<tr class="data blank">');
      $($tr).data('index', index);
      for(i = 0; i < columns.length; i++) {
        $td = $('<td>');
        $($td).data('index', i);
        $td.html("&nbsp;");
        $tr.append($td);
      }
      $tbody.append($tr);
      if ($tbody.find("tr").length < 2) {
        alignColumnWidths();
      }
    }

    function scrollToBottom() {
      // Dummy, big number will cause that we will always scroll maximally to the bottom.
      $tbody.scrollTop(99999999);
    }

    function removeDataRow(index) {
      var $tr = $($tbody.find('tr')).filter(function() { return $(this).data("index") === index; });
      $tr.remove();
    }

    function replaceDataRow(rowData, index) {
      var datum;

      if ($tbody.find('tr').length === 0) {
        appendDataRow(rowData, index);
        return;
      }

      var $tr = $($tbody.find('tr')).filter(function() {
            return $(this).data("index") === index;
          }),
          $dataElements = $($tr).find('td'),
          dataElementCount = $dataElements.length,
          $td, i;

      for (i = 0; i < rowData.length; i++) {
        if (i < dataElementCount) {
          $td = $($dataElements[i]);
          datum = (rowData[i] && rowData[i].length) ? rowData[i][1] : rowData[i];
          $td.data('datum', datum);
          setFormattedData($td, datum, i);
        }
      }
    }

    function calculateSizeAndPosition() {
      tbodyPos = $tbody.position();
      tbodyHeight = $tbody.height();
    }

    function commitEditing() {
      var $input = $tbody.find('input');

      $input.each(function() {
        var $td = $(this).parent(),
            rowIndex = $td.parent().data('index'),
            colIndex = $td.data('index'),
            val = $(this).val();

        if (!isNaN(parseFloat(val)) && isFinite(val)) {
          val = parseFloat(val);
        }
        tableController.addDataToCell(rowIndex, colIndex, val);
        $td.empty().html(val);
      });

      alignColumnWidths();
      calculateSizeAndPosition();
    }

    function startEditing(rowIndex, colIndex) {
      var $td = $(getRowByIndex(rowIndex).find('td')[colIndex]),
          $oldInputs = $tbody.find('input'),
          data,
          $input,
          nextColIndex;

      if (!$td || (!columns[colIndex].editable) || ($td.find('input').length)) {
        return;
      }

      if ($oldInputs.length) {
        commitEditing();
      }

      data   = tableController.getDataInCell(rowIndex, colIndex);
      $input = $('<input class="editor-text">').val(data);

      $td.empty().append($input);

      alignColumnWidths();

      $input.bind('keydown', function(e) {
        var code = (e.keyCode ? e.keyCode : e.which);
        if(code === 13) {        // Enter
          commitEditing();
        } else if (code === 9){  // Tab
          commitEditing();
          // find and select next available cell
          nextColIndex = colIndex;
          while (++nextColIndex < columns.length) {
            if (columns[nextColIndex].editable) {
              startEditing(rowIndex, nextColIndex);
              break;
            }
          }
        }
        e.stopPropagation();
      });

      $input.on('blur', commitEditing);

      setTimeout(function(){
        $input.focus();
      }, 0);
    }

    return {
      render: function() {
        var i, $title;
        $el = $('<div>');
        $table = $('<table>');
        $tbody = $('<tbody>');
        $titlerow = $('<tr class="header">');
        $thead = $('<thead>').append($titlerow);
        $table
          .append($thead)
          .append($tbody);
        renderColumnTitles();
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
              colIndex = $td.data('index');

          startEditing(rowIndex, colIndex);
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

      clear: function () {
        $tbody.find('.data').remove();
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
        renderColumnTitles();
        formatNumericValues();
        alignColumnWidths();
        calculateSizeAndPosition();
      }

    };
  };
});


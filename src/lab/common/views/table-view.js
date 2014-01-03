define(function(require) {
  var slickgrid  = require('slickgrid')

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
        addNewRows  = opts.addNewRows || false,
        tableId     = id + "-table",
        grid,
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
        if (v === -1) $tr[0].scrollIntoView(true);
        if (v === 1) $tr[0].scrollIntoView();
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
        datum = rowData[i];
        if(typeof datum === "string") {
          $td.text(datum);
        } else if(typeof datum === "number") {
          $td.text(formatters[i](datum));
        }
        $tr.append($td);
      }
      $tbody.append($tr);
      $tr[0].scrollIntoView();
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
      grid.setData(tableData);
    }

    function calculateSizeAndPosition() {
      tbodyPos = $tbody.position();
      tbodyHeight = $tbody.height();
    }

    function emToPx(input) {
      var emSize = parseFloat($el.css("font-size"));
      return input * emSize;
    }

    function fixColumnWidths() {
      var cols = grid.getColumns(),
          i;
      for (i = 0; i < cols.length; i++) {
        $($el.find(".slick-header-column")[i]).outerWidth(cols[i].width);
      }

      // for the moment, rm this as it messes up the header height
      $el.find(".slick-sort-indicator").remove();
    }

    function fixRowHeights() {
      $el.find(".slick-row, .slick-cell").css({height: "1.5em"})
    }

    return {
      render: function(parent) {
        var tableHeight;

        if (height) {
          tableHeight = height;
        } else {
          tableHeight = (4 + 0.867 * visibleRows) + "em";
        }

        $el = $('<div>').attr('id', id)
          .css({width: width, height: tableHeight});
        $table = $('<div>').attr('id', tableId)
          .css({width: '100%', height: '100%'})
          .appendTo($el);
        for (i = 0; i < klasses.length; i++) {
          $el.addClass(klasses[i]);
        }

        var options = {
          editable: true,
          enableAddRow: addNewRows,
          enableCellNavigation: true,
          asyncEditorLoading: false,
          autoEdit: true,
          forceFitColumns: true
        };

        tableData = [{},{},{}];
        console.log(columns)
        grid = new Slick.Grid($table, tableData, columns, options);

        grid.onColumnsReordered.subscribe(fixColumnWidths);

        return $el;
  //       <div style="width:600px;">
  //   <div id="myGrid" style="width:100%;height:500px;"></div>
  // </div>

  //       var i, j, rowData, $title, $tr, $th, $td;
  //       $el = $('<div>');
  //       $table = $('<table>');
  //       $tbody = $('<tbody>');
  //       $titlerow  = $('<tr class="header">');
  //       $thead = $('<thead>').append($titlerow);
  //       $table
  //         .append($thead)
  //         .append($tbody);
  //       renderTableData();
  //       $tableWrapper = $('<div>')
  //         .addClass("table-wrapper")
  //         .append($table);
  //       $el.attr('id', id);
  //       if (title) {
  //         $title = $('<div>')
  //           .addClass("title")
  //           .text(title);
  //         $el.append($title);
  //       }
  //       $el.append($tableWrapper);
  //       for (i = 0; i < klasses.length; i++) {
  //         $el.addClass(klasses[i]);
  //       }
  //       if (tooltip) {
  //         $el.attr("title", tooltip);
  //       }
  //       if (width) {
  //         $el.css("width", width);
  //       }
  //       if (height) {
  //         $el.css("height", height);
  //       }
  //       $tbody.delegate("tr", "click", function(e) {
  //         var ri = getRowIndexFromRow($(e.currentTarget));
  //         if (!e.shiftKey && !e.metaKey) {
  //           clearSelection();
  //         }
  //         addSelection(ri);
  //         if (e.shiftKey) {
  //           fillSelection();
  //         }
  //       });
  //       calculateSizeAndPosition();
  //       return $el;
      },

      resize: function () {
        var cols, i;

        $("#"+tableId).width($("#"+id).width());
        $("#"+tableId+" .slick-viewport").width($("#"+tableId).width());
        // grid.autosizeColumns();

        cols = grid.getColumns();

        for (i = 0; i < cols.length; i++) {
          if (cols[i].emWidth) {
            cols[i].width = emToPx(cols[i].emWidth)
          }
        }

        grid.setOptions({rowHeight: emToPx(1.5)});

        grid.resizeCanvas();

        fixColumnWidths();

        // var remainingHeight;
        // $table.height($tableWrapper.height());
        // remainingHeight = $table.height() - ($thead.outerHeight(true));
        // $tbody.height(remainingHeight - 6);
        // calculateSizeAndPosition();
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
        for (var i=0; i<tableData.length; i++) {
          datum = tableData[i];
          if (datum instanceof Array){
            newDatum = {}
            for (var j=0; j<datum.length; j++) {
              newDatum[columns[j].id] = datum[j];
            }
            tableData[i] = newDatum;
          }
        }

        grid.setColumns(columns);
        grid.setData(tableData);
        grid.render();

        fixRowHeights();

        // grid.resizeCanvas(); // calling this too fast causes shrinking....
        window.grid = grid;
        window.data = tableData;
        window.el = $el;
        window.resize = this.resize;
      }

    };
  };
});


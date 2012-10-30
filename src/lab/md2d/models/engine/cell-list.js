if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function (require, exports, module) {

  exports.cellList = function (width, height, cellSize) {
    var api,
        colsNum,
        rowsNum,
        cellsNum,
        cell,

        init = function () {
          var i;
          colsNum = Math.ceil(width / cellSize);
          rowsNum = Math.ceil(height / cellSize);
          cellsNum = colsNum * rowsNum;
          cell = new Array(cellsNum);
          for(i = 0; i < cellsNum; i++) {
            cell[i] = [];
          }
        };

    init ();

    // Public API.
    api = {
      reinitialize: function (newCellSize) {
        if (newCellSize !== cellSize) {
          cellSize = newCellSize;
          init();
        }
      },

      addToCell: function (atomIdx, x, y) {
        var cellIdx = Math.floor(y / cellSize) * colsNum + Math.floor(x / cellSize);
        cell[cellIdx].push(atomIdx);
      },

      getCell: function (idx) {
        return cell[idx];
      },

      getRowsNum: function () {
        return rowsNum;
      },

      getColsNum: function () {
        return colsNum;
      },

      getNeighboringCells: function (rowIdx, colIdx) {
        var cellIdx = rowIdx * colsNum + colIdx,
            result = [];

        // Upper right.
        if (colIdx + 1 < colsNum && rowIdx + 1 < rowsNum) result.push(cell[cellIdx + colsNum + 1]);
        // Right.
        if (colIdx + 1 < colsNum) result.push(cell[cellIdx + 1]);
        // Bottom right.
        if (colIdx + 1 < colsNum && rowIdx - 1 >= 0) result.push(cell[cellIdx - colsNum + 1]);
        // Bottom.
        if (rowIdx - 1 >= 0) result.push(cell[cellIdx - colsNum]);

        return result;
      },

      clear: function () {
        var i;
        for (i = 0; i < cellsNum; i++) {
          cell[i].length = 0;
        }
      }
    };

    return api;
  };

});

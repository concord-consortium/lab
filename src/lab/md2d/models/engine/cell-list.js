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

    // Public API.
    api = {
      addToCell: function (idx, x, y) {
        var cellIdx;
        x = Math.floor(x / cellSize);
        y = Math.floor(y / cellSize);
        cellIdx = y * colsNum + x;
        if (cellIdx > cellsNum) {
          cellIdx--;
        }
        cell[cellIdx].push(idx);
        return cellIdx;
      },

      getCell: function (cellIdx) {
        return cell[cellIdx];
      },

      getNeighboringCells: function (cellIdx) {
        var result = [cellIdx],
            colIdx = cellIdx % colsNum,
            rowIdx = Math.floor(cellIdx / colsNum);

        if (colIdx + 1 < colsNum && rowIdx + 1 < rowsNum) result.push(cellIdx + colsNum + 1);
        if (colIdx + 1 < colsNum) result.push(cellIdx + 1);
        if (colIdx + 1 < colsNum && rowIdx - 1 >= 0) result.push(cellIdx - colsNum + 1);
        if (rowIdx - 1 >= 0) result.push(cellIdx - colsNum);

        return result;
      },

      clearCells: function () {
        var i;
        for (i = 0; i < cellsNum; i++) {
          cell[i].length = 0;
        }
      }
    };

    init ();
    return api;
  };

});

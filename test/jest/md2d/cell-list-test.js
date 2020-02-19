const assert = require("assert");
import CellList from "models/md2d/models/engine/cell-list";

describe("Cell list", () => {
  let cellList = null;
  beforeEach(() => {
    cellList = new CellList(2, 1, 0.5);
  });

  it("should be initialized correctly", () => {
    assert.equal(cellList.getColsNum(), 4);
    assert.equal(cellList.getRowsNum(), 2);
  });

  it("should handle atoms correctly - vol 1", () => {
    var i, cell;

    cellList.addToCell(0, 0.0, 0.0);
    cellList.addToCell(1, 0.5, 0.0);
    cellList.addToCell(2, 1.0, 0.0);
    cellList.addToCell(3, 1.5, 0.0);
    cellList.addToCell(4, 0.0, 0.5);
    cellList.addToCell(5, 0.5, 0.5);
    cellList.addToCell(6, 1.0, 0.5);
    cellList.addToCell(7, 1.5, 0.5);
    for (i = 0; i < 8; i++) {
      cell = cellList.getCell(i);
      assert.equal(cell.length, 1);
      assert.equal(cell[0], i);
    }

    cellList.clear();
  });

  it("should handle atoms correctly - vol 2", () => {
    var cell;

    cellList.addToCell(0, 0.00, 0.00);
    cellList.addToCell(1, 0.49, 0.00);
    cellList.addToCell(2, 0.49, 0.49);
    cellList.addToCell(3, 0.00, 0.49);
    cellList.addToCell(4, 1.50, 0.50);
    cellList.addToCell(5, 1.99, 0.50);
    cellList.addToCell(6, 1.99, 0.99);
    cellList.addToCell(7, 1.50, 0.99);

    cell = cellList.getCell(0);
    assert.equal(cell.length, 4);
    assert.equal(cell[0], 0);
    assert.equal(cell[1], 1);
    assert.equal(cell[2], 2);
    assert.equal(cell[3], 3);

    cell = cellList.getCell(7);
    assert.equal(cell.length, 4);
    assert.equal(cell[0], 4);
    assert.equal(cell[1], 5);
    assert.equal(cell[2], 6);
    assert.equal(cell[3], 7);

    cellList.clear();
  });

  it("should provide neighbors correctly", () => {
    assert.equal(cellList.getNeighboringCells(0, 0).length, 2);
    assert.equal(cellList.getNeighboringCells(0, 0)[0], cellList.getCell(5));
    assert.equal(cellList.getNeighboringCells(0, 0)[1], cellList.getCell(1));

    assert.equal(cellList.getNeighboringCells(0, 1).length, 2);
    assert.equal(cellList.getNeighboringCells(0, 1)[0], cellList.getCell(6));
    assert.equal(cellList.getNeighboringCells(0, 1)[1], cellList.getCell(2));

    assert.equal(cellList.getNeighboringCells(0, 2).length, 2);
    assert.equal(cellList.getNeighboringCells(0, 2)[0], cellList.getCell(7));
    assert.equal(cellList.getNeighboringCells(0, 2)[1], cellList.getCell(3));

    assert.equal(cellList.getNeighboringCells(0, 3).length, 0);

    assert.equal(cellList.getNeighboringCells(1, 0).length, 3);
    assert.equal(cellList.getNeighboringCells(1, 0)[0], cellList.getCell(5));
    assert.equal(cellList.getNeighboringCells(1, 0)[1], cellList.getCell(1));
    assert.equal(cellList.getNeighboringCells(1, 0)[2], cellList.getCell(0));

    assert.equal(cellList.getNeighboringCells(1, 1).length, 3);
    assert.equal(cellList.getNeighboringCells(1, 1)[0], cellList.getCell(6));
    assert.equal(cellList.getNeighboringCells(1, 1)[1], cellList.getCell(2));
    assert.equal(cellList.getNeighboringCells(1, 1)[2], cellList.getCell(1));

    assert.equal(cellList.getNeighboringCells(1, 2).length, 3);
    assert.equal(cellList.getNeighboringCells(1, 2)[0], cellList.getCell(7));
    assert.equal(cellList.getNeighboringCells(1, 2)[1], cellList.getCell(3));
    assert.equal(cellList.getNeighboringCells(1, 2)[2], cellList.getCell(2));

    assert.equal(cellList.getNeighboringCells(1, 3).length, 1);
    assert.equal(cellList.getNeighboringCells(1, 3)[0], cellList.getCell(3));
  });

  it("should be able to reinitialize correctly", () => {
    assert.equal(cellList.getColsNum(), 4);
    assert.equal(cellList.getRowsNum(), 2);

    cellList.reinitialize(1);
    assert.equal(cellList.getColsNum(), 2);
    assert.equal(cellList.getRowsNum(), 2);

    cellList.reinitialize(1, 2);
    assert.equal(cellList.getColsNum(), 2);
    assert.equal(cellList.getRowsNum(), 4);

    cellList.reinitialize(10, 20, 2);
    assert.equal(cellList.getColsNum(), 5);
    assert.equal(cellList.getRowsNum(), 10);
  });
});

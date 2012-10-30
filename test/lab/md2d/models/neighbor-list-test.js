/*globals d3, model */

require("../../../env");

var requirejs = require("requirejs"),
    config    = require("../../../requirejs-config"),
    vows      = require("vows"),
    assert    = require("assert");

// Use Lab RequireJS configuration.
requirejs.config(config.labConfig);

requirejs([
  "md2d/models/engine/neighbor-list"
], function (neighborList) {
  var NeighborList = neighborList.neighborList,

      suite = vows.describe("md2d/models/engine/neighbor-list");

  suite.addBatch({
    "Neighbor list": {
      topic: function () {
        // 10 atoms, 0.2 skin length.
        return NeighborList(10, 0.2);
      },
      "should be initialized correctly": function (neighborList) {
        assert.isTrue(neighborList.getList().length > 10 * 9 / 2);
      },
      "should handle atoms correctly - vol 1": function (neighborList) {
        var list;
        neighborList.markNeighbors(0, 1);
        neighborList.markNeighbors(0, 2);
        neighborList.markNeighbors(0, 3);

        neighborList.markNeighbors(2, 5);
        neighborList.markNeighbors(2, 6);
        neighborList.markNeighbors(2, 7);

        list = neighborList.getList();

        assert.equal(neighborList.getStartIdxFor(0), 0);
        assert.equal(list[0], 1);
        assert.equal(list[1], 2);
        assert.equal(list[2], 3);
        assert.equal(neighborList.getEndIdxFor(0), 3);

        assert.equal(neighborList.getStartIdxFor(2), 3);
        assert.equal(list[3], 5);
        assert.equal(list[4], 6);
        assert.equal(list[5], 7);
        assert.equal(neighborList.getEndIdxFor(2), 6);
      },
      "should handle atoms correctly after clearing the list": function (neighborList) {
        var list;

        neighborList.clear();

        neighborList.markNeighbors(0, 1);
        neighborList.markNeighbors(0, 2);
        neighborList.markNeighbors(0, 3);

        neighborList.markNeighbors(2, 5);
        neighborList.markNeighbors(2, 6);
        neighborList.markNeighbors(2, 7);

        list = neighborList.getList();

        assert.equal(neighborList.getStartIdxFor(0), 0);
        assert.equal(list[0], 1);
        assert.equal(list[1], 2);
        assert.equal(list[2], 3);
        assert.equal(neighborList.getEndIdxFor(0), 3);

        assert.equal(neighborList.getStartIdxFor(2), 3);
        assert.equal(list[3], 5);
        assert.equal(list[4], 6);
        assert.equal(list[5], 7);
        assert.equal(neighborList.getEndIdxFor(2), 6);
      }
    }
  });

  suite.export(module);
});

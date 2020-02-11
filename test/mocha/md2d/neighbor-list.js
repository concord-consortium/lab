/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();

const NeighborList = requirejs('models/md2d/models/engine/neighbor-list');

describe("Neighbor List", function() {
  let neighborList = null;

  const xcoords = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const ycoords = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  beforeEach(() => neighborList = new NeighborList(10, 0.2));

  it("should be initialized correctly", () => neighborList.getList().length.should.be.above((10 * 9) / 2));

  return describe("when neighborhood between atoms is defined", function() {
    beforeEach(function() {
      neighborList.markNeighbors(0, 1);
      neighborList.markNeighbors(0, 2);
      neighborList.markNeighbors(0, 3);

      neighborList.markNeighbors(2, 5);
      neighborList.markNeighbors(2, 6);
      return neighborList.markNeighbors(2, 7);
    });

    it("list should be filled correctly", function() {
        const list = neighborList.getList();

        neighborList.getStartIdxFor(0).should.equal(0);
        list[0].should.equal(1);
        list[1].should.equal(2);
        list[2].should.equal(3);
        neighborList.getEndIdxFor(0).should.equal(3);

        neighborList.getStartIdxFor(2).should.equal(3);
        list[3].should.equal(5);
        list[4].should.equal(6);
        list[5].should.equal(7);
        return neighborList.getEndIdxFor(2).should.equal(6);
    });

    describe("and positions of atoms are set", function() {
      beforeEach(() => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) =>
        neighborList.saveAtomPosition(i, xcoords[i], ycoords[i])));

      it("should be updated right after creation", () => neighborList.shouldUpdate(xcoords, ycoords).should.equal(true));

      it("shouldn't be updated if first check was done and positions are the same", function() {
        neighborList.shouldUpdate(xcoords, ycoords).should.equal(true);
        return neighborList.shouldUpdate(xcoords, ycoords).should.equal(false);
      });

      it("should be updated if first check was done and positions are different", function() {
        neighborList.shouldUpdate(xcoords, ycoords).should.equal(true);
        // Max displacement of atom has to be bigger than 0.2 defined during constructing this list.
        // That's why we are swapping xcoords with ycoords.
        return neighborList.shouldUpdate(ycoords, xcoords).should.equal(true);
      });

      return it("should be updated after invalidation", function() {
        neighborList.shouldUpdate(xcoords, ycoords).should.equal(true);
        neighborList.shouldUpdate(xcoords, ycoords).should.equal(false);
        neighborList.invalidate();
        return neighborList.shouldUpdate(xcoords, ycoords).should.equal(true);
      });
    });

    return describe("but list is cleared", function() {
      beforeEach(() => neighborList.clear());

      return it("should work correctly after clearing", function() {
        neighborList.markNeighbors(0, 5);
        neighborList.markNeighbors(0, 6);
        neighborList.markNeighbors(0, 7);

        const list = neighborList.getList();

        neighborList.getStartIdxFor(0).should.equal(0);
        list[0].should.equal(5);
        list[1].should.equal(6);
        list[2].should.equal(7);
        return neighborList.getEndIdxFor(0).should.equal(3);
      });
    });
  });
});

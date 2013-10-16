helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

NeighborList = requirejs 'models/md2d/models/engine/neighbor-list'

describe "Neighbor List", ->
  neighborList = null

  xcoords = [1..10]
  ycoords = [10..1]

  beforeEach ->
    neighborList = new NeighborList 10, 0.2

  it "should be initialized correctly", ->
    neighborList.getList().length.should.be.above 10 * 9 / 2

  describe "when neighborhood between atoms is defined", ->
    beforeEach ->
      neighborList.markNeighbors 0, 1
      neighborList.markNeighbors 0, 2
      neighborList.markNeighbors 0, 3

      neighborList.markNeighbors 2, 5
      neighborList.markNeighbors 2, 6
      neighborList.markNeighbors 2, 7

    it "list should be filled correctly", ->
        list = neighborList.getList()

        neighborList.getStartIdxFor(0).should.equal 0
        list[0].should.equal 1
        list[1].should.equal 2
        list[2].should.equal 3
        neighborList.getEndIdxFor(0).should.equal 3

        neighborList.getStartIdxFor(2).should.equal 3
        list[3].should.equal 5
        list[4].should.equal 6
        list[5].should.equal 7
        neighborList.getEndIdxFor(2).should.equal 6

    describe "and positions of atoms are set", ->
      beforeEach ->
        for i in [0..9]
          neighborList.saveAtomPosition i, xcoords[i], ycoords[i]

      it "should be updated right after creation", ->
        neighborList.shouldUpdate(xcoords, ycoords).should.equal true

      it "shouldn't be updated if first check was done and positions are the same", ->
        neighborList.shouldUpdate(xcoords, ycoords).should.equal true
        neighborList.shouldUpdate(xcoords, ycoords).should.equal false

      it "should be updated if first check was done and positions are different", ->
        neighborList.shouldUpdate(xcoords, ycoords).should.equal true
        # Max displacement of atom has to be bigger than 0.2 defined during constructing this list.
        # That's why we are swapping xcoords with ycoords.
        neighborList.shouldUpdate(ycoords, xcoords).should.equal true

      it "should be updated after invalidation", ->
        neighborList.shouldUpdate(xcoords, ycoords).should.equal true
        neighborList.shouldUpdate(xcoords, ycoords).should.equal false
        neighborList.invalidate()
        neighborList.shouldUpdate(xcoords, ycoords).should.equal true

    describe "but list is cleared", ->
      beforeEach ->
        neighborList.clear()

      it "should work correctly after clearing", ->
        neighborList.markNeighbors 0, 5
        neighborList.markNeighbors 0, 6
        neighborList.markNeighbors 0, 7

        list = neighborList.getList()

        neighborList.getStartIdxFor(0).should.equal 0
        list[0].should.equal 5
        list[1].should.equal 6
        list[2].should.equal 7
        neighborList.getEndIdxFor(0).should.equal 3

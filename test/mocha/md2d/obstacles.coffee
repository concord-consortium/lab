helpers = require '../../helpers'
emptyModel = helpers.getModel 'empty-model.json'
helpers.setupBrowserEnvironment()

describe "MD2D modeler", ->
  requirejs ['md2d/models/modeler'], (Model) ->
    # Obstacles data.
    data =
        x: [4]
        y: [4]
        width: [2]
        height: [2]

    model = null

    beforeEach ->
      model = new Model emptyModel
      model.createObstacles data

    it "should initialize obstacles correctly", ->
      model.getNumberOfObstacles().should.equal 1
      obsData = model.getObstacleProperties 0
      obsData.x.should.equal data.x[0]
      obsData.y.should.equal data.y[0]
      obsData.width.should.equal data.width[0]
      obsData.height.should.equal data.height[0]


    describe "when addObstacle() is called", ->
      describe "and the properties are correct", ->
        it "should add a new obstacle", ->
          newObs =
            x: 1
            y: 1
            width: 2
            height: 2

          model.addObstacle newObs

          model.getNumberOfObstacles().should.equal 2
          obsData = model.getObstacleProperties 1
          obsData.x.should.equal newObs.x
          obsData.y.should.equal newObs.y
          obsData.width.should.equal newObs.width
          obsData.height.should.equal newObs.height

          # Edge cases.
          (-> model.addObstacle x: 2, y: 4, width: 2, height: 2).should.not.throw()
          (-> model.addObstacle x: 6, y: 4, width: 2, height: 2).should.not.throw()
          (-> model.addObstacle x: 4, y: 2, width: 2, height: 2).should.not.throw()
          (-> model.addObstacle x: 4, y: 6, width: 2, height: 2).should.not.throw()

      describe "and the properties are incomplete", ->
        it "should fail and report an error", ->
          # No width and height provided!
          # These are required parameters, see metadata.
          (-> model.addObstacle x: 1, y: 1).should.throw()
          model.getNumberOfObstacles().should.equal 1

      describe "and the properties define an obstacle overlapping with an atom", ->
        it "should fail and report an error", ->
          model.createAtoms x: [1.5], y: [1.5]
          (-> model.addObstacle x: 1, y: 1, width: 2, height: 2).should.throw()
          model.getNumberOfObstacles().should.equal 1

      describe "and the properties define an obstacle overlapping with a wall", ->
        it "should fail and report an error", ->
          (-> model.addObstacle x: -0.5, y: 1, width: 2, height: 2).should.throw()
          (-> model.addObstacle x: 1, y: -0.5, width: 2, height: 2).should.throw()
          (-> model.addObstacle x: 9, y: 1, width: 2, height: 2).should.throw()
          (-> model.addObstacle x: 1, y: 9, width: 2, height: 2).should.throw()
          model.getNumberOfObstacles().should.equal 1

      describe "and the properties define an obstacle overlapping with another obstacle", ->
        it "should fail and report an error", ->
          (-> model.addObstacle x: 3, y: 3, width: 2, height: 2).should.throw()
          # Edge cases.
          (-> model.addObstacle x: 2.01, y: 4, width: 2, height: 2).should.throw()
          (-> model.addObstacle x: 5.99, y: 4, width: 2, height: 2).should.throw()
          (-> model.addObstacle x: 4, y: 2.01, width: 2, height: 2).should.throw()
          (-> model.addObstacle x: 4, y: 5.99, width: 2, height: 2).should.throw()
          model.getNumberOfObstacles().should.equal 1

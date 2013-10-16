helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

Model = requirejs 'models/md2d/models/modeler'

describe "MD2D modeler", ->
  model = null

  beforeEach ->
    # Use {} as an empty model definition. Default values will be used.
    # See: md2d/models/metadata.js
    model = new Model {}

  it "should deserialize obstacles correctly", ->
    # Obstacles data.
    data =
        x: [1, 4]
        y: [1, 4]
        width: [1, 2]
        height: [1, 2]

    model.createObstacles data

    model.getNumberOfObstacles().should.equal 2
    obsData = model.getObstacleProperties 0
    obsData.x.should.equal data.x[0]
    obsData.y.should.equal data.y[0]
    obsData.width.should.equal data.width[0]
    obsData.height.should.equal data.height[0]

    obsData = model.getObstacleProperties 1
    obsData.x.should.equal data.x[1]
    obsData.y.should.equal data.y[1]
    obsData.width.should.equal data.width[1]
    obsData.height.should.equal data.height[1]


  describe "when addObstacle() is called", ->
    describe "and the properties are correct", ->
      it "should add a new obstacle", ->
        newObs =
          x: 1
          y: 1
          width: 2
          height: 2

        model.addObstacle newObs

        model.getNumberOfObstacles().should.equal 1
        obsData = model.getObstacleProperties 0
        obsData.x.should.equal newObs.x
        obsData.y.should.equal newObs.y
        obsData.width.should.equal newObs.width
        obsData.height.should.equal newObs.height

        # Edge cases, close to existin obstacle.
        nextObs =
          x: 4
          y: 4
          width: 2
          height: 2
        model.addObstacle nextObs

        (-> model.addObstacle x: 2, y: 4, width: 2, height: 2).should.not.throw()
        (-> model.addObstacle x: 6, y: 4, width: 2, height: 2).should.not.throw()
        (-> model.addObstacle x: 4, y: 2, width: 2, height: 2).should.not.throw()
        (-> model.addObstacle x: 4, y: 6, width: 2, height: 2).should.not.throw()

    describe "and the properties are incomplete", ->
      it "should fail and report an error", ->
        # No width and height provided!
        # These are required parameters, see metadata.
        (-> model.addObstacle x: 1, y: 1).should.throw()
        model.getNumberOfObstacles().should.equal 0

    describe "and the properties define an obstacle overlapping with an atom", ->
      it "should fail and report an error", ->
        model.addAtom x: 1.5, y: 1.5
        (-> model.addObstacle x: 1, y: 1, width: 2, height: 2).should.throw()
        model.getNumberOfObstacles().should.equal 0

    describe "and the properties define an obstacle overlapping with a wall", ->
      it "should fail and report an error", ->
        (-> model.addObstacle x: -0.5, y: 1, width: 2, height: 2).should.throw()
        (-> model.addObstacle x: 1, y: -0.5, width: 2, height: 2).should.throw()
        (-> model.addObstacle x: 9, y: 1, width: 2, height: 2).should.throw()
        (-> model.addObstacle x: 1, y: 9, width: 2, height: 2).should.throw()
        model.getNumberOfObstacles().should.equal 0

    describe "and the properties define an obstacle overlapping with another obstacle", ->
      it "should fail and report an error", ->
        obs =
          x: 4
          y: 4
          width: 2
          height: 2
        model.addObstacle obs

        (-> model.addObstacle x: 3, y: 3, width: 2, height: 2).should.throw()
        # Edge cases.
        (-> model.addObstacle x: 2.01, y: 4, width: 2, height: 2).should.throw()
        (-> model.addObstacle x: 5.99, y: 4, width: 2, height: 2).should.throw()
        (-> model.addObstacle x: 4, y: 2.01, width: 2, height: 2).should.throw()
        (-> model.addObstacle x: 4, y: 5.99, width: 2, height: 2).should.throw()
        model.getNumberOfObstacles().should.equal 1

  describe "when removeObstacle() is called", ->

    beforeEach ->
      model.addObstacle x: 1, y: 1, width: 1, height: 1 # idx = 0
      model.addObstacle x: 2, y: 2, width: 2, height: 2 # idx = 1
      model.addObstacle x: 7, y: 7, width: 3, height: 3 # idx = 2

    describe "and provided index matches some obstacle", ->
      it "should remove it", ->
        model.getNumberOfObstacles().should.equal 3
        model.removeObstacle 0
        model.getNumberOfObstacles().should.equal 2
        model.removeObstacle 0
        model.getNumberOfObstacles().should.equal 1
        model.removeObstacle 0
        model.getNumberOfObstacles().should.equal 0

      it "should shift other, remaining obstacles properties", ->
        model.removeObstacle 1
        model.getNumberOfObstacles().should.equal 2
        # Remaining obstacles.
        model.getObstacleProperties(0).x.should.equal 1
        model.getObstacleProperties(0).y.should.equal 1
        model.getObstacleProperties(0).width.should.equal 1
        model.getObstacleProperties(0).height.should.equal 1
        model.getObstacleProperties(1).x.should.equal 7
        model.getObstacleProperties(1).y.should.equal 7
        model.getObstacleProperties(1).width.should.equal 3
        model.getObstacleProperties(1).height.should.equal 3

    describe "and provided index doesn't match any obstacle", ->
      it "should fail and report an error", ->
        (-> model.removeObstacle 3).should.throw()
        model.removeObstacle 0
        model.removeObstacle 0
        model.removeObstacle 0
        model.getNumberOfObstacles().should.equal 0
        (-> model.removeObstacle 0).should.throw()

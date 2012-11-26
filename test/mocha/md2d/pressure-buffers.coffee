helpers = require '../../helpers'
pressureProbes = helpers.getModel 'pressure-probes.json'
helpers.setupBrowserEnvironment()

describe "MD2D pressure buffers", ->
  requirejs ['md2d/models/modeler', 'md2d/models/engine/pressure-buffers'], (Model, PressureBuffers) ->
    model = new Model pressureProbes
    pressureBuffers = null
    obstaclesData = null
    obstaclesCount = null

    beforeEach ->
      obstaclesData = model.get_obstacles()
      obstaclesCount = model.getNumberOfObstacles()
      pressureBuffers = new PressureBuffers
      pressureBuffers.initialize obstaclesData, obstaclesCount

    it "should be initialized correctly", ->
      # See the model JSON definition for pressure probes definition.
      pressureBuffers.getPressureFromProbe(0, 'north').should.equal 0
      pressureBuffers.getPressureFromProbe(1, 'south').should.equal 0
      pressureBuffers.getPressureFromProbe(2, 'west').should.equal 0
      pressureBuffers.getPressureFromProbe(3, 'east').should.equal 0
      # Incorrect calls:
      (-> pressureBuffers.getPressureFromProbe 0, 'east').should.throw()
      (-> pressureBuffers.getPressureFromProbe 0, 'west').should.throw()
      (-> pressureBuffers.getPressureFromProbe 0, 'south').should.throw()

      (-> pressureBuffers.getPressureFromProbe 1, 'east').should.throw()
      (-> pressureBuffers.getPressureFromProbe 1, 'west').should.throw()
      (-> pressureBuffers.getPressureFromProbe 1, 'north').should.throw()

      (-> pressureBuffers.getPressureFromProbe 2, 'east').should.throw()
      (-> pressureBuffers.getPressureFromProbe 2, 'north').should.throw()
      (-> pressureBuffers.getPressureFromProbe 2, 'south').should.throw()

      (-> pressureBuffers.getPressureFromProbe 3, 'north').should.throw()
      (-> pressureBuffers.getPressureFromProbe 3, 'west').should.throw()
      (-> pressureBuffers.getPressureFromProbe 3, 'south').should.throw()

    it "should report some value if atoms hit probes", ->
      obstaclesData.nProbeValue[0] = 100
      obstaclesData.sProbeValue[1] = 100
      obstaclesData.wProbeValue[2] = 100
      obstaclesData.eProbeValue[3] = 100

      pressureBuffers.updateBuffers(100)

      pressureBuffers.getPressureFromProbe(0, 'north').should.not.equal 0
      pressureBuffers.getPressureFromProbe(1, 'south').should.not.equal 0
      pressureBuffers.getPressureFromProbe(2, 'west').should.not.equal 0
      pressureBuffers.getPressureFromProbe(3, 'east').should.not.equal 0

    describe "when obstacle is removed", ->

      beforeEach ->
        pressureBuffers.obstacleRemoved 1

      it "should update its buffers and report correct values", ->
        (-> pressureBuffers.getPressureFromProbe 1, 'south').should.throw()

        (-> pressureBuffers.getPressureFromProbe 0, 'north').should.not.throw()
        (-> pressureBuffers.getPressureFromProbe 1, 'west').should.not.throw()
        (-> pressureBuffers.getPressureFromProbe 2, 'east').should.not.throw()
helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

Model = requirejs 'models/md2d/models/modeler'

describe "MD2D modeler", ->
  model = null
  callbacks = null

  beforeEach ->
    # Use {} as an empty model definition. Default values will be used.
    # See: md2d/models/metadata.js
    model = new Model {}

  it "should deserialize electric fields correctly", ->
    # Electric fields data.
    data =
        intensity: [1, 1.5]
        orientation: ["N", "E"]

    model.createElectricFields data
    model.getNumberOfElectricFields().should.equal 2
    efData = model.getElectricFieldProperties 0
    efData.intensity.should.equal data.intensity[0]
    efData.orientation.should.equal data.orientation[0]

    efData = model.getElectricFieldProperties 1
    efData.intensity.should.equal data.intensity[1]
    efData.orientation.should.equal data.orientation[1]

  describe "when addElectricField() is called", ->
    it "should add a electric field", ->
      data =
        intensity: 1
        orientation: "N"

      model.addElectricField data

      model.getNumberOfElectricFields().should.equal 1
      efData = model.getElectricFieldProperties 0
      efData.intensity.should.equal data.intensity
      efData.orientation.should.equal data.orientation

    it "should trigger 'addElectricField' event", ->
      callback = sinon.spy()
      model.on 'addElectricField', callback

      callback.callCount.should.equal 0
      model.addElectricField intensity: 1, orientation: "N"
      callback.callCount.should.equal 1

  describe "when setElectricFieldProperties() is called", ->
    beforeEach ->
      model.addElectricField intensity: 1, orientation: "N"

    it "should update electric field properties", ->
      model.getElectricFieldProperties(0).intensity.should.equal 1
      model.getElectricFieldProperties(0).orientation.should.equal "N"
      model.setElectricFieldProperties 0, {intensity: 2, orientation: "E"}
      model.getElectricFieldProperties(0).intensity.should.equal 2
      model.getElectricFieldProperties(0).orientation.should.equal "E"

    it "should trigger 'changeElectricField' event", ->
      callback = sinon.spy()
      model.on 'changeElectricField', callback

      callback.callCount.should.equal 0
      model.setElectricFieldProperties 0, {intensity: 1, orientation: "N"}
      callback.callCount.should.equal 1

  describe "when removeElectricField() is called", ->

    beforeEach ->
      model.addElectricField intensity: 1, orientation: "N" # idx = 0
      model.addElectricField intensity: 2, orientation: "S" # idx = 1
      model.addElectricField intensity: 3, orientation: "E" # idx = 2

    describe "and provided index matches some electric field", ->
      it "should remove it", ->
        model.getNumberOfElectricFields().should.equal 3
        model.removeElectricField 0
        model.getNumberOfElectricFields().should.equal 2
        model.removeElectricField 0
        model.getNumberOfElectricFields().should.equal 1
        model.removeElectricField 0
        model.getNumberOfElectricFields().should.equal 0

      it "should shift other, remaining electric fields properties", ->
        model.removeElectricField 1
        model.getNumberOfElectricFields().should.equal 2
        # Remaining obstacles.
        model.getElectricFieldProperties(0).intensity.should.equal 1
        model.getElectricFieldProperties(0).orientation.should.equal "N"
        model.getElectricFieldProperties(1).intensity.should.equal 3
        model.getElectricFieldProperties(1).orientation.should.equal "E"

      it "should trigger 'removeElectricField' event", ->
        callback = sinon.spy()
        model.on 'removeElectricField', callback

        callback.callCount.should.equal 0
        model.removeElectricField 0
        callback.callCount.should.equal 1
        model.removeElectricField 0
        callback.callCount.should.equal 2
        model.removeElectricField 0
        callback.callCount.should.equal 3

    describe "and provided index doesn't match any electric field", ->
      it "should fail and report an error", ->
        (-> model.removeElectricField 3).should.throw()
        model.removeElectricField 0
        model.removeElectricField 0
        model.removeElectricField 0
        model.getNumberOfElectricFields().should.equal 0
        (-> model.removeElectricField 0).should.throw()


  describe "when shape with electric field is removed", ->

      beforeEach ->
        model.addShape type: "rectangle", x: 0, y: 0, width: 5, height: 5
        model.addShape type: "rectangle", x: 5, y: 0, width: 5, height: 5

        model.addElectricField intensity: 1, orientation: "N", shapeIdx: 0 # idx = 0
        model.addElectricField intensity: 2, orientation: "S", shapeIdx: 1 # idx = 1
        model.addElectricField intensity: 3, orientation: "E", shapeIdx: null # idx = 2

      it "electric field should be also removed", ->
        model.getNumberOfShapes().should.equal 2
        model.getNumberOfElectricFields().should.equal 3

        model.removeShape 0

        model.getNumberOfShapes().should.equal 1
        model.getNumberOfElectricFields().should.equal 2

        # Note that indices of atoms should be shifter already.
        model.getElectricFieldProperties(0).intensity.should.equal 2
        model.getElectricFieldProperties(0).orientation.should.equal "S"
        # Index of shape should be updated too!
        model.getElectricFieldProperties(0).shapeIdx.should.equal 0

        model.removeShape 0

        model.getNumberOfShapes().should.equal 0
        model.getNumberOfElectricFields().should.equal 1

        # Note that indices of atoms should be shifter already.
        model.getElectricFieldProperties(0).intensity.should.equal 3
        model.getElectricFieldProperties(0).orientation.should.equal "E"
        should.equal model.getElectricFieldProperties(0).shapeIdx, null


      it "should also trigger 'removeElectricField' event", ->
        callback = sinon.spy()
        model.on 'removeElectricField', callback

        callback.callCount.should.equal 0
        model.removeShape 0
        # Why? Electric field should be also removed, see test above.
        callback.callCount.should.equal 1
        model.removeShape 0
        callback.callCount.should.equal 2

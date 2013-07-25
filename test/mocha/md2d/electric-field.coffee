helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

Model = requirejs 'md2d/models/modeler'

describe "MD2D modeler", ->
  model = null
  ef = null
  callbacks = null

  beforeEach ->
    # Use {} as an empty model definition. Default values will be used.
    # See: md2d/models/metadata.js
    model = new Model {}
    ef = model.electricFields

  it "should deserialize electric fields correctly", ->
    # Electric fields data.
    data =
        intensity: [1, 1.5]
        orientation: ["N", "E"]

    model.createElectricFields data
    ef.count.should.equal 2
    efData = ef.get 0
    efData.intensity.should.equal data.intensity[0]
    efData.orientation.should.equal data.orientation[0]

    efData = ef.get 1
    efData.intensity.should.equal data.intensity[1]
    efData.orientation.should.equal data.orientation[1]

  describe "when electricFields.add(props) is called", ->
    it "should add a electric field", ->
      data =
        intensity: 1
        orientation: "N"

      ef.add data
      ef.count.should.equal 1
      efData = ef.get 0
      efData.intensity.should.equal data.intensity
      efData.orientation.should.equal data.orientation

    it "should trigger 'add' event", ->
      callback = sinon.spy()
      model.electricFields.on 'add', callback

      callback.callCount.should.equal 0
      ef.add intensity: 1, orientation: "N"
      callback.callCount.should.equal 1

  describe "when electricFields.set(props) is called", ->
    beforeEach ->
      ef.add intensity: 1, orientation: "N"

    it "should update electric field properties", ->
      # this time use objects array to test values instead of .get
      ef.objects[0].intensity.should.equal 1
      ef.objects[0].orientation.should.equal "N"
      ef.set 0, {intensity: 2, orientation: "E"}
      ef.objects[0].intensity.should.equal 2
      ef.objects[0].orientation.should.equal "E"

    it "should trigger 'changeElectricField' event", ->
      callback = sinon.spy()
      model.electricFields.on 'set', callback

      callback.callCount.should.equal 0
      ef.set 0, {intensity: 1, orientation: "N"}
      callback.callCount.should.equal 1

  describe "when electricFields.remove(idx) is called", ->

    beforeEach ->
      ef.add intensity: 1, orientation: "N" # idx = 0
      ef.add intensity: 2, orientation: "S" # idx = 1
      ef.add intensity: 3, orientation: "E" # idx = 2

    describe "and provided index matches some electric field", ->
      it "should remove it", ->
        ef.count.should.equal 3
        ef.remove 0
        ef.count.should.equal 2
        ef.remove 0
        ef.count.should.equal 1
        ef.remove 0
        ef.count.should.equal 0

      it "should shift other, remaining electric fields properties", ->
        ef.remove 1
        ef.count.should.equal 2
        # Remaining electric fields.
        ef.get(0).intensity.should.equal 1
        ef.get(0).orientation.should.equal "N"
        ef.get(1).intensity.should.equal 3
        ef.get(1).orientation.should.equal "E"

      it "should trigger 'remove' event", ->
        callback = sinon.spy()
        model.electricFields.on 'remove', callback
        callback.callCount.should.equal 0
        ef.remove 0
        callback.callCount.should.equal 1
        ef.remove 0
        callback.callCount.should.equal 2
        ef.remove 0
        callback.callCount.should.equal 3

    describe "and provided index doesn't match any electric field", ->
      it "should fail and report an error", ->
        (-> ef.remove 3).should.throw()
        ef.remove 0
        ef.remove 0
        ef.remove 0
        ef.count.should.equal 0
        (-> ef.remove 0).should.throw()


  describe "when rectangle with electric field is removed", ->

      beforeEach ->
        model.addRectangle x: 0, y: 0, width: 5, height: 5
        model.addRectangle x: 5, y: 0, width: 5, height: 5

        ef.add intensity: 1, orientation: "N", rectangleIdx: 0 # idx = 0
        ef.add intensity: 2, orientation: "S", rectangleIdx: 1 # idx = 1
        ef.add intensity: 3, orientation: "E", rectangleIdx: null # idx = 2

      it "electric field should be also removed", ->
        model.getNumberOfRectangles().should.equal 2
        ef.count.should.equal 3

        model.removeRectangle 0

        model.getNumberOfRectangles().should.equal 1
        ef.count.should.equal 2

        # Note that indices of atoms should be shifter already.
        ef.get(0).intensity.should.equal 2
        ef.get(0).orientation.should.equal "S"
        # Index of rectangle should be updated too!
        ef.get(0).rectangleIdx.should.equal 0

        model.removeRectangle 0

        model.getNumberOfRectangles().should.equal 0
        ef.count.should.equal 1

        # Note that indices of atoms should be shifter already.
        ef.get(0).intensity.should.equal 3
        ef.get(0).orientation.should.equal "E"
        should.equal ef.get(0).rectangleIdx, null


      it "should also trigger electric field 'remove' event", ->
        callback = sinon.spy()
        model.electricFields.on 'remove', callback

        callback.callCount.should.equal 0
        model.removeRectangle 0
        # Why? Electric field should be also removed, see test above.
        callback.callCount.should.equal 1
        model.removeRectangle 0
        callback.callCount.should.equal 2

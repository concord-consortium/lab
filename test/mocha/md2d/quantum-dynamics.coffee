helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

Model = requirejs 'md2d/models/modeler'

describe "MD2D modeler with Quantum Dynamics plugin", ->
  model = null
  callbacks = null

  describe "when using quantum dynamics", ->
    beforeEach ->
      model = new Model {
        quantumDynamics: {
          useQuantumDynamics: true
        }
      }

    it "should have useQuantumDynamics = true", ->
      model.properties.quantumDynamics.useQuantumDynamics.should.eql true

    it "should have an excitation table with default of zero", ->
      # Atoms data.
      data =
        x: [1, 1]
        y: [1, 1]

      model.createAtoms data

      atomData = model.getAtomProperties 0

      should.exist atomData.excitation
      atomData.excitation.should.equal 0

    it "should read excitation and deserialize correctly", ->
      # Atoms data.
      data =
        x: [1, 1]
        y: [1, 1]
        excitation: [0, 1]

      model.createAtoms data

      atomData = model.getAtomProperties 0
      atomData.excitation.should.equal data.excitation[0]

      atomData = model.getAtomProperties 1
      atomData.excitation.should.equal data.excitation[1]

    describe "serialization", ->
      it "should include excitation values", ->
        data =
          x: [1, 1]
          y: [1, 1]
          excitation: [0, 1]

        model.createAtoms data

        excitation = model.serialize().atoms.excitation

        should.exist excitation
        excitation.should.eql [0, 1]


  describe "when not using quantum dynamics", ->
    beforeEach ->
      model = new Model {
        quantumDynamics: null
      }

    it "should not allow excitation to be set", ->
      # Atoms data.
      data =
        x: [1, 1]
        y: [1, 1]
        excitation: [0, 1]

      (-> model.createAtoms(data)).should.throw TypeError

    it "should not have an excitation table", ->
      # Atoms data.
      data =
        x: [1, 1]
        y: [1, 1]

      model.createAtoms(data)

      atomData = model.getAtomProperties 0
      should.not.exist atomData.excitation

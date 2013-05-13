helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

Model = requirejs 'md2d/models/modeler'

describe "MD2D modeler with Quantum Dynamics plugin", ->
  model = null
  callbacks = null

  beforeEach ->
    model = new Model {
      quantumDynamics: {}
    }

  it "should not allow excitation to be set when we don't use quantum dynamics", ->
    # Redefine model just for this test
    model = new Model {
      quantumDynamics: null
    }
    # Atoms data.
    data =
        x: [1, 1]
        y: [1, 1]
        excitation: [0, 1]

    (->
      model.createAtoms(data)
    ).should.throw(TypeError)

  it "should not have an excitation table when we don't use quantum dynamics", ->
    # Redefine model just for this test
    model = new Model {
      quantumDynamics: null
    }
    # Atoms data.
    data =
        x: [1, 1]
        y: [1, 1]

    model.createAtoms(data)

    atomData = model.getAtomProperties 0
    should.not.exist atomData.excitation

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
helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

helpers.withIsolatedRequireJSAndViewsMocked (requirejs) ->
  InteractivesController = requirejs 'common/controllers/interactives-controller'

  controller = null
  script = null

  interactive =
    "title": "Test Interactive"
    "models": [
      "type": "md2d"
      "id": "model1"
      "url": "model1"
    ]

  before ->
    # Create interactive controller.
    # Probably most tests will load their custom models,
    # so load just empty model.
    helpers.withModel {}, ->
      controller = new InteractivesController interactive, 'body'
    script = window.script
    should.exist script

  # Loads a given model. Use this function instead of creating a new
  # interactive controller each time whan a new model should be loaded.
  loadModel = (modelDefinition) ->
    # Use provided model.
    helpers.withModel modelDefinition, ->
      controller.loadModel "model1"
    # Scripting API is exported to the global namespace when model is loaded.
    script = window.script


  describe "MD2D Scripting API test", ->

    describe "atomsWithinTriangle", ->
      before ->
        loadModel({width: 10, height: 10})

      it "should return atoms within triangular area", ->
        should.exist script.atomsWithinTriangle
        script.addAtom x: 5, y: 5, element: 0
        # Various test cases (checking geometric calculations).
        script.atomsWithinTriangle(0, 0, 5, 10, 10, 0).should.eql [0]
        script.atomsWithinTriangle(0, 0, 4.99, 10, 4.99, 0).should.eql []
        script.atomsWithinTriangle(0, 0, 5.01, 10, 5.01, 0).should.eql [0]
        script.atomsWithinTriangle(4.99, 0, 4.99, 10, 10, 0).should.eql [0]
        script.atomsWithinTriangle(5.01, 0, 5.01, 10, 10, 0).should.eql []
        script.atomsWithinTriangle(0, 5.01, 10, 5.01, 5, 0).should.eql [0]
        script.atomsWithinTriangle(0, 4.99, 10, 4.99, 5, 0).should.eql []
        script.atomsWithinTriangle(0, 5.01, 10, 5.01, 5, 10).should.eql []
        script.atomsWithinTriangle(0, 4.99, 10, 4.99, 5, 10).should.eql [0]
        # Select only atoms with element 0.
        script.atomsWithinTriangle(0, 0, 5, 10, 10, 0, 0).should.eql [0]
        # Select only atoms with element 1, 2, 3.
        script.atomsWithinTriangle(0, 0, 5, 10, 10, 0, 1).should.eql []
        script.atomsWithinTriangle(0, 0, 5, 10, 10, 0, 2).should.eql []
        script.atomsWithinTriangle(0, 0, 5, 10, 10, 0, 3).should.eql []

    describe "addKEToAtoms", ->
      before ->
        loadModel({width: 10, height: 10})

      err = 1e-4

      it "should add given amout of KE to group of atoms", ->
        should.exist script.addKEToAtoms
        script.addAtom x: 1, y: 1, element: 0
        script.addAtom x: 2, y: 2, element: 0
        script.addAtom x: 3, y: 3, element: 0

        script.get("totalEnergy").should.be.approximately 0, err
        script.get("kineticEnergy").should.be.approximately 0, err
        script.get("potentialEnergy").should.be.approximately 0, err

        script.addKEToAtoms 2

        script.get("totalEnergy").should.be.approximately 2, err
        script.get("kineticEnergy").should.be.approximately 2, err
        script.get("potentialEnergy").should.be.approximately 0, err


        script.addKEToAtoms 2, [0, 1, 2]

        script.get("totalEnergy").should.be.approximately 4, err
        script.get("kineticEnergy").should.be.approximately 4, err
        script.get("potentialEnergy").should.be.approximately 0, err

        a0 = script.getAtomProperties 0
        a1 = script.getAtomProperties 1
        a2 = script.getAtomProperties 2

        script.addKEToAtoms 2, [1]

        script.get("totalEnergy").should.be.approximately 6, err
        script.get("kineticEnergy").should.be.approximately 6, err
        script.get("potentialEnergy").should.be.approximately 0, err

        newA0 = script.getAtomProperties 0
        newA1 = script.getAtomProperties 1
        newA2 = script.getAtomProperties 2

        newA0.should.eql a0
        newA2.should.eql a2
        newA1.vx.should.be.above a1.vx
        newA1.vy.should.be.above a1.vy

        script.addKEToAtoms -10

        # Energy *should not* change as it's impossible to remove 10eV when KE is only 6eV.
        script.get("totalEnergy").should.be.approximately 6, err
        script.get("kineticEnergy").should.be.approximately 6, err
        script.get("potentialEnergy").should.be.approximately 0, err






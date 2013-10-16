helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

Model = requirejs 'models/md2d/models/modeler'

describe "MD2D modeler with Quantum Dynamics plugin", ->
  model = null
  callbacks = null

  describe "when using quantum dynamics", ->
    beforeEach ->
      model = new Model {
        quantumDynamics: {}
      }

    it "should have useQuantumDynamics = true", ->
      model.properties.useQuantumDynamics.should.eql true

    it "should not have a 'quantumDynamics' property", ->
      should.not.exist model.properties.quantumDynamics

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
      it "should include excitation values in the atoms table", ->
        data =
          x: [1, 1]
          y: [1, 1]
          excitation: [0, 1]

        model.createAtoms data

        excitation = model.serialize().atoms.excitation

        should.exist excitation
        excitation.should.eql [0, 1]

      it "should include a quantumDynamics stanza", ->
        quantumDynamics = model.serialize().quantumDynamics
        should.exist quantumDynamics

      describe "of photons", ->
        describe "when there are no photons", ->
          beforeEach ->
            data =
              x: [1, 1]
              y: [1, 1]
              excitation: [0, 1]
            model.createAtoms data

          it "should still have a photons object", ->
            photons = model.serialize().quantumDynamics.photons
            should.exist photons

        describe "when there are photons", ->
          beforeEach ->
            model = new Model {
              quantumDynamics: {
                photons: {
                  x: [0]
                  y: [1]
                  vx: [2]
                  vy: [3]
                  angularFrequency: [4]
                }
              }
            }

          it "should have a photons array with data for the photons", ->
            photons = model.serialize().quantumDynamics.photons

            photons.should.eql {
              x: [0]
              y: [1]
              vx: [2]
              vy: [3]
              angularFrequency: [4]
            }

        describe "when there are entries in the photons table that have no velocity", ->
          beforeEach ->
            model = new Model {
              quantumDynamics: {
                photons: {
                  x: [0, 0, 0]
                  y: [1, 1, 1]
                  vx: [2, 0, 0]
                  vy: [3, 0, 3]
                  angularFrequency: [4, 4, 4]
                }
              }
            }

          it "should omit the non-moving photons from the array", ->
            photons = model.serialize().quantumDynamics.photons

            photons.should.eql {
              x: [0, 0]
              y: [1, 1]
              vx: [2, 0]
              vy: [3, 3]
              angularFrequency: [4, 4]
            }


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

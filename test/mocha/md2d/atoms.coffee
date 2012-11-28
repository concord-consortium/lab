helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

describe "MD2D modeler", ->
  requirejs ['md2d/models/modeler'], (Model) ->
    model = null

    beforeEach ->
      # Use {} as an empty model definition. Default values will be used.
      # See: md2d/models/metadata.js
      model = new Model {}

    it "should deserialize atoms correctly", ->
      # Atoms data.
      data =
          x: [1, 4]
          y: [1, 4]

      model.createAtoms data

      model.get_num_atoms().should.equal 2
      atomData = model.getAtomProperties 0
      atomData.x.should.equal data.x[0]
      atomData.y.should.equal data.y[0]

      atomData = model.getAtomProperties 1
      atomData.x.should.equal data.x[1]
      atomData.y.should.equal data.y[1]


    describe "when addAtom() is called", ->
      describe "and the properties are correct", ->
        it "should add a new atom", ->
          data =
            x: 1
            y: 1

          model.addAtom data

          model.get_num_atoms().should.equal 1
          atomData = model.getAtomProperties 0
          atomData.x.should.equal data.x
          atomData.y.should.equal data.y

      describe "and the properties are incomplete", ->
        it "should fail and report an error", ->
          # No y coordinate provided!
          # It is a required parameter, see metadata.
          (-> model.addAtom x: 1).should.throw()
          model.get_num_atoms().should.equal 0

    describe "when removeAtom() is called", ->

      beforeEach ->
        model.addAtom x: 1, y: 1 # idx = 0
        model.addAtom x: 2, y: 2 # idx = 1
        model.addAtom x: 3, y: 3 # idx = 2

      describe "and provided index matches some atom", ->
        it "should remove it", ->
          model.get_num_atoms().should.equal 3
          model.removeAtom 0
          model.get_num_atoms().should.equal 2
          model.removeAtom 0
          model.get_num_atoms().should.equal 1
          model.removeAtom 0
          model.get_num_atoms().should.equal 0

        it "should shift other, remaining atom properties", ->
          model.removeAtom 1
          model.get_num_atoms().should.equal 2
          # Remaining obstacles.
          model.getAtomProperties(0).x.should.equal 1
          model.getAtomProperties(0).y.should.equal 1
          model.getAtomProperties(1).x.should.equal 3
          model.getAtomProperties(1).y.should.equal 3

        describe "and there are radial bonds", ->

          beforeEach ->
            model.addRadialBond atom1: 0, atom2: 1, length: 1, strength: 1
            model.addRadialBond atom1: 1, atom2: 2, length: 2, strength: 2

          it "should remove also connected radial bonds", ->
            model.getNumberOfRadialBonds().should.equal 2

            model.removeAtom 0
            model.get_num_atoms().should.equal 2

            model.getNumberOfRadialBonds().should.equal 1
            model.getRadialBondProperties(0).atom1.should.equal 0
            model.getRadialBondProperties(0).atom2.should.equal 1
            model.getRadialBondProperties(0).length.should.equal 2
            model.getRadialBondProperties(0).strength.should.equal 2

            model.removeAtom 0
            model.get_num_atoms().should.equal 1

            model.getNumberOfRadialBonds().should.equal 0

      describe "and provided index doesn't match any atom", ->
        it "should fail and report an error", ->
          (-> model.removeAtom 3).should.throw()
          model.removeAtom 0
          model.removeAtom 0
          model.removeAtom 0
          model.get_num_atoms().should.equal 0
          (-> model.removeAtom 0).should.throw()

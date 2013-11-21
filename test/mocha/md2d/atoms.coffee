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

  it "should deserialize atoms correctly", ->
    # Atoms data.
    data =
        x: [1, 4]
        y: [1, 4]

    model.createAtoms data
    model.getNumberOfAtoms().should.equal 2
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

        model.getNumberOfAtoms().should.equal 1
        atomData = model.getAtomProperties 0
        atomData.x.should.equal data.x
        atomData.y.should.equal data.y

      it "should trigger 'addAtom' event", ->
        callback = sinon.spy()
        model.on 'addAtom', callback

        callback.callCount.should.equal 0
        model.addAtom x: 0, y: 0
        callback.callCount.should.equal 1

    describe "and the properties are incomplete", ->
      it "should fail and report an error", ->
        # No y coordinate provided!
        # It is a required parameter, see metadata.
        (-> model.addAtom x: 1).should.throw()
        model.getNumberOfAtoms().should.equal 0

  describe "when removeAtom() is called", ->

    beforeEach ->
      model.addAtom x: 1, y: 1 # idx = 0
      model.addAtom x: 2, y: 2 # idx = 1
      model.addAtom x: 3, y: 3 # idx = 2

    describe "and provided index matches some atom", ->
      it "should remove it", ->
        model.getNumberOfAtoms().should.equal 3
        model.removeAtom 0
        model.getNumberOfAtoms().should.equal 2
        model.removeAtom 0
        model.getNumberOfAtoms().should.equal 1
        model.removeAtom 0
        model.getNumberOfAtoms().should.equal 0

      it "should shift other, remaining atom properties", ->
        model.removeAtom 1
        model.getNumberOfAtoms().should.equal 2
        # Remaining obstacles.
        model.getAtomProperties(0).x.should.equal 1
        model.getAtomProperties(0).y.should.equal 1
        model.getAtomProperties(1).x.should.equal 3
        model.getAtomProperties(1).y.should.equal 3

      it "should trigger 'removeAtom' event", ->
        callback = sinon.spy()
        model.on 'removeAtom', callback

        callback.callCount.should.equal 0
        model.removeAtom 0
        callback.callCount.should.equal 1
        model.removeAtom 0
        callback.callCount.should.equal 2
        model.removeAtom 0
        callback.callCount.should.equal 3

      describe "and there are connected radial bonds", ->

        beforeEach ->
          model.addRadialBond atom1: 0, atom2: 1, length: 1, strength: 1
          model.addRadialBond atom1: 1, atom2: 2, length: 2, strength: 2

        it "should also remove them", ->
          model.getNumberOfAtoms().should.equal 3
          model.getNumberOfRadialBonds().should.equal 2

          model.removeAtom 0

          model.getNumberOfAtoms().should.equal 2
          model.getNumberOfRadialBonds().should.equal 1

          # Note that indices of atoms should be shifter already.
          model.getRadialBondProperties(0).atom1.should.equal 0
          model.getRadialBondProperties(0).atom2.should.equal 1
          model.getRadialBondProperties(0).length.should.equal 2
          model.getRadialBondProperties(0).strength.should.equal 2

          model.removeAtom 0

          model.getNumberOfAtoms().should.equal 1
          model.getNumberOfRadialBonds().should.equal 0

        it "should also trigger 'removeRadialBond' event", ->
          callback = sinon.spy()
          model.on 'removeRadialBond', callback

          callback.callCount.should.equal 0
          model.removeAtom 0
          # Why? Radial bond should be also removed, see test above.
          callback.callCount.should.equal 1
          model.removeAtom 0
          callback.callCount.should.equal 2


        describe "and there are connected angular bonds", ->

          beforeEach ->
            # Add some atoms and radial bond to create two angular bonds.
            model.addAtom x: 4, y: 4 # idx = 3
            model.addAtom x: 5, y: 5 # idx = 4
            model.addAtom x: 6, y: 6 # idx = 5
            model.addRadialBond atom1: 1, atom2: 3, length: 3, strength: 3
            model.addRadialBond atom1: 3, atom2: 4, length: 4, strength: 4
            model.addRadialBond atom1: 3, atom2: 5, length: 5, strength: 5

            model.addAngularBond atom1: 0, atom2: 2, atom3: 1, angle: 1, strength: 1
            model.addAngularBond atom1: 1, atom2: 4, atom3: 3, angle: 2, strength: 2
            model.addAngularBond atom1: 4, atom2: 5, atom3: 3, angle: 3, strength: 3
            # Finally, atoms are connected like that:
            #   3 -- 5
            #  / \
            #  1  4
            # / \
            # 0  2
            # angular bonds are between 0-2-1, 1-4-3 and 4-5-3 (last atom is central).
            # Note that lengths and angles of radial and angular bonds are random
            # and doesn't match "picture" above. We are not testing physics here,
            # just correct behavior while adding and removing atoms.

          it "should also remove them", ->
              model.getNumberOfAtoms().should.equal 6
              model.getNumberOfRadialBonds().should.equal 5
              model.getNumberOfAngularBonds().should.equal 3

              model.removeAtom 0

              #   2 -- 4
              #  / \
              #  0  3
              #   \
              #    1

              model.getNumberOfAtoms().should.equal 5
              model.getNumberOfRadialBonds().should.equal 4
              model.getNumberOfAngularBonds().should.equal 2

              # Note that indices of atoms should be shifter already.
              model.getRadialBondProperties(0).atom1.should.equal 0
              model.getRadialBondProperties(0).atom2.should.equal 1
              model.getRadialBondProperties(0).length.should.equal 2
              model.getRadialBondProperties(0).strength.should.equal 2

              model.getRadialBondProperties(1).atom1.should.equal 0
              model.getRadialBondProperties(1).atom2.should.equal 2
              model.getRadialBondProperties(1).length.should.equal 3
              model.getRadialBondProperties(1).strength.should.equal 3

              model.getRadialBondProperties(2).atom1.should.equal 2
              model.getRadialBondProperties(2).atom2.should.equal 3
              model.getRadialBondProperties(2).length.should.equal 4
              model.getRadialBondProperties(2).strength.should.equal 4

              model.getRadialBondProperties(3).atom1.should.equal 2
              model.getRadialBondProperties(3).atom2.should.equal 4
              model.getRadialBondProperties(3).length.should.equal 5
              model.getRadialBondProperties(3).strength.should.equal 5

              model.getAngularBondProperties(0).atom1.should.equal 0
              model.getAngularBondProperties(0).atom2.should.equal 3
              model.getAngularBondProperties(0).atom3.should.equal 2
              model.getAngularBondProperties(0).angle.should.equal 2
              model.getAngularBondProperties(0).strength.should.equal 2

              model.getAngularBondProperties(1).atom1.should.equal 3
              model.getAngularBondProperties(1).atom2.should.equal 4
              model.getAngularBondProperties(1).atom3.should.equal 2
              model.getAngularBondProperties(1).angle.should.equal 3
              model.getAngularBondProperties(1).strength.should.equal 3

              model.removeAtom 0

              #   1 -- 3
              #    \
              #     2
              #
              #    0

              model.getNumberOfAtoms().should.equal 4
              model.getNumberOfRadialBonds().should.equal 2
              model.getNumberOfAngularBonds().should.equal 1

              model.getRadialBondProperties(0).atom1.should.equal 1
              model.getRadialBondProperties(0).atom2.should.equal 2
              model.getRadialBondProperties(0).length.should.equal 4
              model.getRadialBondProperties(0).strength.should.equal 4

              model.getRadialBondProperties(1).atom1.should.equal 1
              model.getRadialBondProperties(1).atom2.should.equal 3
              model.getRadialBondProperties(1).length.should.equal 5
              model.getRadialBondProperties(1).strength.should.equal 5

              model.getAngularBondProperties(0).atom1.should.equal 2
              model.getAngularBondProperties(0).atom2.should.equal 3
              model.getAngularBondProperties(0).atom3.should.equal 1
              model.getAngularBondProperties(0).angle.should.equal 3
              model.getAngularBondProperties(0).strength.should.equal 3

              model.removeAtom 1

              #       2
              #
              #     1
              #
              #    0

              model.getNumberOfAtoms().should.equal 3
              model.getNumberOfRadialBonds().should.equal 0
              model.getNumberOfAngularBonds().should.equal 0

            it "should also trigger 'removeAngularBond' event", ->
              callback = sinon.spy()
              model.on 'removeAngularBond', callback

              callback.callCount.should.equal 0
              model.removeAtom 0
              # Why? Angular bond should be also removed, see test above.
              callback.callCount.should.equal 1
              model.removeAtom 0
              callback.callCount.should.equal 2

        it "should trigger 'removeRadialBond' event if some radial bonds are removed", ->
          callback = sinon.spy()
          model.on 'removeRadialBond', callback

          callback.callCount.should.equal 0
          model.removeAtom 0
          # So, first radial bonds is removed.
          callback.callCount.should.equal 1
          model.removeAtom 0
          # Second radial bonds is removed.
          callback.callCount.should.equal 2
          model.removeAtom 0
          # There were no more radial bonds connected to this atom.
          callback.callCount.should.equal 2

    describe "and provided index doesn't match any atom", ->
      it "should fail and report an error", ->
        (-> model.removeAtom 3).should.throw()
        model.removeAtom 0
        model.removeAtom 0
        model.removeAtom 0
        model.getNumberOfAtoms().should.equal 0
        (-> model.removeAtom 0).should.throw()

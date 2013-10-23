helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

AtomTransition = requirejs 'models/md2d/models/atom-transition'
Model          = requirejs 'models/md2d/models/modeler'

###
  Note that this is quick tests of the AtomTransition subclass.
  Take a look at test/mocha/common/abstract-transition.coffee
  to find more detailed tests and usage of transitions.
###
describe "AtomTransition", ->
  describe "AtomTransition constructor", ->
    it "should exist", ->
      should.exist AtomTransition

  describe "instance of AtomTransition", ->
    # Instance of AtomTransition.
    t = null
    # MD2D model used for transitions.
    model = null

    before ->
      model = new Model {}
      # Add atom.
      model.addAtom {x: 1, y: 1}
      model.getNumberOfAtoms().should.eql 1
      t = new AtomTransition model
      t.id(0).ease("linear").duration(800).prop("x", 9)

    it "should modify atom properties when .process() is called", ->
      model.getAtomProperties(0).x.should.eql 1
      t.process(400)
      model.getAtomProperties(0).x.should.eql 5 # 1 + 400/800 * (9 - 1) = 5
      t.process(400)
      model.getAtomProperties(0).x.should.eql 9 # 1 + 800/800 * (9 - 1) = 9
      t.isFinished.should.be.true

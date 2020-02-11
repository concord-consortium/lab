/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();

const AtomTransition = requirejs('models/md2d/models/atom-transition');
const Model          = requirejs('models/md2d/models/modeler');

/*
  Note that this is quick tests of the AtomTransition subclass.
  Take a look at test/mocha/common/abstract-transition
  to find more detailed tests and usage of transitions.
*/
describe("AtomTransition", function() {
  describe("AtomTransition constructor", () => it("should exist", () => should.exist(AtomTransition)));

  return describe("instance of AtomTransition", function() {
    // Instance of AtomTransition.
    let t = null;
    // MD2D model used for transitions.
    let model = null;

    before(function() {
      model = new Model({});
      // Add atom.
      model.addAtom({x: 1, y: 1});
      model.getNumberOfAtoms().should.eql(1);
      t = new AtomTransition(model);
      return t.id(0).ease("linear").duration(800).prop("x", 9);
    });

    return it("should modify atom properties when .process() is called", function() {
      model.getAtomProperties(0).x.should.eql(1);
      t.process(400);
      model.getAtomProperties(0).x.should.eql(5); // 1 + 400/800 * (9 - 1) = 5
      t.process(400);
      model.getAtomProperties(0).x.should.eql(9); // 1 + 800/800 * (9 - 1) = 9
      return t.isFinished.should.be.true;
    });
  });
});

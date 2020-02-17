import AtomTransition from "../../../src/lab/models/md2d/models/atom-transition";
import Model from "../../../src/lab/models/md2d/models/modeler";

/*
  Note that this is quick tests of the AtomTransition subclass.
  Take a look at test/mocha/common/abstract-transition
  to find more detailed tests and usage of transitions.
*/
describe("AtomTransition", function () {
  describe("AtomTransition constructor", () => {
    it("should exist", () => {
      should.exist(AtomTransition);
    });
  });

  describe("instance of AtomTransition", function () {
    // Instance of AtomTransition.
    let t = null;
    // MD2D model used for transitions.
    let model = null;

    beforeAll(function () {
      model = new Model({});
      // Add atom.
      model.addAtom({x: 1, y: 1});
      model.getNumberOfAtoms().should.eql(1);
      t = new AtomTransition(model);
      t.id(0).ease("linear").duration(800).prop("x", 9);
    });

    it("should modify atom properties when .process() is called", function () {
      model.getAtomProperties(0).x.should.eql(1);
      t.process(400);
      model.getAtomProperties(0).x.should.eql(5); // 1 + 400/800 * (9 - 1) = 5
      t.process(400);
      model.getAtomProperties(0).x.should.eql(9); // 1 + 800/800 * (9 - 1) = 9
      t.isFinished.should.be.true;
    });
  });
});

/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();

const Model = requirejs('models/md2d/models/modeler');

describe("MD2D modeler", function() {
  let model = null;
  const callbacks = null;

  beforeEach(() => // Use {} as an empty model definition. Default values will be used.
  // See: md2d/models/metadata.js
  model = new Model({}));

  it("should deserialize electric fields correctly", function() {
    // Electric fields data.
    const data = {
        intensity: [1, 1.5],
        orientation: ["N", "E"]
      };

    model.createElectricFields(data);
    model.getNumberOfElectricFields().should.equal(2);
    let efData = model.getElectricFieldProperties(0);
    efData.intensity.should.equal(data.intensity[0]);
    efData.orientation.should.equal(data.orientation[0]);

    efData = model.getElectricFieldProperties(1);
    efData.intensity.should.equal(data.intensity[1]);
    return efData.orientation.should.equal(data.orientation[1]);
});

  describe("when addElectricField() is called", function() {
    it("should add a electric field", function() {
      const data = {
        intensity: 1,
        orientation: "N"
      };

      model.addElectricField(data);

      model.getNumberOfElectricFields().should.equal(1);
      const efData = model.getElectricFieldProperties(0);
      efData.intensity.should.equal(data.intensity);
      return efData.orientation.should.equal(data.orientation);
    });

    return it("should trigger 'addElectricField' event", function() {
      const callback = sinon.spy();
      model.on('addElectricField', callback);

      callback.callCount.should.equal(0);
      model.addElectricField({intensity: 1, orientation: "N"});
      return callback.callCount.should.equal(1);
    });
  });

  describe("when setElectricFieldProperties() is called", function() {
    beforeEach(() => model.addElectricField({intensity: 1, orientation: "N"}));

    it("should update electric field properties", function() {
      model.getElectricFieldProperties(0).intensity.should.equal(1);
      model.getElectricFieldProperties(0).orientation.should.equal("N");
      model.setElectricFieldProperties(0, {intensity: 2, orientation: "E"});
      model.getElectricFieldProperties(0).intensity.should.equal(2);
      return model.getElectricFieldProperties(0).orientation.should.equal("E");
    });

    return it("should trigger 'changeElectricField' event", function() {
      const callback = sinon.spy();
      model.on('changeElectricField', callback);

      callback.callCount.should.equal(0);
      model.setElectricFieldProperties(0, {intensity: 1, orientation: "N"});
      return callback.callCount.should.equal(1);
    });
  });

  describe("when removeElectricField() is called", function() {

    beforeEach(function() {
      model.addElectricField({intensity: 1, orientation: "N"}); // idx = 0
      model.addElectricField({intensity: 2, orientation: "S"}); // idx = 1
      return model.addElectricField({intensity: 3, orientation: "E"});
    }); // idx = 2

    describe("and provided index matches some electric field", function() {
      it("should remove it", function() {
        model.getNumberOfElectricFields().should.equal(3);
        model.removeElectricField(0);
        model.getNumberOfElectricFields().should.equal(2);
        model.removeElectricField(0);
        model.getNumberOfElectricFields().should.equal(1);
        model.removeElectricField(0);
        return model.getNumberOfElectricFields().should.equal(0);
      });

      it("should shift other, remaining electric fields properties", function() {
        model.removeElectricField(1);
        model.getNumberOfElectricFields().should.equal(2);
        // Remaining obstacles.
        model.getElectricFieldProperties(0).intensity.should.equal(1);
        model.getElectricFieldProperties(0).orientation.should.equal("N");
        model.getElectricFieldProperties(1).intensity.should.equal(3);
        return model.getElectricFieldProperties(1).orientation.should.equal("E");
      });

      return it("should trigger 'removeElectricField' event", function() {
        const callback = sinon.spy();
        model.on('removeElectricField', callback);

        callback.callCount.should.equal(0);
        model.removeElectricField(0);
        callback.callCount.should.equal(1);
        model.removeElectricField(0);
        callback.callCount.should.equal(2);
        model.removeElectricField(0);
        return callback.callCount.should.equal(3);
      });
    });

    return describe("and provided index doesn't match any electric field", () => it("should fail and report an error", function() {
      ((() => model.removeElectricField(3))).should.throw();
      model.removeElectricField(0);
      model.removeElectricField(0);
      model.removeElectricField(0);
      model.getNumberOfElectricFields().should.equal(0);
      return ((() => model.removeElectricField(0))).should.throw();
    }));
  });


  return describe("when shape with electric field is removed", function() {

      beforeEach(function() {
        model.addShape({type: "rectangle", x: 0, y: 0, width: 5, height: 5});
        model.addShape({type: "rectangle", x: 5, y: 0, width: 5, height: 5});

        model.addElectricField({intensity: 1, orientation: "N", shapeIdx: 0}); // idx = 0
        model.addElectricField({intensity: 2, orientation: "S", shapeIdx: 1}); // idx = 1
        return model.addElectricField({intensity: 3, orientation: "E", shapeIdx: null});
      }); // idx = 2

      it("electric field should be also removed", function() {
        model.getNumberOfShapes().should.equal(2);
        model.getNumberOfElectricFields().should.equal(3);

        model.removeShape(0);

        model.getNumberOfShapes().should.equal(1);
        model.getNumberOfElectricFields().should.equal(2);

        // Note that indices of atoms should be shifter already.
        model.getElectricFieldProperties(0).intensity.should.equal(2);
        model.getElectricFieldProperties(0).orientation.should.equal("S");
        // Index of shape should be updated too!
        model.getElectricFieldProperties(0).shapeIdx.should.equal(0);

        model.removeShape(0);

        model.getNumberOfShapes().should.equal(0);
        model.getNumberOfElectricFields().should.equal(1);

        // Note that indices of atoms should be shifter already.
        model.getElectricFieldProperties(0).intensity.should.equal(3);
        model.getElectricFieldProperties(0).orientation.should.equal("E");
        return should.equal(model.getElectricFieldProperties(0).shapeIdx, null);
      });


      return it("should also trigger 'removeElectricField' event", function() {
        const callback = sinon.spy();
        model.on('removeElectricField', callback);

        callback.callCount.should.equal(0);
        model.removeShape(0);
        // Why? Electric field should be also removed, see test above.
        callback.callCount.should.equal(1);
        model.removeShape(0);
        return callback.callCount.should.equal(2);
      });
  });
});

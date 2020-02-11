/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();

const Model = requirejs('models/md2d/models/modeler');

describe("MD2D modeler with Quantum Dynamics plugin", function() {
  let model = null;
  const callbacks = null;

  describe("when using quantum dynamics", function() {
    beforeEach(() => model = new Model({
      quantumDynamics: {}
    }));

    it("should have useQuantumDynamics = true", () => model.properties.useQuantumDynamics.should.eql(true));

    it("should not have a 'quantumDynamics' property", () => should.not.exist(model.properties.quantumDynamics));

    it("should have an excitation table with default of zero", function() {
      // Atoms data.
      const data = {
        x: [1, 1],
        y: [1, 1]
      };

      model.createAtoms(data);

      const atomData = model.getAtomProperties(0);

      should.exist(atomData.excitation);
      return atomData.excitation.should.equal(0);
    });

    it("should read excitation and deserialize correctly", function() {
      // Atoms data.
      const data = {
        x: [1, 1],
        y: [1, 1],
        excitation: [0, 1]
      };

      model.createAtoms(data);

      let atomData = model.getAtomProperties(0);
      atomData.excitation.should.equal(data.excitation[0]);

      atomData = model.getAtomProperties(1);
      return atomData.excitation.should.equal(data.excitation[1]);
  });

    return describe("serialization", function() {
      it("should include excitation values in the atoms table", function() {
        const data = {
          x: [1, 1],
          y: [1, 1],
          excitation: [0, 1]
        };

        model.createAtoms(data);

        const {
          excitation
        } = model.serialize().atoms;

        should.exist(excitation);
        return excitation.should.eql([0, 1]);
    });

      it("should include a quantumDynamics stanza", function() {
        const {
          quantumDynamics
        } = model.serialize();
        return should.exist(quantumDynamics);
      });

      return describe("of photons", function() {
        describe("when there are no photons", function() {
          beforeEach(function() {
            const data = {
              x: [1, 1],
              y: [1, 1],
              excitation: [0, 1]
            };
            return model.createAtoms(data);
          });

          return it("should still have a photons object", function() {
            const {
              photons
            } = model.serialize().quantumDynamics;
            return should.exist(photons);
          });
        });

        describe("when there are photons", function() {
          beforeEach(() => model = new Model({
            quantumDynamics: {
              photons: {
                x: [0],
                y: [1],
                vx: [2],
                vy: [3],
                angularFrequency: [4]
              }
            }
          }));

          return it("should have a photons array with data for the photons", function() {
            const {
              photons
            } = model.serialize().quantumDynamics;

            return photons.should.eql({
              x: [0],
              y: [1],
              vx: [2],
              vy: [3],
              angularFrequency: [4]
            });
        });
      });

        return describe("when there are entries in the photons table that have no velocity", function() {
          beforeEach(() => model = new Model({
            quantumDynamics: {
              photons: {
                x: [0, 0, 0],
                y: [1, 1, 1],
                vx: [2, 0, 0],
                vy: [3, 0, 3],
                angularFrequency: [4, 4, 4]
              }
            }
          }));

          return it("should omit the non-moving photons from the array", function() {
            const {
              photons
            } = model.serialize().quantumDynamics;

            return photons.should.eql({
              x: [0, 0],
              y: [1, 1],
              vx: [2, 0],
              vy: [3, 3],
              angularFrequency: [4, 4]
            });
        });
      });
    });
  });
});


  return describe("when not using quantum dynamics", function() {
    beforeEach(() => model = new Model({
      quantumDynamics: null
    }));

    it("should not allow excitation to be set", function() {
      // Atoms data.
      const data = {
        x: [1, 1],
        y: [1, 1],
        excitation: [0, 1]
      };

      return ((() => model.createAtoms(data))).should.throw(TypeError);
    });

    return it("should not have an excitation table", function() {
      // Atoms data.
      const data = {
        x: [1, 1],
        y: [1, 1]
      };

      model.createAtoms(data);

      const atomData = model.getAtomProperties(0);
      return should.not.exist(atomData.excitation);
    });
  });
});

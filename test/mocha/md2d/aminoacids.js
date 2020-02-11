/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();

const Model      = requirejs('models/md2d/models/modeler');
const aminoacids = requirejs('models/md2d/models/aminoacids-props');

describe("MD2D modeler", function() {
  let model = null;

  beforeEach(() => // Use {} as an empty model definition. Default values will be used.
  // See: md2d/models/metadata.js
  model = new Model({}));

  return it("should create elements representing amino acids", function() {
    // 5 editable elements + 20 amino acids.
    model.getNumberOfElements().should.eql(25);

    const checkAminoAcid = function(id) {
      const el = model.getElementProperties(id);
      const i = id - 5;
      // Note that sigma is calculated using Classic MW approach.
      // See: org.concord.mw2d.models.AminoAcidAdapter
      // Basic length unit in Classic MW is 0.1 Angstrom, do conversion.
      const expectedSigma = 0.01 * 18 * Math.pow(aminoacids[i].volume / aminoacids[0].volume, 0.3333333333333);
      const expectedMass = aminoacids[i].molWeight;
      // Epsilon should have default value.
      const expectedEpsilon = -0.1;
      // Floating point errors.
      const acceptedErr = 1e-5;

      Math.abs(el.sigma - expectedSigma).should.be.below(acceptedErr);
      Math.abs(el.mass - expectedMass).should.below(acceptedErr);
      return Math.abs(el.epsilon - expectedEpsilon).should.below(acceptedErr);
    };

    return (() => {
      const result = [];
      for (let i = 5; i <= 24; i++) {
        result.push(checkAminoAcid(i));
      }
      return result;
    })();
});
});

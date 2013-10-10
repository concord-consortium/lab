helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

Model      = requirejs 'models/md2d/models/modeler'
aminoacids = requirejs 'models/md2d/models/aminoacids-props'

describe "MD2D modeler", ->
  model = null

  beforeEach ->
    # Use {} as an empty model definition. Default values will be used.
    # See: md2d/models/metadata.js
    model = new Model {}

  it "should create elements representing amino acids", ->
    # 5 editable elements + 20 amino acids.
    model.getNumberOfElements().should.eql 25

    checkAminoAcid = (id) ->
      el = model.getElementProperties(id)
      i = id - 5
      # Note that sigma is calculated using Classic MW approach.
      # See: org.concord.mw2d.models.AminoAcidAdapter
      # Basic length unit in Classic MW is 0.1 Angstrom, do conversion.
      expectedSigma = 0.01 * 18 * Math.pow aminoacids[i].volume / aminoacids[0].volume, 0.3333333333333
      expectedMass = aminoacids[i].molWeight
      # Epsilon should have default value.
      expectedEpsilon = -0.1
      # Floating point errors.
      acceptedErr = 1e-5

      Math.abs(el.sigma - expectedSigma).should.be.below acceptedErr
      Math.abs(el.mass - expectedMass).should.below acceptedErr
      Math.abs(el.epsilon - expectedEpsilon).should.below acceptedErr

    checkAminoAcid i for i in [5..24]

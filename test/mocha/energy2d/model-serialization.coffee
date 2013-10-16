fs      = require 'fs'
assert  = require 'assert'
helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

Model      = requirejs 'models/energy2d/modeler'
arrayTypes = requirejs 'common/array-types'

describe "Energy2D modeler deserialization and serialization", ->
  path = './test/fixtures/e2d-conversion'

  before ->
    # Overwrite default float arrays type. It's required, as when Float32Array is used,
    # there are some numerical errors involved, which cause that serialize-deserialize
    # tests fail.
    arrayTypes.floatType = "Float64Array"

  compareVertices = (org, ser) ->
    org = org.split(", ")
    ser = ser.split(", ")
    for i in [0...org.length]
      assert.equal Number(ser[i]), Number(org[i])


  it "an instantiated E2D model should match original serialization", ->
    inputFiles = fs.readdirSync path

    for inputFile in inputFiles
      originalModelJSON = fs.readFileSync("#{path}/#{inputFile}").toString()
      originalModel = JSON.parse originalModelJSON

      model = new Model originalModel
      serializedModel = model.serialize()

      # Test polygons' vertices string separately, due to different possible
      # rounding of numbers (e.g. 5 vs 5.0).
      if originalModel.structure? and originalModel.structure.part?
        originalModel.structure.part.forEach (p, i) ->
          if p.shapeType == "polygon"
            compareVertices p.vertices, serializedModel.structure.part[i].vertices
            delete p.vertices
            delete serializedModel.structure.part[i].vertices

      # Basic test of the rest of the models.
      assert.deepEqual serializedModel, originalModel,
        "\n===> the serialized object:\n#{JSON.stringify(serializedModel, null, 2)}
         \n===> the original object used to create the E2D model:\n#{JSON.stringify(originalModel, null, 2)}
         \n\nThe serialized object does not match the original object used to create the E2D model: #{path}/#{inputFile}"

    return

fs      = require 'fs'
assert  = require 'assert'
helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

Model      = requirejs 'models/energy2d/modeler'
arrayTypes = requirejs 'common/array-types'

modelJSON =
  "timeStep": 1
  "model_width": 10
  "model_height": 10
  "structure":
    "part": [
      "shapeType": "rectangle",
      "x": 1
      "y": 2
      "width": 3
      "height": 4
      "temperature": 5
    ]
  "sensors": [
      "type": "thermometer"
      "x": 1
      "y": 2
    ,
      "type": "anemometer"
      "x": 1
      "y": 2
      "angle": 90
  ]


describe "Energy2D modeler serialization after changes", ->
  model = null
  orgJSON = null

  before ->
    model = new Model modelJSON
    orgJSON = model.serialize()

  it "top-level property change should be reflected in a serialized model", ->
    model.properties.timeStep = orgJSON.timeStep = 1

    model.serialize().should.eql orgJSON

  it "parts' properties changes should be reflected in a serialized model", ->
    p = model.getPartsArray()

    p[0].x = orgJSON.structure.part[0].x = 3
    p[0].y = orgJSON.structure.part[0].y = 5
    p[0].width = orgJSON.structure.part[0].width = 2
    p[0].height = orgJSON.structure.part[0].height = 2
    p[0].temperature = orgJSON.structure.part[0].temperature = 15

    model.serialize().should.eql orgJSON

  it "sensors' properties changes should be reflected in a serialized model", ->
    s = model.getSensorsArray()

    s[0].x = orgJSON.sensors[0].x = 3
    s[1].y = orgJSON.sensors[1].y = 7

    model.serialize().should.eql orgJSON

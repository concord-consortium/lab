/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs      = require('fs');
const assert  = require('assert');
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();

const Model      = requirejs('models/energy2d/modeler');
const arrayTypes = requirejs('common/array-types');

const modelJSON = {
  "timeStep": 1,
  "model_width": 10,
  "model_height": 10,
  "structure": {
    "part": [{
      "shapeType": "rectangle",
      "x": 1,
      "y": 2,
      "width": 3,
      "height": 4,
      "temperature": 5
    }
    ]
  },
  "sensors": [{
      "type": "thermometer",
      "x": 1,
      "y": 2
    }
    , {
      "type": "anemometer",
      "x": 1,
      "y": 2,
      "angle": 90
    }
  ]
};


describe("Energy2D modeler serialization after changes", function() {
  let model = null;
  let orgJSON = null;

  before(function() {
    model = new Model(modelJSON);
    return orgJSON = model.serialize();
  });

  it("top-level property change should be reflected in a serialized model", function() {
    model.properties.timeStep = (orgJSON.timeStep = 1);

    return model.serialize().should.eql(orgJSON);
  });

  it("parts' properties changes should be reflected in a serialized model", function() {
    const p = model.getPartsArray();

    p[0].x = (orgJSON.structure.part[0].x = 3);
    p[0].y = (orgJSON.structure.part[0].y = 5);
    p[0].width = (orgJSON.structure.part[0].width = 2);
    p[0].height = (orgJSON.structure.part[0].height = 2);
    p[0].temperature = (orgJSON.structure.part[0].temperature = 15);

    return model.serialize().should.eql(orgJSON);
  });

  return it("sensors' properties changes should be reflected in a serialized model", function() {
    const s = model.getSensorsArray();

    s[0].x = (orgJSON.sensors[0].x = 3);
    s[1].y = (orgJSON.sensors[1].y = 7);

    return model.serialize().should.eql(orgJSON);
  });
});

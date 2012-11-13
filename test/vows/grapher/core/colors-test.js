require("../../../env");

var requirejs = require('requirejs'),
    config    = require('../../../requirejs-config'),
    vows = require("vows"),
    assert = require("assert");

// Use Lab RequireJS configuration.
requirejs.config(config.labConfig);

requirejs([
  'grapher/core/colors'
], function (colors) {

  var suite = vows.describe("grapher/core/colors");

  suite.addBatch({
    "colors": {
      topic: function() {
        return colors;
      },
      "returns six char hex color string from name": function(colors) {
        assert.equal(colors('bright_red'), '#ff0000');
      }
    }
  });

  suite.export(module);
});

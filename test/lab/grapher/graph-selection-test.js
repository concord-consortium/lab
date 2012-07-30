/*globals grapher*/

require("../../env");
require("../../../server/public/lab/lab.grapher");
require("../../../server/public/lab/lab.layout");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("Lab grapher selection features");

function getBaseGraph() {
  return grapher.graph( $('<div>').width(500).height(500)[0] );
}

suite.addBatch({

  "initially": {
    topic: function() {
      return getBaseGraph();
    },

    "has_selection property": {
      topic: function(graph) {
        return graph.has_selection();
      },
      "should be false": function(topic) {
        assert.strictEqual( topic, false );
      }
    }
  },

  "when selection domain is set to null": {
    topic: function() {
      return getBaseGraph().selection_domain(null);
    },
    "has_selection property": {
      topic: function(graph) {
        return graph.has_selection();
      },
      "should be false": function(topic) {
        assert.strictEqual( topic, false );
      }
    }
  },

  "when selection domain is set to []": {
    topic: function() {
      return getBaseGraph().selection_domain([]);
    },
    "has_selection property": {
      topic: function(graph) {
        return graph.has_selection();
      },
      "should be true": function(topic) {
        assert.strictEqual( topic, true );
      }
    },
    "selection domain": {
      topic: function(graph) {
        return graph.selection_domain();
      },
      "should be []": function(topic) {
        assert.deepEqual( topic, [] );
      }
    }
  },

  "when selection domain is set to [1, 2]": {
    topic: function() {
      return getBaseGraph().selection_domain([1, 2]);
    },
    "has_selection property": {
      topic: function(graph) {
        return graph.has_selection();
      },
      "should be true": function(topic) {
        assert.strictEqual( topic, true );
      }
    },
    "selection domain": {
      topic: function(graph) {
        return graph.selection_domain();
      },
      "should be [1, 2]": function(topic) {
        assert.deepEqual( topic, [1,2] );
      }
    }
  },

  "when selection_visible is true": {
    topic: function() {
      return function() {
        return getBaseGraph().selection_visible(true);
      };
    },

    "and has_selection is true": {
      topic: function(getTopicGraph) {
        return function() {
          return getTopicGraph().selection_domain([1,2]);
        };
      },

      "the brush element": {
        topic: function(getTopicGraph) {
          return getTopicGraph().elem.select('.brush');
        },
        "should be visible": function(topic) {
          assert.equal( topic.style('display'), 'inline' );
        }
      },

      "and has_selection subsequently becomes false": {
        topic: function(getTopicGraph) {
          return function() {
            return getTopicGraph().selection_domain(null);
          };
        },
        "the brush element": {
          topic: function(getTopicGraph) {
            return getTopicGraph().elem.select('.brush');
          },
          "should not be visible": function(topic) {
            assert.equal( topic.style('display'), 'none' );
          }
        }
      },

      "and selection_visible subsequently becomes false": {
        topic: function(getTopicGraph) {
          return function() {
            return getTopicGraph().selection_visible(false);
          };
        },
        "the brush element": {
          topic: function(getTopicGraph) {
            return getTopicGraph().elem.select('.brush');
          },
          "should not be visible": function(topic) {
            assert.equal( topic.style('display'), 'none' );
          }
        }
      }
    }
  }

});

suite.export(module);
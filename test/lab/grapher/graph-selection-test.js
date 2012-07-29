/*globals grapher*/

require("../../env");
require("../../../server/public/lab/lab.grapher");
require("../../../server/public/lab/lab.layout");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("Lab grapher selection features");

suite.addBatch({

  "graph": {
    topic: function() {
      // make a fresh graph for each test...
      return function() {
        return grapher.graph( $('<div>').width(500).height(500)[0] );
      }
    },

    "when selection domain is set to null": {
      topic: function(getGraph) {
        var graph = getGraph();
        graph.selection_domain(null);
        return graph;
      },
      "has_selection property": {
        topic: function(graph) {
          return graph.has_selection();
        },
        "should be false": function(topic) {
          assert.strictEqual( topic, false );
        }
      },
      "selection domain": {
        topic: function(graph) {
          return graph.selection_domain();
        },
        "should be [-Infinity, Infinity]": function(topic) {
          assert.deepEqual( topic, [-Infinity, Infinity] );
        }
      }
    },

    "when selection domain is set to []": {
      topic: function(getGraph) {
        var graph = getGraph();
        graph.selection_domain([]);
        return graph;
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
      topic: function(getGraph) {
        var graph = getGraph();
        graph.selection_domain([1, 2]);
        return graph;
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
    }
  }

});

suite.export(module);
/*globals grapher*/

require("../../env");
require("../../../server/public/lab/lab.grapher");
require("../../../server/public/lab/lab.layout");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("Lab grapher selection features");

function getBaseGraph() {
  return grapher.graph( $('<div>').width(500).height(500)[0] ).xmin(0).xmax(10);
}

function graphWithBrushUpdateEvent(graph, extent) {
  graph.brush_control().extent(extent);
  graph.brush_listener()();
  return graph;
}

function graphWithBrushClearEvent(graph) {
  graph.brush_control().clear();
  graph.brush_listener()();
  return graph;
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

    "selection_enabled property": {
      topic: function(getTopicGraph) {
        return getTopicGraph().selection_enabled();
      },

      "should be true": function(topic) {
        assert.strictEqual( topic, true );
      }
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
        },

        "should allow pointer-events": function(topic) {
          assert.equal( topic.style('pointer-events'), 'all' );
        }
      },

      "the brush control": {
        topic: function(getTopicGraph) {
          return getTopicGraph().brush_control();
        },
        "should listen for brush events": function(topic) {
          assert.isFunction( topic.on('brush') );
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
      },

      "and selection_enabled subsequently becomes false": {
        topic: function(getTopicGraph) {
          return function() {
            return getTopicGraph().selection_enabled(false);
          };
        },
        "the brush element": {
          topic: function(getTopicGraph) {
            return getTopicGraph().elem.select('.brush');
          },
          "should be visible": function(topic) {
            assert.equal( topic.style('display'), 'inline' );
          },
          "should not allow pointer-events": function(topic) {
            assert.equal( topic.style('pointer-events'), 'none' );
          }
        },

        "and selection_enabled subsequently becomes true again": {
          topic: function(getTopicGraph) {
            return function() {
              return getTopicGraph().selection_enabled(true);
            };
          },
          "the brush element": {
            topic: function(getTopicGraph) {
              return getTopicGraph().elem.select('.brush');
            },
            "should be visible": function(topic) {
              assert.equal( topic.style('display'), 'inline' );
            },
            "should allow pointer-events": function(topic) {
              assert.equal( topic.style('pointer-events'), 'all' );
            }
          }
        }
      }
    },

    "and the selection domain is set to [15, 16]": {
      topic: function(getTopicGraph) {
        return function() {
          return getTopicGraph().selection_domain([15, 16]);
        };
      },

      "the brush control's extent": {
        topic: function(getTopicGraph) {
          return getTopicGraph().brush_control().extent();
        },
        "should be [15, 16]": function(topic) {
          assert.deepEqual( topic, [15, 16] );
        }
      },

      "and the selection domain is programmatically updated to [10, 12]": {
        topic: function(getTopicGraph) {
          return function() {
            return getTopicGraph().selection_domain([10, 12]);
          };
        },

        "the brush control's extent": {
          topic: function(getTopicGraph) {
            return getTopicGraph().brush_control().extent();
          },
          "should update to [10, 12]": function(topic) {
            assert.deepEqual( topic, [10, 12] );
          }
        }

        // Note, unfortunately, that you can't directly test for correct updating of element width
        // using jsdom.
      },

      "and a brush event is fired, with brush extent [11, 13]": {
        topic: function(getTopicGraph) {
          return function() {
            return graphWithBrushUpdateEvent(getTopicGraph(), [11, 13]);
          };
        },

        "the selection domain": {
          topic: function(getTopicGraph) {
            return getTopicGraph().selection_domain();
          },
          "should be updated to [11, 13]": function(topic) {
            assert.deepEqual( topic, [11, 13] );
          }
        }
      },

      "and a brush event is fired, with the brush extent cleared": {
        topic: function(getTopicGraph) {
          return function() {
            return graphWithBrushClearEvent(getTopicGraph());
          };
        },

        "the selection domain": {
          topic: function(getTopicGraph) {
            return getTopicGraph().selection_domain();
          },
          "should be updated to []": function(topic) {
            assert.deepEqual( topic, [] );
          }
        }
      },

      "with selection_enabled set to false": {
        topic: function(getTopicGraph) {
          return function() {
            return getTopicGraph().selection_enabled(false);
          };
        },
        "and a brush event is fired, with brush extent [11, 13]": {
          topic: function(getTopicGraph) {
            return function() {
              return graphWithBrushUpdateEvent(getTopicGraph(), [11, 13]);
            };
          },

          "the selection domain": {
            topic: function(getTopicGraph) {
              return getTopicGraph().selection_domain();
            },
            "should remain [15, 16]": function(topic) {
              assert.deepEqual( topic, [15, 16] );
            }
          }
        }
      }
    }
  },

  "when the graph is initialized": {
    topic: function() {
      return function() {
        return getBaseGraph().selection_visible(false);
      };
    },

    "and the selection domain is [15, 16]": {
      topic: function(getTopicGraph) {
        return function() {
          return getTopicGraph().selection_domain([15, 16]);
        };
      },

      "the selection_visible property": {
        topic: function(getTopicGraph) {
          return getTopicGraph().selection_visible();
        },
        "is false": function(topic) {
          assert.strictEqual( topic, false );
        }
      },

      "the brush control": {
        topic: function(getTopicGraph) {
          // Topics that return undefined (equivalently, that don't return a value)
          // must use this.callback to pass the topic to vows.
          // Additionally, the first argument to this.callback indicates whether
          // an error was thrown by the topic function and therefore must be null
          // see https://github.com/cloudhead/vows/issues/187

          this.callback( null, getTopicGraph().brush_control() );
        },
        "should not yet be defined": function(topic) {
          assert.isUndefined( topic );
        }
      },

      "when selection_visible does become true": {
        topic: function(getTopicGraph) {
          return function() {
            return getTopicGraph().selection_visible(true);
          };
        },

        "the brush control's extent": {
          topic: function(getTopicGraph) {
            return getTopicGraph().brush_control().extent();
          },
          "should be [15, 16]": function(topic) {
            assert.deepEqual( topic, [15, 16] );
          }
        }
      }
    }
  }

});

suite.export(module);
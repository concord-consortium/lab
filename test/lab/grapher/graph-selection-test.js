/*globals grapher, $ */

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

// FIXME the pattern of tests used in Lab currently creates problems because tests are interdependent.
// See https://groups.google.com/forum/?fromgroups=#!searchin/lab-models/isolate/lab-models/-wCu-xISJN8/jTAFsN4BoBAJ

// When this problem is fixed, uncomment the test below:

suite.addBatch({

  "initially": {
    topic: function() {
      return getBaseGraph();
    },

    "the has_selection property": {
      topic: function(graph) {
        return graph.has_selection();
      },
      "should be false": function(topic) {
        assert.strictEqual( topic, false );
      }
    },

    "the selection domain": {
      topic: function(graph) {
        return graph.selection_domain();
      },
      "should be null": function(topic) {
        assert.strictEqual( topic, null );
      }
    },

    "the selection_visible property": {
      topic: function(graph) {
        return graph.selection_visible();
      },
      "should be false": function(topic) {
        assert.strictEqual( topic, false );
      }
    },

    "the selection_enabled property": {
      topic: function(graph) {
        return graph.selection_enabled();
      },
      "should be true": function(topic) {
        assert.strictEqual( topic, true );
      }
    }
  },

  "when selection domain is set to null, for \"no selection\"": {
    topic: function() {
      return getBaseGraph().selection_domain(null);
    },
    "the has_selection property": {
      topic: function(graph) {
        return graph.has_selection();
      },
      "should be false": function(topic) {
        assert.strictEqual( topic, false );
      }
    },
    "the selection domain": {
      topic: function(graph) {
        return graph.selection_domain();
      },
      "should be null": function(topic) {
        assert.strictEqual( topic, null );
      }
    }
  },

  "when selection domain is set to [], for \"empty selection\"": {
    topic: function() {
      return getBaseGraph().selection_domain([]);
    },
    "the has_selection property": {
      topic: function(graph) {
        return graph.has_selection();
      },
      "should be true": function(topic) {
        assert.strictEqual( topic, true );
      }
    },
    "the selection domain": {
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
    "the has_selection property": {
      topic: function(graph) {
        return graph.has_selection();
      },
      "should be true": function(topic) {
        assert.strictEqual( topic, true );
      }
    },
    "the selection domain": {
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
      // This topic is a *function* that creates a graph (with a particular setup), so that each
      // subtopic can create an independent graph instance which inherits the setup defined by this
      // topic. (Without doing this, all subtopics and would mutate a single graph instance set up
      // by this topic, which leads to chaos, not to mention incorrect test results.)
      return function() {
        return getBaseGraph().selection_visible(true);
      };
    },

    "the selection_enabled property": {
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

      "the d3 brush control": {
        topic: function(getTopicGraph) {
          return getTopicGraph().brush_control();
        },
        "should listen for d3 brush events": function(topic) {
          assert.isFunction( topic.on('brush') );
        }
      },

      "and when has_selection subsequently becomes false": {
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

      "and when selection_visible subsequently becomes false": {
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

      "and when selection_enabled subsequently becomes false": {
        topic: function(getTopicGraph) {
          return function() {
            return getTopicGraph().selection_enabled(false);
          };
        },
        "the brush element": {
          topic: function(getTopicGraph) {
            return getTopicGraph().elem.select('.brush');
          },
          "should not be visible": function(topic) {
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
        return function(cb) {
          var graph = getTopicGraph().selection_domain([15, 16]);
          // allow topics to pass this.callback to getTopicGraph, and allow the vows
          // to see the arguments passed to the selection_listener, by making sure
          // to add null as the 'error' argument to this.callback
          if (cb) {
            graph.selection_listener(function cb2() {
              var args = [].splice.call(arguments, 0);
              cb.apply(null, [null].concat(args) );
            });
          }
          return graph;
        };
      },

      "the d3 brush control's extent": {
        topic: function(getTopicGraph) {
          return getTopicGraph().brush_control().extent();
        },
        "should be [15, 16]": function(topic) {
          assert.deepEqual( topic, [15, 16] );
        }
      },

      "and when the selection domain is programmatically updated to [10, 12]": {
        topic: function(getTopicGraph) {
          return function(cb) {
            return getTopicGraph(cb).selection_domain([10, 12]);
          };
        },

        "the d3 brush control's extent": {
          topic: function(getTopicGraph) {
            return getTopicGraph().brush_control().extent();
          },
          "should update to [10, 12]": function(topic) {
            assert.deepEqual( topic, [10, 12] );
          }
        },

        "the selection listener": {
          topic: function(getTopicGraph) {
            getTopicGraph(this.callback);
          },
          "should be called back with [10, 12]": function(domain) {
            assert.deepEqual( domain, [10, 12] );
          }
        }

        // Note, unfortunately, that you can't directly test for correct updating of element width
        // using jsdom.
      },

      "and when the selection domain is programmatically updated to null": {
        topic: function(getTopicGraph) {
          return function(cb) {
            return getTopicGraph(cb).selection_domain(null);
          };
        },

        "the selection listener": {
          topic: function(getTopicGraph) {
            getTopicGraph(this.callback);
          },
          "should be called back with null": function(domain) {
            assert.strictEqual( domain, null );
          }
        }

        // Note, unfortunately, that you can't directly test for correct updating of element width
        // using jsdom.
      },

      "and a brush event is fired, with brush extent [11, 13]": {
        topic: function(getTopicGraph) {
          return function(cb) {
            return graphWithBrushUpdateEvent(getTopicGraph(cb), [11, 13]);
          };
        },

        "the selection domain": {
          topic: function(getTopicGraph) {
            return getTopicGraph().selection_domain();
          },
          "should update to [11, 13]": function(topic) {
            assert.deepEqual( topic, [11, 13] );
          }
        },

        "the selection listener": {
          topic: function(getTopicGraph) {
            getTopicGraph(this.callback);
          },
          "should be called back with [11, 13]": function(domain) {
            assert.deepEqual( domain, [11, 13] );
          }
        }
      },

      "and a brush event is fired, with the brush extent cleared": {
        topic: function(getTopicGraph) {
          return function(cb) {
            return graphWithBrushClearEvent(getTopicGraph(cb));
          };
        },

        "the selection domain": {
          topic: function(getTopicGraph) {
            return getTopicGraph().selection_domain();
          },
          "should be updated to []": function(topic) {
            assert.deepEqual( topic, [] );
          }
        },

        "the selection listener": {
          topic: function(getTopicGraph) {
            getTopicGraph(this.callback);
          },
          "should be called back with []": function(domain) {
            assert.deepEqual( domain, [] );
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
        "should be false": function(topic) {
          assert.strictEqual( topic, false );
        }
      },

      "the d3 brush control": {
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

        "the d3 brush control's extent": {
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

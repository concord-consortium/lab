/*jslint indent: 2, node: true */
//
// lab/models/energy2d/engine/utils/performance.js
//

// Simple tools for measurement of performance.
// Automatically detects nested calls of start()
// and creates appropriate tree.
// E.g.:
// var perf = makePerformanceTools();
// ...
// perf.start('database read');
// ...
//   perf.start('connection');
//   ...
//   perf.stop('connection');
//   ...
//   perf.start('parsing');
//   ...
//   perf.stop('parsing');
// ...
// perf.stop('database read')
// 
// wiil create a tree:
// database read
//  |.. connection 
//  |.. parsing

var PerformanceTools = exports.makePerformanceModel = function () {
  'use strict';
  var
    // Holds data.
    tree = {
      id: undefined,
      data: undefined,
      parent: undefined,
      children: {}
    },
    act_node = tree,

    goToNode = function (id_string) {
      if (!act_node.children[id_string]) {
        act_node.children[id_string] = {
          id: id_string,
          data: { sum: 0, count: 0, avg: 0 },
          parent: act_node,
          children: {}
        };
      }
      act_node = act_node.children[id_string];
      return act_node;
    };

  //
  // Public API.
  //
  return {
    // Start measurement.
    start: function (id_string) {
      goToNode(id_string);
      act_node.start_time = new Date().getTime();
    },
    // Stop measurement.
    stop: function (id_string) {
      var time = new Date().getTime();
      if (act_node.id !== id_string) {
        throw new Error("Performance: there is another active counter: " + act_node.name);
      }
      // Collect data.
      act_node.data.sum += time - act_node.start_time;
      act_node.data.count += 1;
      act_node.data.avg = act_node.data.sum / act_node.data.count;
      // Move one level up.
      act_node = act_node.parent;
    },
    // Get tree with stats.
    getTree: function () {
      return tree;
    }
  };
};

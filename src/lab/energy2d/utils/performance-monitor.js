/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false*/

// Simple tools for measurement of performance.
// Automatically detects nested calls of start()
// and creates appropriate tree_root.
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
// wiil create a tree_root:
// database read
//  |.. connection 
//  |.. parsing

define(function () {
  'use strict';

  return function PerformanceMonitor() {
    var
      // Holds avg time data.
      tree_root = {
        id: undefined,
        data: undefined,
        parent: undefined,
        children: {}
      },
      act_node = tree_root,

      // Holds FPS counters.
      fps_data = {},

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
      // FPS counter start
      startFPS: function (id_string) {
        fps_data[id_string] = {
          start_time: new Date().getTime(),
          count: 0,
          fps: 0
        };
      },
      // FPS update.
      updateFPS: function (id_string) {
        var
          data = fps_data[id_string],
          time = new Date().getTime();

        if (!data) {
          return;
        }
        data.count += 1;
        data.fps = data.count / ((time - data.start_time) / 1000);
      },
      // FPS counter start
      stopFPS: function (id_string) {
        delete fps_data[id_string];
      },
      // Get tree with stats.
      getTree: function () {
        return tree_root;
      },
      // Get FPS data.
      getFPSData: function () {
        return fps_data;
      }
    };
  };
});

/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false, $: false*/

// Performance Monitor View.
//
// getHTMLElement() method returns JQuery object with DIV that contains performance data.

define(function () {
  'use strict';

  return function PerformanceView(html_id) {
    var
      DEFAULT_ID = 'energy2d-performance',
      DEFAULT_CLASS = 'energy2d-performance',

      $performance_div,
      $stats,
      $fps,

      performance_model,

      //
      // Private methods.
      //
      initHTMLelement = function () {
        $performance_div = $('<div />');
        $fps = $('<pre />');
        $stats = $('<pre />');

        $performance_div.append('<h2>FPS Counters:</h2>');
        $performance_div.append($fps);
        $performance_div.append('<h2>Stats (average time):</h2>');
        $performance_div.append($stats);
      },

      addChildren = function (children, level) {
        var name, child, i;

        for (name in children) {
          if (children.hasOwnProperty(name)) {
            child = children[name];
            for (i = 0; i < level; i += 1) {
              $stats.append('  ');
            }
            $stats.append(child.id + ': ' + child.data.avg.toFixed(2) + 'ms\n');
            addChildren(child.children, level + 1);
          }
        }
      },

      renderTime = function (tree) {
        // Reset view.
        $stats.html('');
        addChildren(tree.children, 0);
      },

      renderFPS = function (fps_data) {
        var name;
        $fps.html('');
        for (name in fps_data) {
          if (fps_data.hasOwnProperty(name)) {
            $fps.append(name + ': ' + fps_data[name].fps.toFixed(2) + ' fps');
          }
        }
      },

      //
      // Public API.
      //
      performance_view = {
        bindModel: function (model) {
          performance_model = model;
        },

        update: function () {
          // Update stats.
          renderFPS(performance_model.getFPSData());
          renderTime(performance_model.getTree());
        },

        getHTMLElement: function () {
          return $performance_div;
        }
      };

    // One-off initialization.
    initHTMLelement();

    return performance_view;
  };
});

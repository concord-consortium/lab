/*global define */

define(function (require) {
  // Dependencies.
  var Backbone = require('backbone'),

      BarGraphModel = Backbone.Model.extend({
        defaults: {
          // Current value displayed by bar graph.
          value:     0,
          // Min value displayed.
          minValue:  0,
          // Max value displayed.
          maxValue:  10,

          // Dimensions of the bar graph
          // (including axis and labels).
          width:     150,
          height:    500,

          // Graph title.
          title:     undefined,
          // Color of the main bar.
          barColor:  "green",
          // Color of axis, labels, title.
          textColor: "#555",
          // Number of ticks displayed on the axis.
          ticks:     10
        }
      });

  return BarGraphModel;
});

/*global define */

define(function (require) {
  // Dependencies.
  var Backbone = require('backbone'),

      BarGraphModel = Backbone.Model.extend({
        defaults: {
          // Current value displayed by bar graph.
          value:     0,
          // Second value displayed by bar graph (using small triangle).
          // It can be used to show averaged or previous value.
          // null means that it shouldn't be displayed at all.
          secondValue: null,
          // Min value displayed.
          minValue:  0,
          // Max value displayed.
          maxValue:  10,

          // Dimensions of the bar graph (bar itself, labels, titles etc. are
          // NOT included).
          width:     "2em",
          height:    "20em",

          // Graph title.
          title:     "",
          // Color of the main bar.
          barColor:  "#e23c34",
          // Color of the area behind the bar.
          fillColor: "white",
          // Color of axis, labels, title.
          textColor: "#555",
          // Number of ticks displayed on the axis.
          // This value is *only* a suggestion. The most clean
          // and human-readable values are used.
          ticks:          10,
          // Number of grid lines displayed on the bar.
          gridLines:      10,
          // Enables or disables displaying of numerical labels.
          displayLabels: true,
          // Format of labels.
          // See the specification of this format:
          // https://github.com/mbostock/d3/wiki/Formatting#wiki-d3_format
          // or:
          // http://docs.python.org/release/3.1.3/library/string.html#formatspec
          labelFormat: "0.1f"
        }
      });

  return BarGraphModel;
});

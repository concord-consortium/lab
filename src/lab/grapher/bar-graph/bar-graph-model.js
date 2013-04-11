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
          min: 0,
          // Max value displayed.
          max: 10,

          // Width of the bar graph (bar itself, labels, titles etc. are
          // NOT included).
          barWidth: "2em",

          // Height of the bar graph container (bar itself + small padding).
          height: "20em",

          // Graph title. You can also specify multiline title using array
          // of strings, e.g.:
          // ["Title", "Subtitle"]
          title: "",
          // Accepted values are "right", "top" and "bottom".
          titleOn: "right",
          // Color of the main bar.
          barColor:  "#e23c34",
          // Color of the area behind the bar.
          fillColor: "white",
          // Number of labels displayed on the left side of the graph.
          // This value is *only* a suggestion. The most clean
          // and human-readable values are used.
          // You can also specify value-label pairs, e.g.:
          // [
          //   {
          //     "value": 0,
          //     "label": "low"
          //   },
          //   {
          //     "value": 10,
          //     "label": "high"
          //   }
          // ]
          // Use 0 or null to disable labels completely.
          labels:          10,
          // Units symbol displayed next to labels.
          units: "",
          // Number of grid lines displayed on the bar.
          gridLines:      10,
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

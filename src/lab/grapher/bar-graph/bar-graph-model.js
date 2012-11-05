/*globals define, d3, $, Backbone */

define(function (require) {

  var BarGraphModel = Backbone.Model.extend({
    defaults: {
      value:    0,

      minValue: 0,
      maxValue: 10,

      width:    100,
      height:   300,
      padding: {
        left:   10,
        top:    10,
        right:  40,
        bottom: 10
      },

      barWidth: 0.8,     // defined as a factor of width.
      barColor: "green",

      ticks:    10
    }
  });

  return BarGraphModel;
});

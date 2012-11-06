/*globals define, d3, $, Backbone */

define(function (require) {

  var BarGraphModel = Backbone.Model.extend({
    defaults: {
      value:    0,
      minValue: 0,
      maxValue: 10,

      width:    120,
      height:   300,
      barColor: "green",
      ticks:    10
    }
  });

  return BarGraphModel;
});

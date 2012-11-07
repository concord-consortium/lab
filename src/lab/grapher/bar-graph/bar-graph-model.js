/*global define */

define(function (require) {
  // Dependencies.
  var Backbone = require('backbone'),

      BarGraphModel = Backbone.Model.extend({
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

/*global define */

define(function (require) {
  // Dependencies.
  var Backbone = require('backbone'),

      BarGraphModel = Backbone.Model.extend({
        defaults: {
          value:    0,
          minValue: 0,
          maxValue: 10,

          title: undefined,

          width:       150,
          height:      500,
          scaleWidth:  150,
          scaleHeight: 500,

          barColor: "green",
          ticks:    10
        }
      });

  return BarGraphModel;
});

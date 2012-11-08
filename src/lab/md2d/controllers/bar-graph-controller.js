/*global define: false, model: false */

define(function (require) {
  var BarGraphModel = require('grapher/bar-graph/bar-graph-model'),
      BarGraphView  = require('grapher/bar-graph/bar-graph-view');

  return function BarGraphController(component) {
    var // Object with Public API.
        controller,
        // Model with options and current value.
        barGraphModel = new BarGraphModel(component.options),
        // Main view.
        barGraphView = new BarGraphView({model: barGraphModel, id: component.id}),
        // First data channel.
        input1 = component.input1,

        update = function () {
          barGraphModel.set({value: model.get(input1)});
        };

    controller = {
      // This callback should be trigger when model is loaded.
      modelLoadedCallback: function () {
        var input1 = component.input1;
        if (input1) {
          model.addPropertiesListener([input1], update);
        }
        // Render.
        barGraphView.render();
      },

      // Returns view container (div).
      getViewContainer: function () {
        return barGraphView.$el;
      },

      resize: function (width, height) {
        if (arguments.length === 0) return;

        if (width !== undefined && height === undefined) {
          // Fit to parent.
          barGraphView.$el.css("height", "100%");
          height = barGraphView.$el.height();
        }

        barGraphModel.set({
          width: width,
          height: height
        });
      }
    };

    // Return Public API object.
    return controller;
  };
});

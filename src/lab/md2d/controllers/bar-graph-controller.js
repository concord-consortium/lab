/*global define: false, model: false */

// Bar graph controller.
// It provides specific interface used in MD2D environment
// (by interactives-controller and layout module).
define(function (require) {
  var BarGraphModel = require('grapher/bar-graph/bar-graph-model'),
      BarGraphView  = require('grapher/bar-graph/bar-graph-view');

  return function BarGraphController(component) {
    var // Object with Public API.
        controller,
        // Model with options and current value.
        barGraphModel = new BarGraphModel(component.options),
        // Main view.
        barGraphView  = new BarGraphView({model: barGraphModel, id: component.id}),
        // First data channel.
        input1 = component.input1,

        update = function () {
          barGraphModel.set({value: model.get(input1)});
        };

    controller = {
      // This callback should be trigger when model is loaded.
      modelLoadedCallback: function () {
        if (input1) {
          model.addPropertiesListener([input1], update);
        }
        // Initial render...
        barGraphView.render();
        // and update.
        update();
      },

      // Returns view container (div).
      getViewContainer: function () {
        return barGraphView.$el;
      },

      // Method required by layout module.
      resize: function (width, height) {
        if (width === undefined)
          width = barGraphView.getParentWidth();

        if (height === undefined)
          height = barGraphView.getParentHeight();

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

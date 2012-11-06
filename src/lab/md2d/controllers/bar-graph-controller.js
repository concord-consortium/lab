/*global define: false, $: false, model: false */

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

        update = function () {
          // FIXME: hardcoded just for testing !!!
          barGraphModel.set({value: model.pressureProbes()[0].west});
        };

    controller = {
      // This callback should be trigger when model is loaded.
      modelLoadedCallback: function () {
        model.on('tick.' + component.id, update);

        barGraphView.render();
      },

      // Returns view container (div).
      getViewContainer: function () {
        return barGraphView.$el;
      },

      resize: function (width, height) {
        var newDim = {};

        if (width !== undefined) {
          newDim.width = width;
        }
        if (height !== undefined) {
          newDim.height = height;
        }

        barGraphModel.set(newDim);
      }
    };

    // Return Public API object.
    return controller;
  };
});

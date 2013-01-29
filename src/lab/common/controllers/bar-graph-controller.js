/*global $: false, define: false, model: false */

// Bar graph controller.
// It provides specific interface used in MD2D environment
// (by interactives-controller and layout module).
define(function (require) {
  var BarGraphModel = require('grapher/bar-graph/bar-graph-model'),
      BarGraphView  = require('grapher/bar-graph/bar-graph-view'),

      // Note: We always explicitly copy properties from component spec to bar graph options hash,
      // in order to avoid tighly coupling an externally-exposed API (the component spec) to an
      // internal implementation detail (the bar graph options format).
      barGraphOptionForComponentSpecProperty = {
        // Min value displayed.
        minValue:  'minValue',
        // Max value displayed.
        maxValue:  'maxValue',
        // Graph title.
        title:     'title',
        // Color of the main bar.
        barColor:  'barColor',
        // Color of the area behind the bar.
        fillColor: 'fillColor',
        // Color of axis, labels, title.
        textColor: 'textColor',
        // Number of ticks displayed on the axis.
        // This value is *only* a suggestion. The most clean
        // and human-readable values are used.
        ticks:      'ticks',
        // Number of subdivisions between major ticks.
        tickSubdivide: 'tickSubdivide',
        // Enables or disables displaying of numerical labels.
        displayLabels: 'displayLabels',
        // Format of labels.
        // See the specification of this format:
        // https://github.com/mbostock/d3/wiki/Formatting#wiki-d3_format
        // or:
        // http://docs.python.org/release/3.1.3/library/string.html#formatspec
        labelFormat: 'labelFormat'
      },

      // Limit options only to these supported.
      filterOptions = function(inputHash) {
        var options = {},
            cName, gName;

        for (cName in barGraphOptionForComponentSpecProperty) {
          if (barGraphOptionForComponentSpecProperty.hasOwnProperty(cName)) {
            gName = barGraphOptionForComponentSpecProperty[cName];
            if (inputHash[cName] !== undefined) {
              options[gName] = inputHash[cName];
            }
          }
        }
        return options;
      };

  return function BarGraphController(component) {
    var // Object with Public API.
        controller,
        // Model with options and current value.
        barGraphModel = new BarGraphModel(filterOptions(component.options)),
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
      },

      // Returns serialized component definition.
      serialize: function () {
        var result = $.extend(true, {}, component);
        // Update options.
        result.options = filterOptions(barGraphModel.toJSON());
        // Return updated definition.
        return result;
      }
    };

    // Return Public API object.
    return controller;
  };
});

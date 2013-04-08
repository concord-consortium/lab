/*global $: false, define: false, model: false */

// Bar graph controller.
// It provides specific interface used in MD2D environment
// (by interactives-controller and layout module).
define(function (require) {
  var BarGraphModel = require('grapher/bar-graph/bar-graph-model'),
      BarGraphView  = require('grapher/bar-graph/bar-graph-view'),
      metadata      = require('common/controllers/interactive-metadata'),
      validator     = require('common/validator'),

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
        // Number of grid lines displayed on the bar.
        // This value is *only* a suggestion, it's similar to 'ticks'.
        gridLines:  'gridLines',
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
        barGraphModel,
        // Main view.
        barGraphView,
        // First data channel.
        property,
        // Second data channel.
        secondProperty,

        update = function () {
          barGraphModel.set({value: model.get(property)});
        },
        updateSecondProperty = function () {
          barGraphModel.set({secondValue: model.get(secondProperty)});
        };

    //
    // Initialization.
    //
    // Validate component definition, use validated copy of the properties.
    component = validator.validateCompleteness(metadata.barGraph, component);
    barGraphModel = new BarGraphModel(filterOptions(component.options));
    barGraphView  = new BarGraphView({model: barGraphModel, id: component.id});
    // Apply custom width and height settings.
    barGraphView.$el.css({
      width: component.width,
      height: component.height
    });
    // Each interactive component has to have class "component".
    barGraphView.$el.addClass("component");
    property = component.property;
    secondProperty = component.secondProperty;

    controller = {
      // This callback should be trigger when model is loaded.
      modelLoadedCallback: function () {
        model.addPropertiesListener([property], update);
        if (typeof component.averagePeriod !== 'undefined' && component.averagePeriod !== null) {
          // This option is for authors convenience. It causes that filtered
          // output is automatically defined (it uses basic property as an
          // input). Author doesn't have to define it manually.
          secondProperty = property + "-bargraph-" + component.id + "-average";
          model.defineFilteredOutput(secondProperty, {}, property, "RunningAverage", component.averagePeriod);
        }
        if (secondProperty) {
          model.addPropertiesListener([secondProperty], updateSecondProperty);
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
      resize: function () {
        // Inform model about possible new dimensions (when $el dimensions
        // are specified in % or em, they will probably change each time
        // the interactive container is changed). It's important to do that,
        // as various visual elements can be adjusted (font size, padding etc.).
        barGraphModel.set({
          width: barGraphView.$el.width(),
          height: barGraphView.$el.height()
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

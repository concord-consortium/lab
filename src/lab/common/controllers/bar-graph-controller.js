/*global $: false, define: false */

// Bar graph controller.
// It provides specific interface used in MD2D environment
// (by interactives-controller and layout module).
define(function (require) {
  var BarGraphModel   = require('grapher/bar-graph/bar-graph-model'),
      BarGraphView    = require('grapher/bar-graph/bar-graph-view'),
      metadata        = require('common/controllers/interactive-metadata'),
      helpIconSupport = require('common/controllers/help-icon-support'),
      validator       = require('common/validator'),

      // Note: We always explicitly copy properties from component spec to bar graph options hash,
      // in order to avoid tighly coupling an externally-exposed API (the component spec) to an
      // internal implementation detail (the bar graph options format).
      barGraphOptionForComponentSpecProperty = {
        // Min value displayed.
        min: 'min',
        // Max value displayed.
        max: 'max',
        // Graph title.
        title: 'title',
        // Title position.
        titleOn: 'titleOn',
        // Color of the main bar.
        barColor:  'barColor',
        // Color of the area behind the bar.
        fillColor: 'fillColor',
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
        labels:      'labels',
        // Number of grid lines displayed on the bar.
        // This value is *only* a suggestion, it's similar to 'ticks'.
        gridLines:  'gridLines',
        // Format of labels.
        // See the specification of this format:
        // https://github.com/mbostock/d3/wiki/Formatting#wiki-d3_format
        // or:
        // http://docs.python.org/release/3.1.3/library/string.html#formatspec
        labelFormat: 'labelFormat',
        // Units displayed next to labels. Set it to 'true' to use units
        // automatically retrieved from property description. Set it to any
        // string to use custom unit symbol.
        units: 'units'
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

  return function BarGraphController(component, interactivesController) {
    var // Object with Public API.
        controller,
        model,
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

    function initialize() {
      model = interactivesController.getModel();

      // Validate component definition, use validated copy of the properties.
      component = validator.validateCompleteness(metadata.barGraph, component);
      barGraphModel = new BarGraphModel(filterOptions(component));
      barGraphView  = new BarGraphView({model: barGraphModel, id: component.id});
      // Each interactive component has to have class "component".
      barGraphView.$el.addClass("component");
      property = component.property;
      secondProperty = component.secondProperty;

      if (component.tooltip) {
        barGraphView.$el.attr("title", component.tooltip);
      }

      helpIconSupport(controller, component, interactivesController.helpSystem);
    }

    controller = {
      // This callback should be triggered when model is loaded.
      modelLoadedCallback: function () {
        var units = "";
        if (model) {
          model.removeObserver(property, update);
          if (secondProperty) {
            model.removeObserver(secondProperty, updateSecondProperty);
          }
        }
        model = interactivesController.getModel();
        // Register properties listeners.
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
        // Retrieve and set units if they are enabled.
        if (component.units === true) {
          // Units automatically retrieved from property description.
          units = model.getPropertyDescription(property).getUnitAbbreviation();
        } else if (component.units) {
          // Units defined in JSON definition explicitly.
          units = component.units;
        }
        // Apply custom width and height settings.
        // Do it in modelLoadedCallback, as during its execution,
        // the view container is already added to the document and
        // calculations of the size work correctly.
        // Also, pass calculated unit type.
        barGraphModel.set({
          barWidth: component.barWidth,
          height: component.height,
          units: units
        });
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
        // Just render bar graph again.
        barGraphView.render();
      },

      // Returns serialized component definition.
      serialize: function () {
        var result = $.extend(true, {}, component);
        // Return updated definition.
        return result;
      }
    };

    initialize();

    // Return Public API object.
    return controller;
  };
});

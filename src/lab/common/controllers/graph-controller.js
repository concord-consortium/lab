/*global define, $*/

define(function (require) {
  var Graph = require('grapher/core/graph'),
      metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator'),

      // Note: We always explicitly copy properties from component spec to grapher options hash,
      // in order to avoid tighly coupling an externally-exposed API (the component spec) to an
      // internal implementation detail (the grapher options format).
      grapherOptionForComponentSpecProperty = {
        title: 'title',
        enableAutoScaleButton: 'enableAutoScaleButton',
        enableAxisScaling: 'enableAxisScaling',
        enableSelectionButton: 'enableSelectionButton',
        clearSelectionOnLeavingSelectMode: 'clearSelectionOnLeavingSelectMode',
        dataPoints: 'dataPoints',
        markAllDataPoints: 'markAllDataPoints',
        showRulersOnSelection: 'showRulersOnSelection',
        fontScaleRelativeToParent: 'fontScaleRelativeToParent',
        xlabel: 'xlabel',
        xmin: 'xmin',
        xmax: 'xmax',
        ylabel: 'ylabel',
        ymin: 'ymin',
        ymax: 'ymax',
        lineWidth: 'lineWidth',
        xTickCount: 'xTickCount',
        yTickCount: 'yTickCount',
        xscaleExponent: 'xscaleExponent',
        yscaleExponent: 'yscaleExponent',
        xFormatter: 'xFormatter',
        yFormatter: 'yFormatter',
        lines: 'lines',
        bars: 'bars'
      },

      graphControllerCount = 0;

  return function graphController(component, interactivesController) {
    var // HTML element containing view
        $container,
        grapher,
        controller,
        model,
        scriptingAPI,
        properties,
        dataPointsArrays = [],
        namespace = "graphController" + (++graphControllerCount);

    // Name of the model property whose description sets the current yLabel.
    var yLabelProperty;

    function initialize() {
      scriptingAPI = interactivesController.getScriptingAPI();
      model = interactivesController.getModel();

      // Validate component definition, use validated copy of the properties.
      component = validator.validateCompleteness(metadata.graph, component);
      // The list of properties we are being asked to graph.
      properties = component.properties.slice();
      $container = $('<div>').attr('id', component.id).addClass('graph');
      // Each interactive component has to have class "component".
      $container.addClass("component");
      // Apply custom width and height settings.
      $container.css({
        width: component.width,
        height: component.height
      });
      if (component.tooltip) {
        $container.attr("title", component.tooltip);
      }
    }

    /**
      Returns an array containing two-element arrays each containing the current model
      time and the current value of each model property specified in component.properties.
    */
    function getDataPoint() {
      var ret = [], i, len, xval;

      xval = model.get(component.xProperty);
      for (i = 0, len = properties.length; i < len; i++) {
        ret.push([xval, model.get(properties[i])]);
      }
      return ret;
    }

    /**
      Return an options hash for use by the grapher.
    */
    function getOptions() {
      var options = {},
          cProp,
          gOption;

      // update grapher options from component spec & defaults
      for (cProp in grapherOptionForComponentSpecProperty) {
        if (grapherOptionForComponentSpecProperty.hasOwnProperty(cProp)) {
          gOption = grapherOptionForComponentSpecProperty[cProp];
          options[gOption] = component[cProp];
        }
      }
      return options;
    }

    /**
      Resets the cached data array to a single, initial data point, and pushes that data into graph.
    */
    function resetData() {
      var dataPoint = getDataPoint(),
          i;

      if (component.streamDataFromModel) {
        for (i = 0; i < dataPoint.length; i++) {
          dataPointsArrays[i] = [dataPoint[i]];
        }
        grapher.resetPoints(dataPointsArrays);
      } else {
        for (i = 0; i < dataPoint.length; i++) {
          dataPointsArrays[i] = [];
        }
        grapher.resetPoints();
      }
      grapher.repaint();
    }

    /**
      Appends the current data point (as returned by getDataPoint()) to the graph and to the cached
      data array
    */
    function appendDataPoint() {
      var dataPoint = getDataPoint(),
          i;

      for (i = 0; i < dataPoint.length; i++) {
        dataPointsArrays[i].push(dataPoint[i]);
      }
      // The grapher considers each individual (property, time) pair to be a "point", and therefore
      // considers the set of properties at any 1 time (what we consider a "point") to be "points".
      grapher.addPoints(dataPoint);
    }

    /**
      Removes all data from the graph that correspond to steps following the current step pointer.
      This is used when a change is made that invalidates the future data.
    */
    function removeDataAfterStepPointer() {
      var i;

      for (i = 0; i < properties.length; i++) {
        // Account for initial data, which corresponds to stepCounter == 0
        dataPointsArrays[i].length = model.stepCounter()+1;
      }
      grapher.resetPoints(dataPointsArrays);
    }

    /**
      Causes the graph to move the "current" pointer to the current model step. This desaturates
      the graph region corresponding to times after the current point.
    */
    function redrawCurrentStepPointer() {
      grapher.updateOrRescale(model.stepCounter());
    }

    /**
      Ask the grapher to reset itself, without adding new data.
    */
    function resetGrapher() {
      grapher.reset('#' + component.id, getOptions());
    }

    function registerModelListeners() {
      if (component.streamDataFromModel) {
        // Namespace listeners to '.graphController' so we can eventually remove them all at once
        model.on('tick.'+namespace, appendDataPoint);
        model.on('stepBack.'+namespace, redrawCurrentStepPointer);
        model.on('stepForward.'+namespace, redrawCurrentStepPointer);
        model.on('seek.'+namespace, redrawCurrentStepPointer);
        model.on('play.'+namespace, function() {
          if (grapher.numberOfPoints() && model.stepCounter() < grapher.numberOfPoints()) {
            removeDataAfterStepPointer();
          }
        });
        model.on('invalidation.'+namespace, function() {
          removeDataAfterStepPointer();
        });
        model.on('reset.'+namespace, modelResetHandler);
      }
    }

    function updateYLabelHandler() {
      if (yLabelProperty) {
        model.removePropertyDescriptionObserver(yLabelProperty, setYLabelFromProperty);
        yLabelProperty = null;
      }

      if (!component.ylabel && properties.length === 1) {
        yLabelProperty = properties[0];
        setYLabelFromProperty();
        model.addPropertyDescriptionObserver(yLabelProperty, setYLabelFromProperty);
      }
    }

    function setYLabelFromProperty() {
      var description = model.getPropertyDescription(yLabelProperty);
      grapher.yLabel(description.getLabel() + " (" + description.getUnitAbbreviation() + ")");
    }

    function modelResetHandler() {
      if (grapher) {
        if (component.clearDataOnReset) {
          resetData();
          if (component.resetAxesOnReset) {
            resetGrapher();
          }
        }
      } else {
        grapher = new Graph($container[0], getOptions(), undefined, interactivesController.getNextTabIndex());
      }
      updateYLabelHandler();
    }

    controller = {
      type: "graph",

      /**
        Called by the interactives controller when the model finishes loading.
      */
      modelLoadedCallback: function() {
        model = interactivesController.getModel();
        scriptingAPI = interactivesController.getScriptingAPI();

        if (grapher) {
          resetGrapher();
        } else {
          grapher = new Graph($container[0], getOptions(), undefined, interactivesController.getNextTabIndex());
        }
        resetData();
        registerModelListeners();
        updateYLabelHandler();
        grapher.repaint();
      },

      /**
        Used when manually adding points to the graph.
      */
      appendDataPropertiesToComponent: appendDataPoint,


      /**
        Add non-realtime dataset to the graph.
      */
      addDataSet: function (dataset) {
        dataPointsArrays.push(dataset);
      },

      /**
        Remove all non-realtime datasets
      */
      clearDataSets: function () {
        dataPointsArrays.length = properties.length;
      },

      /**
        Modifies the current list of graph options with new values and resets the graph.the
        Note: does not support changes to the 'properties' list.
      */
      setAttributes: function(opts) {
        if (grapher) {
          $.extend(component, opts);
          resetData();
          if (opts.dataPoints) {
            dataPointsArrays = opts.dataPoints;
          }
          resetGrapher();
        }
        // We may have set or unset the explicit 'ylabel' option; update the graph's ylabel as
        // appropriate
        updateYLabelHandler();
      },

      /**
        Adjusts axis ranges to match those of the properties the graph is reading from, without
        clearing data.

        Does nothing to the x-axis if the description of the xProperty has no min or max property.
        For the y-axis properties, finds the (min, max) pair that contains all property ranges,
        ignoring missing values for min or max, as long as at least one property has a min and one
        property has a max.
      */
      syncAxisRangesToPropertyRanges: function() {
        var xDescription = model.getPropertyDescription(component.xProperty);
        var yDescriptions = properties.map(function(property) {
          return model.getPropertyDescription(property);
        });
        var ymin;
        var ymax;

        if (xDescription && xDescription.getMin() != null && xDescription.getMax() != null) {
          grapher.xDomain([xDescription.getMin(), xDescription.getMax()]);
        }

        ymin = Infinity;
        ymax = -Infinity;
        yDescriptions.forEach(function(description) {
          if (description) {
            if (description.getMin() < ymin) ymin = description.getMin();
            if (description.getMax() > ymax) ymax = description.getMax();
          }
        });

        if (isFinite(ymin) && isFinite(ymax)) {
          grapher.yDomain([ymin, ymax]);
        }
      },

      /**
        If the x=0 is not visible in the current x axis range, move the x-axis so that x=0 is
        present at the left of the graph, while keeping the current x axis scale and the y axis
        range.
      */
      scrollXAxisToZero: function() {
        var xmin = grapher.xmin();
        var xmax = grapher.xmax();

        if (xmin !== 0) {
          grapher.xDomain([0, xmax - xmin]);
        }
      },

      /**
        Returns the grapher object itself.
      */
      getView: function() {
        return grapher;
      },

      /**
        Returns a jQuery selection containing the div which contains the graph.
      */
      getViewContainer: function() {
        return $container;
      },

      resize: function () {
        // For now only "fit to parent" behavior is supported.
        if (grapher) {
          grapher.resize();
        }
      },

      reset: function () {
        if (grapher) {
          resetGrapher();
        }
      },

      update: function () {
        if (grapher) {
          grapher.update();
        }
      },

      selectionDomain: function() {
        if (grapher) {
          return grapher.selectionDomain.apply(grapher, arguments);
        }
        return null;
      },

      selectionEnabled: function() {
        if (grapher) {
          return grapher.selectionEnabled.apply(grapher, arguments);
        }
        return null;
      },

      /**
        Returns serialized component definition.
      */
      serialize: function () {
        // The only thing which needs to be updated is scaling of axes.
        // Note however that the serialized definition should always have
        // 'xmin' set to initial value, as after deserialization we assume
        // that there is no previous data and simulations should start from the beginning.
        var result = $.extend(true, {}, component),
            // Get current domains settings, e.g. after dragging performed by the user.
            // TODO: this should be reflected somehow in the grapher model,
            // not grabbed directly from the view as now. Waiting for refactoring.
            xDomain = grapher.xDomain(),
            yDomain = grapher.yDomain(),
            startX  = component.xmin;

        result.ymin = yDomain[0];
        result.ymax = yDomain[1];
        // Shift graph back to the original origin, but keep scale of the X axis.
        // This is not very clear, but follows the rule of least surprise for the user.
        result.xmin = startX;
        result.xmax = startX + xDomain[1] - xDomain[0];

        return result;
      }
    };

    initialize();
    return controller;

  };
});

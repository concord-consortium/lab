/*global define, $*/

define(function (require) {
  var Graph         = require('lab-grapher'),
      metadata      = require('common/controllers/interactive-metadata'),
      validator     = require('common/validator'),
      ListeningPool = require('common/listening-pool'),
      DataSet       = require('common/controllers/data-set'),

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
        dataSet,
        scriptingAPI,
        properties,
        isSetup = false,
        dataPointsArrays = [],
        listeningPool,
        namespace = "graphController" + (++graphControllerCount);

    // Name of the model property whose description sets the current yLabel.
    var yLabelProperty;

    function getModel () {
      return interactivesController.getModel();
    }

    // In the future, we expect datasets to be defined in the interactive json
    function lookUpDataSetById () {
      if (properties.dataSetId) {
        dataSet = interactivesController.getComponent(properties.dataSetId);
      }
      return false;
    }

    // Legacy path: The dataset is defined as part of the graph controller.
    function makeDataSet () {
      var componentData = {
        properties: component.properties.slice(),
        streamDataFromModel: component.streamDataFromModel,
        clearOnModelReset: component.clearOnModelLoad,
        xProperty: component.xProperty,
        clearOnModelLoad: component.clearOnModelLoad,
        id: component.id + "autoDataSet",
        dataPoints: [],
        type: 'dataSet'
      };
      dataSet = new DataSet(componentData, interactivesController);
    }

    function loadDataSet () {
      if (lookUpDataSetById()) {
        return;
      }
      makeDataSet();
    }

    function initialize() {
      scriptingAPI = interactivesController.getScriptingAPI();
      listeningPool = new ListeningPool(namespace);
      // Validate component definition, use validated copy of the properties.
      component = validator.validateCompleteness(metadata.graph, component);
      // The list of properties we are being asked to graph.
      properties = component.properties.slice();
      loadDataSet();
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
      Causes the graph to move the "current" pointer to the current model step. This desaturates
      the graph region corresponding to times after the current point.
    */
    function redrawCurrentStepPointer() {
      grapher.updateOrRescale(getModel().stepCounter());
    }
    function _selectionChangeHandler(extra) {
      redrawCurrentStepPointer(extra.data);  //
    }


    function resetGraph() {
      if (grapher) {
        if (component.resetAxesOnReset) {
          resetGrapher();
        }
      } else {
        initGrapher();
      }
      updateYLabelHandler();
    }
    function _modelResetHandler() {
      resetGraph();
    }

    /**
      Reset all the datapoints in the graph.
      dataSeriesArry will contain an empty data set, or invitial values
      for all model params.
    */
    function clearGrapher(data) {
      if(grapher) {
        grapher.resetPoints(data);
        grapher.repaint();
      }
    }
    function _dataResetHandler(extra) {
      clearGrapher(extra.data);
    }

    /**
      Ask the grapher to reset itself, without adding new data.
    */
    function resetGrapher() {
      grapher.reset('#' + component.id, getOptions());
    }

    /**
      Add new points to the graphers
    */
    function addGraphPoints(dataPoints) {
      grapher.addPoints(dataPoints);
    }
    function _sampleAddedHandler(extra) {
      addGraphPoints(extra.data);
    }


    function registerListeners() {
      listeningPool.removeAll();
      var model = getModel();

      // We reset the graph view after model reset.
      listeningPool.listen(model, 'reset',       _modelResetHandler);

      // Not sure, but we probably want all the other events from the dataSet
      listeningPool.listen(dataSet, DataSet.Events.SELECTION_CHANGED, _selectionChangeHandler);
      listeningPool.listen(dataSet, DataSet.Events.DATA_RESET,        _dataResetHandler);
      listeningPool.listen(dataSet, DataSet.Events.SAMPLE_ADDED,      _sampleAddedHandler);
    }

    function updateYLabelHandler() {
      if (yLabelProperty) {
        getModel().removePropertyDescriptionObserver(yLabelProperty, setYLabelFromProperty);
        yLabelProperty = null;
      }

      if (!component.ylabel && properties.length === 1) {
        yLabelProperty = properties[0];
        setYLabelFromProperty();
        getModel().addPropertyDescriptionObserver(yLabelProperty, setYLabelFromProperty);
      }
    }

    function setYLabelFromProperty() {
      var description = getModel().getPropertyDescription(yLabelProperty);
      grapher.yLabel(description.getLabel() + " (" + description.getUnitAbbreviation() + ")");
    }

    function initGrapher() {
      grapher = new Graph($container[0], getOptions(), undefined, interactivesController.getNextTabIndex());
    }

    controller = {
      type: "graph",

      /**
        Called by the interactives controller when the model finishes loading.
      */
      modelLoadedCallback: function() {
        if (grapher) {
          resetGrapher();
        } else {
          initGrapher();
        }
        dataSet.modelLoadedCallback(); // TODO: have dataSet register its own
        registerListeners();

        scriptingAPI = interactivesController.getScriptingAPI();
        // TODO: Let the dataset handle this by itself:
        if (component.clearOnModelLoad || !isSetup) {
          dataSet.resetData();
        }
        updateYLabelHandler();
        grapher.repaint();
      },

      /**
        Used when manually adding points to the graph.
      */
      appendDataPropertiesToComponent: function() {
        dataSet.appendDataPoint(arguments);
      },


      /**
        Add non-realtime series to the dataSet.
      */
      addDataSet: function (series) {
        dataSet.addStaticDataSeries(series);
      },

      /**
        Remove all non-realtime data series from the dataSets
      */
      clearDataSets: function () {
        dataSet.clearStaticDataSeries();
      },

      /**
        Modifies the current list of graph options with new values and resets the graph.the
        Note: does not support changes to the 'properties' list.
      */
      setAttributes: function(opts) {
        if (grapher) {
          $.extend(component, opts);
          dataSet.resetData();
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
        var model = getModel();
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

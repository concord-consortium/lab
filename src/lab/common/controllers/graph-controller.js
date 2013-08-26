/*global define, $, model*/

define(function (require) {
  var Graph = require('grapher/core/graph'),
      metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator'),

      // Note: We always explicitly copy properties from component spec to grapher options hash,
      // in order to avoid tighly coupling an externally-exposed API (the component spec) to an
      // internal implementation detail (the grapher options format).
      grapherOptionForComponentSpecProperty = {
        title: 'title',
        clearDataOnReset: 'clearDataOnReset',
        streamDataFromModel: 'streamDataFromModel',
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

  return function graphController(component, scriptingAPI, interactivesController) {
    var // HTML element containing view
        $container,
        grapher,
        controller,
        properties,
        data = [],
        namespace = "graphController" + (++graphControllerCount);


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

      if (getOptions().streamDataFromModel) {
        for (i = 0; i < dataPoint.length; i++) {
          data[i] = [dataPoint[i]];
        }
        grapher.resetPoints(data);
      } else {
        for (i = 0; i < dataPoint.length; i++) {
          data[i] = [];
        }
        grapher.resetPoints();
      }
    }

    /**
      Appends the current data point (as returned by getDataPoint()) to the graph and to the cached
      data array
    */
    function appendDataPoint() {
      var dataPoint = getDataPoint(),
          i;

      for (i = 0; i < dataPoint.length; i++) {
        data[i].push(dataPoint[i]);
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
        data[i].length = model.stepCounter() + 1;
      }
      grapher.resetPoints(data);
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
      if (getOptions().streamDataFromModel) {
        // Namespace listeners to '.graphController' so we can eventually remove them all at once
        model.on('tick.'+namespace, appendDataPoint);
        model.on('stepBack.'+namespace, redrawCurrentStepPointer);
        model.on('stepForward.'+namespace, redrawCurrentStepPointer);
        model.on('seek.'+namespace, redrawCurrentStepPointer);
        model.on('reset.'+namespace, function() {
          resetGrapher();
          resetData();
        });
        model.on('play.'+namespace, function() {
          if (grapher.numberOfPoints() && model.stepCounter() < grapher.numberOfPoints()) {
            removeDataAfterStepPointer();
          }
        });
        model.on('invalidation.'+namespace, function() {
          removeDataAfterStepPointer();
        });
      }
    }

    //
    // Initialization.
    //
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

    return controller = {
      /**
        Called by the interactives controller when the model finishes loading.
      */
      modelLoadedCallback: function() {
        if (grapher) {
          resetGrapher();
        } else {
          grapher = new Graph($container[0], getOptions(), undefined, interactivesController.getNextTabIndex());
        }
        resetData();
        registerModelListeners();
      },

      /**
        Called by the interactives controller when the model is reset.
      */
      modelResetCallback: function() {
        if (grapher) {
          if (getOptions().clearDataOnReset) {
            resetData();
            resetGrapher();
          }
        } else {
          grapher = new Graph($container[0], getOptions(), undefined, interactivesController.getNextTabIndex());
        }
      },

      /**
        Used when manually adding points to the graph.
      */
      appendDataPropertiesToComponent: appendDataPoint,

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
  };

});

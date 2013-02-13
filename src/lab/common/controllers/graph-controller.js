/*global define $ model*/
/*jslint boss: true eqnull: true*/

define(function (require) {
  var RealTimeGraph = require('grapher/core/real-time-graph'),
      metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator'),

      // Note: We always explicitly copy properties from component spec to grapher options hash,
      // in order to avoid tighly coupling an externally-exposed API (the component spec) to an
      // internal implementation detail (the grapher options format).
      grapherOptionForComponentSpecProperty = {
        title: 'title',
        xlabel: 'xlabel',
        xmin: 'xmin',
        xmax: 'xmax',
        ylabel: 'ylabel',
        ymin: 'ymin',
        ymax: 'ymax'
      };

  return function graphController(component) {
    var // HTML element containing view
        $container,
        grapher,
        controller,
        properties,
        data = [];

    /**
      Returns the time interval that elapses between succeessive data points, in picoseconds. (The
      current implementation of the grapher requires this knowledge.)
    */
    function getSamplePeriod() {
      return model.get('viewRefreshInterval') * model.get('timeStep') / 1000;
    }

    /**
      Returns an array containing the current value of each model property specified in
      component.properties.
    */
    function getDataPoint() {
      var ret = [], i, len;

      for (i = 0, len = properties.length; i < len; i++) {
        ret.push(model.get(properties[i]));
      }
      return ret;
    }

    /**
      Return an options hash for use by the grapher.
    */
    function getOptions() {
      var cProp,
          gOption,
          options = {
            sample: getSamplePeriod()
          };

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

      for (i = 0; i < dataPoint.length; i++) {
        data[i] = [dataPoint[i]];
      }
      grapher.new_data(data);
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
      grapher.add_points(dataPoint);
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
      grapher.new_data(data);
    }

    /**
      Causes the graph to move the "current" pointer to the current model step. This desaturates
      the graph region corresponding to times after the current point.
    */
    function redrawCurrentStepPointer() {
      grapher.updateOrRescale(model.stepCounter());
      grapher.showMarker(model.stepCounter());
    }

    /**
      Ask the grapher to reset itself, without adding new data.
    */
    function resetGrapher() {
      grapher.reset('#' + component.id, getOptions());
    }


    function registerModelListeners() {
      // Namespace listeners to '.graphController' so we can eventually remove them all at once
      model.on('tick.graphController', appendDataPoint);
      model.on('stepBack.graphController', redrawCurrentStepPointer);
      model.on('stepForward.graphController', redrawCurrentStepPointer);
      model.on('seek.graphController', redrawCurrentStepPointer);
      model.on('reset.graphController', function() {
        resetGrapher();
        resetData();
      });
      model.on('play.pressureGraph', function() {
        if (grapher.number_of_points() && model.stepCounter() < grapher.number_of_points()) {
          removeDataAfterStepPointer();
        }
        grapher.show_canvas();
      });
      model.on('invalidation.graphController', removeDataAfterStepPointer);

      // As an imperfect hack (really the grapher should allow us to pass the correct x-axis value)
      // we reset the graph if a model property change changes the time interval between ticks
      model.addPropertiesListener(['viewRefreshInterval', 'timeStep'], function() {
        resetGrapher();
        resetData();
      });
    }

    //
    // Initialization.
    //
    // Validate component definition, use validated copy of the properties.
    component = validator.validateCompleteness(metadata.graph, component);
    // The list of properties we are being asked to graph.
    properties = component.properties.slice();
    $container = $('<div>').attr('id', component.id).addClass('properties-graph');

    return controller = {

      /**
        Called by the interactives controller when the model finishes loading.
      */
      modelLoadedCallback: function() {
        if (grapher) {
          resetGrapher();
        } else {
          grapher = new RealTimeGraph($container[0], getOptions());
        }
        resetData();
        registerModelListeners();
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
        $container.width("100%");
        $container.height("100%");
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
            xDomain = grapher.getXDomain(),
            yDomain = grapher.getYDomain(),
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

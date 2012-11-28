/*global define $ model*/
/*jslint boss: true eqnull: true*/

define(function (require) {
  var RealTimeGraph = require('grapher/core/real-time-graph'),
      defaults = {
        title:  "Graph",
        xlabel: "Model Time (ps)",
        xmin:   0,
        xmax:   20,
        ylabel: "",
        ymin:   0,
        ymax:   10
      },

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
        $container = $('<div>').attr('id', component.id).addClass('properties-graph'),
        grapher,
        controller,
        properties,
        data = [];

    /**
      Returns the time interval that elapses between succeessive data points. The current
      implementation of the grapher requires this knowledge.
    */
    function getSamplePeriod() {
      return model.get('viewRefreshInterval') * model.get('timeStep');
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
          options[gOption] = (component[cProp] != null) ? component[cProp] : defaults[cProp];
        }
      }
      return options;
    }

    /**
      Resets the cached data array to a single, initial data point, and pushes that data into graph.
    */
    function resetData() {
      data.length = 0;
      data.push(getDataPoint());
      grapher.new_data(data);
    }

    /**
      Appends the current data point (as returned by getDataPoint()) to the graph and to the cached
      data array
    */
    function appendDataPoint() {
      var point = getDataPoint();
      data.push(point);
      // The grapher considers each individual (property, time) pair to be a "point", and therefore
      // considers the set of properties at any 1 time (what we consider a "point") to be "points".
      grapher.add_points(point);
    }

    /**
      Removes all data from the graph that correspond to steps following the current step pointer.
      This is used when a change is made that invalidates the future data.
    */
    function removeDataAfterStepPointer() {
      // Account for initial data, which corresponds to stepCounter == 0
      data.length = model.stepCounter() + 1;
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
      model.on('invalidation.graphController', removeDataAfterStepPointer);

      // As an imperfect hack (really the grapher should allow us to pass the correct x-axis value)
      // we reset the graph if a model property change changes the time interval between ticks
      model.addPropertiesListener(['viewRefreshInterval', 'timeStep'], function() {
        resetGrapher();
        resetData();
      });
    }

    // The list of properties we are being asked to graph.
    properties = component.properties.slice();

    return controller = {

      /**
        Called by the interactives controller when the model finishes loading.
      */
      modelLoadedCallback: function() {
        if (grapher) {
          resetGrapher();
        } else {
          grapher = new RealTimeGraph('#' + component.id, getOptions());
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
      }
    };
  };

});

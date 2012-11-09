/*global define: false, $: false, model: false */

define(function (require) {
  var realTimeGraph = require('grapher/core/real-time-graph');

  return function pressureGraphController(component) {
    var // Object with Public API.
        controller,
        // Main view, grapher/real-time-graph.
        grapherView,
        // Array of arrays storying pressure probes data.
        pressureData,
        // HTML element containing view.
        $container = $('<div>').attr('id', component.id),
        // Default options, extended by user option and passed to grapher.
        options = {
          title:  "Pressure",
          xlabel: "Model Time (ps)",
          xmin:   0,
          xmax:   20,
          ylabel: "Bar",
          ymin:  -0.2,
          ymax:   3.0
        },

        // Initializes pressureData structure, sets 0 for
        // every existing pressure probe.
        initPressureData = function () {
          var probes = model.pressureProbes(),
              idx, name, probe;

          pressureData = [];

          // Draw every pressure probe.
          for (idx in probes) {
            if (probes.hasOwnProperty(idx)) {
              probe = probes[idx];
              for (name in probe) {
                if (probe.hasOwnProperty(name)) {
                  pressureData.push([0]);
                }
              }
            }
          }
        },

        // Updates options which are strongly connected
        // with model and resets grapher.
        updateModelRelatedOptions = function () {
          options.sample = modelSampleSizeInPs();
        },

        modelSampleSizeInPs = function() {
          return model.get("viewRefreshInterval") * model.get("timeStep")/1000;
        },

        // Collects pressure data, saves it in pressureData
        // array and finally updates the graph view.
        update = function () {
          var probes = model.pressureProbes(),
              result = [],
              i = 0,
              idx, name, probe;

          // Collect data and store it.
          for (idx in probes) {
            if (probes.hasOwnProperty(idx)) {
              probe = probes[idx];
              for (name in probe) {
                if (probe.hasOwnProperty(name)) {
                  result.push(probe[name]);
                  pressureData[i++].push(probe[name]);
                }
              }
            }
          }

          // Update graph.
          grapherView.add_points(result);
        },

        // Sets length pf pressureData arrays to desired value.
        // It is useful e.g. during seek operation.
        setPressureDataLength = function (newLength) {
          var i, len;

          if (newLength > 0) {
            for (i = 0, len = pressureData.length; i < len; i++) {
              pressureData[i].length = newLength;
            }
          } else {
            // Do not create empty arrays, instead fill them
            // with initial values (= 0).
            initPressureData();
          }
        },

        // Registers all necessary callbacks, should be called
        // whenever a new model is created.
        registerModelCallbacks = function () {

          model.on('tick.pressureGraph', update);

          model.on('play.pressureGraph', function() {
            if (grapherView.number_of_points() && model.stepCounter() < grapherView.number_of_points()) {
              setPressureDataLength(model.stepCounter());
              grapherView.new_data(pressureData);
            }
            grapherView.show_canvas();
          });

          model.on('reset.pressureGraph', function() {
            options.sample = modelSampleSizeInPs();
            initPressureData();
            grapherView.reset('#' + component.id, options);
            grapherView.new_data(pressureData);
          });

          model.on('stepForward.pressureGraph', function() {
            grapherView.updateOrRescale(model.stepCounter());
            grapherView.showMarker(model.stepCounter());
          });

          model.on('stepBack.pressureGraph', function() {
            grapherView.updateOrRescale(model.stepCounter());
            grapherView.showMarker(model.stepCounter());
          });

          model.on('seek.pressureGraph', function() {
            setPressureDataLength(model.stepCounter());
            grapherView.new_data(pressureData);
          });

          model.addPropertiesListener(['viewRefreshInterval'], function() {
            updateModelRelatedOptions();
            grapherView.reset('#' + component.id, options);
          });
        };

    controller = {
      // This callback should be trigger when model is loaded.
      modelLoadedCallback: function () {
        var $container = $('#' + component.id);

        // Initialize pressure data.
        initPressureData();

        // Use options obtained from model.
        updateModelRelatedOptions();
        // Use options provided in component definition.
        $.extend(options, component.options || {});

        // Create pressureGraph only if it hasn't been drawn before.
        if (!grapherView) {
          options.dataset = pressureData;
          grapherView = realTimeGraph('#' + component.id, options);
        } else {
          // If grapher exists, just reset.
          grapherView.reset('#' + component.id, options, $container[0]);
        }

        // Set dimensions if provided.
        if (component.dimensions) {
          grapherView.resize(component.dimensions.width, component.dimensions.height);
        }

        // This method is called whenever a model loads (i.e., a new model object is created.)
        // Always request event notifications from the new model object.
        registerModelCallbacks();
      },

      // Returns view container (div).
      getViewContainer: function () {
        return $container;
      },

      // Returns view (grapher).
      getView: function () {
        return grapherView;
      }
    };

    // Return Public API object.
    return controller;
  };
});

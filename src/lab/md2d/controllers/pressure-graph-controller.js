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

        // Creates grapher view.
        createGrapher = function (id, options) {
          options = options || {};
          options.dataset = pressureData;
          grapherView = realTimeGraph('#' + id, options);
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
                  pressureData[i].push(probe[name]);
                }
              }
            }
          }

          // Update graph.
          grapherView.add_points(result);
        },

        resetPressureData = function (index) {
          var modelsteps = model.stepCounter(),
              i, len;

          if (index) {
            for (i = 0, len = pressureData.length; i < len; i++) {
              pressureData[i].length = modelsteps;
            }
            return index;
          } else {
            initPressureData();
            return 0;
          }
        },

        // Registers all necessary callbacks, should be called
        // whenever a new model is created.
        registerModelCallbacks = function () {
          // Update refresh interval.
          model.addPropertiesListener(['viewRefreshInterval'], function() {
            options.sample = model.get("viewRefreshInterval") / 1000;
            grapherView.reset('#' + component.id, options);
          });

          model.on('tick.pressureGraph', update);

          model.on('play.pressureGraph', function() {
            if (grapherView.number_of_points() && model.stepCounter() < grapherView.number_of_points()) {
              resetPressureData(model.stepCounter());
              grapherView.new_data(pressureData);
            }
            grapherView.show_canvas();
          });

          model.on('reset.pressureGraph', function() {
            sample = model.get("viewRefreshInterval") / 1000;
            options.sample = sample;
            resetPressureData();
            grapherView.reset('#' + component.id, options);
            grapherView.new_data(pressureData);
          });

          model.on('seek.pressureGraph', function() {
            var modelsteps = model.stepCounter();
            if (modelsteps > 0) {
              resetPressureData(modelsteps);
            } else {
              resetPressureData();
            }
            grapherView.new_data(pressureData);
          });
        };

    controller = {
      // This callback should be trigger when model is loaded.
      modelLoadedCallback: function () {
        var $container = $('#' + component.id);

        resetPressureData();

        // Set options.
        options.sample = model.get("viewRefreshInterval") / 1000;
        // Use options provided in component definition.
        $.extend(options, component.options || {});

        // Create pressureGraph only if it hasn't been drawn before.
        if (!grapherView) {
          $.extend(options, component.options || []);
          createGrapher(component.id, options);
        } else {
          grapherView.reset('#' + component.id, options, $container[0]);
        }

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

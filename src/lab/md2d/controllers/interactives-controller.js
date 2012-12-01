/*global define model $ alert ACTUAL_ROOT d3*/
/*jshint eqnull: true boss: true */
define(function (require) {
  // Dependencies.
  var ModelController         = require('md2d/controllers/model-controller'),
      PressureGraphController = require('md2d/controllers/pressure-graph-controller'),
      BarGraphController      = require('md2d/controllers/bar-graph-controller'),
      GraphController         = require('md2d/controllers/graph-controller'),
      DgExportController      = require('md2d/controllers/dg-export-controller'),
      RealTimeGraph           = require('grapher/core/real-time-graph'),
      Thermometer             = require('cs!common/components/thermometer'),
      layout                  = require('common/layout/layout'),
      setupInteractiveLayout  = require('common/layout/interactive-layout');

  return function interactivesController(interactive, viewSelector, modelLoadedCallbacks, layoutStyle) {

    modelLoadedCallbacks = modelLoadedCallbacks || [];

    var controller = {},
        modelController,
        $interactiveContainer,
        models = [],
        modelsHash = {},
        propertiesListeners = [],
        playerConfig,
        componentCallbacks = [],
        onLoadScripts = [],
        thermometer,
        energyGraph,
        energyData = [[],[],[]],
        // A generic line graph of some set of properties
        graph,
        // Pressure Graph Controller, handles pressure data and its graphing.
        pressureGraphController,
        // Bar graph controller.
        barGraphController,
        // Handles exporting data to DataGames, if 'exports' are specified
        dgExportController,

        setupScreenCalledTwice = false,

        //
        // Define the scripting API used by 'action' scripts on interactive elements.
        //
        // The properties of the object below will be exposed to the interactive's
        // 'action' scripts as if they were local vars. All other names (including
        // all globals, but exluding Javascript builtins) will be unavailable in the
        // script context; and scripts are run in strict mode so they don't
        // accidentally expose or read globals.
        //
        // TODO: move construction of this object to its own file.
        //

        scriptingAPI = (function() {

          function isInteger(n) {
            // Exploits the facts that (1) NaN !== NaN, and (2) parseInt(Infinity, 10) is NaN
            return typeof n === "number" && (parseFloat(n) === parseInt(n, 10));
          }

          function isArray(obj) {
            return typeof obj === 'object' && obj.slice === Array.prototype.slice;
          }

          /** return an integer randomly chosen from the set of integers 0..n-1 */
          function randomInteger(n) {
            return Math.floor(Math.random() * n);
          }

          function swapElementsOfArray(array, i, j) {
            var tmp = array[i];
            array[i] = array[j];
            array[j] = tmp;
          }

          /** Return an array of n randomly chosen members of the set of integers 0..N-1 */
          function choose(n, N) {
            var values = [],
                i;

            for (i = 0; i < N; i++) { values[i] = i; }

            for (i = 0; i < n; i++) {
              swapElementsOfArray(values, i, i + randomInteger(N-i));
            }
            values.length = n;

            return values;
          }

          return {

            deg2rad: Math.PI/180,
            rad2deg: 180/Math.PI,

            format: d3.format,

            /* Returns number of atoms in the system. */
            getNumberOfAtoms: function getNumberOfAtoms() {
              return model.get_num_atoms();
            },

            addAtom: function addAtom(props, options) {
              if (options && options.supressRepaint) {
                // Translate supressRepaint option to
                // option understable by modeler.
                // supresRepaint is a conveniance option for
                // Scripting API users.
                options.supressEvent = true;
              }
              return model.addAtom(props, options);
            },

            /*
              Removes atom 'i'.
            */
            removeAtom: function removeAtom(i, options) {
              if (options && options.supressRepaint) {
                // Translate supressRepaint option to
                // option understable by modeler.
                // supresRepaint is a conveniance option for
                // Scripting API users.
                options.supressEvent = true;
                delete options.supressRepaint;
              }
              try {
                model.removeAtom(i, options);
              } catch (e) {
                if (!options || !options.silent)
                  throw e;
              }
            },

            /*
              Removes radial bond 'i'.
            */
            removeRadialBond: function removeRadialBond(i, options) {
              try {
                model.removeRadialBond(i);
              } catch (e) {
                if (!options || !options.silent)
                  throw e;
              }

              scriptingAPI.repaint();
            },

            /*
              Removes angular bond 'i'.
            */
            removeAngularBond: function removeAngularBond(i, options) {
              try {
                model.removeAngularBond(i);
              } catch (e) {
                if (!options || !options.silent)
                  throw e;
              }

              scriptingAPI.repaint();
            },

            addRandomAtom: function addRandomAtom() {
              return model.addRandomAtom.apply(model, arguments);
            },

            get: function get() {
              return model.get.apply(model, arguments);
            },

            set: function set() {
              return model.set.apply(model, arguments);
            },

            adjustTemperature: function adjustTemperature(fraction) {
              model.set({targetTemperature: fraction * model.get('temperature')});
            },

            limitHighTemperature: function limitHighTemperature(t) {
              if (model.get('targetTemperature') > t) model.set({targetTemperature: t});
            },

            loadModel: function loadModel(modelId, cb) {
              model.stop();

              controller.loadModel(modelId);

              if (typeof cb === 'function') {
                onLoadScripts.push(cb);
              }
            },

            /** returns a list of integers corresponding to atoms in the system */
            randomAtoms: function randomAtoms(n) {
              var numAtoms = model.get_num_atoms();

              if (n == null) n = 1 + randomInteger(numAtoms-1);

              if (!isInteger(n)) throw new Error("randomAtoms: number of atoms requested, " + n + ", is not an integer.");
              if (n < 0) throw new Error("randomAtoms: number of atoms requested, " + n + ", was less be greater than zero.");

              if (n > numAtoms) n = numAtoms;
              return choose(n, numAtoms);
            },

            /**
              Accepts atom indices as arguments, or an array containing atom indices.
              Unmarks all atoms, then marks the requested atom indices.
              Repaints the screen to make the marks visible.
            */
            markAtoms: function markAtoms() {
              var i,
                  len;

              if (arguments.length === 0) return;

              // allow passing an array instead of a list of atom indices
              if (isArray(arguments[0])) {
                return markAtoms.apply(null, arguments[0]);
              }

              scriptingAPI.unmarkAllAtoms();

              // mark the requested atoms
              for (i = 0, len = arguments.length; i < len; i++) {
                model.setAtomProperties(arguments[i], {marked: 1});
              }
              scriptingAPI.repaint();
            },

            unmarkAllAtoms: function unmarkAllAtoms() {
              for (var i = 0, len = model.get_num_atoms(); i < len; i++) {
                model.setAtomProperties(i, {marked: 0});
              }
              scriptingAPI.repaint();
            },

            traceAtom: function traceAtom(i) {
              if (i === null) return;

              model.set({atomTraceId: i});
              model.set({showAtomTrace: true});
            },

            untraceAtom: function untraceAtom() {
              model.set({showAtomTrace: false});
            },

            /**
              Observe property `propertyName` on the model, and perform `action` when it changes.
              Pass property value to action.
            */
            onPropertyChange: function onPropertyChange(propertyName, action) {
              model.addPropertiesListener([propertyName], function() {
                action( model.get(propertyName) );
              });
            },

            /**
              Sets individual atom properties using human-readable hash.
              e.g. setAtomProperties(5, {x: 1, y: 0.5, charge: 1})
            */
            setAtomProperties: function setAtomProperties(i, props, checkLocation, moveMolecule, options) {
              model.setAtomProperties(i, props, checkLocation, moveMolecule);
              if (!(options && options.supressRepaint)) {
                scriptingAPI.repaint();
              }
            },

            /**
              Returns atom properties as a human-readable hash.
              e.g. getAtomProperties(5) --> {x: 1, y: 0.5, charge: 1, ... }
            */
            getAtomProperties: function getAtomProperties(i) {
              return model.getAtomProperties(i);
            },

            setElementProperties: function setElementProperties(i, props) {
              model.setElementProperties(i, props);
              scriptingAPI.repaint();
            },

            getElementProperties: function getElementProperties(i) {
              return model.getElementProperties(i);
            },

            /**
              Adds an obstacle using human-readable hash of properties.
              e.g. addObstacle({x: 1, y: 0.5, width: 1, height: 1})
            */
            addObstacle: function addObstacle(props, options) {
              try {
                model.addObstacle(props);
              } catch (e) {
                if (!options || !options.silent)
                  throw e;
              }
              scriptingAPI.repaint();
            },

            /**
              Sets individual obstacle properties using human-readable hash.
              e.g. setObstacleProperties(0, {x: 1, y: 0.5, externalFx: 0.00001})
            */
            setObstacleProperties: function setObstacleProperties(i, props) {
              model.setObstacleProperties(i, props);
              scriptingAPI.repaint();
            },

            /**
              Returns obstacle properties as a human-readable hash.
              e.g. getObstacleProperties(0) --> {x: 1, y: 0.5, externalFx: 0.00001, ... }
            */
            getObstacleProperties: function getObstacleProperties(i) {
              return model.getObstacleProperties(i);
            },

            /**
              Removes obstacle 'i'.
            */
            removeObstacle: function removeObstacle(i, options) {
              try {
                model.removeObstacle(i);
              } catch (e) {
                if (!options || !options.silent)
                  throw e;
              }

              scriptingAPI.repaint();
            },

            setRadialBondProperties: function setRadialBondProperties(i, props) {
              model.setRadialBondProperties(i, props);
              scriptingAPI.repaint();
            },

            getRadialBondProperties: function getRadialBondProperties(i) {
              return model.getRadialBondProperties(i);
            },

            setAngularBondProperties: function setAngularBondProperties(i, props) {
              model.setAngularBondProperties(i, props);
              scriptingAPI.repaint();
            },

            getAngularBondProperties: function getAngularBondProperties(i) {
              return model.getAngularBondProperties(i);
            },

            /**
              Returns current value in Bars of the given pressure probe.
              obstacleId  - id of the obstacle containing pressure probe (e.g. 0)
              orientation - string describing placement of the pressure probe
                            ('west', 'north', 'east' or 'south')
            */
            getPressureProbeValue: function getPressureProbe(obstacleId, orientation) {
              return model.pressureProbes()[obstacleId][orientation];
            },

            getTime: function getTime() {
              return model.get('time');
            },

            pe: function pe() {
              return model.get('potentialEnergy');
            },

            ke: function ke() {
              return model.get('kineticEnergy');
            },

            atomsKe: function atomsKe(atomsList) {
              var sum = 0, i;
              for (i = 0; i < atomsList.length; i++) {
                sum += model.getAtomKineticEnergy(atomsList[i]);
              }
              return sum;
            },

            start: function start() {
              model.start();
            },

            stop: function stop() {
              model.stop();
            },

            reset: function reset() {
              model.stop();
              modelController.reload();
            },

            tick: function tick() {
              model.tick();
            },

            minimizeEnergy: function minimizeEnergy() {
              model.minimizeEnergy();
              scriptingAPI.repaint();
            },

            repaint: function repaint() {
              modelController.repaint();
            },

            exportData: function exportData() {
              if (!dgExportController) throw new Error("No exports have been specified.");
              dgExportController.exportData();
            },

            // rudimentary debugging functionality
            alert: alert,

            console: window.console != null ? window.console : {
              log: function() {},
              error: function() {},
              warn: function() {},
              dir: function() {}
            }
          };
        }());

    /**
      Allow console users to try script actions
    */
    function exposeScriptingAPI() {
      window.script = $.extend({}, scriptingAPI);
      window.script.run = function(source, args) {
        var prop,
            argNames = [],
            argVals = [];

        for (prop in args) {
          if (args.hasOwnProperty(prop)) {
            argNames.push(prop);
            argVals.push(args[prop]);
          }
        }
        return makeFunctionInScriptContext.apply(null, argNames.concat(source)).apply(null, argVals);
      };
    }

    function getModel(modelId) {
      if (modelsHash[modelId]) {
        return modelsHash[modelId];
      }
      throw new Error("No model found with id "+modelId);
    }

    /**
      Load the model from the url specified in the 'model' key. 'modelLoaded' is called
      after the model loads.

      @param: modelUrl
    */
    function loadModel(modelId) {
      var model = getModel(modelId);

      controller.currentModel = model;

      if (model.viewOptions) {
        // make a deep copy of model.viewOptions, so we can freely mutate playerConfig
        // without the results being serialized or displayed in the interactives editor.
        playerConfig = $.extend(true, {}, model.viewOptions);
      } else {
        playerConfig = { controlButtons: 'play' };
      }
      playerConfig.fit_to_parent = !layoutStyle;
      playerConfig.interactiveUrl = model.url;

      onLoadScripts = [];
      if (model.onLoad) {
        onLoadScripts.push( makeFunctionInScriptContext( getStringFromArray(model.onLoad) ) );
      }

      $.get(ACTUAL_ROOT + model.url).done(function(modelConfig) {

        // Deal with the servers that return the json as text/plain
        modelConfig = typeof modelConfig === 'string' ? JSON.parse(modelConfig) : modelConfig;

        if (modelController) {
          modelController.reload(modelConfig, playerConfig);
        } else {
          modelController = new ModelController('#molecule-container', modelConfig, playerConfig);
          modelLoaded();
          // also be sure to get notified when the underlying model changes
          modelController.on('modelReset', modelLoaded);
          controller.modelController = modelController;
        }
      });
    }

    function createComponent(component) {
      switch (component.type) {
        case 'button':
          return createButton(component);
        case 'checkbox':
          return createCheckbox(component);
        case 'pulldown':
          return createPulldown(component);
        case 'radio':
          return createRadio(component);
        case 'thermometer':
          thermometer = createThermometer(component);
          return thermometer;
        case 'barGraph':
          barGraphController = new BarGraphController(component);
          return {
            elem:     barGraphController.getViewContainer(),
            callback: barGraphController.modelLoadedCallback
          };
        case 'energyGraph':
          return createEnergyGraph(component);
        case 'pressureGraph':
          pressureGraphController = new PressureGraphController(component);
          return {
            elem:     pressureGraphController.getViewContainer(),
            callback: pressureGraphController.modelLoadedCallback
          };
        case 'graph':
          graph = new GraphController(component);
          return {
            elem:     graph.getViewContainer(),
            callback: graph.modelLoadedCallback
          };
        case 'slider':
          return createSlider(component);
      }
    }

    /**
      Given a script string, return a function that executes that script in a
      context containing *only* the bindings to names we supply.

      This isn't intended for XSS protection (in particular it relies on strict
      mode.) Rather, it's so script authors don't get too clever and start relying
      on accidentally exposed functionality, before we've made decisions about
      what scripting API and semantics we want to support.
    */
    function makeFunctionInScriptContext() {
      var prop,
          whitelistedNames,
          whitelistedObjectsArray,
          scriptFunctionMakerSource,

          // First n-1 arguments to this function are the names to bind to the arguments that are
          // passed to the function we make
          argumentsToScript = Array.prototype.slice.call(arguments, 0, arguments.length - 1),

          // Last argument is the function body of the script, as a string
          scriptSource = arguments[arguments.length - 1];

      // Construct parallel arrays of the keys and values of the scripting API
      whitelistedNames = [];
      whitelistedObjectsArray = [];

      for (prop in scriptingAPI) {
        if (scriptingAPI.hasOwnProperty(prop) && argumentsToScript.indexOf(prop) < 0) {
          whitelistedNames.push(prop);
          whitelistedObjectsArray.push( scriptingAPI[prop] );
        }
      }

      // Make sure the script runs in strict mode, so undeclared variables don't
      // escape to the toplevel scope.
      scriptFunctionMakerSource =  "return function(" + argumentsToScript.join(',') + ") { 'use " + "strict'; " + scriptSource + "};";

      // This function runs the script with all globals shadowed:
      return function() {
        var prop,
            blacklistedNames,
            scriptArgumentList,
            safedScript;

        // Blacklist all globals, except those we have whitelisted. (Don't move
        // the construction of 'blacklistedNames' to the enclosing scope, because
        // new globals -- in particular, 'model' -- are created in between the
        // time the enclosing function executes and the time this function
        // executes.)
        blacklistedNames = [];
        for (prop in window) {
          if (window.hasOwnProperty(prop) && !scriptingAPI.hasOwnProperty(prop)) {
            blacklistedNames.push(prop);
          }
        }

        // Here's the key. The Function constructor acccepts a list of argument
        // names followed by the source of the *body* of the function to
        // construct. We supply the whitelist names, followed by the "blacklist"
        // of globals, followed by the script source. But when we invoke the
        // function thus created, we will only provide values for the whitelisted
        // names -- all of the "blacklist" names will therefore have the value
        // 'undefined' inside the function body.
        //
        // (Additionally, remember that functions created by the Function
        // constructor execute in the global context -- they don't capture names
        // from the scope they were created in.)
        scriptArgumentList = whitelistedNames.concat(blacklistedNames).concat(scriptFunctionMakerSource);

        // TODO: obvious optimization: cache the result of the Function constructor
        // and don't reinvoke the Function constructor unless the blacklistedNames array
        // has changed. Create a unit test for this scenario.
        try {
          safedScript = Function.apply(null, scriptArgumentList).apply(null, whitelistedObjectsArray);
        } catch (e) {
          alert("Error compiling script: \"" + e.toString() + "\"\nScript:\n\n" + scriptSource);
        }

        try {
          // invoke the script, passing only enough arguments for the whitelisted names
          return safedScript.apply(null, Array.prototype.slice.call(arguments));
        } catch (e) {
          alert("Error running script: \"" + e.toString() + "\"\nScript:\n\n" + scriptSource);
        }
      };
    }

    /**
      Generic function that accepts either a string or an array of strings,
      and returns the complete string
    */
    function getStringFromArray(str) {
      if (typeof str === 'string') {
        return str;
      }
      return str.join('\n');
    }

    function createButton(component) {
      var $button, scriptStr;

      $button = $('<button>').attr('id', component.id).html(component.text);
      $button.addClass("component");

      scriptStr = getStringFromArray(component.action);

      $button.click(makeFunctionInScriptContext(scriptStr));

      return { elem: $button };
    }

    function createCheckbox(component) {
      var propertyName  = component.property,
          onClickScript = component.onClick,
          $checkbox,
          $label;

      $checkbox = $('<input type="checkbox">').attr('id', component.id);
      $label = $('<label>').append(component.text).append($checkbox);
      // Append class to label, as it's the most outer container in this case.
      $label.addClass("component");

      // Process onClick script if it is defined.
      if (onClickScript) {
        onClickScript = getStringFromArray(onClickScript);
        // Create a function which assumes we pass it a parameter called 'value'.
        onClickScript = makeFunctionInScriptContext('value', onClickScript);
      }

      // Connect checkbox with model's property if its name is defined.
      if (propertyName !== undefined) {
        modelLoadedCallbacks.push(function () {
          var updateCheckbox = function () {
            var value = model.get(propertyName);
            if (value) {
              $checkbox.attr('checked', true);
            } else {
              $checkbox.attr('checked', false);
            }
          };
          // Register listener for 'propertyName'.
          model.addPropertiesListener([propertyName], updateCheckbox);
          // Perform initial checkbox setup.
          updateCheckbox();
        });
      }

      // Register handler for click event.
      $checkbox.click(function () {
        var value = false,
            propObj;
        // $(this) will contain a reference to the checkbox.
        if ($(this).is(':checked')) {
          value = true;
        }
        // Change property value if checkbox is connected
        // with model's property.
        if (propertyName !== undefined) {
          propObj = {};
          propObj[propertyName] = value;
          model.set(propObj);
        }
        // Finally, if checkbox has onClick script attached,
        // call it in script context with checkbox status passed.
        if (onClickScript !== undefined) {
          onClickScript(value);
        }
      });

      // Return label tag, as it contains checkbox anyway.
      return { elem: $label };
    }

    function createPulldown(component) {
      var $pulldown, $option,
          options = component.options || [],
          option,
          i, ii;

      $pulldown = $('<select>').attr('id', component.id);
      $pulldown.addClass("component");

      for (i=0, ii=options.length; i<ii; i++) {
        option = options[i];
        $option = $('<option>').html(option.text);
        if (option.disabled) {
          $option.attr("disabled", option.disabled);
        }
        if (option.selected) {
          $option.attr("selected", option.selected);
        }
        $pulldown.append($option);
      }

      $pulldown.change(function() {
        var index = $(this).prop('selectedIndex'),
            action = component.options[index].action,
            scriptStr;

        if (action){
          scriptStr = getStringFromArray(action);
          makeFunctionInScriptContext(scriptStr)();
        } else if (component.options[index].loadModel){
          model.stop();
          loadModel(component.options[index].loadModel);
        }
      });

      return { elem: $pulldown };
    }

    function createRadio(component) {
      var $div, $option, $span,
          options = component.options || [],
          option,
          id = component.id,
          i, ii;

      $div = $('<div>').attr('id', id);
      $div.addClass("component");

      for (i=0, ii=options.length; i<ii; i++) {
        option = options[i];
        $option = $('<input>')
          .attr('type', "radio")
          .attr('name', id);
        if (option.disabled) {
          $option.attr("disabled", option.disabled);
        }
        if (option.selected) {
          $option.attr("checked", option.selected);
        }
        $span = $('<span>')
          .append($option)
          .append(option.text);
        $div.append($span).append("<br/>");

        $option.change((function(option) {
          return function() {
            var scriptStr;
            if (option.action){
              scriptStr = getStringFromArray(option.action);
              makeFunctionInScriptContext(scriptStr)();
            } else if (option.loadModel){
              model.stop();
              loadModel(option.loadModel);
            }
          };
        })(option));
      }

      return { elem: $div };
    }

    function createSlider(component) {
      var min = component.min,
          max = component.max,
          steps = component.steps,
          action = component.action,
          propertyName = component.property,
          initialValue = component.initialValue,
          title = component.title || "",
          labels = component.labels || [],
          displayValue = component.displayValue,
          i,
          $elem,
          $title,
          label,
          $label,
          $slider,
          $sliderHandle,
          $container;

      if (min == null) min = 0;
      if (max == null) max = 10;
      if (steps == null) steps = 10;

      $title = $('<p class="title">' + title + '</p>');
      // we pick up the SVG slider component CSS if we use the generic class name 'slider'
      $container = $('<div class="container">');
      $slider = $('<div class="html-slider">');
      $container.append($slider);

      $slider.slider({
        min: min,
        max: max,
        step: (max - min) / steps
      });

      $sliderHandle = $slider.find(".ui-slider-handle");

      $elem = $('<div class="interactive-slider">')
                .append($title)
                .append($container);

      for (i = 0; i < labels.length; i++) {
        label = labels[i];
        $label = $('<p class="label">' + label.label + '</p>');
        $label.css('left', (label.value-min) / (max-min) * 100 + '%');
        $container.append($label);
      }

      if (displayValue) {
        displayValue = makeFunctionInScriptContext('value', displayValue);
      }

      if (action) {
        // The 'action' property is a source of a function which assumes we pass it a parameter
        // called 'value'.
        action = makeFunctionInScriptContext('value', action);
        $slider.bind('slide', function(event, ui) {
          action(ui.value);
          if (displayValue) {
            $sliderHandle.text(displayValue(ui.value));
          }
        });
      }

      if (propertyName) {
        $slider.bind('slide', function(event, ui) {
          // just ignore slide events that occur before the model is loaded
          var obj = {};
          obj[propertyName] = ui.value;
          if (model) model.set(obj);
          if (displayValue) {
            $sliderHandle.text(displayValue(ui.value));
          }
        });

        modelLoadedCallbacks.push(function() {
          model.addPropertiesListener([propertyName], function() {
            var value = model.get(propertyName);
            $slider.slider('value', value);
            if (displayValue) {
              $sliderHandle.text(displayValue(value));
            }
          });
        });
      }

      if (initialValue != null) {
        // Make sure to call the action with the startup value of slider. (The script action may
        // manipulate the model, so we have to make sure it runs after the model loads, by pushing
        // it onto 'modelLoadedCallbacks'.)
        if (action) {
          modelLoadedCallbacks.push(function() {
            $slider.slider('value', initialValue);
            action(initialValue);
            if (displayValue) {
              $sliderHandle.text(displayValue(initialValue));
            }
          });
        }

        if (propertyName) {
          modelLoadedCallbacks.push(function() {
            var obj = {};
            obj.propertyName = initialValue;
            model.set(obj);
          });
        }
      } else if (propertyName) {
        modelLoadedCallbacks.push(function() {
          var value = model.get(propertyName);
          $slider.slider('value', value);
          if (displayValue) {
            $sliderHandle.text(displayValue(value));
          }
        });
      }
      return { elem: $elem };
    }

    /**
      Returns an 'interactive thermometer' object, that wraps a base Thermometer with a label for use
      in Interactives.

      properties are:

       elem:      DOM element containing the Thermometer div and the label div
       component: base Thermometer object, with no label
       callback:  standard interactive component callback, called as soon as the display is ready
       update:    method to ask thermometer to update its display
    */
    function createThermometer(component) {
      var $thermometer = $('<div>').attr('id', component.id),

          reading,
          units = "K",
          offset = 0,
          scale = 1,
          digits = 0,

          labelIsReading = !!component.labelIsReading,
          labelText = labelIsReading ? "" : "Thermometer",
          $label = $('<p class="label">').text(labelText).width('6em'),
          $elem = $('<div class="interactive-thermometer">')
                  .append($thermometer)
                  .append($label),

          thermometerComponent = new Thermometer($thermometer, null, component.min, component.max),
          self;

      if (reading = component.reading) {
        if (reading.units != null)  units = reading.units;
        if (reading.offset != null) offset = reading.offset;
        if (reading.scale != null)  scale = reading.scale;
        if (reading.digits != null) digits = reading.digits;
      }

      function updateLabel(temperature) {
        temperature = scale*temperature + offset;
        $label.text(temperature.toFixed(digits) + " " + units);
      }
      // TODO: update to observe actual system temperature once output properties are observable
      queuePropertiesListener(['targetTemperature'], function() { self.update(); });

      return self = {
        elem:      $elem,
        component: thermometerComponent,

        callback: function() {
          thermometerComponent.resize();
          self.update();
        },

        update: function() {
          var t = model.get('targetTemperature');
          thermometerComponent.add_value(t);
          if (labelIsReading) updateLabel(t);
        }
      };
    }

    function queuePropertiesListener(properties, func) {
      if (typeof model !== 'undefined') {
        model.addPropertiesListener(properties, func);
      } else {
        propertiesListeners.push([properties, func]);
      }
    }

    function createEnergyGraph(component) {
      var elem = $('<div>').attr('id', component.id);
      return  {
        elem: elem,
        callback: function() {

          var thisComponent = component,
              $container = $('#' + thisComponent.id),
              options = {
                title:     "Energy of the System (KE:red, PE:green, TE:blue)",
                xlabel:    "Model Time (ps)",
                xmin:      0,
                xmax:     20,
                sample:    modelSampleSizeInPs(),
                ylabel:    "eV",
                ymin:      -5.0,
                ymax:      5.0
              };

          resetEnergyData();

          model.addPropertiesListener(['viewRefreshInterval'], function() {
            options.sample = modelSampleSizeInPs();
            energyGraph.reset('#' + thisComponent.id, options);
          });

          // Create energyGraph only if it hasn't been drawn before:
          if (!energyGraph) {
            $.extend(options, thisComponent.options || []);
            newEnergyGraph(thisComponent.id, options);
          } else {
            options.sample = modelSampleSizeInPs();
            $.extend(options, thisComponent.options || []);
            energyGraph.reset('#' + thisComponent.id, options, $container[0]);
          }

          if (thisComponent.dimensions) {
            energyGraph.resize(thisComponent.dimensions.width, component.dimensions.height);
          }

          // This method is called whenever a model loads (i.e., a new model object is created.)
          // Always request event notifications from the new model object.

          model.on('tick.energyGraph', updateEnergyGraph);

          model.on('play.energyGraph', function() {
            invalidateFollowingEnergyData();
            energyGraph.show_canvas();
          });

          model.on('invalidation.energyGraph', invalidateFollowingEnergyData);

          model.on('reset.energyGraph', function() {
            options.sample = modelSampleSizeInPs();
            resetEnergyData();
            energyGraph.reset('#' + thisComponent.id, options);
            energyGraph.new_data(energyData);
          });

          model.on('stepForward.energyGraph', function() {
            if (model.isNewStep()) {
              updateEnergyGraph();
            } else {
              energyGraph.updateOrRescale(model.stepCounter());
              energyGraph.showMarker(model.stepCounter());
            }
          });

          model.on('stepBack.energyGraph', function() {
            energyGraph.updateOrRescale(model.stepCounter());
            energyGraph.showMarker(model.stepCounter());
          });

          model.on('seek.energyGraph', function() {
            var modelsteps = model.stepCounter();
            if (modelsteps > 0) {
              resetEnergyData(modelsteps);
            } else {
              resetEnergyData();
            }
            energyGraph.new_data(energyData);
          });

        }
      };
    }

    function modelSampleSizeInPs() {
      return model.get("viewRefreshInterval") * model.get("timeStep")/1000;
    }

    function newEnergyGraph(id, options) {
      options = options || {};
      options.dataset = energyData;
      energyGraph = new RealTimeGraph('#' + id, options);
    }

    function invalidateFollowingEnergyData() {
      if (energyGraph.number_of_points() && model.stepCounter() < energyGraph.number_of_points()) {
        resetEnergyData(model.stepCounter());
        energyGraph.new_data(energyData);
      }
    }

    function updateEnergyGraph() {
      energyGraph.add_points(updateEnergyData());
    }

    // Add another sample of model KE, PE, and TE to the arrays in energyData
    function updateEnergyData() {
      var ke = model.get('kineticEnergy'),
          pe = model.get('potentialEnergy'),
          te = ke + pe;
      energyData[0].push(ke);
      energyData[1].push(pe);
      energyData[2].push(te);
      return [ke, pe, te];
    }

    // Reset the energyData arrays to a specific length by passing in an index value,
    // or empty the energyData arrays an initialize the first sample.
    function resetEnergyData(index) {
      var modelsteps = model.stepCounter(),
          i,
          len;

      if (index) {
        for (i = 0, len = energyData.length; i < len; i++) {
          energyData[i].length = modelsteps;
        }
        return index;
      } else {
        energyData = [[0],[0],[0]];
        return 0;
      }
    }

    /**
      Call this after the model loads, to process any queued resize and update events
      that depend on the model's properties, then draw the screen.
    */
    function modelLoaded() {
      var i, listener;

      setupCustomOutputs(controller.currentModel.outputs, interactive.outputs);
      setupCustomParameters(controller.currentModel.parameters, interactive.parameters);

      for(i = 0; i < componentCallbacks.length; i++) {
        componentCallbacks[i]();
      }

      layout.addView('moleculeContainers', modelController.moleculeContainer);
      if (thermometer) layout.addView('thermometers', thermometer.component);
      if (energyGraph) layout.addView('energyGraphs', energyGraph);
      // TODO: energyGraphs should be changed to lineGraphs?
      if (pressureGraphController) layout.addView('energyGraphs', pressureGraphController.getView());
      if (graph) layout.addView('energyGraphs', graph.getView());
      if (barGraphController) layout.addView('barGraphs', barGraphController);

      $(window).unbind('resize');

      if (layoutStyle) {
        // for compatibility with current implementation "embedded" interactive style
        layout.selection = layoutStyle;
        layout.setupScreen();

        // layout.setupScreen modifies the size of the molecule view's containing element based on
        // its current size. The first two times it is called, it sets the container to two different
        // sizes. After that, further calls do not change the size of the container. (For some reason,
        // when the screen resizes, only one call to setupScreen is required.)
        //
        // The following is therefore a dirty hack to pretend layout.setupScreen behaves more nicely.
        if (!setupScreenCalledTwice) {
          layout.setupScreen();
          setupScreenCalledTwice = true;
        }

        $(window).on('resize', layout.setupScreen);
      } else {
        // preferred path...
        setupInteractiveLayout();
        $(window).on('resize', setupInteractiveLayout);
      }

      for(i = 0; i < propertiesListeners.length; i++) {
        listener = propertiesListeners[i];
        model.addPropertiesListener(listener[0], listener[1]);
      }

      for(i = 0; i < onLoadScripts.length; i++) {
        onLoadScripts[i]();
      }

      for(i = 0; i < modelLoadedCallbacks.length; i++) {
        modelLoadedCallbacks[i]();
      }
      model.initializeHistory();
    }

    /**
      The main method called when this controller is created.

      Populates the element pointed to by viewSelector with divs to contain the
      molecule container (view) and the various components specified in the interactive
      definition, and

      @param newInteractive
        hash representing the interactive specification
      @param viewSelector
        jQuery selector that finds the element to put the interactive view into
    */
    function loadInteractive(newInteractive, viewSelector) {
      var model,
          componentJsons,
          components = {},
          component,
          divContents,
          $row, items,
          div,
          componentId,
          $top, $right, $rightwide, $bottom,
          i, j, ii;

      componentCallbacks = [];
      interactive = newInteractive;
      $interactiveContainer = $(viewSelector);
      if ($interactiveContainer.children().length === 0) {
        $top = $('<div class="interactive-top" id="top"/>');
        $top.append('<div class="interactive-top" id="molecule-container"/>');
        if (interactive.layout && interactive.layout.right !== undefined) {
          $right = $('<div class="interactive-top" id="right"/>');
          $top.append($right);
        }
        if (interactive.layout && interactive.layout.rightwide) {
          $rightwide = $('<div id="rightwide"/>');
          $top.append($rightwide);
        }
        $interactiveContainer.append($top);
        $interactiveContainer.append('<div class="interactive-bottom" id="bottom"/>');
      } else {
        $bottom = $("#bottom");
        $right = $("#right");
        $rightwide = $("#rightwide");
        $bottom.html('');
        if ($right) {
          $right.empty();
        }
        if ($rightwide) {
          $rightwide.empty();
        }
      }

      // set up the list of possible models
      if (interactive.models != null && interactive.models.length > 0) {
        models = interactive.models;
        for (i=0, ii=models.length; i<ii; i++) {
          model = models[i];
          model.id = model.id || "model"+i;
          modelsHash[model.id] = model;
        }
        loadModel(models[0].id);
      }

      componentJsons = interactive.components || [];

      for (i = 0, ii=componentJsons.length; i<ii; i++) {
        component = createComponent(componentJsons[i]);
        components[componentJsons[i].id] = component;
      }

      // Setup exporter, if any...
      if (interactive.exports) {
        dgExportController = new DgExportController(interactive.exports);
        // componentCallbacks is just a list of callbacks to make when model loads; it should
        // perhaps be renamed.
        componentCallbacks.push(dgExportController.modelLoadedCallback);
      }

      // look at each div defined in layout, and add any components in that
      // array to that div. Then rm the component from components so we can
      // add the remainder to #bottom at the end
      if (interactive.layout) {
        for (div in interactive.layout) {
          if (interactive.layout.hasOwnProperty(div)) {
            divContents = interactive.layout[div];
            if (typeof divContents === "string") {
              // simply add the author-defined html in its entirety
              $('#'+div).html(divContents);
            } else {
              if (Object.prototype.toString.call(divContents[0]) !== "[object Array]") {
                divContents = [divContents];
              }
              for (i = 0; i < divContents.length; i++) {
                items = divContents[i];
                $row = $('<div class="interactive-' + div + '-row"/>');
                $('#'+div).append($row);
                for (j = 0; j < items.length; j++) {
                  componentId = items[j];
                  if (components[componentId]) {
                    $row.append(components[componentId].elem);
                    if (components[componentId].callback) {
                      componentCallbacks.push(components[componentId].callback);
                    }
                    delete components[componentId];
                  }
                }
              }
            }
          }
        }
      }

      // add the remaining components -- first try to append them to dom elements that
      // may have been defined by the author, and if that fails, add them to #bottom
      if ($('#bottom.row').length === 0) {
        $row = $('<div class="interactive-' + div + '-row"/>');
        $('#bottom').append($row);
      }
      for (componentId in components) {
        if (components.hasOwnProperty(componentId)) {
          if ($('#interactive-container #'+componentId).length > 0) {
            $('#interactive-container #'+componentId).append(components[componentId].elem);
          } else {
            $row.append(components[componentId].elem);
          }
        }
      }

    }

    /**
      After a model loads, this method sets up the custom output properties specified in the "model"
      section of the interactive and in the interactive.

      Any output property definitions in the model section of the interactive specification override
      properties with the same that are specified in the main body if the interactive specification.
    */
    function setupCustomOutputs(modelOutputs, interactiveOutputs) {
      if (!modelOutputs && !interactiveOutputs) return;

      var outputs = {},
          prop,
          output;

      function processOutputsArray(outputsArray) {
        if (!outputsArray) return;
        for (var i = 0; i < outputsArray.length; i++) {
          outputs[outputsArray[i].name] = outputsArray[i];
        }
      }

      // per-model output definitions override output definitions from interactives
      processOutputsArray(interactiveOutputs);
      processOutputsArray(modelOutputs);

      for (prop in outputs) {
        if (outputs.hasOwnProperty(prop)) {
          output = outputs[prop];
          // DOM elements (and, by analogy, Next Gen MW interactive components like slides)
          // have "ids". But, in English, properties have "names", but not "ids".
          model.defineOutput(output.name, {
            label: output.label,
            units: output.units
          }, makeFunctionInScriptContext(getStringFromArray(output.value)),
          output.filter);
        }
      }
    }

    /**
      After a model loads, this method is used to set up the custom parameters specified in the
      model section of the interactive, or in the toplevel of the interactive
    */
    function setupCustomParameters(modelParameters, interactiveParameters) {
      if (!modelParameters && !interactiveParameters) return;

      var i,
          parameter,
          // append modelParameters second so they're processed later (and override entries of the
          // same name in interactiveParameters)
          parameters = (interactiveParameters || []).concat(modelParameters || []),
          initialValues = {};

      for (i = 0; i < parameters.length; i++) {
        parameter = parameters[i];
        model.defineParameter(parameter.name, {
          label: parameter.label,
          units: parameter.units
        }, makeFunctionInScriptContext('value', getStringFromArray(parameter.onChange)));

        if (parameter.initialValue !== undefined) {
          initialValues[parameter.name] = parameter.initialValue;
        }
      }

      model.set(initialValues);
    }

    // run this when controller is created
    loadInteractive(interactive, viewSelector);
    exposeScriptingAPI();

    // make these private variables and functions available
    controller.loadInteractive = loadInteractive;
    controller.loadModel = loadModel;

    return controller;
  };
});

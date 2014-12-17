/*global d3, $, define */
/*jshint loopfunc: true */

define(function (require) {

  var alert = require('common/alert');
  var namespaceCount = 0;

  // This object is the outer context in which each script function is executed. This prevents at
  // least inadvertent reliance by the script on unintentinally exposed globals. Note that this
  // object is shared by the all instances of functions created in Scripting API context
  // (see makeFunctionInScriptContext).
  var shadowedGlobals = {};

  function errorForKey(key) {
    return function() {
      throw new ReferenceError(key + " is not defined");
    };
  }

  // Make shadowedGlobals contain keys for all globals (properties of 'window').
  // Also make set and get of any such property throw a ReferenceError exactly like
  // reading or writing an undeclared variable in strict mode.
  function setShadowedGlobals() {
    var keys = Object.getOwnPropertyNames(window),
        key,
        i,
        len,
        err;

    for (i = 0, len = keys.length; i < len; i++) {
      key = keys[i];
      if (!shadowedGlobals.hasOwnProperty(key)) {
        err = errorForKey(key);

        Object.defineProperty(shadowedGlobals, key, {
          set: err,
          get: err
        });
      }
    }
  }

  //
  // Define the scripting API used by 'action' scripts on interactive elements.
  //
  // The properties of the object below will be exposed to the interactive's
  // 'action' scripts as if they were local vars. All other names (including
  // all globals, but exluding Javascript builtins) will be unavailable in the
  // script context; and scripts are run in strict mode so they don't
  // accidentally expose or read globals.
  //
  return function ScriptingAPI (interactivesController, model) {

    // Note. Normally, scripting API methods should not create event listeners to be added to the
    // interactivesController, because doing so from an onLoad script results in adding a new event
    // listener per model load or reload. The interactivesController has no mechanism for
    // associating listeners with a particular model and removing them after load; that semantics is
    // handled by adding listeners directly to a model.

    // Ensure that we don't overwrite model.reset observers.
    // MUST. FIX. EVENT. OBSERVING. to get rid of this ridiculous unique id requirement!
    function onModelReset(callback) {
      model.on('reset.common-scripting-api-' + (namespaceCount++), callback);
    }

    var controller = {

      api: (function() {

        function isInteger(n) {
          // Exploits the facts that (1) NaN !== NaN, and (2) parseInt(Infinity, 10) is NaN
          return typeof n === "number" && (parseFloat(n) === parseInt(n, 10));
        }

        function isArray(obj) {
          return typeof obj === 'object' && obj.slice === Array.prototype.slice;
        }

        /** return a number randomly chosen between 0..max */
        function randomFloat(max) {
          if (max) {
            return Math.random() * max;
          } else {
            return Math.random();
          }
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

        /* Send a tracking event to Google Analytics */
        function trackEvent(category, action, label) {
          var googleAnalytics;

          if (typeof _gaq === 'undefined'){
            // console.error("Google Analytics not defined, Can not send trackEvent");
            return;
          }
          googleAnalytics = _gaq;
          if (!category) {
            category = "Interactive";
          }
          // console.log("Sending a track page event Google Analytics (category:action:label):");
          // console.log("(" + category + ":"  + action + ":" + label + ")");
          googleAnalytics.push(['_trackEvent', category, action, label]);
        }

        return {
          isInteger: isInteger,
          isArray: isArray,
          randomInteger: randomInteger,
          randomFloat: randomFloat,
          swapElementsOfArray: swapElementsOfArray,
          choose: choose,

          deg2rad: Math.PI/180,
          rad2deg: 180/Math.PI,

          trackEvent: trackEvent,

          format: d3.format,

          get: function get() {
            return model.get.apply(model, arguments);
          },

          set: function set() {
            return model.set.apply(model, arguments);
          },

          freeze: function freeze() {
            return model.freeze.apply(model, arguments);
          },

          unfreeze: function unfreeze() {
            return model.unfreeze.apply(model, arguments);
          },

          // optional 'parameters' list of values to pass into the loaded model
          //
          // TODO remove optional parameter list when interactives have parameters that
          //      exist beyond model loading
          loadModel: function loadModel(modelId, parameters) {
            model.stop();
            interactivesController.loadModel(modelId, null, parameters);
          },

          getLoadedModelId: function getLoadedModel() {
            return interactivesController.getLoadedModelId();
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
           * Performs a user-defined script at any given time.
           *
           * callAt(t, ...) guarantees that script will be executed, but not necessarily
           * at exactly chosen time (as this can be impossible due to simulation settings).
           * User scripts cannot interrupt the model "tick", the most inner integration loop.
           * e.g. callAt(23, ...) in MD2D model context will be executed at time 50,
           * if timeStepsPerTick = 50 and timeStep = 1.
           *
           * callAt action will occur when the model reaches the specified time and the simulation
           * is running at the moment. Note that just stepping forward and backward in time won't
           * trigger action again, but if you step back and start the simulation, then it will.
           *
           * @param  {number} time     Time defined in model native time unit (e.g. fs for MD2D).
           * @param  {function} action Function containing user-defined script.
           */
          callAt: function callAt(time, action) {
            function checkTime() {
              if (model.properties.time >= time) {
                action();
                stopChecking();
              }
            }

            function startChecking() {
              // addObserver(key, callback) is idempotent
              model.addObserver('time', checkTime);
            }

            function stopChecking() {
              model.removeObserver('time', checkTime);
            }

            function onStartHandler() {
              // This callback handles situation in which user moved back in time using tick
              // history and clicked play again. Setup checking again. Note that startChecking()
              // is idempotent so we can call it many times.
              if (model.properties.time < time) {
                startChecking();
              }
            }

            onModelReset(startChecking);
            this.onStart(onStartHandler);
            startChecking();
          },

          /**
           * Performs a user-defined script repeatedly, with a fixed time delay
           * between each call.
           *
           * callEvery(t, ...) guarantees that script will be executed *correct number of times*,
           * but not necessarily at exactly chosen intervals (as this can be impossible due to
           * simulation settings). User scripts cannot interrupt the model "tick", the most
           * inner integration loop.
           * e.g. callEvery(23, ...) in MD2D model context will be executed *twice* at time 50,
           * if timeStepsPerTick = 50 and timeStep = 1.
           *
           * callEvery action for time N * interval (for any integer N >= 1) will only be called
           * when the model time exceeds N * interval time. Note that just stepping forward and
           * backward in time won't trigger action again, but if you step back and start the
           * simulation, then it will.
           *
           * @param {number}   interval Interval on how often to execute the script,
           *                            defined in model native time unit (e.g. fs for MD2D).
           * @param {function} action   Function containing user-defined script.
           */
          callEvery: function callEvery(interval, action) {
            var lastCall = 0;

            function checkTime() {
              while (model.properties.time - lastCall >= interval) {
                action();
                lastCall += interval;
              }
            }

            function resetState() {
              lastCall = 0;
            }

            function onStartHandler() {
              // This callback handles situation in which user moved back in time using tick
              // history and clicked play again.
              while (lastCall > model.properties.time) {
                lastCall -= interval;
              }
            }

            model.addObserver('time', checkTime);
            onModelReset(resetState);
            this.onStart(onStartHandler);
          },

          /**
           * Sets a custom click handler for objects of a given type.
           * Basic type which is always supported is "background". It is empty
           * area of a model. Various models can support different clickable
           * types. Please see the model documentation to check what
           * other object types are supported.
           *
           * Behind the scenes this functions uses class selector. So you can
           * also inspect SVG image and check what is class of interesting
           * object and try to use it.
           *
           * MD2D specific notes:
           * Supported types: "background", "atom", "obstacle", "image", "textBox".
           * TODO: move it to MD2D related docs in the future.
           *
           * @param {string}   type    Name of the type of clickable objects.
           * @param {Function} handler Custom click handler. It will be called
           *                           when object is clicked with (x, y, d, i) arguments:
           *                             x - x coordinate in model units,
           *                             y - y coordinate in model units,
           *                             d - data associated with a given object (can be undefined!),
           *                             i - ID of clicked object (usually its value makes sense if d is defined).
           */
          onClick: function onClick(type, handler) {
            // Append '.' to make API simpler.
            // So authors can just specify onClick("atom", ...) instead of class selectors.
            interactivesController.modelController.modelContainer.setClickHandler("." + type, handler);
          },

          /**
           * Sets a custom drag handler for objects of a given type.
           * Drag handler will be executed after position of an object is updated due to user
           * dragging action, so custom handler can affect it (e.g. limit to only one axis), e.g:
           *
           *   onDrag("atom", function (x, y, i, d) {
           *     setAtomProperties(i, {y: 2});
           *   });
           *
           * MD2D specific notes:
           * only "atom" type is supported.
           *
           * @param {string}   type    Name of the type of draggable objects.
           * @param {Function} handler Custom drag handler. It will be called
           *                           when object is dragged with (x, y, d, i) arguments:
           *                             x - x coordinate in model units,
           *                             y - y coordinate in model units,
           *                             d - data associated with a given object (can be undefined!),
           *                             i - ID of an object (usually its value makes sense if d is defined).
           */
          onDrag: function onDrag(type, handler) {
            interactivesController.modelController.modelContainer.setDragHandler(type, handler);
          },

          /**
           * Sets custom select handler. It enables select action and lets author provide custom handler
           * which is executed when select action is finished. The area of selection is passed to handler
           * as arguments. It is defined by rectangle - its lower left corner coordinates, width and height.
           *
           * @param {Function} handler Custom select handler. It will be called
           *                           when select action is finished with (x, y, w, h) arguments:
           *                             x - x coordinate of lower left selection corner (in model units),
           *                             y - y coordinate of lower left selection corner (in model units),
           *                             width  - width of selection rectangle (in model units),
           *                             height - height of selection rectangle (in model units).
           */
          onSelect: function onSelect(handler) {
            interactivesController.modelController.modelContainer.setSelectHandler(handler);
          },

          setComponentDisabled: function setComponentDisabled(compID, v) {
            interactivesController.getComponent(compID).setDisabled(v);
          },

          /**
            Clears data set completely.
           */
          clearDataSet: function clearDataSet(name) {
            interactivesController.getDataSet(name).clearData();
          },

          /**
            Resets data sat to its initial data. When initial data is not provided, clears data
            set (in such case this function behaves exactly like .clearDataSet()).
           */
          resetDataSet: function resetDataSet(name) {
            interactivesController.getDataSet(name).resetData();
          },

          resetDataSetProperties: function resetDataSetProperties(name, props) {
            interactivesController.getDataSet(name).resetProperties(props);
          },

          /**
            Used when manually adding points to a graph or a table.
            Normally the graph or table property streamDataFromModel should be false
            when using this function.
          */
          appendDataPropertiesToComponent: function appendDataPropertiesToComponent(compID) {
            var comp = interactivesController.getComponent(compID);
            if (comp !== undefined) {
              comp.appendDataPropertiesToComponent();
            }
          },

          /**
            Change attributes of an existing component.

            WARNING: the current implementation of this function is very limited. Despite its
                     generic name, it only lets you change graph's attributes or button's label.
          */
          setComponentAttributes: function setComponentAttributes(componentID, opts) {
            var comp = interactivesController.getComponent(componentID);

            if (!comp) {
              throw new Error("Component " + componentID + " not found.");
            }
            if (typeof(comp.setAttributes) !== "function") {
              throw new Error("Component " + componentID + " does not support dynamic attributes change.");
            }
            comp.setAttributes(opts);
          },

          /**
            Set the ranges of graph component to match the ranges of the properties it is graphing.
          */
          syncAxisRangesToPropertyRanges: function syncAxisRangesToPropertyRanges(componentID) {
            var component = interactivesController.getComponent(componentID);

            if (!component) {
              throw new Error("Component " + componentID + " not found.");
            }
            if (!component.syncAxisRangesToPropertyRanges) {
              throw new Error("Component " + componentID + " does not support syncAxisRangesToPropertyRanges.");
            }

            component.syncAxisRangesToPropertyRanges();
          },

          scrollXAxisToZero: function scrollXAxisToZero(componentID) {
            var component = interactivesController.getComponent(componentID);

            if (!component) {
              throw new Error("Component " + componentID + " not found.");
            }
            if (!component.scrollXAxisToZero) {
              throw new Error("Component " + componentID + " does not support scrollXAxisToZero.");
            }

            component.scrollXAxisToZero();
          },

          resetGraphSelection: function resetGraphSelectionDomain(componentID) {
            var component = interactivesController.getComponent(componentID);

            if (!component) {
              throw new Error("Component " + componentID + " not found.");
            }
            if (!component.selectionDomain) {
              throw new Error("Component " + componentID + " does not support selectionDomain.");
            }
            if (!component.selectionEnabled) {
              throw new Error("Component " + componentID + " does not support selectionEnabled.");
            }

            component.selectionDomain(null);
            component.selectionEnabled(false);
          },

          addAnnotation: function addAnnotation(componentID, annotation) {
            var component = interactivesController.getComponent(componentID);

            if (!component) {
              throw new Error("Component " + componentID + " not found.");
            }
            if (!component.addAnnotation) {
              throw new Error("Component " + componentID + " does not support addAnnotation.");
            }

            component.addAnnotation(annotation);
          },

          resetAnnotations: function resetAnnotations(componentID) {
            var component = interactivesController.getComponent(componentID);

            if (!component) {
              throw new Error("Component " + componentID + " not found.");
            }
            if (!component.resetAnnotations) {
              throw new Error("Component " + componentID + " does not support resetAnnotations.");
            }

            component.resetAnnotations();
          },

          start: function start() {
            model.start();
            trackEvent('Interactive', "Start", "Starting interactive: " + interactivesController.get('title') );
          },

          onStart: function onStart(handler) {
            model.on("play.custom-script" + (namespaceCount++), handler);
          },

          stop: function stop() {
            model.stop();
          },

          onStop: function onStop(handler) {
            model.on("stop.custom-script", handler);
          },

          /**
           * Reload the model. The interactives controller will emit a 'willResetModel'.
           * The willResetModel observers can ask to wait for asynchronous confirmation before
           * the model is actually reloaded.
           * @param  {object} options hash of options, supported properties:
           *                         * propertiesToRetain - a list of properties to save before
           *                           the model reload and restore after reload.
           *                         * cause - cause of the reload action, it can be e.g. "reload"
           *                           or "new-run". It will be passed to "modelLoaded" event handlers.
           */
          reloadModel: function reloadModel(options) {
            interactivesController.reloadModel(options);
          },

          /**
           * Reload the interactive. The interactives controller will emit a 'willResetModel',
           * as obviously the interactive reload causes the model to be restored to its initial
           * state too. The willResetModel observers can ask to wait for asynchronous confirmation
           * before the interactive and model is actually reloaded.
           */
          reloadInteractive: function reloadInteractive() {
            interactivesController.reloadInteractive();
          },

          stepForward: function stepForward() {
            model.stepForward();
            if (!model.isNewStep()) {
              interactivesController.updateModelView();
            }
          },

          stepBack: function stepBack() {
            model.stepBack();
            interactivesController.updateModelView();
          },

          tick: function tick() {
            model.tick();
          },

          isStopped: function isStopped() {
            return model.isStopped();
          },

          getTime: function getTime() {
            return model.get('time');
          },

          /**
           * Returns number of frames per second.
           * @return {number} frames per second.
           */
          getFPS: function getFPS() {
            return model.getFPS();
          },

          /**
           * Returns "simulation progress rate".
           * It indicates how much of simulation time is calculated for
           * one second of real time.
           * @return {number} simulation progress rate.
           */
          getSimulationProgressRate: function getSimulationProgressRate() {
            return model.getSimulationProgressRate();
          },

          startPerformanceTuning: function startPerformanceTuning() {
            model.performanceOptimizer.enable();
          },

          repaint: function repaint() {
            interactivesController.repaintModelView();
          },

          canExportData: function canExportData() {
            var exportController = interactivesController.exportController;
            return exportController && exportController.canExportData() || false;
          },

          isUnexportedDataPresent: function isUnexportedDataPresent() {
            var exportController = interactivesController.exportController;
            return exportController && exportController.isUnexportedDataPresent() || false;
          },

          dataAreAvailableForExport: function dataAreAvailableForExport() {
            var exportController = interactivesController.exportController;
            return exportController && exportController.dataAreAvailableForExport() || false;
          },

          exportData: function exportData() {
            var exportController = interactivesController.exportController;
            if (!exportController || !exportController.canExportData()) {
              throw new Error("No exports have been specified.");
            }
            exportController.exportData();
          },

          Math: Math,
          Infinity: Infinity,
          isFinite: isFinite,
          NaN: NaN,
          isNaN: isNaN,

          // Prevent sandbox from overwriting window.undefined (this can still happen in browsers
          // that haven't implemented immutable undefined--mainly IE9, Safari 5)
          undefined: void 0,

          // Rudimentary debugging functionality. Use Lab alert helper function.
          alert: alert,

          // safe versions of setTimeout and setInterval
          setTimeout: function setTimeout(handler) {

            // Ensure that we don't leak "window" to handler function.
            if ( ! handler || handler.constructor !== Function ) {
              throw new TypeError("Must pass a Function instance to Lab's setTimeout.");
            }

            var args = Array.prototype.slice.apply(arguments);
            // By the spec, setTimeout explicitly sets the thisValue of the handler to global object
            // http://www.whatwg.org/specs/web-apps/current-work/multipage/webappapis.html#timers
            // (work through the "timer initialization steps" algorithm)
            // Ensure that the thisValue is undefined/null:
            args[0] = handler.bind(undefined);
            return window.setTimeout.apply(window, args);
          },

          setInterval: function setInterval(handler) {
            if ( ! handler || handler.constructor !== Function ) {
              throw new TypeError("Must pass a Function instance to Lab's setInterval.");
            }

            var args = Array.prototype.slice.apply(arguments);
            args[0] = handler.bind(undefined);
            return window.setInterval.apply(window, args);
          },

          clearTimeout:  window.clearTimeout,

          clearInterval: window.clearInterval,

          console: window.console !== null ? window.console : {
            log: function() {},
            error: function() {},
            warn: function() {},
            dir: function() {}
          }
        };
      }()),

      /**
       * Current model.
       */
      get model() {
        return model;
      },

      /**
       * InteractivesController instance.
       */
      get intController() {
        return interactivesController;
      },

      /**
       * Bind a new model to Scripting API.
       */
      bindModel: function (newModel) {
        model = newModel;
      },

      /**
        Freeze Scripting API
        Make the scripting API immutable once defined
      */
      freeze: function () {
        Object.freeze(this.api);
      },

      /**
        Extend Scripting API
      */
      extend: function (ModelScriptingAPI) {
        $.extend(this.api, new ModelScriptingAPI(this));
      },

      /**
        Allow console users to try script actions
      */
      exposeScriptingAPI: function () {
        window.script = this.api;
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
          return controller.makeFunctionInScriptContext.apply(null, argNames.concat(source)).apply(null, argVals);
        };
      },

      /**
        Given a script string, return a function that executes that script in a
        context containing *only* the bindings to names we supply.

        This isn't intended for XSS protection (in particular it relies on strict
        mode.) Rather, it's so script authors don't get too clever and start relying
        on accidentally exposed functionality, before we've made decisions about
        what scripting API and semantics we want to support.
      */
      makeFunctionInScriptContext: function () {
            // First n-1 arguments to this function are the names of the arguments to the script.
        var argumentsToScript = Array.prototype.slice.call(arguments, 0, arguments.length - 1),

            // Last argument is the function body of the script, as a string or array of strings.
            scriptSource = arguments[arguments.length - 1],

            scriptFunctionMakerSource,
            scriptFunctionMaker,
            scriptFunction;

        if (typeof scriptSource !== 'string') scriptSource = scriptSource.join('      \n');

        scriptFunctionMakerSource =
          "with (shadowedGlobals) {\n" +
          "  with (scriptingAPI) {\n" +
          "    return function(" + argumentsToScript.join(',') +  ") {\n" +
          "      'use " + "strict';\n" +
          "      " + scriptSource + "\n" +
          "    };\n" +
          "  }\n" +
          "}";

        try {
          scriptFunctionMaker = new Function('shadowedGlobals', 'scriptingAPI', scriptFunctionMakerSource);
          scriptFunction = scriptFunctionMaker(shadowedGlobals, controller.api);
        } catch (e) {
          alert("Error compiling script: \"" + e.toString() + "\"\nScript:\n\n" + scriptSource);
          return function() {
            throw new Error("Cannot run a script that could not be compiled");
          };
        }

        // This function runs the script with all globals shadowed:
        return function() {
          setShadowedGlobals();
          try {
            // invoke the script, passing only enough arguments for the whitelisted names
            return scriptFunction.apply(null, Array.prototype.slice.call(arguments));
          } catch (e) {
            alert("Error running script: \"" + e.toString() + "\"\nScript:\n\n" + scriptSource);
          }
        };
      }
    };

    return controller;
  };
});

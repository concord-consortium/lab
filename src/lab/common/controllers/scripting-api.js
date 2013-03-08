/*global d3, $, define, model */

define(function (require) {

  var alert = require('common/alert');

  //
  // Define the scripting API used by 'action' scripts on interactive elements.
  //
  // The properties of the object below will be exposed to the interactive's
  // 'action' scripts as if they were local vars. All other names (including
  // all globals, but exluding Javascript builtins) will be unavailable in the
  // script context; and scripts are run in strict mode so they don't
  // accidentally expose or read globals.
  //
  return function ScriptingAPI (interactivesController, modelScriptingAPI) {

    var scriptingAPI = (function() {

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

        isInteger: isInteger,
        isArray: isArray,
        randomInteger: randomInteger,
        swapElementsOfArray: swapElementsOfArray,
        choose: choose,

        deg2rad: Math.PI/180,
        rad2deg: 180/Math.PI,

        format: d3.format,

        get: function get() {
          return model.get.apply(model, arguments);
        },

        set: function set() {
          return model.set.apply(model, arguments);
        },

        loadModel: function loadModel(modelId, cb) {
          model.stop();

          interactivesController.loadModel(modelId);

          if (typeof cb === 'function') {
            interactivesController.pushOnLoadScript(cb);
          }
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

        start: function start() {
          model.start();
        },

        stop: function stop() {
          model.stop();
        },

        reset: function reset() {
          model.stop();
          interactivesController.modelController.reload();
        },

        tick: function tick() {
          model.tick();
        },


        getTime: function getTime() {
          return model.get('time');
        },

        repaint: function repaint() {
          interactivesController.getModelController().repaint();
        },

        exportData: function exportData() {
          var dgExport = interactivesController.getDGExportController();
          if (!dgExport)
            throw new Error("No exports have been specified.");
          dgExport.exportData();
        },

        Math: Math,

        // Rrevent us from overwriting window.undefined.
        "undefined": undefined,

        // Rudimentary debugging functionality. Use Lab alert helper function.
        alert: alert,

        console: window.console !== null ? window.console : {
          log: function() {},
          error: function() {},
          warn: function() {},
          dir: function() {}
        }
      };

    }());

    var controller = {
      /**
        Freeze Scripting API
        Make the scripting API immutable once defined
      */
      freeze: function () {
        Object.freeze(scriptingAPI);
      },

      /**
        Extend Scripting API
      */
      extend: function (ModelScriptingAPI) {
        $.extend(scriptingAPI, new ModelScriptingAPI(scriptingAPI));
      },

      /**
        Allow console users to try script actions
      */
      exposeScriptingAPI: function () {
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

            // This object is the outer context in which the script is executed. Every time the script
            // is executed, it contains the value 'undefined' for all the currently defined globals.
            // This prevents at least inadvertent reliance by the script on unintentinally exposed
            // globals.

        var shadowedGlobals = {},

            // First n-1 arguments to this function are the names of the arguments to the script.
            argumentsToScript = Array.prototype.slice.call(arguments, 0, arguments.length - 1),

            // Last argument is the function body of the script, as a string or array of strings.
            scriptSource = arguments[arguments.length - 1],

            scriptFunctionMakerSource,
            scriptFunctionMaker,
            scriptFunction;

        if (typeof scriptSource !== 'string') scriptSource = scriptSource.join('      \n');

        // Make shadowedGlobals contain keys for all globals (properties of 'window')
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
              err = (function(key) {
                return function() { throw new ReferenceError(key + " is not defined"); };
              }(key));

              Object.defineProperty(shadowedGlobals, key, {
                set: err,
                get: err
              });
            }
          }
        }

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
          scriptFunctionMaker = new Function('shadowedGlobals', 'scriptingAPI', 'scriptSource', scriptFunctionMakerSource);
          scriptFunction = scriptFunctionMaker(shadowedGlobals, scriptingAPI, scriptSource);
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

/*global d3 $ define model alert */

define(function (require) {

  //
  // Define the scripting API used by 'action' scripts on interactive elements.
  //
  // The properties of the object below will be exposed to the interactive's
  // 'action' scripts as if they were local vars. All other names (including
  // all globals, but exluding Javascript builtins) will be unavailable in the
  // script context; and scripts are run in strict mode so they don't
  // accidentally expose or read globals.
  //
  return function ScriptingAPI (interactivesController) {

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

          interactivesController.loadModel(modelId);

          if (typeof cb === 'function') {
            interactivesController.pushOnLoadScript(cb);
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

        /**
          Sets custom pairwise LJ properties (epsilon or sigma), which will
          be used instead of the mean values of appropriate element properties.
          i, j - IDs of the elements which should have custom pairwise LJ properties.
          props - object containing sigma, epsilon or both.
          e.g. setPairwiseLJProperties(0, 1, {epsilon: -0.2})
        */
        setPairwiseLJProperties: function setPairwiseLJProperties(i, j, props) {
          model.getPairwiseLJProperties().set(i, j, props);
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
          Sets solvent. You can use three predefined solvents: "water", "oil" or "vacuum".
          This is only a convenience method. The same effect can be achieved by manual setting
          of 'solventForceFactor', 'dielectricConstant' and 'backgroundColor' properties.
        */
        setSolvent: function setSolvent(type) {
          model.setSolvent(type);
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
          interactivesController.modelController.reload();
        },

        tick: function tick() {
          model.tick();
        },

        minimizeEnergy: function minimizeEnergy() {
          model.minimizeEnergy();
          scriptingAPI.repaint();
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

    // Make the scripting API immutable once defined
    Object.freeze(scriptingAPI);

    return {
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
          return this.makeFunctionInScriptContext.apply(null, argNames.concat(source)).apply(null, argVals);
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
  };
});

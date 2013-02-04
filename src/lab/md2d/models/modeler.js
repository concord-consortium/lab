/*global define: false, d3: false, $: false */
/*jslint onevar: true devel:true eqnull: true boss: true */

define(function(require) {
  // Dependencies.
  var arrays               = require('arrays'),
      console              = require('common/console'),
      md2d                 = require('md2d/models/engine/md2d'),
      metadata             = require('md2d/models/metadata'),
      TickHistory          = require('common/models/tick-history'),
      RunningAverageFilter = require('cs!md2d/models/running-average-filter'),
      Solvent              = require('cs!md2d/models/solvent'),
      serialize            = require('common/serialize'),
      validator            = require('common/validator'),
      aminoacids           = require('md2d/models/aminoacids-props'),
      aminoacidsHelper     = require('cs!md2d/models/aminoacids-helper'),
      units                = require('md2d/models/engine/constants/units'),
      _ = require('underscore');

  return function Model(initialProperties) {

    // all models created with this constructor will be of type: "md2d"
    this.constructor.type = "md2d";

    var model = {},
        dispatch = d3.dispatch("tick", "play", "stop", "reset", "stepForward", "stepBack",
                               "seek", "addAtom", "removeAtom", "addRadialBond", "removeRadialBond",
                               "removeAngularBond", "invalidation", "textBoxesChanged"),
        VDWLinesCutoffMap = {
          "short": 1.33,
          "medium": 1.67,
          "long": 2.0
        },
        defaultMaxTickHistory = 1000,
        stopped = true,
        restart = false,
        newStep = false,
        translationAnimInProgress = false,
        lastSampleTime,
        sampleTimes = [],

        modelOutputState,
        tickHistory,

        // Molecular Dynamics engine.
        engine,

        // An array of elements object.
        editableElements,

        // ######################### Main Data Structures #####################
        // They are initialized at the end of this function. These data strucutres
        // are mainly managed by the engine.

        // A hash of arrays consisting of arrays of atom property values
        atoms,

        // A hash of arrays consisting of arrays of element property values
        elements,

        // A hash of arrays consisting of arrays of obstacle property values
        obstacles,

        // A hash of arrays consisting of arrays of radial bond property values
        radialBonds,

        // A hash of arrays consisting of arrays of angular bond property values
        angularBonds,

        // A hash of arrays consisting of arrays of restraint property values
        // (currently atom-only)
        restraints,

        // ####################################################################

        // A two dimensional array consisting of atom index numbers and atom
        // property values - in effect transposed from the atom property arrays.
        results,

        // A two dimensional array consisting of radial bond index numbers, radial bond
        // properties, and the postions of the two bonded atoms.
        radialBondResults,

        // The index of the "spring force" used to implement dragging of atoms in a running model
        liveDragSpringForceIndex,

        // Cached value of the 'friction' property of the atom being dragged in a running model
        liveDragSavedFriction,

        listeners = {},

        properties = {
          /**
            These functions are optional setters that will be called *instead* of simply setting
            a value when 'model.set({property: value})' is called, and are currently needed if you
            want to pass a value through to the engine.  The function names are automatically
            determined from the property name. If you define one of these custom functions, you
            must remember to also set the property explicitly (if appropriate) as this won't be
            done automatically
          */

          set_targetTemperature: function(t) {
            this.targetTemperature = t;
            if (engine) {
              engine.setTargetTemperature(t);
            }
          },

          set_temperatureControl: function(tc) {
            this.temperatureControl = tc;
            if (engine) {
              engine.useThermostat(tc);
            }
          },

          set_lennardJonesForces: function(lj) {
            this.lennardJonesForces = lj;
            if (engine) {
              engine.useLennardJonesInteraction(lj);
            }
          },

          set_coulombForces: function(cf) {
            this.coulombForces = cf;
            if (engine) {
              engine.useCoulombInteraction(cf);
            }
          },

          set_solventForceType: function(s) {
            this.solventForceType = s;
            if (engine) {
              engine.setSolventForceType(s);
            }
          },

          set_solventForceFactor: function(s) {
            this.solventForceFactor = s;
            if (engine) {
              engine.setSolventForceFactor(s);
            }
          },

          set_additionalSolventForceMult: function(s) {
            this.additionalSolventForceMult = s;
            if (engine) {
              engine.setAdditionalSolventForceMult(s);
            }
          },

          set_additionalSolventForceThreshold: function(s) {
            this.additionalSolventForceThreshold = s;
            if (engine) {
              engine.setAdditionalSolventForceThreshold(s);
            }
          },

          set_dielectricConstant: function(dc) {
            this.dielectricConstant = dc;
            if (engine) {
              engine.setDielectricConstant(dc);
            }
          },

          set_realisticDielectricEffect: function (rdc) {
            this.realisticDielectricEffect = rdc;
            if (engine) {
              engine.setRealisticDielectricEffect(rdc);
            }
          },

          set_VDWLinesCutoff: function(cutoff) {
            var ratio;
            this.VDWLinesCutoff = cutoff;
            ratio = VDWLinesCutoffMap[cutoff];
            if (ratio && engine) {
              engine.setVDWLinesRatio(ratio);
            }
          },

          set_gravitationalField: function(gf) {
            this.gravitationalField = gf;
            if (engine) {
              engine.setGravitationalField(gf);
            }
          },

          set_modelSampleRate: function(rate) {
            this.modelSampleRate = rate;
            if (!stopped) model.restart();
          },

          set_timeStep: function(ts) {
            this.timeStep = ts;
          },

          set_viscosity: function(v) {
            this.viscosity = v;
            if (engine) {
              engine.setViscosity(v);
            }
          },

          set_polarAAEpsilon: function (e) {
            var polarAAs, element1, element2,
                i, j, len;

            this.polarAAEpsilon = e;

            if (engine) {
              // Set custom pairwise LJ properties for polar amino acids.
              // They should attract stronger to better mimic nature.
              polarAAs = aminoacidsHelper.getPolarAminoAcids();
              for (i = 0, len = polarAAs.length; i < len; i++) {
                element1 = polarAAs[i];
                for (j = i + 1; j < len; j++) {
                  element2 = polarAAs[j];
                  // Set custom pairwise LJ epsilon (default one for AA is -0.1).
                  engine.pairwiseLJProperties.set(element1, element2, {epsilon: e});
                }
              }
            }
          }
        },

        // The list of all 'output' properties (which change once per tick).
        outputNames = [],

        // Information about the description and calculating function for 'output' properties.
        outputsByName = {},

        // The subset of outputName list, containing list of outputs which are filtered
        // by one of the built-in filters (like running average filter).
        filteredOutputNames = [],

        // Function adding new sample for filtered outputs. Other properties of filtered output
        // are stored in outputsByName object, as filtered output is just extension of normal output.
        filteredOutputsByName = {},

        // The currently-defined parameters.
        parametersByName = {};

    function notifyPropertyListeners(listeners) {
      listeners = _.uniq(listeners);
      for (var i=0, ii=listeners.length; i<ii; i++){
        listeners[i]();
      }
    }

    function notifyPropertyListenersOfEvents(events) {
      var evt,
          evts,
          waitingToBeNotified = [],
          i, ii;

      if (typeof events === "string") {
        evts = [events];
      } else {
        evts = events;
      }
      for (i=0, ii=evts.length; i<ii; i++){
        evt = evts[i];
        if (listeners[evt]) {
          waitingToBeNotified = waitingToBeNotified.concat(listeners[evt]);
        }
      }
      if (listeners["all"]){      // listeners that want to be notified on any change
        waitingToBeNotified = waitingToBeNotified.concat(listeners["all"]);
      }
      notifyPropertyListeners(waitingToBeNotified);
    }

    /**
      Restores a set of "input" properties, notifying their listeners of only those properties which
      changed, and only after the whole set of properties has been updated.
    */
    function restoreProperties(savedProperties) {
      var property,
          changedProperties = [],
          savedValue;

      for (property in savedProperties) {
        if (savedProperties.hasOwnProperty(property)) {
          // skip read-only properties
          if (outputsByName[property]) {
            throw new Error("Attempt to restore output property \"" + property + "\".");
          }
          savedValue = savedProperties[property];
          if (properties[property] !== savedValue) {
            if (properties["set_"+property]) {
              properties["set_"+property](savedValue);
            } else {
              properties[property] = savedValue;
            }
            changedProperties.push(property);
          }
        }
      }
      notifyPropertyListenersOfEvents(changedProperties);
    }

    /**
      Restores a list of parameter values, notifying their listeners after the whole list is
      updated, and without triggering setters. Sets parameters not in the passed-in list to
      undefined.
    */
    function restoreParameters(savedParameters) {
      var parameterName,
          observersToNotify = [];

      for (parameterName in savedParameters) {
        if (savedParameters.hasOwnProperty(parameterName)) {
          // restore the property value if it was different or not defined in the current time step
          if (properties[parameterName] !== savedParameters[parameterName] || !parametersByName[parameterName].isDefined) {
            properties[parameterName] = savedParameters[parameterName];
            parametersByName[parameterName].isDefined = true;
            observersToNotify.push(parameterName);
          }
        }
      }

      // remove parameter values that aren't defined at this point in history
      for (parameterName in parametersByName) {
        if (parametersByName.hasOwnProperty(parameterName) && !savedParameters.hasOwnProperty(parameterName)) {
          parametersByName[parameterName].isDefined = false;
          properties[parameterName] = undefined;
        }
      }

      notifyPropertyListenersOfEvents(observersToNotify);
    }

    function average_speed() {
      var i, s = 0, n = model.get_num_atoms();
      i = -1; while (++i < n) { s += engine.atoms.speed[i]; }
      return s/n;
    }

    function tick(elapsedTime, dontDispatchTickEvent) {
      var timeStep = model.get('timeStep'),
          // Save number of radial bonds in engine before integration,
          // as integration can create new disulfide bonds. This is the
          // only type of objects which can be created by the engine autmatically.
          prevNumOfRadialBonds = engine.getNumberOfRadialBonds(),
          t, sampleTime;

      if (!stopped) {
        t = Date.now();
        if (lastSampleTime) {
          sampleTime = t - lastSampleTime;
          sampleTimes.push(sampleTime);
          sampleTimes.splice(0, sampleTimes.length - 128);
        } else {
          lastSampleTime = t;
        }
      }

      // viewRefreshInterval is defined in Classic MW as the number of timesteps per view update.
      // However, in MD2D we prefer the more physical notion of integrating for a particular
      // length of time.
      console.time('integration');
      engine.integrate(model.get('viewRefreshInterval') * timeStep, timeStep);
      console.timeEnd('integration');
      console.time('reading model state');
      updateAllOutputProperties();
      console.timeEnd('reading model state');

      console.time('tick history push');
      tickHistory.push();
      console.timeEnd('tick history push');

      newStep = true;

      if (!dontDispatchTickEvent) {
        dispatch.tick();
      }

      if (prevNumOfRadialBonds < engine.getNumberOfRadialBonds()) {
        dispatch.addRadialBond();
      }

      return stopped;
    }

    function average_rate() {
      var i, ave, s = 0, n = sampleTimes.length;
      i = -1; while (++i < n) { s += sampleTimes[i]; }
      ave = s/n;
      return (ave ? 1/ave*1000: 0);
    }

    function set_properties(hash) {
      var property, propsChanged = [];
      for (property in hash) {
        if (hash.hasOwnProperty(property) && hash[property] !== undefined && hash[property] !== null) {
          // skip read-only properties
          if (outputsByName[property]) {
            throw new Error("Attempt to set read-only output property \"" + property + "\".");
          }
          // look for set method first, otherwise just set the property
          if (properties["set_"+property]) {
            properties["set_"+property](hash[property]);
          // why was the property not set if the default value property is false ??
          // } else if (properties[property]) {
          } else {
            properties[property] = hash[property];
          }
          propsChanged.push(property);
        }
      }
      notifyPropertyListenersOfEvents(propsChanged);
    }

    /**
      Call this method after moving to a different model time (e.g., after stepping the model
      forward or back, seeking to a different time, or on model initialization) to update all output
      properties and notify their listeners. This method is more efficient for that case than
      updateOutputPropertiesAfterChange because it can assume that all output properties are
      invalidated by the model step. It therefore does not need to calculate any output property
      values; it allows them to be evaluated lazily instead. Property values are calculated when and
      if listeners request them. This method also guarantees that all properties have their updated
      value when they are requested by any listener.

      Technically, this method first updates the 'results' array and macrostate variables, then
      invalidates any  cached output-property values, and finally notifies all output-property
      listeners.

      Note that this method and updateOutputPropertiesAfterChange are the only methods which can
      flush the cached value of an output property. Therefore, be sure to not to make changes
      which would invalidate a cached value without also calling one of these two methods.
    */
    function updateAllOutputProperties() {
      var i, j, l;

      readModelState();

      // invalidate all cached values before notifying any listeners
      for (i = 0; i < outputNames.length; i++) {
        outputsByName[outputNames[i]].hasCachedValue = false;
      }

      // Update all filtered outputs.
      // Note that this have to be performed after invalidation of all outputs
      // (as filtered output can filter another output), but before notifying
      // listeners (as we want to provide current, valid value).
      for (i = 0; i < filteredOutputNames.length; i++) {
        filteredOutputsByName[filteredOutputNames[i]].addSample();
      }

      for (i = 0; i < outputNames.length; i++) {
        if (l = listeners[outputNames[i]]) {
          for (j = 0; j < l.length; j++) {
            l[j]();
          }
        }
      }
    }

    /**
      ALWAYS CALL THIS FUNCTION before any change to model state outside a model step
      (i.e., outside a tick, seek, stepForward, stepBack)

      Note:  Changes to view-only property changes that cannot change model physics might reasonably
      by considered non-invalidating changes that don't require calling this hook.
    */
    function invalidatingChangePreHook() {
      storeOutputPropertiesBeforeChange();
    }

    /**
      ALWAYS CALL THIS FUNCTION after any change to model state outside a model step.
    */
    function invalidatingChangePostHook() {
      updateOutputPropertiesAfterChange();
      if (tickHistory) tickHistory.invalidateFollowingState();
      dispatch.invalidation();
    }

    /**
      Call this method *before* changing any "universe" property or model property (including any
      property of a model object such as the position of an atom) to save the output-property
      values before the change. This is required to enabled updateOutputPropertiesAfterChange to be
      able to detect property value changes.

      After the change is made, call updateOutputPropertiesAfterChange to notify listeners.
    */
    function storeOutputPropertiesBeforeChange() {
      var i, outputName, output, l;

      for (i = 0; i < outputNames.length; i++) {
        outputName = outputNames[i];
        if ((l = listeners[outputName]) && l.length > 0) {
          output = outputsByName[outputName];
          // Can't save previous value in output.cachedValue because, before we check it, the
          // cachedValue may be overwritten with an updated value as a side effect of the
          // calculation of the updated value of some other property
          output.previousValue = output.hasCachedValue ? output.cachedValue : output.calculate();
        }
      }
    }

    /**
      Before changing any "universe" property or model property (including any
      property of a model object such as the position of an atom), call the method
      storeOutputPropertiesBeforeChange; after changing the property, call this method  to detect
      changed output-property values and to notify listeners of the output properties which have
      changed. (However, don't call either method after a model tick or step;
      updateAllOutputProperties is more efficient for that case.)
    */
    function updateOutputPropertiesAfterChange() {
      var i, j, output, outputName, l, listenersToNotify = [];

      readModelState();

      // Mark _all_ cached values invalid ... we're not going to be checking the values of the
      // unobserved properties, so we have to assume their value changed.
      for (i = 0; i < outputNames.length; i++) {
        output = outputsByName[outputNames[i]];
        output.hasCachedValue = false;
      }

      // Update all filtered outputs.
      // Note that this have to be performed after invalidation of all outputs
      // (as filtered output can filter another output).
      for (i = 0; i < filteredOutputNames.length; i++) {
        filteredOutputsByName[filteredOutputNames[i]].addSample();
      }

      // Keep a list of output properties that are being observed and which changed ... and
      // cache the updated values while we're at it
      for (i = 0; i < outputNames.length; i++) {
        outputName = outputNames[i];
        output = outputsByName[outputName];

        if ((l = listeners[outputName]) && l.length > 0) {
          // Though we invalidated all cached values above, nevertheless some outputs may have been
          // computed & cached during a previous pass through this loop, as a side effect of the
          // calculation of some other property. Therefore we can respect hasCachedValue here.
          if (!output.hasCachedValue) {
            output.cachedValue = output.calculate();
            output.hasCachedValue = true;
          }

          if (output.cachedValue !== output.previousValue) {
            for (j = 0; j < l.length; j++) {
              listenersToNotify.push(l[j]);
            }
          }
        }
        // Now that we're done with it, allow previousValue to be GC'd. (Of course, since we're
        // using an equality test to check for changes, it doesn't make sense to let outputs be
        // objects or arrays, yet)
        output.previousValue = null;
      }

      // Finally, now that all the changed properties have been cached, notify listeners
      for (i = 0; i < listenersToNotify.length; i++) {
        listenersToNotify[i]();
      }
    }

    /**
      This method is called to refresh the results array and macrostate variables (KE, PE,
      temperature) whenever an engine integration occurs or the model state is otherwise changed.

      Normally, you should call the methods updateOutputPropertiesAfterChange or
      updateAllOutputProperties rather than calling this method. Calling this method directly does
      not cause output-property listeners to be notified, and calling it prematurely will confuse
      the detection of changed properties.
    */
    function readModelState() {
      var i, prop, n, amino;

      engine.computeOutputState(modelOutputState);

      extendResultsArray();

      // Transpose 'atoms' object into 'results' for easier consumption by view code
      for (i = 0, n = model.get_num_atoms(); i < n; i++) {
        for (prop in atoms) {
          if (atoms.hasOwnProperty(prop)) {
            results[i][prop] = atoms[prop][i];
          }
        }

        // Additional properties, used only by view.
        if (aminoacidsHelper.isAminoAcid(atoms.element[i])) {
          amino = aminoacidsHelper.getAminoAcidByElement(atoms.element[i]);
          results[i].symbol = amino.symbol;
          results[i].label = amino.abbreviation;
        }
      }
    }

    /**
      Ensure that the 'results' array of arrays is defined and contains one typed array per atom
      for containing the atom properties.
    */
    function extendResultsArray() {
      var isAminoAcid = function () {
            return aminoacidsHelper.isAminoAcid(this.element);
          },
          i, len;

      // TODO: refactor whole approach to creation of objects from flat arrays.
      // Think about more general way of detecting and representing amino acids.
      // However it would be reasonable to perform such refactoring later, when all requirements
      // related to proteins engine are clearer.

      if (!results) results = [];

      for (i = results.length, len = model.get_num_atoms(); i < len; i++) {
        if (!results[i]) {
          results[i] = {
            idx: i,
            // Provide convenience function for view, do not force it to ask
            // model / engine directly. In the future, atom objects should be
            // represented by a separate class.
            isAminoAcid: isAminoAcid
          };
        }
      }
    }

    /**
      Create set of amino acids elements. Use descriptions
      provided in 'aminoacids' array.
    */
    function createAminoAcids() {
      var sigmaIn01Angstroms,
          sigmaInNm,
          i, len;

      // Note that amino acids ALWAYS have IDs from
      // AMINO_ELEMENT_FIRST_IDX (= 5) to AMINO_ELEMENT_LAST_IDX (= 24).
      // This is enforced by backward compatibility with Classic MW.

      // At the beginning, ensure that elements from 0 to 24 exists.
      for (i = engine.getNumberOfElements(); i <= aminoacidsHelper.lastElementID; i++) {
        model.addElement({
          id: i
        });
      }

      // Set amino acids properties using elements from 5 to 24.
      for (i = 0, len = aminoacids.length; i < len; i++) {
        // Note that sigma is calculated using Classic MW approach.
        // See: org.concord.mw2d.models.AminoAcidAdapter
        // Basic length unit in Classic MW is 0.1 Angstrom.
        sigmaIn01Angstroms = 18 * Math.pow(aminoacids[i].volume / aminoacids[0].volume, 0.3333333333333);
        sigmaInNm = units.convert(sigmaIn01Angstroms / 10, { from: units.unit.ANGSTROM, to: units.unit.NANOMETER });
        // Use engine's method instead of modeler's method to avoid validation.
        // Modeler's wrapper ensures that amino acid is immutable, so it won't allow
        // to set properties of amino acid.
        engine.setElementProperties(aminoacidsHelper.firstElementID + i, {
          mass: aminoacids[i].molWeight,
          sigma: sigmaInNm
          // Don't provide epsilon, as default value should be used.
          // Classic MW uses epsilon 0.1 for all amino acids, which is default one.
          // See: org.concord.mw2d.models.AtomicModel.resetElements()
        });
      }
    }

    // ------------------------------------------------------------
    //
    // Public functions
    //
    // ------------------------------------------------------------

    model.getStats = function() {
      return {
        time        : model.get('time'),
        speed       : average_speed(),
        ke          : model.get('kineticEnergy'),
        temperature : model.get('temperature'),
        current_step: tickHistory.get("counter"),
        steps       : tickHistory.get("length")-1
      };
    };

    // A convenience for interactively getting energy averages
    model.getStatsHistory = function(num) {
      var i, len, start,
          tick,
          ke, pe,
          ret = [];

      len = tickHistory.get("length");
      if (!arguments.length) {
        start = 0;
      } else {
        start = Math.max(len-num, 0);
      }
      ret.push("time (fs)\ttotal PE (eV)\ttotal KE (eV)\ttotal energy (eV)");

      for (i = start; i < len; i++) {
        tick = tickHistory.returnTick(i);
        pe = tick.output.PE;
        ke = tick.output.KE;
        ret.push(tick.output.time + "\t" + pe + "\t" + ke + "\t" + (pe+ke));
      }
      return ret.join('\n');
    };

    /**
      Current seek position
    */
    model.stepCounter = function() {
      return tickHistory.get("counter");
    };

    /**
      Current position of first value in tick history, normally this will be 0.
      This will be greater than 0 if maximum size of tick history has been exceeded.
    */
    model.stepStartCounter = function() {
      return tickHistory.get("startCounter");
    };

    /** Total number of ticks that have been run & are stored, regardless of seek
        position
    */
    model.steps = function() {
      return tickHistory.get("length");
    };

    model.isNewStep = function() {
      return newStep;
    };

    model.seek = function(location) {
      if (!arguments.length) { location = 0; }
      stopped = true;
      newStep = false;
      tickHistory.seekExtract(location);
      updateAllOutputProperties();
      dispatch.seek();
      return tickHistory.get("counter");
    };

    model.stepBack = function(num) {
      if (!arguments.length) { num = 1; }
      var i, index;
      stopped = true;
      newStep = false;
      i=-1; while(++i < num) {
        index = tickHistory.get("index");
        if (index > 0) {
          tickHistory.decrementExtract();
          updateAllOutputProperties();
          dispatch.stepBack();
        }
      }
      return tickHistory.get("counter");
    };

    model.stepForward = function(num) {
      if (!arguments.length) { num = 1; }
      var i, index, size;
      stopped = true;
      i=-1; while(++i < num) {
        index = tickHistory.get("index");
        size = tickHistory.get("length");
        if (index < size-1) {
          tickHistory.incrementExtract();
          updateAllOutputProperties();
          dispatch.stepForward();
        } else {
          tick();
        }
      }
      return tickHistory.get("counter");
    };

    /**
      Creates a new md2d engine and leaves it in 'engine'.
    */
    model.initializeEngine = function () {
      engine = md2d.createEngine();

      engine.setSize([model.get('width'), model.get('height')]);
      engine.useLennardJonesInteraction(model.get('lennardJonesForces'));
      engine.useCoulombInteraction(model.get('coulombForces'));
      engine.useThermostat(model.get('temperatureControl'));
      engine.setViscosity(model.get('viscosity'));
      engine.setVDWLinesRatio(VDWLinesCutoffMap[model.get('VDWLinesCutoff')]);
      engine.setGravitationalField(model.get('gravitationalField'));
      engine.setTargetTemperature(model.get('targetTemperature'));
      engine.setDielectricConstant(model.get('dielectricConstant'));
      engine.setRealisticDielectricEffect(model.get('realisticDielectricEffect'));
      engine.setSolventForceType(model.get('solventForceType'));
      engine.setSolventForceFactor(model.get('solventForceFactor'));
      engine.setAdditionalSolventForceMult(model.get('additionalSolventForceMult'));
      engine.setAdditionalSolventForceThreshold(model.get('additionalSolventForceThreshold'));

      // Register invalidating change hooks.
      // pairwiseLJProperties object allows to change state which defines state of the whole simulation.
      engine.pairwiseLJProperties.registerChangeHooks(invalidatingChangePreHook, invalidatingChangePostHook);
      engine.geneticProperties.registerChangeHooks(invalidatingChangePreHook, invalidatingChangePostHook);

      window.state = modelOutputState = {};

      // Copy reference to basic properties.
      atoms = engine.atoms;
      elements = engine.elements;
      radialBonds = engine.radialBonds;
      radialBondResults = engine.radialBondResults;
      angularBonds = engine.angularBonds;
      restraints = engine.restraints;
      obstacles = engine.obstacles;
    };

    model.createElements = function(_elements) {
      // Options for addElement method.
      var options = {
        // Deserialization process, invalidating change hooks will be called manually.
        deserialization: true
      },
      i, num, prop, elementProps;

      // Call the hook manually, as addElement won't do it due to
      // deserialization option set to true.
      invalidatingChangePreHook();

      if (_elements === undefined) {
        // Special case when elements are not defined.
        // Empty object will be filled with default values.
        model.addElement({id: 0}, options);
        return;
      }

      // _elements is hash of arrays (as specified in JSON model).
      // So, for each index, create object containing properties of
      // element 'i'. Later, use these properties to add element
      // using basic addElement method.
      for (i = 0, num = _elements.mass.length; i < num; i++) {
        elementProps = {};
        for (prop in _elements) {
          if (_elements.hasOwnProperty(prop)) {
            elementProps[prop] = _elements[prop][i];
          }
        }
        model.addElement(elementProps, options);
      }

      // Call the hook manually, as addRadialBond won't do it due to
      // deserialization option set to true.
      invalidatingChangePostHook();

      return model;
    };

    /**
      Creates a new set of atoms, but new engine is created at the beginning.
      TODO: this method makes no sense. Objects like obstacles, restraints etc.,
      will be lost. It's confusing and used *only* in tests for now.
      Think about API change. Probably the best option would be to just create new
      modeler each time using constructor.

      @config: either the number of atoms (for a random setup) or
               a hash specifying the x,y,vx,vy properties of the atoms
      When random setup is used, the option 'relax' determines whether the model is requested to
      relax to a steady-state temperature (and in effect gets thermalized). If false, the atoms are
      left in whatever grid the engine's initialization leaves them in.
    */
    model.createNewAtoms = function(config) {
      model.initializeEngine();
      model.createElements(editableElements);
      model.createAtoms(config);

      return model;
    };

    /**
      Creates a new set of atoms.

      @config: either the number of atoms (for a random setup) or
               a hash specifying the x,y,vx,vy properties of the atoms
      When random setup is used, the option 'relax' determines whether the model is requested to
      relax to a steady-state temperature (and in effect gets thermalized). If false, the atoms are
      left in whatever grid the engine's initialization leaves them in.
    */
    model.createAtoms = function(config) {
          // Options for addAtom method.
      var options = {
            // Do not check the position of atom, assume that it's valid.
            supressCheck: true,
            // Deserialization process, invalidating change hooks will be called manually.
            deserialization: true
          },
          i, num, prop, atomProps;

      // Call the hook manually, as addAtom won't do it due to
      // deserialization option set to true.
      invalidatingChangePreHook();

      if (typeof config === 'number') {
        num = config;
      } else if (config.num != null) {
        num = config.num;
      } else if (config.x) {
        num = config.x.length;
      }

      // TODO: this branching based on x, y isn't very clear.
      if (config.x && config.y) {
        // config is hash of arrays (as specified in JSON model).
        // So, for each index, create object containing properties of
        // atom 'i'. Later, use these properties to add atom
        // using basic addAtom method.
        for (i = 0; i < num; i++) {
          atomProps = {};
          for (prop in config) {
            if (config.hasOwnProperty(prop)) {
              atomProps[prop] = config[prop][i];
            }
          }
          model.addAtom(atomProps, options);
        }
      } else {
        for (i = 0; i < num; i++) {
          // Provide only required values.
          atomProps = {x: 0, y: 0};
          model.addAtom(atomProps, options);
        }
        // This function rearrange all atoms randomly.
        engine.setupAtomsRandomly({
          temperature: model.get('targetTemperature'),
          // Provide number of user-defined, editable elements.
          // There is at least one default element, even if no elements are specified in JSON.
          userElements: editableElements === undefined ? 1 : editableElements.mass.length
        });
        if (config.relax)
          engine.relaxToTemperature();
      }

      // Call the hook manually, as addAtom won't do it due to
      // deserialization option set to true.
      invalidatingChangePostHook();

      // Listeners should consider resetting the atoms a 'reset' event
      dispatch.reset();

      // return model, for chaining (if used)
      return model;
    };

    model.createRadialBonds = function(_radialBonds) {
          // Options for addRadialBond method.
      var options = {
            // Deserialization process, invalidating change hooks will be called manually.
            deserialization: true
          },
          num = _radialBonds.strength.length,
          i, prop, radialBondProps;

      // Call the hook manually, as addRadialBond won't do it due to
      // deserialization option set to true.
      invalidatingChangePreHook();

      // _radialBonds is hash of arrays (as specified in JSON model).
      // So, for each index, create object containing properties of
      // radial bond 'i'. Later, use these properties to add radial bond
      // using basic addRadialBond method.
      for (i = 0; i < num; i++) {
        radialBondProps = {};
        for (prop in _radialBonds) {
          if (_radialBonds.hasOwnProperty(prop)) {
            radialBondProps[prop] = _radialBonds[prop][i];
          }
        }
        model.addRadialBond(radialBondProps, options);
      }

      // Call the hook manually, as addRadialBond won't do it due to
      // deserialization option set to true.
      invalidatingChangePostHook();

      return model;
    };

    model.createAngularBonds = function(_angularBonds) {
          // Options for addAngularBond method.
      var options = {
            // Deserialization process, invalidating change hooks will be called manually.
            deserialization: true
          },
          num = _angularBonds.strength.length,
          i, prop, angularBondProps;

      // Call the hook manually, as addAngularBond won't do it due to
      // deserialization option set to true.
      invalidatingChangePreHook();

      // _angularBonds is hash of arrays (as specified in JSON model).
      // So, for each index, create object containing properties of
      // angular bond 'i'. Later, use these properties to add angular bond
      // using basic addAngularBond method.
      for (i = 0; i < num; i++) {
        angularBondProps = {};
        for (prop in _angularBonds) {
          if (_angularBonds.hasOwnProperty(prop)) {
            angularBondProps[prop] = _angularBonds[prop][i];
          }
        }
        model.addAngularBond(angularBondProps, options);
      }

      // Call the hook manually, as addRadialBond won't do it due to
      // deserialization option set to true.
      invalidatingChangePostHook();

      return model;
    };

    model.createRestraints = function(_restraints) {
      var num = _restraints.atomIndex.length,
          i, prop, restraintsProps;

      // _restraints is hash of arrays (as specified in JSON model).
      // So, for each index, create object containing properties of
      // restraint 'i'. Later, use these properties to add restraint
      // using basic addRestraint method.
      for (i = 0; i < num; i++) {
        restraintsProps = {};
        for (prop in _restraints) {
          if (_restraints.hasOwnProperty(prop)) {
            restraintsProps[prop] = _restraints[prop][i];
          }
        }
        model.addRestraint(restraintsProps);
      }

      return model;
    };

    model.createObstacles = function(_obstacles) {
      var numObstacles = _obstacles.x.length,
          i, prop, obstacleProps;

      // _obstacles is hash of arrays (as specified in JSON model).
      // So, for each index, create object containing properties of
      // obstacle 'i'. Later, use these properties to add obstacle
      // using basic addObstacle method.
      for (i = 0; i < numObstacles; i++) {
        obstacleProps = {};
        for (prop in _obstacles) {
          if (_obstacles.hasOwnProperty(prop)) {
            obstacleProps[prop] = _obstacles[prop][i];
          }
        }
        model.addObstacle(obstacleProps);
      }

      return model;
    };

    model.reset = function() {
      model.resetTime();
      tickHistory.restoreInitialState();
      dispatch.reset();
    };

    model.resetTime = function() {
      engine.setTime(0);
    };

    model.getTotalMass = function() {
      return engine.getTotalMass();
    };

    model.getAtomKineticEnergy = function(i) {
      return engine.getAtomKineticEnergy(i);
    };

    /**
      Attempts to add an 0-velocity atom to a random location. Returns false if after 10 tries it
      can't find a location. (Intended to be exposed as a script API method.)

      Optionally allows specifying the element (default is to randomly select from all editableElements) and
      charge (default is neutral).
    */
    model.addRandomAtom = function(el, charge) {
      if (el == null) el = Math.floor( Math.random() * elements.mass.length );
      if (charge == null) charge = 0;

      var size   = model.size(),
          radius = engine.getRadiusOfElement(el),
          x,
          y,
          loc,
          numTries = 0,
          // try at most ten times.
          maxTries = 10;

      do {
        x = Math.random() * size[0] - 2*radius;
        y = Math.random() * size[1] - 2*radius;

        // findMinimimuPELocation will return false if minimization doesn't converge, in which case
        // try again from a different x, y
        loc = engine.findMinimumPELocation(el, x, y, 0, 0, charge);
        if (loc && model.addAtom({ element: el, x: loc[0], y: loc[1], charge: charge })) return true;
      } while (++numTries < maxTries);

      return false;
    },

    /**
      Adds a new atom defined by properties.
      Intended to be exposed as a script API method also.

      Adjusts (x,y) if needed so that the whole atom is within the walls of the container.

      Returns false and does not add the atom if the potential energy change of adding an *uncharged*
      atom of the specified element to the specified location would be positive (i.e, if the atom
      intrudes into the repulsive region of another atom.)

      Otherwise, returns true.

      silent = true disables this check.
    */
    model.addAtom = function(props, options) {
      var size = model.size(),
          radius;

      options = options || {};

      // Validate properties, provide default values.
      props = validator.validateCompleteness(metadata.atom, props);

      // As a convenience to script authors, bump the atom within bounds
      radius = engine.getRadiusOfElement(props.element);
      if (props.x < radius) props.x = radius;
      if (props.x > size[0] - radius) props.x = size[0] - radius;
      if (props.y < radius) props.y = radius;
      if (props.y > size[1] - radius) props.y = size[1] - radius;

      // check the potential energy change caused by adding an *uncharged* atom at (x,y)
      if (!options.supressCheck && !engine.canPlaceAtom(props.element, props.x, props.y)) {
        // return false on failure
        return false;
      }

      // When atoms are being deserialized, the deserializing function
      // should handle change hooks due to performance reasons.
      if (!options.deserialization)
        invalidatingChangePreHook();
      engine.addAtom(props);
      if (!options.deserialization)
        invalidatingChangePostHook();

      if (!options.supressEvent) {
        dispatch.addAtom();
      }

      return true;
    },

    model.removeAtom = function(i, options) {
      var prevRadBondsCount = engine.getNumberOfRadialBonds(),
          prevAngBondsCount = engine.getNumberOfAngularBonds();

      options = options || {};

      invalidatingChangePreHook();
      engine.removeAtom(i);
      // Enforce modeler to recalculate results array.
      results.length = 0;
      invalidatingChangePostHook();

      if (!options.supressEvent) {
        // Notify listeners that atoms is removed.
        dispatch.removeAtom();

        // Removing of an atom can also cause removing of
        // the connected radial bond. Detect it and notify listeners.
        if (engine.getNumberOfRadialBonds() !== prevRadBondsCount) {
          dispatch.removeRadialBond();
        }
        if (engine.getNumberOfAngularBonds() !== prevAngBondsCount) {
          dispatch.removeAngularBond();
        }
      }
    },

    model.addElement = function(props) {
      // Validate properties, use default values if there is such need.
      props = validator.validateCompleteness(metadata.element, props);
      // Finally, add radial bond.
      engine.addElement(props);
    };

    model.addObstacle = function(props) {
      var validatedProps;

      if (props.color !== undefined && props.colorR === undefined) {
        // Convert color definition.
        // Both forms are supported:
        //   color: [ 128, 128, 255 ]
        // or
        //   colorR: 128,
        //   colorB: 128,
        //   colorG: 255
        props.colorR = props.color[0];
        props.colorG = props.color[1];
        props.colorB = props.color[2];
      }
      // Validate properties, use default values if there is such need.
      validatedProps = validator.validateCompleteness(metadata.obstacle, props);
      // Finally, add obstacle.
      invalidatingChangePreHook();
      engine.addObstacle(validatedProps);
      invalidatingChangePostHook();
    };

    model.removeObstacle = function (idx) {
      invalidatingChangePreHook();
      engine.removeObstacle(idx);
      invalidatingChangePostHook();
    };

    model.addRadialBond = function(props, options) {
      // Validate properties, use default values if there is such need.
      props = validator.validateCompleteness(metadata.radialBond, props);

      // During deserialization change hooks are managed manually.
      if (!options || !options.deserialization)
        invalidatingChangePreHook();

      // Finally, add radial bond.
      engine.addRadialBond(props);

      if (!options || !options.deserialization)
        invalidatingChangePostHook();

      dispatch.addRadialBond();
    },

    model.removeRadialBond = function(idx) {
      invalidatingChangePreHook();
      engine.removeRadialBond(idx);
      invalidatingChangePreHook();
      dispatch.removeRadialBond();
    };

    model.addAngularBond = function(props, options) {
      // Validate properties, use default values if there is such need.
      props = validator.validateCompleteness(metadata.angularBond, props);

      // During deserialization change hooks are managed manually.
      if (!options || !options.deserialization)
        invalidatingChangePreHook();

      // Finally, add angular bond.
      engine.addAngularBond(props);

      if (!options || !options.deserialization)
        invalidatingChangePostHook();
    };

    model.removeAngularBond = function(idx) {
      invalidatingChangePreHook();
      engine.removeAngularBond(idx);
      invalidatingChangePostHook();
      dispatch.removeAngularBond();
    };

    model.addRestraint = function(props) {
      // Validate properties, use default values if there is such need.
      props = validator.validateCompleteness(metadata.restraint, props);
      // Finally, add restraint.
      invalidatingChangePreHook();
      engine.addRestraint(props);
      invalidatingChangePostHook();
    };

    /** Return the bounding box of the molecule containing atom 'atomIndex', with atomic radii taken
        into account.

       @returns an object with properties 'left', 'right', 'top', and 'bottom'. These are translated
       relative to the center of atom 'atomIndex', so that 'left' represents (-) the distance in nm
       between the leftmost edge and the center of atom 'atomIndex'.
    */
    model.getMoleculeBoundingBox = function(atomIndex) {

      var moleculeAtoms,
          i,
          x,
          y,
          r,
          top = -Infinity,
          left = Infinity,
          bottom = Infinity,
          right = -Infinity,
          cx,
          cy;

      moleculeAtoms = engine.getMoleculeAtoms(atomIndex);
      moleculeAtoms.push(atomIndex);

      for (i = 0; i < moleculeAtoms.length; i++) {
        x = atoms.x[moleculeAtoms[i]];
        y = atoms.y[moleculeAtoms[i]];
        r = atoms.radius[moleculeAtoms[i]];

        if (x-r < left  ) left   = x-r;
        if (x+r > right ) right  = x+r;
        if (y-r < bottom) bottom = y-r;
        if (y+r > top   ) top    = y+r;
      }

      cx = atoms.x[atomIndex];
      cy = atoms.y[atomIndex];

      return { top: top-cy, left: left-cx, bottom: bottom-cy, right: right-cx };
    },

    /**
        A generic method to set properties on a single existing atom.

        Example: setAtomProperties(3, {x: 5, y: 8, px: 0.5, charge: -1})

        This can optionally check the new location of the atom to see if it would
        overlap with another another atom (i.e. if it would increase the PE).

        This can also optionally apply the same dx, dy to any atoms in the same
        molecule (if x and y are being changed), and check the location of all
        the bonded atoms together.
      */
    model.setAtomProperties = function(i, props, checkLocation, moveMolecule) {
      var moleculeAtoms,
          dx, dy,
          new_x, new_y,
          j, jj;

      // Validate properties.
      props = validator.validate(metadata.atom, props);

      if (moveMolecule) {
        moleculeAtoms = engine.getMoleculeAtoms(i);
        if (moleculeAtoms.length > 0) {
          dx = typeof props.x === "number" ? props.x - atoms.x[i] : 0;
          dy = typeof props.y === "number" ? props.y - atoms.y[i] : 0;
          for (j = 0, jj=moleculeAtoms.length; j<jj; j++) {
            new_x = atoms.x[moleculeAtoms[j]] + dx;
            new_y = atoms.y[moleculeAtoms[j]] + dy;
            if (!model.setAtomProperties(moleculeAtoms[j], {x: new_x, y: new_y}, checkLocation, false)) {
              return false;
            }
          }
        }
      }

      if (checkLocation) {
        var x  = typeof props.x === "number" ? props.x : atoms.x[i],
            y  = typeof props.y === "number" ? props.y : atoms.y[i],
            el = typeof props.element === "number" ? props.y : atoms.element[i];

        if (!engine.canPlaceAtom(el, x, y, i)) {
          return false;
        }
      }

      invalidatingChangePreHook();
      engine.setAtomProperties(i, props);
      invalidatingChangePostHook();
      return true;
    };

    model.getAtomProperties = function(i) {
      var atomMetaData = metadata.atom,
          props = {},
          propName;
      for (propName in atomMetaData) {
        if (atomMetaData.hasOwnProperty(propName)) {
          props[propName] = atoms[propName][i];
        }
      }
      return props;
    };

    model.setElementProperties = function(i, props) {
      // Validate properties.
      props = validator.validate(metadata.element, props);
      if (aminoacidsHelper.isAminoAcid(i)) {
        throw new Error("Elements: elements with ID " + i + " cannot be edited, as they define amino acids.");
      }
      invalidatingChangePreHook();
      engine.setElementProperties(i, props);
      invalidatingChangePostHook();
    };

    model.getElementProperties = function(i) {
      var elementMetaData = metadata.element,
          props = {},
          propName;
      for (propName in elementMetaData) {
        if (elementMetaData.hasOwnProperty(propName)) {
          props[propName] = elements[propName][i];
        }
      }
      return props;
    };

    model.setObstacleProperties = function(i, props) {
      // Validate properties.
      props = validator.validate(metadata.obstacle, props);
      invalidatingChangePreHook();
      engine.setObstacleProperties(i, props);
      invalidatingChangePostHook();
    };

    model.getObstacleProperties = function(i) {
      var obstacleMetaData = metadata.obstacle,
          props = {},
          propName;
      for (propName in obstacleMetaData) {
        if (obstacleMetaData.hasOwnProperty(propName)) {
          props[propName] = obstacles[propName][i];
        }
      }
      return props;
    };

    model.setRadialBondProperties = function(i, props) {
      // Validate properties.
      props = validator.validate(metadata.radialBond, props);
      invalidatingChangePreHook();
      engine.setRadialBondProperties(i, props);
      invalidatingChangePostHook();
    };

    model.getRadialBondProperties = function(i) {
      var radialBondMetaData = metadata.radialBond,
          props = {},
          propName;
      for (propName in radialBondMetaData) {
        if (radialBondMetaData.hasOwnProperty(propName)) {
          props[propName] = radialBonds[propName][i];
        }
      }
      return props;
    };

    model.setRestraintProperties = function(i, props) {
      // Validate properties.
      props = validator.validate(metadata.restraint, props);
      invalidatingChangePreHook();
      engine.setRestraintProperties(i, props);
      invalidatingChangePostHook();
    };

    model.getRestraintProperties = function(i) {
      var restraintMetaData = metadata.restraint,
          props = {},
          propName;
      for (propName in restraintMetaData) {
        if (restraintMetaData.hasOwnProperty(propName)) {
          props[propName] = restraints[propName][i];
        }
      }
      return props;
    };

    model.setAngularBondProperties = function(i, props) {
      // Validate properties.
      props = validator.validate(metadata.angularBond, props);
      invalidatingChangePreHook();
      engine.setAngularBondProperties(i, props);
      invalidatingChangePostHook();
    };

    model.getAngularBondProperties = function(i) {
      var angularBondMetaData = metadata.angularBond,
          props = {},
          propName;
      for (propName in angularBondMetaData) {
        if (angularBondMetaData.hasOwnProperty(propName)) {
          props[propName] = angularBonds[propName][i];
        }
      }
      return props;
    };

    model.setSolvent = function (solventName) {
      var solvent = new Solvent(solventName),
          props = {
            solventForceType: solvent.forceType,
            dielectricConstant: solvent.dielectricConstant,
            backgroundColor: solvent.color
          };
      model.set(props);
    };

    /** A "spring force" is used to pull atom `atomIndex` towards (x, y). We expect this to be used
       to drag atoms interactively using the mouse cursor (in which case (x,y) is the mouse cursor
       location.) In these cases, use the liveDragStart, liveDrag, and liveDragEnd methods instead
       of this one.

       The optional springConstant parameter (measured in eV/nm^2) is used to adjust the strength
       of the "spring" pulling the atom toward (x, y)

       @returns ID (index) of the spring force among all spring forces
    */
    model.addSpringForce = function(atomIndex, x, y, springConstant) {
      if (springConstant == null) springConstant = 500;
      return engine.addSpringForce(atomIndex, x, y, springConstant);
    };

    /**
      Update the (x, y) position of a spring force.
    */
    model.updateSpringForce = function(springForceIndex, x, y) {
      engine.updateSpringForce(springForceIndex, x, y);
    };

    /**
      Remove a spring force.
    */
    model.removeSpringForce = function(springForceIndex) {
      engine.removeSpringForce(springForceIndex);
    };

    model.addTextBox = function(props) {
      props = validator.validateCompleteness(metadata.textBox, props);
      properties.textBoxes.push(props);
      dispatch.textBoxesChanged();
    };

    model.removeTextBox = function(i) {
      var text = properties.textBoxes;
      if (i >=0 && i < text.length) {
        properties.textBoxes = text.slice(0,i).concat(text.slice(i+1))
        dispatch.textBoxesChanged();
      } else {
        throw new Error("Text box \"" + i + "\" does not exist, so it cannot be removed.");
      }
    };

    model.setTextBoxProperties = function(i, props) {
      var textBox = properties.textBoxes[i];
      if (textBox) {
        props = validator.validate(metadata.textBox, props);
        for (prop in props) {
          textBox[prop] = props[prop];
        }
        dispatch.textBoxesChanged();
      } else {
        throw new Error("Text box \"" + i + "\" does not exist, so it cannot have properties set.");
      }
    };

    /**
      Implements dragging of an atom in a running model, by creating a spring force that pulls the
      atom towards the mouse cursor position (x, y) and damping the resulting motion by temporarily
      adjusting the friction of the dragged atom.
    */
    model.liveDragStart = function(atomIndex, x, y) {
      if (x == null) x = atoms.x[atomIndex];
      if (y == null) y = atoms.y[atomIndex];

      liveDragSavedFriction = model.getAtomProperties(atomIndex).friction;

      // Use setAtomProperties so that we handle things correctly if a web worker is integrating
      // the model. (Here we follow the rule that we must assume that an integration might change
      // any property of an atom, and therefore cause changes to atom properties in the main thread
      // to be be lost. This is true even though common sense tells us that the friction property
      // won't change during an integration.)

      model.setAtomProperties(atomIndex, { friction: model.LIVE_DRAG_FRICTION });

      liveDragSpringForceIndex = model.addSpringForce(atomIndex, x, y, 500);
    };

    /**
      Updates the drag location after liveDragStart
    */
    model.liveDrag = function(x, y) {
      model.updateSpringForce(liveDragSpringForceIndex, x, y);
    };

    /**
      Cancels a live drag by removing the spring force that is pulling the atom, and restoring its
      original friction property.
    */
    model.liveDragEnd = function() {
      var atomIndex = engine.springForceAtomIndex(liveDragSpringForceIndex);

      model.setAtomProperties(atomIndex, { friction: liveDragSavedFriction });
      model.removeSpringForce(liveDragSpringForceIndex);
    };

    // return a copy of the array of speeds
    model.get_speed = function() {
      return arrays.copy(engine.atoms.speed, []);
    };

    model.get_rate = function() {
      return average_rate();
    };

    model.is_stopped = function() {
      return stopped;
    };

    model.get_atoms = function() {
      return atoms;
    };

    model.get_results = function() {
      return results;
    };

    model.get_radial_bond_results = function() {
      return radialBondResults;
    };

    model.get_num_atoms = function() {
      return engine.getNumberOfAtoms();
    };

    model.get_obstacles = function() {
      return obstacles;
    };

    model.getNumberOfElements = function () {
      return engine.getNumberOfElements();
    };

    model.getNumberOfObstacles = function () {
      return engine.getNumberOfObstacles();
    };

    model.getNumberOfRadialBonds = function () {
      return engine.getNumberOfRadialBonds();
    };

    model.getNumberOfAngularBonds = function () {
      return engine.getNumberOfAngularBonds();
    };

    model.get_radial_bonds = function() {
      return radialBonds;
    };

    model.get_restraints = function() {
      return restraints;
    };

    model.getPairwiseLJProperties = function() {
      return engine.pairwiseLJProperties;
    };

    model.getGeneticProperties = function() {
      return engine.geneticProperties;
    };

    model.get_vdw_pairs = function() {
      return engine.getVdwPairsArray();
    };

    model.on = function(type, listener) {
      dispatch.on(type, listener);
      return model;
    };

    model.tickInPlace = function() {
      dispatch.tick();
      return model;
    };

    model.tick = function(num, opts) {
      if (!arguments.length) num = 1;

      var dontDispatchTickEvent = opts && opts.dontDispatchTickEvent || false,
          i = -1;

      while(++i < num) {
        tick(null, dontDispatchTickEvent);
      }
      return model;
    };

    model.relax = function() {
      engine.relaxToTemperature();
      return model;
    };

    model.minimizeEnergy = function () {
      invalidatingChangePreHook();
      engine.minimizeEnergy();
      invalidatingChangePostHook();
      return model;
    };

    /**
      Generates a protein. It returns a real number of created amino acids.

      'aaSequence' parameter defines expected sequence of amino acids. Pass undefined
      and provide 'expectedLength' if you want to generate a random protein.

      'expectedLength' parameter controls the maximum (and expected) number of amino
      acids of the resulting protein. Provide this parameter only when 'aaSequence'
      is undefined. When expected length is too big (due to limited area of the model),
      the protein will be truncated and its real length returned.
    */
    model.generateProtein = function (aaSequence, expectedLength) {
      var generatedAACount;

      invalidatingChangePreHook();

      generatedAACount = engine.generateProtein(aaSequence, expectedLength);
      // Enforce modeler to recalculate results array.
      // TODO: it's a workaround, investigate the problem.
      results.length = 0;

      invalidatingChangePostHook();

      dispatch.addAtom();

      return generatedAACount;
    };

    model.extendProtein = function (xPos, yPos, aaAbbr) {
      invalidatingChangePreHook();

      engine.extendProtein(xPos, yPos, aaAbbr);
      // Enforce modeler to recalculate results array.
      // TODO: it's a workaround, investigate the problem.
      results.length = 0;

      invalidatingChangePostHook();

      dispatch.addAtom();
    };

    /**
      Performs only one step of translation.

      Returns true when translation is finished, false otherwise.
    */
    model.translateStepByStep = function () {
      var abbr = engine.geneticProperties.translateStepByStep(),
          markerPos = engine.geneticProperties.get().translationStep,
          symbolHeight = engine.geneticProperties.get().height,
          symbolWidth = engine.geneticProperties.get().width,
          xPos = symbolWidth * markerPos * 3 + 1.5 * symbolWidth,
          yPos = symbolHeight * 5,
          width = model.get("width"),
          height = model.get("height"),
          lastAA;

      while (xPos > width) {
        xPos -= symbolWidth * 3;
      }
      while (yPos > height) {
        yPos -= symbolHeight;
      }

      if (abbr !== undefined) {
        model.extendProtein(xPos, yPos, abbr);
      } else {
        lastAA = model.get_num_atoms() - 1;
        model.setAtomProperties(lastAA, {pinned: false});
      }

      // That means that the last step of translation has just been performed.
      return abbr === undefined;
    };

    model.animateTranslation = function () {
      var translationStep = function () {
            var lastStep = model.translateStepByStep();
            if (lastStep === false) {
              setTimeout(translationStep, 1000);
            }
          };

      // Avoid two timers running at the same time.
      if (translationAnimInProgress === true) {
        return;
      }
      translationAnimInProgress = true;

      // If model is stopped, play it.
      if (stopped) {
        model.resume();
      }

      // Start the animation.
      translationStep();
    };

    model.start = function() {
      return model.resume();
    };

    /**
      Restart the model (call model.resume()) after the next tick completes.

      This is useful for changing the modelSampleRate interactively.
    */
    model.restart = function() {
      restart = true;
    };

    model.resume = function() {

      console.time('gap between frames');
      model.timer(function timerTick(elapsedTime) {
        console.timeEnd('gap between frames');
        // Cancel the timer and refuse to to step the model, if the model is stopped.
        // This is necessary because there is no direct way to cancel a d3 timer.
        // See: https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_timer)
        if (stopped) return true;

        if (restart) {
          setTimeout(model.resume, 0);
          return true;
        }

        tick(elapsedTime, false);

        console.time('gap between frames');
        return false;
      });

      restart = false;
      if (stopped) {
        stopped = false;
        dispatch.play();
      }

      return model;
    };

    /**
      Repeatedly calls `f` at an interval defined by the modelSampleRate property, until f returns
      true. (This is the same signature as d3.timer.)

      If modelSampleRate === 'default', try to run at the "requestAnimationFrame rate"
      (i.e., using d3.timer(), after running f, also request to run f at the next animation frame)

      If modelSampleRate !== 'default', instead uses setInterval to schedule regular calls of f with
      period (1000 / sampleRate) ms, corresponding to sampleRate calls/s
    */
    model.timer = function(f) {
      var intervalID,
          sampleRate = model.get("modelSampleRate");

      if (sampleRate === 'default') {
        // use requestAnimationFrame via d3.timer
        d3.timer(f);
      } else {
        // set an interval to run the model more slowly.
        intervalID = window.setInterval(function() {
          if ( f() ) {
            window.clearInterval(intervalID);
          }
        }, 1000/sampleRate);
      }
    };

    model.stop = function() {
      stopped = true;
      dispatch.stop();
      return model;
    };

    model.ave_ke = function() {
      return modelOutputState.KE / model.get_num_atoms();
    };

    model.ave_pe = function() {
      return modelOutputState.PE / model.get_num_atoms();
    };

    model.speed = function() {
      return average_speed();
    };

    model.size = function(x) {
      if (!arguments.length) return engine.getSize();
      engine.setSize(x);
      return model;
    };

    model.set = function(hash) {
      // Perform validation in case of setting main properties or
      // model view properties. Attempts to set immutable or read-only
      // properties will be caught.
      validator.validate(metadata.mainProperties, hash);
      validator.validate(metadata.viewOptions, hash);

      if (engine) invalidatingChangePreHook();
      set_properties(hash);
      if (engine) invalidatingChangePostHook();
    };

    model.get = function(property) {
      var output;

      if (properties.hasOwnProperty(property)) return properties[property];

      if (output = outputsByName[property]) {
        if (output.hasCachedValue) return output.cachedValue;
        output.hasCachedValue = true;
        output.cachedValue = output.calculate();
        return output.cachedValue;
      }
    };

    /**
      Add a listener callback that will be notified when any of the properties in the passed-in
      array of properties is changed. (The argument `properties` can also be a string, if only a
      single name needs to be passed.) This is a simple way for views to update themselves in
      response to property changes.

      Observe all properties with `addPropertiesListener('all', callback);`
    */
    model.addPropertiesListener = function(properties, callback) {
      var i;

      function addListener(prop) {
        if (!listeners[prop]) listeners[prop] = [];
        listeners[prop].push(callback);
      }

      if (typeof properties === 'string') {
        addListener(properties);
      } else {
        for (i = 0; i < properties.length; i++) {
          addListener(properties[i]);
        }
      }
    };


    /**
      Add an "output" property to the model. Output properties are expected to change at every
      model tick, and may also be changed indirectly, outside of a model tick, by a change to the
      model parameters or to the configuration of atoms and other objects in the model.

      `name` should be the name of the parameter. The property value will be accessed by
      `model.get(<name>);`

      `description` should be a hash of metadata about the property. Right now, these metadata are not
      used. However, example metadata include the label and units name to be used when graphing
      this property.

      `calculate` should be a no-arg function which should calculate the property value.
    */
    model.defineOutput = function(name, description, calculate) {
      outputNames.push(name);
      outputsByName[name] = {
        description: description,
        calculate: calculate,
        hasCachedValue: false,
        // Used to keep track of whether this property changed as a side effect of some other change
        // null here is just a placeholder
        previousValue: null
      };
    };

    /**
      Add an "filtered output" property to the model. This is special kind of output property, which
      is filtered by one of the built-in filters based on time (like running average). Note that filtered
      outputs do not specify calculate function - instead, they specify property which should filtered.
      It can be another output, model parameter or custom parameter.

      Filtered output properties are extension of typical output properties. They share all features of
      output properties, so they are expected to change at every model tick, and may also be changed indirectly,
      outside of a model tick, by a change to the model parameters or to the configuration of atoms and other
      objects in the model.

      `name` should be the name of the parameter. The property value will be accessed by
      `model.get(<name>);`

      `description` should be a hash of metadata about the property. Right now, these metadata are not
      used. However, example metadata include the label and units name to be used when graphing
      this property.

      `property` should be name of the basic property which should be filtered.

      `type` should be type of filter, defined as string. For now only "RunningAverage" is supported.

      `period` should be number defining length of time period used for calculating filtered value. It should
      be specified in femtoseconds.

    */
    model.defineFilteredOutput = function(name, description, property, type, period) {
      // Filter object.
      var filter, initialValue;

      if (type === "RunningAverage") {
        filter = new RunningAverageFilter(period);
      } else {
        throw new Error("FilteredOutput: unknown filter type " + type + ".");
      }

      initialValue = model.get(property);
      if (initialValue === undefined || isNaN(Number(initialValue))) {
        throw new Error("FilteredOutput: property is not a valid numeric value or it is undefined.");
      }

      // Add initial sample.
      filter.addSample(model.get('time'), initialValue);

      filteredOutputNames.push(name);
      // filteredOutputsByName stores properties which are unique for filtered output.
      // Other properties like description or calculate function are stored in outputsByName hash.
      filteredOutputsByName[name] = {
        addSample: function () {
          filter.addSample(model.get('time'), model.get(property));
        }
      };

      // Create simple adapter implementing TickHistoryCompatible Interface
      // and register it in tick history.
      tickHistory.registerExternalObject({
        push: function () {
          // Push is empty, as we store samples during each tick anyway.
        },
        extract: function (idx) {
          filter.setCurrentStep(idx);
        },
        invalidate: function (idx) {
          filter.invalidate(idx);
        },
        setHistoryLength: function (length) {
          filter.setMaxBufferLength(length);
        }
      });

      // Extend description to contain information about filter.
      description.property = property;
      description.type = type;
      description.period = period;

      // Filtered output is still an output.
      // Reuse existing, well tested logic for caching, observing etc.
      model.defineOutput(name, description, function () {
        return filter.calculate();
      });
    };

    /**
      Define a property of the model to be treated as a custom parameter. Custom parameters are
      (generally, user-defined) read/write properties that trigger a setter action when set, and
      whose values are automatically persisted in the tick history.

      Because custom parameters are not intended to be interpreted by the engine, but instead simply
      *represent* states of the model that are otherwise fully specified by the engine state and
      other properties of the model, and because the setter function might not limit itself to a
      purely functional mapping from parameter value to model properties, but might perform any
      arbitrary stateful change, (stopping the model, etc.), the setter is NOT called when custom
      parameters are updated by the tick history.
    */
    model.defineParameter = function(name, description, setter) {
      parametersByName[name] = {
        description: description,
        setter: setter,
        isDefined: false
      };

      properties['set_'+name] = function(value) {
        properties[name] = value;
        parametersByName[name].isDefined = true;
        // set a useful 'this' binding in the setter:
        parametersByName[name].setter.call(model, value);
      };
    };

    /**
      Retrieve (a copy of) the hash describing property 'name', if one exists. This hash can store
      an arbitrary set of key-value pairs, but is expected to have 'label' and 'units' properties
      describing, respectively, the property's human-readable label and the short name of the units
      in which the property is enumerated.

      Right now, only output properties and custom parameters have a description hash.
    */
    model.getPropertyDescription = function(name) {
      var property = outputsByName[name] || parametersByName[name];
      if (property) {
        return _.extend({}, property.description);
      }
    };

    model.getPropertyType = function(name) {
      if (outputsByName[name]) {
        return 'output'
      }
      if (parametersByName[name]) {
        return 'parameter'
      }
    };

    // FIXME: Broken!! Includes property setter methods, does not include radialBonds, etc.
    model.serialize = function() {
      var propCopy = {},
          ljProps, i, len,

          removeAtomsArrayIfDefault = function(name, defaultVal) {
            if (propCopy.atoms[name].every(function(i) {
              return i === defaultVal;
            })) {
              delete propCopy.atoms[name];
            }
          };

      propCopy = serialize(metadata.mainProperties, properties);
      propCopy.viewOptions = serialize(metadata.viewOptions, properties);
      propCopy.atoms = serialize(metadata.atom, atoms, engine.getNumberOfAtoms());

      if (engine.getNumberOfRadialBonds()) {
        propCopy.radialBonds = serialize(metadata.radialBond, radialBonds, engine.getNumberOfRadialBonds());
      }
      if (engine.getNumberOfAngularBonds()) {
        propCopy.angularBonds = serialize(metadata.angularBond, angularBonds, engine.getNumberOfAngularBonds());
      }
      if (engine.getNumberOfObstacles()) {
        propCopy.obstacles = serialize(metadata.obstacle, obstacles, engine.getNumberOfObstacles());

        propCopy.obstacles.color = [];
        // Convert color from internal representation to one expected for serialization.
        for (i = 0, len = propCopy.obstacles.colorR.length; i < len; i++) {
          propCopy.obstacles.color.push([
            propCopy.obstacles.colorR[i],
            propCopy.obstacles.colorG[i],
            propCopy.obstacles.colorB[i]
          ]);

          // Silly, but allows to pass current serialization tests.
          // FIXME: try to create more flexible tests for serialization.
          propCopy.obstacles.westProbe[i] = Boolean(propCopy.obstacles.westProbe[i]);
          propCopy.obstacles.northProbe[i] = Boolean(propCopy.obstacles.northProbe[i]);
          propCopy.obstacles.eastProbe[i] = Boolean(propCopy.obstacles.eastProbe[i]);
          propCopy.obstacles.southProbe[i] = Boolean(propCopy.obstacles.southProbe[i]);
        }
        delete propCopy.obstacles.colorR;
        delete propCopy.obstacles.colorG;
        delete propCopy.obstacles.colorB;
      }
      if (engine.getNumberOfRestraints() > 0) {
        propCopy.restraints = serialize(metadata.restraint, restraints, engine.getNumberOfRestraints());
      }

      if (engine.geneticProperties.get() !== undefined) {
        propCopy.geneticProperties = engine.geneticProperties.serialize();
      }

      // FIXME: for now Amino Acid elements are *not* editable and should not be serialized
      // -- only copy first five elements
      propCopy.elements = serialize(metadata.element, elements, 5);

      // The same situation for Custom LJ Properties. Do not serialize properties for amino acids.
      propCopy.pairwiseLJProperties = [];
      ljProps = engine.pairwiseLJProperties.serialize();
      for (i = 0, len = ljProps.length; i < len; i++) {
        if (ljProps[i].element1 <= 5 && ljProps[i].element2 <= 5) {
          propCopy.pairwiseLJProperties.push(ljProps[i]);
        }
      }

      // Do the weird post processing of the JSON, which is also done by MML parser.
      // Remove targetTemperature when heat-bath is disabled.
      if (propCopy.temperatureControl === false) {
        delete propCopy.targetTemperature;
      }
      // Remove atomTraceId when atom tracing is disabled.
      if (propCopy.viewOptions.showAtomTrace === false) {
        delete propCopy.viewOptions.atomTraceId;
      }
      if (propCopy.modelSampleRate === "default") {
        delete propCopy.modelSampleRate;
      }

      removeAtomsArrayIfDefault("marked", metadata.atom.marked.defaultValue);
      removeAtomsArrayIfDefault("visible", metadata.atom.visible.defaultValue);
      removeAtomsArrayIfDefault("draggable", metadata.atom.draggable.defaultValue);

      return propCopy;
    };

    // ------------------------------
    // finish setting up the model
    // ------------------------------

    // Friction parameter temporarily applied to the live-dragged atom.
    model.LIVE_DRAG_FRICTION = 10;

    // Define some default output properties.
    model.defineOutput('time', {
      label: "Time",
      units: "fs"
    }, function() {
      return modelOutputState.time;
    });

    model.defineOutput('kineticEnergy', {
      label: "Kinetic Energy",
      units: "eV"
    }, function() {
      return modelOutputState.KE;
    });

    model.defineOutput('potentialEnergy', {
      label: "Potential Energy",
      units: "eV"
    }, function() {
      return modelOutputState.PE;
    });

    model.defineOutput('totalEnergy', {
      label: "Total Energy",
      units: "eV"
    }, function() {
      return modelOutputState.KE + modelOutputState.PE;
    });

    model.defineOutput('temperature', {
      label: "Temperature",
      units: "K"
    }, function() {
      return modelOutputState.temperature;
    });


    // Set the regular, main properties.
    // Note that validation process will return hash without all properties which are
    // not defined in meta model as mainProperties (like atoms, obstacles, viewOptions etc).
    set_properties(validator.validateCompleteness(metadata.mainProperties, initialProperties));

    // Set the model view options.
    set_properties(validator.validateCompleteness(metadata.viewOptions, initialProperties.viewOptions || {}));

    // Setup engine object.
    model.initializeEngine();

    // Finally, if provided, set up the model objects (elements, atoms, bonds, obstacles and the rest).
    // However if these are not provided, client code can create atoms, etc piecemeal.

    // TODO: Elements are stored and treated different from other objects.
    // This is enforced by current createNewAtoms() method which should be
    // depreciated. When it's changed, change also editableElements handling.
    editableElements = initialProperties.elements;
    // Create editable elements.
    model.createElements(editableElements);
    // Create elements which specify amino acids also.
    createAminoAcids();

    // Trigger setter of polarAAEpsilon again when engine is initialized and
    // amino acids crated.
    // TODO: initialize engine before set_properties calls, so properties
    // will be injected to engine automatically.
    model.set({polarAAEpsilon: model.get('polarAAEpsilon')});

    if (initialProperties.atoms) {
      model.createAtoms(initialProperties.atoms);
    } else if (initialProperties.mol_number) {
      model.createAtoms(initialProperties.mol_number);
      if (initialProperties.relax) model.relax();
    }

    if (initialProperties.radialBonds)  model.createRadialBonds(initialProperties.radialBonds);
    if (initialProperties.angularBonds) model.createAngularBonds(initialProperties.angularBonds);
    if (initialProperties.restraints)   model.createRestraints(initialProperties.restraints);
    if (initialProperties.obstacles)    model.createObstacles(initialProperties.obstacles);
    // Basically, this #deserialize method is more or less similar to other #create... methods used
    // above. However, this is the first step to delegate some functionality from modeler to smaller classes.
    if (initialProperties.pairwiseLJProperties)
      engine.pairwiseLJProperties.deserialize(initialProperties.pairwiseLJProperties);
    if (initialProperties.geneticProperties)
      engine.geneticProperties.deserialize(initialProperties.geneticProperties);

    // Initialize tick history.
    tickHistory = new TickHistory({
      input: [
        "targetTemperature",
        "lennardJonesForces",
        "coulombForces",
        "temperatureControl",
        "keShading",
        "chargeShading",
        "showVDWLines",
        "showVelocityVectors",
        "showForceVectors",
        "showClock",
        "viewRefreshInterval",
        "timeStep",
        "viscosity",
        "gravitationalField"
      ],
      restoreProperties: restoreProperties,
      parameters: parametersByName,
      restoreParameters: restoreParameters,
      state: engine.getState()
    }, model, defaultMaxTickHistory);

    newStep = true;
    updateAllOutputProperties();

    return model;
  };
});

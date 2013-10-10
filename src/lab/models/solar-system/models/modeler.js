/*global define: false, d3: false, $: false */
/*jslint onevar: true devel:true eqnull: true boss: true */

define(function(require) {
  // Dependencies.
  var arrays               = require('arrays'),
      console              = require('common/console'),
      serialize            = require('common/serialize'),
      validator            = require('common/validator'),
      PropertySupport      = require('common/property-support'),
      PropertyDescription  = require('common/property-description'),
      TickHistory          = require('common/models/tick-history'),
      solarSystem          = require('models/solar-system/models/engine/solar-system'),
      metadata             = require('models/solar-system/models/metadata'),
      units                = require('models/solar-system/models/engine/constants/units'),
      unitDefinitions      = require('models/solar-system/models/unit-definitions/index'),
      _ = require('underscore');

  return function Model(initialProperties, initializationOptions) {

    // all models created with this constructor will be of type: "solar-system"
    this.constructor.type = "solar-system";

    var model = {},
        dispatch = d3.dispatch("tick", "play", "stop", "reset", "stepForward", "stepBack",
            "seek", "addBody", "removeBody", "invalidation", "textBoxesChanged", "ready"),

        propertySupport = new PropertySupport({
          types: ["output", "parameter", "mainProperty", "viewOption"]
        }),

        defaultMaxTickHistory = 1000,
        stopped = true,
        restart = false,
        newStep = false,

        lastSampleTime,
        sampleTimes = [],

        modelOutputState,
        tickHistory,

        // SolarSystem engine.
        engine,

        // ######################### Main Data Structures #####################
        // They are initialized at the end of this function. These data strucutres
        // are mainly managed by the engine.

        // A hash of arrays consisting of arrays of planet property values
        bodies,

        // ####################################################################

        // A two dimensional array consisting of planet index numbers and planet
        // property values - in effect transposed from the planet property arrays.
        results,

        // If this is true, output properties will not be recalculated on changes
        suppressInvalidatingChangeHooks = false,

        // Invalidating change hooks might between others
        invalidatingChangeHookNestingLevel = 0,

        // The subset of outputName list, containing list of outputs which are filtered
        // by one of the built-in filters (like running average filter).
        filteredOutputNames = [],

        // Function adding new sample for filtered outputs. Other properties of filtered output
        // are stored in outputsByName object, as filtered output is just extension of normal output.
        filteredOutputsByName = {},

        // The set of units currently in effect. (Determined by the 'unitsScheme' property of the
        // model; default value is 'md2d')
        unitsDefinition,

        // Set method mixed in to model by propertySupport; model.set needs to be augmented with
        // physics-based invalidation concerns.
        baseSet,

        // The initial "main" propeties, validated and filtered from the initialProperties array
        mainProperties,

        // The initial viewOptions, validated and filtered from the initialProperties
        viewOptions;

    var isReady = false;

    function defineBuiltinProperty(type, key, setter) {
      var metadataForType,
          descriptor,
          unitType;

      if (type === 'mainProperty') {
        metadataForType = metadata.mainProperties;
      } else if (type === 'viewOption') {
        metadataForType = metadata.viewOptions;
      } else {
        throw new Error(type + " is not a supported built-in property type");
      }

      descriptor = {
        type: type,
        writable: validator.propertyIsWritable(metadataForType[key]),
        set: setter,
        includeInHistoryState: !!metadataForType[key].storeInTickHistory,
        validate: function(value) {
          return validator.validateSingleProperty(metadataForType[key], key, value, false);
        }
      };

      propertySupport.defineProperty(key, descriptor);
    }

    function tick(elapsedTime, dontDispatchTickEvent) {
      var timeStep = model.get('timeStep'),
          t, sampleTime;

      // timeStepsPerTick is defined as the model integration time period
      console.time('integration');
      engine.integrate(model.get('timeStepsPerTick') * timeStep, timeStep);
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

      return stopped;
    }

    // Returns the "raw" (untranslated) version of property 'name'. Used to provide privileged
    // access to internal representation of properties to, e.g., TickHistory.
    function getRawPropertyValue(name) {
      return properties[name];
    }

    // Returns a copy of 'obj' with value replaced by fn(key, value) for every (key, value) pair.
    // (Underscore doesn't do this: https://github.com/documentcloud/underscore/issues/220)
    function mapValues(obj, fn) {
      obj = _.extend({}, obj);
      for (var k in obj) {
        if (obj.hasOwnProperty(k)) obj[k] = fn(k, obj[k]);
      }
      return obj;
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
      readModelState();
      propertySupport.deleteComputedPropertyCachedValues();

      // Update all filtered outputs.
      // Note that this have to be performed after invalidation of all outputs
      // (as filtered output can filter another output), but before notifying
      // listeners (as we want to provide current, valid value).
      filteredOutputNames.forEach(function(name) {
        filteredOutputsByName[name].addSample();
      });

      propertySupport.notifyAllComputedProperties();
    }

    // FIXME
    //
    // Instead of requiring balanced calls to "PreHooks" and "PostHooks", we should instead accept a
    // callback containing actions to perform in between the pre and post actions. That would be a
    // better way of ensuring that pre and post hooks are always balanced.

    /**
      ALWAYS CALL THIS FUNCTION before any change to model state outside a model step
      (i.e., outside a tick, seek, stepForward, stepBack)

      Note:  Changes to view-only property changes that cannot change model physics might reasonably
      by considered non-invalidating changes that don't require calling this hook.
    */
    function invalidatingChangePreHook() {
      if (suppressInvalidatingChangeHooks) return;
      invalidatingChangeHookNestingLevel++;

      if (invalidatingChangeHookNestingLevel === 0) {
        // If we're beginning a series of (possibly-nested) invalidating changes, store computed
        // property values so they can be compared when we finish the invalidating changes.
        propertySupport.storeComputedProperties();
        propertySupport.deleteComputedPropertyCachedValues();
        propertySupport.enableCaching = false;
      }
      invalidatingChangeHookNestingLevel++;
    }

    /**
      ALWAYS CALL THIS FUNCTION after any change to model state outside a model step.
    */
    function invalidatingChangePostHook() {
      if (suppressInvalidatingChangeHooks) return;
      invalidatingChangeHookNestingLevel--;

      if (invalidatingChangeHookNestingLevel === 0) {
        propertySupport.enableCaching = true;
      }

      // Make sure that computed properties which depend on engine state are valid
      if (engine) {
        readModelState();
      }

      // Non-filtered outputs will be valid at this point (caching is disabl;ed, so they're
      // recomputed every time.) This ensures that filtered outputs that depend on non-filtered
      // outputs are also valid:
      filteredOutputNames.forEach(function(name) {
        filteredOutputsByName[name].addSample();
      });

      if (invalidatingChangeHookNestingLevel === 0) {
        // Once we've finished the cycle of invalidating changes, go ahead and notify observers of
        // computed properties that changed.
        propertySupport.enableCaching = true;
        propertySupport.notifyChangedComputedProperties();

        if (tickHistory) tickHistory.invalidateFollowingState();
        dispatch.invalidation();
      }
    }

    /**
      Executes the closure 'extract' which extracts from the tick history, then dispatches
      addAtom/removeAtom, etc, events as needed.

      This prevents unneessary creation and removal of atoms.
    */
    var runAndDispatchObjectNumberChanges = (function() {
      var objects = [{
        getNum: 'getNumberOfBodies',
        addEvent: 'addBody',
        removeEvent: 'removeBody'
      }];

      return function (extract) {
        var i, o, newNum;
        for (i = 0; i < objects.length; i++) {
          o = objects[i];
          o.num = engine[o.getNum]();
        }

        extract();

        for (i = 0; i < objects.length; i++) {
          o = objects[i];
          newNum = engine[o.getNum]();
          if (newNum > o.num) {
            dispatch[o.addEvent]();
          } else if (newNum < o.num) {
            dispatch[o.removeEvent]();
          }
        }
      };
    })();

    /**
      This method is called to refresh the results array and macrostate variables (KE, PE,
      temperature) whenever an engine integration occurs or the model state is otherwise changed.

      Normally, you should call the methods updateOutputPropertiesAfterChange or
      updateAllOutputProperties rather than calling this method. Calling this method directly does
      not cause output-property listeners to be notified, and calling it prematurely will confuse
      the detection of changed properties.
    */
    function readModelState() {
      var i, prop, n;

      engine.computeOutputState(modelOutputState);

      resizeResultsArray();

      // Transpose 'bodies' object into 'results' for easier consumption by view code
      for (i = 0, n = model.get_num_bodies(); i < n; i++) {
        for (prop in bodies) {
          if (bodies.hasOwnProperty(prop)) {
            results[i][prop] = bodies[prop][i];
          }
        }
      }
    }

    /**
      Ensure that the 'results' array of arrays is defined and contains one typed array per atom
      for containing the atom properties.
    */
    function resizeResultsArray() {
      var i, len;

      // TODO: refactor whole approach to creation of objects from flat arrays.

      if (!results) results = [];

      for (i = results.length, len = model.get_num_bodies(); i < len; i++) {
        if (!results[i]) {
          results[i] = {
            idx: i
          };
        }
      }

      // Also make sure to truncate the results array if it got shorter (i.e., atoms were removed)
      results.length = len;
    }

    // ------------------------------------------------------------
    //
    // Public functions
    //
    // ------------------------------------------------------------

    // Adds model.properties, model.set, model.get, model.addObserver, model.removeObserver...
    propertySupport.mixInto(model);

    baseSet = model.set;

    model.set = function(key, value) {
      if (engine) invalidatingChangePreHook();
      baseSet(key, value);
      if (engine) invalidatingChangePostHook();
    };

    /**
      Add a listener callback that will be notified when any of the properties in the passed-in
      array of properties is changed. (The argument `properties` can also be a string, if only a
      single name needs to be passed.) This is a simple way for views to update themselves in
      response to property changes.
    */
    model.addPropertiesListener = function(properties, callback) {
      if (typeof properties === 'string') {
        model.addObserver(properties, callback);
      } else {
        properties.forEach(function(property) {
          model.addObserver(property, callback);
        });
      }
    };

    /**
      Add an "output" property to the model. Output properties are expected to change at every
      model tick, and may also be changed indirectly, outside of a model tick, by a change to model
      properties or the atom, element, etc. properties.

      `key` should be the name of the output. The property value will be accessed by
      `model.get(<key>);`

      `description` should be a hash of metadata about the property.

      `getter` should be a no-arg function which calculates the property value. These values are not
      translated after getter returns because we expect that most output getters are authored
      scripts, which operate entirely with already-translated units. Therefore, getters defined
      internally in modeler.js needs to make sure to translate any "md2d units" values out of the
      md2d-unit domain.
    */
    model.defineOutput = function(key, descriptionHash, getter) {
      propertySupport.defineProperty(key, {
        type: 'output',
        writable: false,
        get: getter,
        includeInHistoryState: false,
        description: new PropertyDescription(unitsDefinition, descriptionHash)
      });
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
    model.defineParameter = function(key, descriptionHash, setter) {
      var descriptor = {
            type: 'parameter',
            includeInHistoryState: true,
            invokeSetterAfterBulkRestore: false,
            description: new PropertyDescription(unitsDefinition, descriptionHash)
          };

      // In practice, some parameters are meant only to be observed, and have no setter
      if (setter) {
        descriptor.set = function(value) {
          setter.call(model, value);
        };
      }
      propertySupport.defineProperty(key, descriptor);
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
      if (!model.isStopped()) {
        model.stop();
      }
      newStep = false;
      runAndDispatchObjectNumberChanges(function() {
        tickHistory.seekExtract(location);
        updateAllOutputProperties();
        dispatch.seek();
      });
      return tickHistory.get("counter");
    };

    model.stepBack = function(num) {
      if (!arguments.length) { num = 1; }
      if (!model.isStopped()) {
        model.stop();
      }
      newStep = false;
      runAndDispatchObjectNumberChanges(function() {
        var i, index;
        i=-1; while(++i < num) {
          index = tickHistory.get("index");
          if (index > 0) {
            tickHistory.decrementExtract();
            updateAllOutputProperties();
            dispatch.stepBack();
          }
        }
      });
      return tickHistory.get("counter");
    };

    model.stepForward = function(num) {
      if (!arguments.length) { num = 1; }
      if (!model.isStopped()) {
        model.stop();
      }
      runAndDispatchObjectNumberChanges(function() {
        var i, index, size;
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
      });
      return tickHistory.get("counter");
    };

    /**
      Initialize width and height from minX, minYm, maxX, maxY
    */
    model.initializeDimensions = function () {
      model.set({ width: model.get('maxX') - model.get('minX') });
      model.set({ height: model.get('maxY') - model.get('minY') });
    };

    /**
      Creates a new solarSystem engine and leaves it in 'engine'.
    */
    model.initializeEngine = function () {
      engine = solarSystem.createEngine();

      engine.setDimensions([model.get('minX'), model.get('minY'), model.get('maxX'), model.get('maxY')]);
      engine.setHorizontalWrapping(model.get('horizontalWrapping'));
      engine.setVerticalWrapping(model.get('verticalWrapping'));

      window.state = modelOutputState = {};

      // Copy reference to basic properties.
      bodies = engine.bodies;
    };

    /**
      Creates a new set of bodies.

      @config: either the number of bodies (for a random setup) or
               a hash specifying the x,y,vx,vy properties of the bodies
      When random setup is used, the option 'relax' determines whether the model is requested to
      relax to a steady-state temperature (and in effect gets thermalized). If false, the bodies are
      left in whatever grid the engine's initialization leaves them in.
    */
    model.createBodies = function(config) {
          // Options for addBody method.
      var options = {
            // Do not check the position of planet, assume that it's valid.
            supressCheck: true,
            // Deserialization process, invalidating change hooks will be called manually.
            deserialization: true
          },
          i, num, prop, planetProps;

      // Call the hook manually, as addBody won't do it due to
      // deserialization option set to true.
      invalidatingChangePreHook();

      if (typeof config === 'number') {
        num = config;
      } else if (config.num !== undefined) {
        num = config.num;
      } else if (config.x) {
        num = config.x.length;
      }

      // TODO: this branching based on x, y isn't very clear.
      if (config.x && config.y) {
        // config is hash of arrays (as specified in JSON model).
        // So, for each index, create object containing properties of
        // planet 'i'. Later, use these properties to add planet
        // using basic addBody method.
        for (i = 0; i < num; i++) {
          planetProps = {};
          for (prop in config) {
            if (config.hasOwnProperty(prop)) {
              planetProps[prop] = config[prop][i];
            }
          }
          if (!planetProps.radius) {
            planetProps.radius = engine.radiusFromMass(config.mass[i]);
          }
          model.addBody(planetProps, options);
        }
      } else {
        for (i = 0; i < num; i++) {
          // Provide only required values.
          planetProps = {x: 0, y: 0};
          model.addBody(planetProps, options);
        }
        // This function rearrange all bodies randomly.
        engine.setupBodiesRandomly();
      }

      // Call the hook manually, as addBody won't do it due to
      // deserialization option set to true.
      invalidatingChangePostHook();

      // Listeners should consider resetting the bodies a 'reset' event
      dispatch.reset();

      // return model, for chaining (if used)
      return model;
    };

    model.ready = function() {
      if (isReady) {
        throw new Error("ready() called on an already-ready model.");
      }

      tickHistory.saveInitialState();
      tickHistory.push();

      propertySupport.invalidatingChangePreHook();
      isReady = true;
      propertySupport.invalidatingChangePostHook();

      dispatch.ready();
    };

    model.reset = function() {
      engine.setTime(0);
      tickHistory.restoreInitialState();
      dispatch.reset();
    };




    /**
      Attempts to add a body to a random location.
    */
    model.addRandomBody = function() {
      var width = model.get('width'),
          height = model.get('height'),
          minX = model.get('minX'),
          minY = model.get('minY'),
          props = {},
          radius,
          mass;

      mass = Math.random() * 10;
      radius = engine.radiusFromMass(mass);
      props = {
        x:       minX + Math.random() * width - 2*radius,
        y:       minY + Math.random() * height - 2*radius,
        vx:      (Math.random() - 0.5) / 100,
        vy:      (Math.random() - 0.5) / 100,
        mass:    mass,
        radius:  radius
      };
      model.addBody(props);
      return false;
    },

    /**
      Adds a new body defined by properties.
      Intended to be exposed as a script API method also.

      Adjusts (x,y) if needed so that the whole body is within the walls of the container.

      Returns false and does not add the planet if the potential energy change of adding an *uncharged*
      planet of the specified element to the specified location would be positive (i.e, if the planet
      intrudes into the repulsive region of another planet.)

      Otherwise, returns true.

      silent = true disables this check.
    */
    model.addBody = function(props, options) {
      var minX = model.get('minX'),
          minY = model.get('minY'),
          maxX = model.get('maxX'),
          maxY = model.get('maxY');

      options = options || {};

      // Validate properties, provide default values.
      props = validator.validateCompleteness(metadata.body, props);

      // As a convenience to script authors, bump the body within bounds
      // radius = engine.getRadiusOfElement(props.element);
      // if (props.x < (minX + radius)) props.x = minX + radius;
      // if (props.x > (maxX - radius)) props.x = maxX - radius;
      // if (props.y < (minY + radius)) props.y = minY + radius;
      // if (props.y > (maxY - radius)) props.y = maxY - radius;

      // When bodies are being deserialized, the deserializing function
      // should handle change hooks due to performance reasons.
      if (!options.deserialization)
        invalidatingChangePreHook();
      engine.addBody(props);
      if (!options.deserialization)
        invalidatingChangePostHook();

      if (!options.supressEvent) {
        dispatch.addBody();
      }

      return true;
    },

    model.removeBody = function(i, options) {

      options = options || {};

      invalidatingChangePreHook();
      engine.removeBody(i);
      // Enforce modeler to recalculate results array.
      results.length = 0;
      invalidatingChangePostHook();

      if (!options.supressEvent) {
        // Notify listeners that bodies is removed.
        dispatch.removeplanet();
      }
    },

    /**
        A generic method to set properties on a single existing planet.

        Example: setplanetProperties(3, {x: 5, y: 8, px: 0.5, charge: -1})

        This can optionally check the new location of the planet to see if it would
        overlap with another another planet (i.e. if it would increase the PE).

        This can also optionally apply the same dx, dy to any bodies in the same
        molecule (if x and y are being changed), and check the location of all
        the bonded bodies together.
      */
    model.setBodyProperties = function(i, props, checkLocation, moveMolecule) {
      var dx, dy,
          new_x, new_y,
          j, jj;

      // Validate properties.
      props = validator.validate(metadata.body, props);


      if (checkLocation) {
        var x  = typeof props.x === "number" ? props.x : bodies.x[i],
            y  = typeof props.y === "number" ? props.y : bodies.y[i];

        if (!engine.canPlaceplanet(el, x, y, i)) {
          return false;
        }
      }

      invalidatingChangePreHook();
      engine.setBodyProperties(i, props);
      invalidatingChangePostHook();
      return true;
    };

    model.getBodyProperties = function(i) {
      var planetMetaData = metadata.body,
          props = {},
          propName;
      for (propName in planetMetaData) {
        if (planetMetaData.hasOwnProperty(propName)) {
          props[propName] = bodies[propName][i];
        }
      }
      return props;
    };

    model.addTextBox = function(props) {
      props = validator.validateCompleteness(metadata.textBox, props);
      model.get('textBoxes').push(props);
      dispatch.textBoxesChanged();
    };

    model.removeTextBox = function(i) {
      var text = model.get('textBoxes');
      if (i >=0 && i < text.length) {
        model.set('textBoxes', text.slice(0,i).concat(text.slice(i+1)));
        dispatch.textBoxesChanged();
      } else {
        throw new Error("Text box \"" + i + "\" does not exist, so it cannot be removed.");
      }
    };

    model.setTextBoxProperties = function(i, props) {
      var textBox = model.get('textBoxes')[i],
          prop;

      if (textBox) {
        props = validator.validate(metadata.textBox, props);
        for (prop in props) {
          if (props.hasOwnProperty(prop)) {
            textBox[prop] = props[prop];
          }
        }
        dispatch.textBoxesChanged();
      } else {
        throw new Error("Text box \"" + i + "\" does not exist, so it cannot have properties set.");
      }
    };

    model.isStopped = function() {
      return stopped;
    };

    model.get_bodies = function() {
      return bodies;
    };

    model.get_results = function() {
      return results;
    };

    model.get_num_bodies = function() {
      return engine.getNumberOfBodies();
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

    /**
      Return a unitDefinition in the current unitScheme for a quantity
      such as 'length', 'mass', etc.
    */
    model.getUnitDefinition = function(name) {
      return unitsDefinition.units[name];
    };

    // FIXME: Broken!! Includes property setter methods, does not include radialBonds, etc.
    model.serialize = function() {
      var propCopy = {},
          ljProps, i, len,

          removebodiesArrayIfDefault = function(name, defaultVal) {
            if (propCopy.bodies[name].every(function(i) {
              return i === defaultVal;
            })) {
              delete propCopy.bodies[name];
            }
          };

      propCopy = serialize(metadata.mainProperties, properties);
      propCopy.viewOptions = serialize(metadata.viewOptions, properties);
      propCopy.bodies = serialize(metadata.body, bodies, engine.getNumberOfBodies());

      // Remove bodyTraceId when body tracing is disabled.
      if (propCopy.viewOptions.showBodyTrace === false) {
        delete propCopy.viewOptions.bodyTraceId;
      }

      removebodiesArrayIfDefault("marked", metadata.body.marked.defaultValue);
      removebodiesArrayIfDefault("visible", metadata.body.visible.defaultValue);

      return propCopy;
    };

    // ------------------------------
    // finish setting up the model
    // ------------------------------

    (function () {
      if (!initialProperties.viewOptions || !initialProperties.viewOptions.textBoxes) {
        return;
      }
      // Temporal workaround to provide text boxes validation.
      // Note that text boxes are handled completely different from other objects
      // like atoms or obstacles. There is much of inconsistency and probably
      // it should be refactored anyway.
      var textBoxes = initialProperties.viewOptions.textBoxes,
          i, len;

      for (i = 0, len = textBoxes.length; i < len; i++) {
        textBoxes[i] = validator.validateCompleteness(metadata.textBox, textBoxes[i]);
      }
    }());
    viewOptions = validator.validateCompleteness(metadata.viewOptions, initialProperties.viewOptions || {});

    // Set the regular, main properties. Note that validation process will return hash without all
    // properties which are not defined in meta model as mainProperties (like atoms, obstacles,
    // viewOptions etc).
    mainProperties = validator.validateCompleteness(metadata.mainProperties, initialProperties);

    // Set up units scheme.
    unitsDefinition = unitDefinitions.get(mainProperties.unitsScheme);

    // ------------------------------
    // Define toplevel properties of the model
    // ------------------------------

    // Add all the mainProperties, with custom setters defined below
    (function() {
      var customSetters = {
        modelSampleRate: function() {
          if (!stopped) model.restart();
        }
      };

      Object.keys(metadata.mainProperties).forEach(function(key) {
        defineBuiltinProperty('mainProperty', key, customSetters[key]);
      });
      propertySupport.setRawValues(mainProperties);
    })();

    // Define and set the model view options. None of these have custom setters.
    Object.keys(metadata.viewOptions).forEach(function(key) {
      defineBuiltinProperty('viewOption', key);
    });
    propertySupport.setRawValues(viewOptions);

    // Initialize minX, minYm, maxX, maxY from model width and height
    // if they are undefined.
    model.initializeDimensions();

    // Setup engine object.
    model.initializeEngine();

    // Finally, if provided, set up the model objects (bodies).
    // However if these are not provided, client code can create bodies, etc piecemeal.

    if (initialProperties.bodies) {
      model.createBodies(initialProperties.bodies);
    }

    // Initialize tick history.
    tickHistory = new TickHistory({
      getProperties: function() {
        return propertySupport.historyStateRawValues;
      },
      restoreProperties: propertySupport.setRawValues,
      state: engine.getState()
    }, model, defaultMaxTickHistory);

    newStep = true;

    // set up types of all properties before any third-party calls to set/get
    mainPropertyUnitTypes = {};
    _.each(metadata.mainProperties, function(value, key) {
      if (value.unitType) {
        mainPropertyUnitTypes[key] = {
          unitType: value.unitType
        };
      }
    });

    // Define some default output properties.
    model.defineOutput('time', {
      label: "Time",
      unitType: 'time',
      format: 'f'
    }, function() {
      return modelOutputState.time;
    });

    model.defineOutput('timePerTick', {
      label: "Model time per tick",
      unitType: 'time',
      format: 'f'
    }, function() {
      return model.get('timeStep') * model.get('timeStepsPerTick');
    });

    (function() {
      var displayTimeUnits;

      // Allow units definition to declare a "Display time"; specifically, let MD2D units definition
      // define a "displayValue" section in the time unit that returns ps instead of fs.

      if (unitsDefinition.units.time.displayValue) {
        displayTimeUnits = unitsDefinition.units.time.displayValue;
      } else {
        displayTimeUnits = _.extend({}, unitsDefinition.units.time);
        displayTimeUnits.unitsPerBaseUnit = 1;
      }

      model.defineOutput('displayTime', {
        label: "Time",
        unitName:         displayTimeUnits.name,
        unitPluralName:   displayTimeUnits.pluralName,
        unitAbbreviation: displayTimeUnits.symbol,
        format: '.1f'
      }, function() {
        return model.get('time') * displayTimeUnits.unitsPerBaseUnit;
      });

      model.defineOutput('displayTimePerTick', {
        label: "Model time per tick",
        unitName:         displayTimeUnits.name,
        unitPluralName:   displayTimeUnits.pluralName,
        unitAbbreviation: displayTimeUnits.symbol,
        format: '.3f'
      }, function() {
        return model.get('timePerTick') * displayTimeUnits.unitsPerBaseUnit;
      });
    }());

    model.defineOutput('tickCounter', {
      label: "Tick Counter",
      unitType: '',
      format: '4g'
    }, function() {
      return tickHistory.get("counter");
    });

    model.defineOutput('newStep', {
      label: "New Step",
      unitType: '',
      format: ''
    }, function() {
      return newStep;
    });

    model.defineOutput('isPlayable', {
      label: "Playable"
    }, function() {
      return isReady;
    });

    updateAllOutputProperties();

    if (!initializationOptions.waitForSetup) {
      model.ready();
    }

    return model;
  };
});

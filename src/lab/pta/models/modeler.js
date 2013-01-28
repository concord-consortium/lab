/*global define: false, d3: false, $: false */
/*jslint onevar: true devel:true eqnull: true boss: true */

define(function(require) {
  // Dependencies.
  var arrays               = require('arrays'),
      console              = require('common/console'),
      pta                  = require('pta/models/engine/pta'),
      metadata             = require('pta/models/metadata'),
      TickHistory          = require('common/models/tick-history'),
      serialize            = require('common/serialize'),
      validator            = require('common/validator'),
      units                = require('common/models/engines/constants/units'),
      PropertyDescription  = require('pta/models/property-description'),
      unitDefinitions      = require('pta/models/unit-definitions/index'),
      UnitsTranslation     = require('pta/models/units-translation'),
      _ = require('underscore');

  return function Model(initialProperties) {

    // all models created with this constructor will be of type: "md2d"
    this.constructor.type = "pta";

    var model = {},
        dispatch = d3.dispatch("tick", "play", "stop", "reset", "stepForward", "stepBack",
            "seek", "addTurtle", "removeTurtle", "invalidation", "textBoxesChanged"),
        defaultMaxTickHistory = 1000,
        stopped = true,
        restart = false,
        newStep = false,

        lastSampleTime,
        sampleTimes = [],

        modelOutputState,
        tickHistory,

        // PTA engine.
        engine,

        // ######################### Main Data Structures #####################
        // They are initialized at the end of this function. These data strucutres
        // are mainly managed by the engine.

        // A hash of arrays consisting of arrays of turtle property values
        turtles,

        // A hash of arrays consisting of arrays of patches property values
        patches,

        // ####################################################################

        // A two dimensional array consisting of turtle index numbers and turtle
        // property values - in effect transposed from the turtle property arrays.
        results,

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

          set_timeStep: function(ts) {
            this.timeStep = ts;
          },

          set_horizontalWrapping: function(hw) {
            this.horizontalWrapping = hw;
            if (engine) {
              engine.setHorizontalWrapping(hw);
            }
          },

          set_verticalWrapping: function(vw) {
            this.verticalWrapping = vw;
            if (engine) {
              engine.setVerticalWrapping(vw);
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

        // Whewther to suppress caching of output properties. Should only be needed between
        // invalidatingChangePreHook and invalidatingChangePostHook
        suppressOutputPropertyCaching = false,

        // The currently-defined parameters.
        parametersByName = {},

        // Unit types for all the properties that can be accessed using model.set/model.get
        mainPropertyUnitTypes,

        // The set of units currently in effect. (Determined by the 'unitsScheme' property of the
        // model; default value is 'md2d')
        unitsDefinition,

        // Object that translates between 'native' md2d units and the units defined
        // by unitsDefinition.
        unitsTranslation;

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
      property of a model object such as the position of an turtle) to save the output-property
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
      property of a model object such as the position of an turtle), call the method
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

      // Transpose 'turtles' object into 'results' for easier consumption by view code
      for (i = 0, n = model.get_num_turtles(); i < n; i++) {
        for (prop in turtles) {
          if (turtles.hasOwnProperty(prop)) {
            results[i][prop] = turtles[prop][i];
          }
        }
      }
    }

    /**
      Ensure that the 'results' array of arrays is defined and contains one typed array per turtle
      for containing the turtle properties.
    */
    function extendResultsArray() {
      var i, len;

      if (!results) results = [];

      for (i = results.length, len = model.get_num_turtles(); i < len; i++) {
        if (!results[i]) {
          results[i] = {
            idx: i
          };
        }
      }
    }

    // ------------------------------------------------------------
    //
    // Public functions
    //
    // ------------------------------------------------------------

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
      Initialize width and height from minX, minYm, maxX, maxY
    */
    model.initializeDimensions = function () {
      model.set({ width: model.get('maxX') - model.get('minX') });
      model.set({ height: model.get('maxY') - model.get('minY') });
    };

    /**
      Creates a new pta engine and leaves it in 'engine'.
    */
    model.initializeEngine = function () {
      engine = pta.createEngine();

      engine.setDimensions([model.get('minX'), model.get('minY'), model.get('maxX'), model.get('maxY')]);
      engine.setHorizontalWrapping(model.get('horizontalWrapping'));
      engine.setVerticalWrapping(model.get('verticalWrapping'));

      window.state = modelOutputState = {};

      // Copy reference to basic properties.
      turtles = engine.turtles;
      patches = engine.patches;
    };

    /**
      Creates a new set of turtles.

      @config: either the number of turtles (for a random setup) or
               a hash specifying the x,y,vx,vy properties of the turtles
      When random setup is used, the option 'relax' determines whether the model is requested to
      relax to a steady-state temperature (and in effect gets thermalized). If false, the turtles are
      left in whatever grid the engine's initialization leaves them in.
    */
    model.createTurtles = function(config) {
          // Options for addTurtle method.
      var options = {
            // Do not check the position of turtle, assume that it's valid.
            supressCheck: true,
            // Deserialization process, invalidating change hooks will be called manually.
            deserialization: true
          },
          i, num, prop, turtleProps;

      // Call the hook manually, as addTurtle won't do it due to
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
        // turtle 'i'. Later, use these properties to add turtle
        // using basic addTurtle method.
        for (i = 0; i < num; i++) {
          turtleProps = {};
          for (prop in config) {
            if (config.hasOwnProperty(prop)) {
              turtleProps[prop] = config[prop][i];
            }
          }
          model.addTurtle(turtleProps, options);
        }
      } else {
        for (i = 0; i < num; i++) {
          // Provide only required values.
          turtleProps = {x: 0, y: 0};
          model.addTurtle(turtleProps, options);
        }
        // This function rearrange all turtles randomly.
        engine.setupTurtlesRandomly();
      }

      // Call the hook manually, as addTurtle won't do it due to
      // deserialization option set to true.
      invalidatingChangePostHook();

      // Listeners should consider resetting the turtles a 'reset' event
      dispatch.reset();

      // return model, for chaining (if used)
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

    /**
      Attempts to add an 0-velocity turtle to a random location. Returns false if after 10 tries it
      can't find a location. (Intended to be exposed as a script API method.)

      Optionally allows specifying the element (default is to randomly select from all editableElements) and
      charge (default is neutral).
    */
    model.addRandomTurtle = function() {
      var width = model.get('width'),
          height = model.get('height'),
          minX = model.get('minX'),
          minY = model.get('minY'),
          radius = 1,
          x, y,
          vx, vy,
          loc;

      x = minX + Math.random() * width - 2*radius;
      y = minY + Math.random() * height - 2*radius;
      vx = (Math.random() - 0.5) / 100;
      vy = (Math.random() - 0.5) / 100;
      model.addTurtle({ x: x, y: x, vx: vx, vy: vy });
      return false;
    },

    /**
      Adds a new turtle defined by properties.
      Intended to be exposed as a script API method also.

      Adjusts (x,y) if needed so that the whole turtle is within the walls of the container.

      Returns false and does not add the turtle if the potential energy change of adding an *uncharged*
      turtle of the specified element to the specified location would be positive (i.e, if the turtle
      intrudes into the repulsive region of another turtle.)

      Otherwise, returns true.

      silent = true disables this check.
    */
    model.addTurtle = function(props, options) {
      var minX = model.get('minX'),
          minY = model.get('minY'),
          maxX = model.get('maxX'),
          maxY = model.get('maxY'),
          radius = 1;

      options = options || {};

      // Validate properties, provide default values.
      props = validator.validateCompleteness(metadata.turtle, props);

      // As a convenience to script authors, bump the turtle within bounds
      // radius = engine.getRadiusOfElement(props.element);
      // if (props.x < (minX + radius)) props.x = minX + radius;
      // if (props.x > (maxX - radius)) props.x = maxX - radius;
      // if (props.y < (minY + radius)) props.y = minY + radius;
      // if (props.y > (maxY - radius)) props.y = maxY - radius;

      // When turtles are being deserialized, the deserializing function
      // should handle change hooks due to performance reasons.
      if (!options.deserialization)
        invalidatingChangePreHook();
      engine.addTurtle(props);
      if (!options.deserialization)
        invalidatingChangePostHook();

      if (!options.supressEvent) {
        dispatch.addTurtle();
      }

      return true;
    },

    model.removeTurtle = function(i, options) {

      options = options || {};

      invalidatingChangePreHook();
      engine.removeTurtle(i);
      // Enforce modeler to recalculate results array.
      results.length = 0;
      invalidatingChangePostHook();

      if (!options.supressEvent) {
        // Notify listeners that turtles is removed.
        dispatch.removeturtle();
      }
    },

    /**
        A generic method to set properties on a single existing turtle.

        Example: setturtleProperties(3, {x: 5, y: 8, px: 0.5, charge: -1})

        This can optionally check the new location of the turtle to see if it would
        overlap with another another turtle (i.e. if it would increase the PE).

        This can also optionally apply the same dx, dy to any turtles in the same
        molecule (if x and y are being changed), and check the location of all
        the bonded turtles together.
      */
    model.setTurtleProperties = function(i, props, checkLocation, moveMolecule) {
      var dx, dy,
          new_x, new_y,
          j, jj;

      // Validate properties.
      props = validator.validate(metadata.turtle, props);


      if (checkLocation) {
        var x  = typeof props.x === "number" ? props.x : turtles.x[i],
            y  = typeof props.y === "number" ? props.y : turtles.y[i];

        if (!engine.canPlaceturtle(el, x, y, i)) {
          return false;
        }
      }

      invalidatingChangePreHook();
      engine.setTurtleProperties(i, props);
      invalidatingChangePostHook();
      return true;
    };

    model.getTurtleProperties = function(i) {
      var turtleMetaData = metadata.turtle,
          props = {},
          propName;
      for (propName in turtleMetaData) {
        if (turtleMetaData.hasOwnProperty(propName)) {
          props[propName] = turtles[propName][i];
        }
      }
      return props;
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

    model.is_stopped = function() {
      return stopped;
    };

    model.get_turtles = function() {
      return turtles;
    };

    model.get_results = function() {
      return results;
    };

    model.get_num_turtles = function() {
      return engine.getNumberOfTurtles();
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
    model.defineOutput = function(name, descriptionHash, calculate) {
      outputNames.push(name);

      mainPropertyUnitTypes[name] = {
        unitType: descriptionHash.unitType
      };

      outputsByName[name] = {
        description: new PropertyDescription(unitsDefinition, descriptionHash),
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
    model.defineParameter = function(name, descriptionHash, setter) {
      parametersByName[name] = {
        description: new PropertyDescription(unitsDefinition, descriptionHash),
        setter: setter,
        isDefined: false
      };

      // Regardless of the type of unit represented by the parameter, do NOT automatically convert
      // it to MD2D units in the set method. That is because the set method on the parameter will
      // also call 'setter', and any native model properties set by 'setter' will be translated.
      // If the parameter value were also translated in the set method, translations would happen
      // twice!
      mainPropertyUnitTypes[name] = {
        unitType: "untranslated"
      };

      properties['set_'+name] = function(value) {
        properties[name] = value;
        parametersByName[name].isDefined = true;
        // setter is optional.
        if (parametersByName[name].setter) {
          // set a useful 'this' binding in the setter:
          parametersByName[name].setter.call(model, value);
        }
      };
    };

    /**
      Return a unitDefinition in the current unitScheme for a quantity
      such as 'length', 'mass', etc.
    */
    model.getUnitDefinition = function(name) {
      return unitsDefinition.units[name];
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

    // FIXME: Broken!! Includes property setter methods, does not include radialBonds, etc.
    model.serialize = function() {
      var propCopy = {},
          ljProps, i, len,

          removeturtlesArrayIfDefault = function(name, defaultVal) {
            if (propCopy.turtles[name].every(function(i) {
              return i === defaultVal;
            })) {
              delete propCopy.turtles[name];
            }
          };

      propCopy = serialize(metadata.mainProperties, properties);
      propCopy.viewOptions = serialize(metadata.viewOptions, properties);
      propCopy.turtles = serialize(metadata.turtle, turtles, engine.getNumberOfTurtles());

      removeturtlesArrayIfDefault("marked", metadata.turtle.marked.defaultValue);
      removeturtlesArrayIfDefault("visible", metadata.turtle.visible.defaultValue);

      return propCopy;
    };

    // ------------------------------
    // finish setting up the model
    // ------------------------------

    // Set the regular, main properties.
    // Note that validation process will return hash without all properties which are
    // not defined in meta model as mainProperties (like turtles, viewOptions etc).
    set_properties(validator.validateCompleteness(metadata.mainProperties, initialProperties));

    // Set the model view options.
    set_properties(validator.validateCompleteness(metadata.viewOptions, initialProperties.viewOptions || {}));

    // initialze width and height from minX, minYm, maxX, maxY
    model.initializeDimensions();

    // Setup engine object.
    model.initializeEngine();

    // Finally, if provided, set up the model objects (turtles).
    // However if these are not provided, client code can create turtles, etc piecemeal.

    if (initialProperties.turtles) {
      model.createTurtles(initialProperties.turtles);
    }

    // Initialize tick history.
    tickHistory = new TickHistory({
      input: [
        "showClock",
        "timeStepsPerTick",
        "timeStep"
      ],
      getRawPropertyValue: getRawPropertyValue,
      restoreProperties: restoreProperties,
      parameters: parametersByName,
      restoreParameters: restoreParameters,
      state: engine.getState()
    }, model, defaultMaxTickHistory);

    newStep = true;

    // Set up units scheme.
    unitsDefinition = unitDefinitions.get(model.get('unitsScheme'));

    // If we're not using MD2D units, we need a translation (which, for each unit type, allows some
    // number of "native" MD2D units to stand for 1 translated unit, e.g., 1 nm represents 1m, with
    // the relationships between these ratios set up so that the calculations reamin physically
    // consistent.
    if (model.get('unitsScheme') !== 'pta') {
      unitsTranslation = new UnitsTranslation(unitsDefinition);
    }

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
      units: "fs"
    }, function() {
      return modelOutputState.time;
    });

    updateAllOutputProperties();

    return model;
  };
});

/*global define: false, d3: false, $: false */
/*jslint onevar: true devel:true eqnull: true */

define(function(require) {
  // Dependencies.
  require('common/console');
  var arrays  = require('arrays'),
      md2d    = require('md2d/models/engine/md2d'),

      engine;

  return function Model(initialProperties) {
    var model = {},
        elements = initialProperties.elements || [{id: 0, mass: 39.95, epsilon: -0.1, sigma: 0.34}],
        dispatch = d3.dispatch("tick", "play", "stop", "reset", "stepForward", "stepBack", "seek", "addAtom"),
        temperature_control,
        keShading, chargeShading, showVDWLines,VDWLinesRatio,
        showClock,
        lennard_jones_forces, coulomb_forces,
        gravitationalField = false,
        viewRefreshInterval = 50,
        timeStep = 1,
        stopped = true,
        tick_history_list = [],
        tick_history_list_index = 0,
        tick_counter = 0,
        new_step = false,
        pressure, pressures = [0],
        modelSampleRate = 60,
        lastSampleTime,
        sampleTimes = [],

        // N.B. this is the thermostat (temperature control) setting
        temperature,

        // current model time, in fs
        time,

        // potential energy
        pe,

        // kinetic energy
        ke,

        modelOutputState,
        model_listener,

        width = initialProperties.width,
        height = initialProperties.height,

        //
        // A two dimensional array consisting of arrays of atom property values
        //
        atoms,

        //
        // A two dimensional array consisting of atom index numbers and atom
        // property values - in effect transposed from the atom property arrays.
        //
        results,

        // A two dimensional array consisting of radial bond index numbers, radial bond
        // properties, and the postions of the two bonded atoms.
        radialBondResults,

        // list of obstacles
        obstacles,
        // Radial Bonds
        radialBonds,
        // Angular Bonds
        angularBonds,
        // VDW Pairs
        vdwPairs,

        viscosity,

        // The index of the "spring force" used to implement dragging of atoms in a running model
        liveDragSpringForceIndex,

        // Cached value of the 'friction' property of the atom being dragged in a running model
        liveDragSavedFriction,

        default_obstacle_properties = {
          vx: 0,
          vy: 0,
          density: Infinity,
          color: [128, 128, 128]
        },

        listeners = {},

        properties = {
          temperature           : 300,
          modelSampleRate       : 60,
          coulomb_forces        : true,
          lennard_jones_forces  : true,
          temperature_control   : true,
          gravitationalField    : false,
          keShading             : false,
          chargeShading         : false,
          showVDWLines          : false,
          showClock             : true,
          viewRefreshInterval   : 50,
          timeStep              : 1,
          VDWLinesRatio         : 1.99,
          viscosity             : 0,

          /**
            These functions are optional setters that will be called *instead* of simply setting
            a value when 'model.set({property: value})' is called, and are currently needed if you
            want to pass a value through to the engine.  The function names are automatically
            determined from the property name. If you define one of these custom functions, you
            must remember to also set the property explicitly (if appropriate) as this won't be
            done automatically
          */

          set_temperature: function(t) {
            this.temperature = t;
            if (engine) {
              engine.setTargetTemperature(t);
            }
          },

          set_temperature_control: function(tc) {
            this.temperature_control = tc;
            if (engine) {
              engine.useThermostat(tc);
            }
          },

          set_coulomb_forces: function(cf) {
            this.coulomb_forces = cf;
            if (engine) {
              engine.useCoulombInteraction(cf);
            }
          },

          set_epsilon: function(e) {
            console.log("set_epsilon: This method is temporarily deprecated");
          },

          set_sigma: function(s) {
            console.log("set_sigma: This method is temporarily deprecated");
          },

          set_gravitationalField: function(gf) {
            this.gravitationalField = gf;
            if (engine) {
              engine.setGravitationalField(gf);
            }
          },

          set_viewRefreshInterval: function(vri) {
            this.viewRefreshInterval = vri;
          },

          set_timeStep: function(ts) {
            this.timeStep = ts;
          },

          set_viscosity: function(v) {
            this.viscosity = v;
            if (engine) {
              engine.setViscosity(v);
            }
          }
        },

        // TODO: notSafari and hasTypedArrays belong in the arrays module
        // Check for Safari. Typed arrays are faster almost everywhere
        // ... except Safari.
        notSafari = (function() {
          var safarimatch  = / AppleWebKit\/([0123456789.+]+) \(KHTML, like Gecko\) Version\/([0123456789.]+) (Safari)\/([0123456789.]+)/,
              match = navigator.userAgent.match(safarimatch);
          return (match && match[3]) ? false: true;
        }()),

        hasTypedArrays = (function() {
          try {
            new Float32Array();
          }
          catch(e) {
            return false;
          }
          return true;
        }()),

        arrayType = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular';

    function setupIndices() {
      var prop,
          i,
          offset;
      //
      // Indexes into the atoms array for the individual node property arrays
      //
      model.ATOM_PROPERTY_LIST = [];

      // Copy ATOM property indices and names from md2d
      offset = 0;
      for (i = 0; i < md2d.ATOM_PROPERTY_LIST.length; i++) {
        prop = md2d.ATOM_PROPERTY_LIST[i];

        model.ATOM_PROPERTY_LIST[i] = prop;
      }

      model.RADIAL_BOND_PROPERTY_LIST = [];

      // Copy Radial Bond properties from md2d
      for (i = 0; i < md2d.RADIAL_BOND_PROPERTY_LIST.length; i++) {
        prop = md2d.RADIAL_BOND_PROPERTY_LIST[i];
        model.RADIAL_BOND_PROPERTY_LIST[i] = prop;
      }

      model.ANGULAR_BOND_PROPERTY_LIST = [];

      // Copy ANGULAR_BOND properties from md2d
      for (i = 0; i < md2d.ANGULAR_BOND_PROPERTY_LIST.length; i++) {
        prop = md2d.ANGULAR_BOND_PROPERTY_LIST[i];
        model.ANGULAR_BOND_PROPERTY_LIST[i] = prop;
      }

      model.ELEMENT_PROPERTY_LIST = [];

      // Copy ELEMENT properties from md2d
      for (i = 0; i < md2d.ELEMENT_PROPERTY_LIST.length; i++) {
        prop = md2d.ELEMENT_PROPERTY_LIST[i];
        model.ELEMENT_PROPERTY_LIST[i] = prop;
      }

      model.NON_ENGINE_PROPERTY_LIST = [
        "visible",
        "marked",
        "draggable"
      ];

      model.NON_ENGINE_DEFAULT_VALUES = {
        visible: 1,
        marked: 0,
        draggable: 0
      };

      model.RADIAL_BOND_STYLES = {
        RADIAL_BOND_STANDARD_STICK_STYLE: 101,
        RADIAL_BOND_LONG_SPRING_STYLE:    102,
        RADIAL_BOND_SOLID_LINE_STYLE:     103,
        RADIAL_BOND_GHOST_STYLE:          104,
        RADIAL_BOND_UNICOLOR_STICK_STYLE: 105,
        RADIAL_BOND_SHORT_SPRING_STYLE:   106,
        RADIAL_BOND_DOUBLE_BOND_STYLE:    107,
        RADIAL_BOND_TRIPLE_BOND_STYLE:    108
      };

      // Add non-engine properties to the end of the list of property indices and names
      offset = model.ATOM_PROPERTY_LIST.length;
      for (i = 0; i < model.NON_ENGINE_PROPERTY_LIST.length; i++) {
        prop = model.NON_ENGINE_PROPERTY_LIST[i];
        model.ATOM_PROPERTY_LIST.push(prop);
      }

      // TODO. probably save everything *except* a list of "non-saveable properties"
      model.SAVEABLE_PROPERTIES =  [
        "x",
        "y",
        "vx",
        "vy",
        "charge",
        "element",
        "pinned",
        "friction",
        "visible",
        "marked",
        "draggable"
      ];

      // TODO: restrict access to some internal properties?
      model.OBSTACLE_PROPERTY_LIST = md2d.OBSTACLE_PROPERTY_LIST;

      model.VDW_INDICES = md2d.VDW_INDICES;

    }

    function notifyPropertyListeners(listeners) {
      $.unique(listeners);
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

    function average_speed() {
      var i, s = 0, n = model.get_num_atoms();
      i = -1; while (++i < n) { s += engine.atoms.speed[i]; }
      return s/n;
    }



    function tick(elapsedTime, dontDispatchTickEvent) {
      var t,
          sampleTime,
          doIntegration;

      if (stopped) {
        doIntegration = true;
      } else {
        t = Date.now();
        if (lastSampleTime) {
          sampleTime  = t - lastSampleTime;
          if (1000/sampleTime < modelSampleRate) {
            doIntegration = true;
            lastSampleTime = t;
            sampleTimes.push(sampleTime);
            sampleTimes.splice(0, sampleTimes.length - 128);
          } else {
            doIntegration = false;
          }
        } else {
          lastSampleTime = t;
          doIntegration = true;
        }
      }

      if (doIntegration) {
        // viewRefreshInterval is defined in Classic MW as the number of timesteps per view update.
        // However, in MD2D we prefer the more physical notion of integrating for a particular
        // length of time.
        engine.integrate(viewRefreshInterval * timeStep, timeStep);
        readModelState();

        pressures.push(pressure);
        pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries

        tick_history_list_push();

        if (!dontDispatchTickEvent) {
          dispatch.tick();
        }
      }

      return stopped;
    }

    function tick_history_list_is_empty() {
      return tick_history_list_index === 0;
    }

    function tick_history_list_push() {
      var prop,
          newAtoms = {};

      for (prop in atoms) {
        if (atoms.hasOwnProperty(prop))
          newAtoms[prop] = arrays.clone(atoms[prop]);
      }
      tick_history_list.length = tick_history_list_index;
      tick_history_list_index++;
      tick_counter++;
      new_step = true;
      tick_history_list.push({
        atoms:    newAtoms,
        pressure: modelOutputState.pressure,
        pe:       modelOutputState.PE,
        ke:       modelOutputState.KE,
        time:     modelOutputState.time
      });
      if (tick_history_list_index > 1000) {
        tick_history_list.splice(1,1);
        tick_history_list_index = 1000;
      }
    }

    function restoreFirstStateinTickHistory() {
      tick_history_list_index = 0;
      tick_counter = 0;
      tick_history_list.length = 1;
      tick_history_list_extract(tick_history_list_index);
    }

    function reset_tick_history_list() {
      tick_history_list = [];
      tick_history_list_index = 0;
      tick_counter = 0;
    }

    function tick_history_list_reset_to_ptr() {
      tick_history_list.length = tick_history_list_index + 1;
    }

    function tick_history_list_extract(index) {
      var prop;
      if (index < 0) {
        throw new Error("modeler: request for tick_history_list[" + index + "]");
      }
      if (index >= tick_history_list.length) {
        throw new Error("modeler: request for tick_history_list[" + index + "], tick_history_list.length=" + tick_history_list.length);
      }
      for (prop in atoms) {
        if (atoms.hasOwnProperty(prop))
          arrays.copy(tick_history_list[index].atoms[prop], atoms[prop]);
      }
      ke = tick_history_list[index].ke;
      time = tick_history_list[index].time;
      engine.setTime(time);
    }

    function container_pressure() {
      return pressures.reduce(function(j,k) { return j+k; })/pressures.length;
    }

    function average_rate() {
      var i, ave, s = 0, n = sampleTimes.length;
      i = -1; while (++i < n) { s += sampleTimes[i]; }
      ave = s/n;
      return (ave ? 1/ave*1000: 0);
    }

    function set_temperature(t) {
      temperature = t;
      engine.setTargetTemperature(t);
    }

    function set_properties(hash) {
      var property, propsChanged = [];
      for (property in hash) {
        if (hash.hasOwnProperty(property) && hash[property] !== undefined && hash[property] !== null) {
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
      Use this method to refresh the results array and macrostate variables (KE, PE, temperature)
      whenever an engine integration occurs or the model state is otherwise changed.
    */
    function readModelState() {
      var i,
          prop,
          n;

      engine.computeOutputState(modelOutputState);

      extendResultsArray();

      // Transpose 'atoms' object into 'results' for easier consumption by view code
      for (prop in atoms) {
        if (atoms.hasOwnProperty(prop)) {
          for (i = 0, n = model.get_num_atoms(); i < n; i++) {
            results[i][prop] = atoms[prop][i];
          }
        }
      }

      pressure = modelOutputState.pressure;
      pe       = modelOutputState.PE;
      ke       = modelOutputState.KE;
      time     = modelOutputState.time;
    }

    /**
      Ensure that the 'results' array of arrays is defined and contains one typed array per atom
      for containing the atom properties.
    */
    function extendResultsArray() {
      var i,
          n;

      if (!results) results = [];

      for (i = results.length, n = model.get_num_atoms(); i < n; i++) {
        if (!results[i]) {
          results[i] = {};
          results[i].idx = i;
        }
      }
    }

    function setToDefaultValue(prop) {
      for (var i = 0; i < model.get_num_atoms(); i++) {
        atoms[prop][i] = model.NON_ENGINE_DEFAULT_VALUES[prop];
      }
    }

    function setFromSerializedArray(prop, serializedArray) {
      for (var i = 0; i < model.get_num_atoms(); i++) {
        atoms[prop][i] = serializedArray[i];
      }
    }

    function initializeNonEngineProperties(serializedAtomProps) {
      var prop,
          i;

      for (i = 0; i < model.NON_ENGINE_PROPERTY_LIST.length; i++) {
        prop = model.NON_ENGINE_PROPERTY_LIST[i];
        atoms[prop] = arrays.create(model.get_num_atoms(), 0, arrayType);

        if (serializedAtomProps[prop]) {
          setFromSerializedArray(prop, serializedAtomProps[prop]);
        }
        else {
          setToDefaultValue(prop);
        }
      }
    }

    /**
      Each entry in engine.atoms is a reference to a typed array. When the engine needs to create
      a larger typed array, it must create a new object. Therefore, this function exists to copy
      over any references to newly created typed arrays from engine.atoms to our atoms object.
    */
    function copyEngineAtomReferences() {
      var i, prop;
      for (i = 0; i < md2d.ATOM_PROPERTY_LIST.length; i++) {
        prop = md2d.ATOM_PROPERTY_LIST[i];
        atoms[prop] = engine.atoms[prop];
      }
    }

    function copyTypedArray(arr) {
      var copy = [];
      for (var i=0,ii=arr.length; i<ii; i++){
        copy[i] = arr[i];
      }
      return copy;
    }


    function serializeAtoms() {
      var serializedData = {},
          prop,
          array,
          i,
          len;

      for (i=0, len = model.SAVEABLE_PROPERTIES.length; i < len; i++) {
        prop = model.SAVEABLE_PROPERTIES[i];
        array = atoms[prop];
        serializedData[prop] = array.slice ? array.slice() : copyTypedArray(array);
      }

      return serializedData;
    }

    // ------------------------------
    // finish setting up the model
    // ------------------------------

    setupIndices();

    // Friction parameter temporarily applied to the live-dragged atom.
    model.LIVE_DRAG_FRICTION = 10;

    // who is listening to model tick completions
    model_listener = initialProperties.model_listener;

    // set the rest of the regular properties
    set_properties(initialProperties);



    // ------------------------------------------------------------
    //
    // Public functions
    //
    // ------------------------------------------------------------

    model.getStats = function() {
      return {
        speed       : average_speed(),
        ke          : ke,
        temperature : temperature,
        pressure    : container_pressure(),
        current_step: tick_counter,
        steps       : tick_history_list.length-1
      };
    };

    // A convenience for interactively getting energy averages
    model.getStatsHistory = function() {
      var i, len,
          tick,
          ret = [];

      ret.push("time (fs)\ttotal PE (eV)\ttotal KE (eV)\ttotal energy (eV)");

      for (i = 0, len = tick_history_list.length; i < len; i++) {
        tick = tick_history_list[i];
        ret.push(tick.time + "\t" + tick.pe + "\t" + tick.ke + "\t" + (tick.pe+tick.ke));
      }
      return ret.join('\n');
    };

    /**
      Current seek position
    */
    model.stepCounter = function() {
      return tick_counter;
    };

    /** Total number of ticks that have been run & are stored, regardless of seek
        position
    */
    model.steps = function() {
      return tick_history_list.length - 1;
    };

    model.isNewStep = function() {
      return new_step;
    };

    model.seek = function(location) {
      if (!arguments.length) { location = 0; }
      stopped = true;
      new_step = false;
      tick_history_list_index = location;
      tick_counter = location;
      tick_history_list_extract(tick_history_list_index);
      dispatch.seek();
      if (model_listener) { model_listener(); }
      return tick_counter;
    };

    model.stepBack = function(num) {
      if (!arguments.length) { num = 1; }
      var i = -1;
      stopped = true;
      new_step = false;
      while(++i < num) {
        if (tick_history_list_index > 1) {
          tick_history_list_index--;
          tick_counter--;
          tick_history_list_extract(tick_history_list_index-1);
          if (model_listener) { model_listener(); }
        }
      }
      return tick_counter;
    };

    model.stepForward = function(num) {
      if (!arguments.length) { num = 1; }
      var i = -1;
      stopped = true;
      while(++i < num) {
        if (tick_history_list_index < tick_history_list.length) {
          tick_history_list_extract(tick_history_list_index);
          tick_history_list_index++;
          tick_counter++;
          if (model_listener) { model_listener(); }
        } else {
          tick();
        }
      }
      return tick_counter;
    };

    /**
      Creates a new md2d model with a new set of atoms and leaves it in 'engine'

      @config: either the number of atoms (for a random setup) or
               a hash specifying the x,y,vx,vy properties of the atoms
      When random setup is used, the option 'relax' determines whether the model is requested to
      relax to a steady-state temperature (and in effect gets thermalized). If false, the atoms are
      left in whatever grid the engine's initialization leaves them in.
    */
    model.createNewAtoms = function(config) {
      var num;

      if (typeof config === 'number') {
        num = config;
      } else if (config.num != null) {
        num = config.num;
      } else if (config.x) {
        num = config.x.length;
      }

      // get a fresh model
      engine = md2d.createEngine();
      engine.setSize([width,height]);
      engine.initializeElements(elements);
      engine.createAtoms({
        num: num
      });

      // Initialize properties
      temperature_control = properties.temperature_control;
      temperature         = properties.temperature;
      modelSampleRate     = properties.modelSampleRate,
      keShading           = properties.keShading,
      chargeShading       = properties.chargeShading;
      showVDWLines        = properties.showVDWLines;
      VDWLinesRatio       = properties.VDWLinesRatio;
      showClock           = properties.showClock;
      viewRefreshInterval = properties.viewRefreshInterval;
      timeStep            = properties.timeStep;
      viscosity           = properties.viscosity;
      gravitationalField  = properties.gravitationalField;

      engine.useLennardJonesInteraction(properties.lennard_jones_forces);
      engine.useCoulombInteraction(properties.coulomb_forces);
      engine.useThermostat(temperature_control);
      engine.setViscosity(viscosity);
      engine.setGravitationalField(gravitationalField);

      engine.setTargetTemperature(temperature);

      if (config.x && config.y) {
        engine.initializeAtomsFromProperties(config);
      } else {
        engine.initializeAtomsRandomly({
          temperature: temperature
        });
        if (config.relax) engine.relaxToTemperature();
      }

      atoms = {};
      copyEngineAtomReferences(engine.atoms);
      initializeNonEngineProperties(config);

      window.state = modelOutputState = {};
      readModelState();

      // tick history stuff
      reset_tick_history_list();
      tick_history_list_push();
      tick_counter = 0;
      new_step = true;

      // Listeners should consider resetting the atoms a 'reset' event
      dispatch.reset();

      // return model, for chaining (if used)
      return model;
    };

    model.createRadialBonds = function(_radialBonds) {
      engine.initializeRadialBonds(_radialBonds);
      radialBonds = engine.radialBonds;
      radialBondResults = engine.radialBondResults;
      readModelState();
      return model;
    };

    model.createAngularBonds = function(_angularBonds) {
      engine.initializeAngularBonds(_angularBonds);
      angularBonds = engine.angularBonds;
      readModelState();
      return model;
    };

    model.createVdwPairs = function(_atoms) {
      engine.createVdwPairsArray(_atoms);
      vdwPairs = engine.vdwPairs;
      readModelState();
      return model;
    };

    model.createObstacles = function(_obstacles) {
      var numObstacles = _obstacles.x.length,
          i, prop;

      // ensure that every property either has a value or the default value
      for (i = 0; i < numObstacles; i++) {
        for (prop in default_obstacle_properties) {
          if (!default_obstacle_properties.hasOwnProperty(prop)) continue;
          if (!_obstacles[prop]) {
            _obstacles[prop] = [];
          }
          if (typeof _obstacles[prop][i] === "undefined") {
            _obstacles[prop][i] = default_obstacle_properties[prop];
          }
        }
      }

      engine.initializeObstacles(_obstacles);
      obstacles = engine.obstacles;
      return model;
    };

    model.reset = function() {
      model.resetTime();
      restoreFirstStateinTickHistory();
      dispatch.reset();
    };

    model.resetTime = function() {
      engine.setTime(0);
    };

    model.getTime = function() {
      return modelOutputState ? modelOutputState.time : undefined;
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

      Optionally allows specifying the element (default is to randomly select from all elements) and
      charge (default is neutral).
    */
    model.addRandomAtom = function(el, charge) {
      if (el == null) el = Math.floor( Math.random() * elements.length );
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
        if (loc && model.addAtom(el, loc[0], loc[1], 0, 0, charge, 0, 0)) return true;
      } while (++numTries < maxTries);

      return false;
    },

    /**
      Adds a new atom with element 'el', charge 'charge', and velocity '[vx, vy]' to the model
      at position [x, y]. (Intended to be exposed as a script API method.)

      Adjusts (x,y) if needed so that the whole atom is within the walls of the container.

      Returns false and does not add the atom if the potential energy change of adding an *uncharged*
      atom of the specified element to the specified location would be positive (i.e, if the atom
      intrudes into the repulsive region of another atom.)

      Otherwise, returns true.
    */
    model.addAtom = function(el, x, y, vx, vy, charge, friction, pinned, visible, draggable) {
      var size      = model.size(),
          radius    = engine.getRadiusOfElement(el),
          newLength,
          i;

      if (visible == null)   visible   = model.NON_ENGINE_DEFAULT_VALUES.visible;
      if (draggable == null) draggable = model.NON_ENGINE_DEFAULT_VALUES.draggable;

      // As a convenience to script authors, bump the atom within bounds
      if (x < radius) x = radius;
      if (x > size[0]-radius) x = size[0]-radius;
      if (y < radius) y = radius;
      if (y > size[1]-radius) y = size[1]-radius;

      // check the potential energy change caused by adding an *uncharged* atom at (x,y)
      if (engine.canPlaceAtom(el, x, y)) {

        i = engine.addAtom(el, x, y, vx, vy, charge, friction, pinned);
        copyEngineAtomReferences();

        // Extend the atoms arrays which the engine doesn't know about. This may seem duplicative,
        // or something we could ask the engine to do on our behalf, but it may make more sense when
        // you realize this is a temporary step until we modify the code further in order to maintain
        // the 'visible', 'draggable' propeties *only* in what is now being called the 'results' array
        newLength = atoms.element.length;

        if (atoms.visible.length < newLength) {
          atoms.visible   = arrays.extend(atoms.visible, newLength);
          atoms.draggable = arrays.extend(atoms.draggable, newLength);
        }

        atoms.visible[i]   = visible;
        atoms.draggable[i] = draggable;

        readModelState();
        dispatch.addAtom();

        return true;
      }
      // return false on failure
      return false;
    },

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
          j, jj,
          key;

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

      // Actually set properties
      for (key in props) {
        if (props.hasOwnProperty(key)) {
          atoms[key][i] = props[key];
        }
      }

      readModelState();
      return true;
    };

    model.getAtomProperties = function(i) {
      var p, propName,
          props = {};
      for (p = 0; p < model.ATOM_PROPERTY_LIST.length; p++) {
        propName = model.ATOM_PROPERTY_LIST[p];
        props[propName] = atoms[propName][i];
      }
      return props;
    };

    model.setElementProperties = function(i, props) {
      engine.setElementProperties(i, props);
      readModelState();
    };

    model.getElementProperties = function(i) {
      var p,
          props = {},
          propName;
      for (p = 0; p < model.ELEMENT_PROPERTY_LIST.length; p++) {
        propName = model.ELEMENT_PROPERTY_LIST[p];
        props[propName] = engine.elements[propName][i];
      }
      return props;
    };

    model.setObstacleProperties = function(i, props) {
      var key;
      for (key in props) {
        if (props.hasOwnProperty(key)) {
          obstacles[key][i] = props[key];
        }
      }
      readModelState();
    };

    model.getObstacleProperties = function(i) {
      var p, propName,
          props = {};
      for (p = 0; p < model.OBSTACLE_PROPERTY_LIST.length; p++) {
        propName = model.OBSTACLE_PROPERTY_LIST[p];
        props[propName] = obstacles[propName][i];
      }
      return props;
    };

    model.setRadialBondProperties = function(i, props) {
      var key;
      for (key in props) {
        if (props.hasOwnProperty(key)) {
          radialBonds[key][i] = props[key];
        }
      }
      readModelState();
    };

    model.getRadialBondProperties = function(i) {
      var p,
          props = {},
          propName;
      for (p = 0; p < model.RADIAL_BOND_PROPERTY_LIST.length; p++) {
        propName = model.RADIAL_BOND_PROPERTY_LIST[p];
        props[propName] = radialBonds[propName][i];
      }
      return props;
    };

    model.setAngularBondProperties = function(i, props) {
      var key;
      for (key in props) {
        if (props.hasOwnProperty(key)) {
          angularBonds[key][i] = props[key];
        }
      }
      readModelState();
    };

    model.getAngularBondProperties = function(i) {
      var p,
          props = {},
          propName;
      for (p = 0; p < model.ANGULAR_BOND_PROPERTY_LIST.length; p++) {
        propName = model.ANGULAR_BOND_PROPERTY_LIST[p];
        props[propName] = model.ANGULAR_BOND_PROPERTY_LIST[propName][i];
      }
      return props;
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

    /**
      Implements dragging of an atom in a running model, by creating a spring force that pulls the
      atom towards the mouse cursor position (x, y) and damping the resulting motion by temporarily
      adjusting the friction of the dragged atom.
    */
    model.liveDragStart = function(atomIndex, x, y) {
      if (x == null) x = atoms.x[atomIndex];
      if (y == null) y = atoms.y[atomIndex];

      liveDragSavedFriction = atoms.friction[atomIndex];
      atoms.friction[atomIndex] = model.LIVE_DRAG_FRICTION;

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

      atoms.friction[atomIndex] = liveDragSavedFriction;
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

    model.set_lennard_jones_forces = function(lj) {
     lennard_jones_forces = lj;
     engine.useLennardJonesInteraction(lj);
    };

    model.set_coulomb_forces = function(cf) {
     coulomb_forces = cf;
     engine.useCoulombInteraction(cf);
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

    model.get_radial_bonds = function() {
      return radialBonds;
    };

    model.get_vdw_pairs = function() {
      if (vdwPairs) engine.updateVdwPairsArray();
      return vdwPairs;
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

    model.start = function() {
      return model.resume();
    };

    model.resume = function() {
      stopped = false;

      d3.timer(function timerTick(elapsedTime) {
        // Cancel the timer and refuse to to step the model, if the model is stopped.
        // This is necessary because there is no direct way to cancel a d3 timer.
        // See: https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_timer)
        if (stopped) return true;

        tick(elapsedTime, false);
        return false;
      });

      dispatch.play();
      return model;
    };

    model.stop = function() {
      stopped = true;
      dispatch.stop();
      return model;
    };

    model.ke = function() {
      return modelOutputState.KE;
    };

    model.ave_ke = function() {
      return modelOutputState.KE / model.get_num_atoms();
    };

    model.pe = function() {
      return modelOutputState.PE;
    };

    model.ave_pe = function() {
      return modelOutputState.PE / model.get_num_atoms();
    };

    model.speed = function() {
      return average_speed();
    };

    model.pressure = function() {
      return container_pressure();
    };

    model.temperature = function(x) {
      if (!arguments.length) return temperature;
      set_temperature(x);
      return model;
    };

    model.size = function(x) {
      if (!arguments.length) return engine.getSize();
      engine.setSize(x);
      return model;
    };

    model.set = function(hash) {
      set_properties(hash);
    };

    model.get = function(property) {
      return properties[property];
    };

    /**
      Set the 'model_listener' function, which is called on tick events.
    */
    model.setModelListener = function(listener) {
      model_listener = listener;
      model.on('tick', model_listener);
      return model;
    };

    // Add a listener that will be notified any time any of the properties
    // in the passed-in array of properties is changed.
    // This is a simple way for views to update themselves in response to
    // properties being set on the model object.
    // Observer all properties with addPropertiesListener(["all"], callback);
    model.addPropertiesListener = function(properties, callback) {
      var i, ii, prop;
      for (i=0, ii=properties.length; i<ii; i++){
        prop = properties[i];
        if (!listeners[prop]) {
          listeners[prop] = [];
        }
        listeners[prop].push(callback);
      }
    };

    model.serialize = function(includeAtoms) {
      var propCopy = $.extend({}, properties);
      if (includeAtoms) {
        propCopy.atoms = serializeAtoms();
      }
      if (elements) {
        propCopy.elements = elements;
      }
      propCopy.width = width;
      propCopy.height = height;
      return propCopy;
    };

    return model;
  };
});

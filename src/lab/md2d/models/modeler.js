/*global define: false, d3: false, $: false */
/*jslint onevar: true devel:true eqnull: true */

define(function(require) {
  // Dependencies.
  var console     = require('common/console'),
      arrays      = require('arrays'),
      md2d        = require('md2d/models/engine/md2d'),
      TickHistory = require('md2d/models/tick-history'),

      engine;

  return function Model(initialProperties) {
    var model = {},
        elements = initialProperties.elements || [{id: 0, mass: 39.95, epsilon: -0.1, sigma: 0.34}],
        dispatch = d3.dispatch("tick", "play", "stop", "reset", "stepForward", "stepBack", "seek", "addAtom"),
        VDWLinesCutoffMap = {
          "short": 1.33,
          "medium": 1.67,
          "long": 2.0
        },
        defaultMaxTickHistory = 1000,
        stopped = true,
        restart = false,
        newStep = false,
        lastSampleTime,
        sampleTimes = [],

        modelOutputState,
        tickHistory,

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
        // Restraints (currently atom-only)
        restraints,
        // VDW Pairs
        vdwPairs,

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
          targetTemperature     : 300,
          modelSampleRate       : 'default',
          coulombForces         : true,
          lennardJonesForces    : true,
          temperatureControl   : true,
          gravitationalField    : false,
          keShading             : false,
          chargeShading         : false,
          showVDWLines          : false,
          showClock             : true,
          viewRefreshInterval   : 50,
          timeStep              : 1,
          VDWLinesCutoff        : "medium",
          viscosity             : 0,

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
          }
        },

        // The list of all 'output' properties (which change once per tick)
        outputNames = [],

        // Information about the metadata and calculating function for 'output' properties
        outputsByName = {},

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
          timeStep = model.get('timeStep'),
          sampleTime;

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
      readModelState();
      console.timeEnd('reading model state');

      tickHistory.push();
      newStep = true;

      if (!dontDispatchTickEvent) {
        dispatch.tick();
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
          readModelState();
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
          readModelState();
          dispatch.stepForward();
        } else {
          tick();
        }
      }
      return tickHistory.get("counter");
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

      engine.useLennardJonesInteraction(model.get('lennardJonesForces'));
      engine.useCoulombInteraction(model.get('coulombForces'));
      engine.useThermostat(model.get('temperatureControl'));
      engine.setViscosity(model.get('viscosity'));
      engine.setVDWLinesRatio(VDWLinesCutoffMap[model.get('VDWLinesCutoff')]);
      engine.setGravitationalField(model.get('gravitationalField'));
      engine.setTargetTemperature(model.get('targetTemperature'));

      if (config.x && config.y) {
        engine.initializeAtomsFromProperties(config);
      } else {
        engine.initializeAtomsRandomly({
          temperature: model.get('targetTemperature')
        });
        if (config.relax) engine.relaxToTemperature();
      }

      atoms = {};
      copyEngineAtomReferences(engine.atoms);
      initializeNonEngineProperties(config);

      window.state = modelOutputState = {};

      // Listeners should consider resetting the atoms a 'reset' event
      dispatch.reset();

      // return model, for chaining (if used)
      return model;
    };

    model.createRadialBonds = function(_radialBonds) {
      engine.initializeRadialBonds(_radialBonds);
      radialBonds = engine.radialBonds;
      radialBondResults = engine.radialBondResults;
      return model;
    };

    model.createAngularBonds = function(_angularBonds) {
      engine.initializeAngularBonds(_angularBonds);
      angularBonds = engine.angularBonds;
      return model;
    };

    model.createRestraints = function(_restraints) {
      engine.initializeRestraints(_restraints);
      restraints = engine.restraints;
      return model;
    };

    model.createVdwPairs = function(_atoms) {
      engine.createVdwPairsArray(_atoms);
      vdwPairs = engine.vdwPairs;
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

    model.initializeHistory = function(maxSize) {
      readModelState();
      maxSize = maxSize || defaultMaxTickHistory;
      tickHistory = TickHistory({
        input: [
          "targetTemperature",
          "lennardJonesForces",
          "coulombForces",
          "temperatureControl",
          "keShading",
          "chargeShading",
          "showVDWLines",
          "showClock",
          "viewRefreshInterval",
          "timeStep",
          "viscosity",
          "gravitationalField"
        ],
        output: [
          "KE",
          "PE",
          "pressure",
          "temperature",
          "time"
        ],
        state: [atoms, obstacles]
      }, modelOutputState, model, engine.setTime, maxSize);
      newStep = true;
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
      engine.setRadialBondProperties(i, props);
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

    model.setRestraintProperties = function(i, props) {
      var key;
      for (key in props) {
        if (props.hasOwnProperty(key)) {
          restraints[key][i] = props[key];
        }
      }
      readModelState();
    };

    model.getRestraintProperties = function(i) {
      var p,
          props = {},
          propName;
      for (p = 0; p < model.RESTRAINT_PROPERTY_LIST.length; p++) {
        propName = model.RESTRAINT_PROPERTY_LIST[p];
        props[propName] = model.RESTRAINT_PROPERTY_LIST[propName][i];
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

    model.get_radial_bonds = function() {
      return radialBonds;
    };

    model.get_restraints = function() {
      return restraints;
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

    model.minimizeEnergy = function () {
      engine.minimizeEnergy();
      readModelState();
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

    model.ave_ke = function() {
      return modelOutputState.KE / model.get_num_atoms();
    };

    model.ave_pe = function() {
      return modelOutputState.PE / model.get_num_atoms();
    };

    model.speed = function() {
      return average_speed();
    };

    model.pressureProbes = function() {
      return modelOutputState.pressureProbes;
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
      if (properties[property]) return properties[property];
      // TODO? Optimization opportunity: calculate any output property only once per tick. Invalidate
      // in readModelState.
      if (outputsByName[property]) return outputsByName[property].calculate();
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
      model tick, and may also be changed indirectly, outside of a model tick,by a change to the
      model parameters or to the configuration of atoms and other objects in the model.

      `name` should be the name of the parameter. The property value will be accessed by
      `model.get(<name>);`

      `metadata` should be  a hash of metadata about the property. Right now, these metadata are not
      used. However, example metadata include the label and units name to be used when graphing
      this property.

      `calculate` should be a no-arg function which should calculate the property value.
    */
    model.addOutput = function(name, metadata, calculate) {
      outputNames.push(name);
      outputsByName[name] = {
        metadata: metadata,
        calculate: calculate
      };
    };

    // FIXME: Broken!! Includes property setter methods, does not include radialBonds, etc.
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

    // ------------------------------
    // finish setting up the model
    // ------------------------------

    setupIndices();

    // Friction parameter temporarily applied to the live-dragged atom.
    model.LIVE_DRAG_FRICTION = 10;

    // set the rest of the regular properties
    set_properties(initialProperties);

    // Define some default output properties.
    model.addOutput('time', {
      label: "Time",
      units: "fs"
    }, function() {
      return modelOutputState.time;
    });

    model.addOutput('kineticEnergy', {
      label: "Kinetic Energy",
      units: "eV"
    }, function() {
      return modelOutputState.KE;
    });

    model.addOutput('potentialEnergy', {
      label: "Potential Energy",
      units: "eV"
    }, function() {
      return modelOutputState.PE;
    });

    model.addOutput('temperature', {
      label: "Temperature",
      units: "K"
    }, function() {
      return modelOutputState.temperature;
    });

    // Finally, if provided, set up the model objects (atoms, bonds, obstacles, and the rest)
    // However if these are not provided, client code can create atoms, etc piecemeal

    if (initialProperties.atoms) {
      model.createNewAtoms(initialProperties.atoms);
    } else if (initialProperties.mol_number) {
      model.createNewAtoms(initialProperties.mol_number);
      if (initialProperties.relax) model.relax();
    }

    if (initialProperties.radialBonds)  model.createRadialBonds(initialProperties.radialBonds);
    if (initialProperties.angularBonds) model.createAngularBonds(initialProperties.angularBonds);
    if (initialProperties.restraints)   model.createRestraints(initialProperties.restraints);
    if (initialProperties.showVDWLines) model.createVdwPairs(initialProperties.atoms);
    if (initialProperties.obstacles)    model.createObstacles(initialProperties.obstacles);

    // Initialize history if user provided atoms, etc, to save. Client code not passing in
    // atoms needs to set up history itself, if it wants history to be saved.
    if (atoms) {
      model.initializeHistory();
    }

    return model;
  };
});

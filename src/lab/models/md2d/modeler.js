/*global $ modeler:true, require, d3, benchmark, molecule_container */
/*jslint onevar: true devel:true eqnull: true */

// modeler.js
//

var md2d   = require('/md2d'),
    arrays = require('arrays'),
    engine;

modeler = {};
modeler.VERSION = '0.2.0';

modeler.model = function(initialProperties) {
  var model = {},
      elements = initialProperties.elements || [{id: 0, mass: 39.95, epsilon: -0.1, sigma: 0.34}],
      dispatch = d3.dispatch("tick", "play", "stop", "reset", "stepForward", "stepBack", "seek", "addAtom"),
      temperature_control,
      chargeShading, showVDWLines,VDWLinesRatio,
      showClock,
      lennard_jones_forces, coulomb_forces,
      gravitationalField = false,
      viewRefreshInterval = 50,
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

      //
      // A two dimensional array consisting of radial bond index numbers, radial bond
      // property, and the postions of the two bonded atoms.
      radialBondResults,

      // list of obstacles
      obstacles,
      // Radial Bonds
      radialBonds,
      // VDW Pairs
      vdwPairs,

      viscosity,

      // The index of the "spring force" used to implement dragging of atoms in a running model
      liveDragSpringForceIndex,

      // Cached value of the 'friction' property of the atom being dragged in a running model
      liveDragSavedFriction,
      i,
      prop,

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
        chargeShading         : false,
        showVDWLines          : false,
        showClock             : true,
        viewRefreshInterval   : 50,
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
          if (engine) {
            engine.setIntegrationDuration(vri);
          }
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
      }());

  //
  // Indexes into the atoms array for the individual node property arrays
  // (re-export these from engine for convenience)
  //
  model.INDICES = {};
  model.ATOM_PROPERTY_LIST = [];
  for (i = 0; i < md2d.ATOM_PROPERTY_LIST.length; i++) {
    prop = md2d.ATOM_PROPERTY_LIST[i];
    model.ATOM_PROPERTY_LIST[i] = prop;
    model.INDICES[prop] = md2d.ATOM_INDICES[prop];
  }

  window.model_md2d_results_RADIUS   = md2d.ATOM_INDICES.RADIUS+1,
  window.model_md2d_results_PX       = md2d.ATOM_INDICES.PX+1,
  window.model_md2d_results_PY       = md2d.ATOM_INDICES.PY+1,
  window.model_md2d_results_X        = md2d.ATOM_INDICES.X+1,
  window.model_md2d_results_Y        = md2d.ATOM_INDICES.Y+1,
  window.model_md2d_results_VX       = md2d.ATOM_INDICES.VX+1,
  window.model_md2d_results_VY       = md2d.ATOM_INDICES.VY+1,
  window.model_md2d_results_SPEED    = md2d.ATOM_INDICES.SPEED+1,
  window.model_md2d_results_AX       = md2d.ATOM_INDICES.AX+1,
  window.model_md2d_results_AY       = md2d.ATOM_INDICES.AY+1,
  window.model_md2d_results_CHARGE   = md2d.ATOM_INDICES.CHARGE+1,
  window.model_md2d_results_FRICTION = md2d.ATOM_INDICES.FRICTION+1,
  window.model_md2d_results_VISIBLE  = md2d.ATOM_INDICES.VISIBLE+1,
  window.model_md2d_results_DRAGGABLE= md2d.ATOM_INDICES.DRAGGABLE+1,
  window.model_md2d_results_ELEMENT  = md2d.ATOM_INDICES.ELEMENT+1,
  window.model_md2d_results_MASS     = md2d.ATOM_INDICES.MASS+1,

  model.ATOM_PROPERTY_NAMES = {
    RADIUS   : md2d.ATOM_PROPERTY_NAMES.RADIUS,
    PX       : md2d.ATOM_PROPERTY_NAMES.PX,
    PY       : md2d.ATOM_PROPERTY_NAMES.PY,
    X        : md2d.ATOM_PROPERTY_NAMES.X,
    Y        : md2d.ATOM_PROPERTY_NAMES.Y,
    VX       : md2d.ATOM_PROPERTY_NAMES.VX,
    VY       : md2d.ATOM_PROPERTY_NAMES.VY,
    SPEED    : md2d.ATOM_PROPERTY_NAMES.SPEED,
    AX       : md2d.ATOM_PROPERTY_NAMES.AX,
    AY       : md2d.ATOM_PROPERTY_NAMES.AY,
    CHARGE   : md2d.ATOM_PROPERTY_NAMES.CHARGE,
    FRICTION : md2d.ATOM_PROPERTY_NAMES.FRICTION,
    ELEMENT  : md2d.ATOM_PROPERTY_NAMES.ELEMENT,
    MASS     : md2d.ATOM_PROPERTY_NAMES.MASS,
    VISIBLE  : "visible",
    DRAGGABLE: "draggable"
  };

  model.OBSTACLE_INDICES = {
    X        : md2d.OBSTACLE_INDICES.X,
    Y        : md2d.OBSTACLE_INDICES.Y,
    WIDTH    : md2d.OBSTACLE_INDICES.WIDTH,
    HEIGHT   : md2d.OBSTACLE_INDICES.HEIGHT,
    COLOR_R  : md2d.OBSTACLE_INDICES.COLOR_R,
    COLOR_G  : md2d.OBSTACLE_INDICES.COLOR_G,
    COLOR_B  : md2d.OBSTACLE_INDICES.COLOR_B,
    VISIBLE  : md2d.OBSTACLE_INDICES.VISIBLE
  };

  model.RADIAL_INDICES = {
    ATOM1     : md2d.RADIAL_INDICES.ATOM1,
    ATOM2     : md2d.RADIAL_INDICES.ATOM2,
    LENGTH    : md2d.RADIAL_INDICES.LENGTH,
    STRENGTH  : md2d.RADIAL_INDICES.STRENGTH
  };

  model.VDW_INDICES = md2d.VDW_INDICES;

  // Friction parameter temporarily applied to the live-dragged atom.
  model.LIVE_DRAG_FRICTION = 10;

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
    i = -1; while (++i < n) { s += engine.speed[i]; }
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
      engine.integrate();
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
    var i,
        newAtoms = [],
        n = atoms.length;

    i = -1; while (++i < n) {
      newAtoms[i] = arrays.clone(atoms[i]);
    }
    tick_history_list.length = tick_history_list_index;
    tick_history_list_index++;
    tick_counter++;
    new_step = true;
    tick_history_list.push({
      atoms:   newAtoms,
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
    var i, n=atoms.length;
    if (index < 0) {
      throw new Error("modeler: request for tick_history_list[" + index + "]");
    }
    if (index >= tick_history_list.length) {
      throw new Error("modeler: request for tick_history_list[" + index + "], tick_history_list.length=" + tick_history_list.length);
    }
    i = -1; while(++i < n) {
      arrays.copy(tick_history_list[index].atoms[i], atoms[i]);
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

  function readModelState() {
    var i,
        len,
        j,
        n;

    engine.computeOutputState(modelOutputState);

    // Transpose 'atoms' array into 'results' for easier consumption by view code
    for (j = 0, len = engine.atoms.length; j < len; j++) {
      for (i = 0, n = model.get_num_atoms(); i < n; i++) {
        results[i][j+1] = engine.atoms[j][i];
      }
    }

    pressure = modelOutputState.pressure;
    pe       = modelOutputState.PE;
    ke       = modelOutputState.KE;
    time     = modelOutputState.time;
  }

  /**
    Initialize results[] arrays consisting of arrays of atom index numbers
    and space to later contain transposed atom properties.
  */
  function createResultsArray() {
    var i,
        n,
        arrayType = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular';

    results = [];

    for (i = 0, n = model.get_num_atoms(); i < n; i++) {
      results[i] = arrays.create(1 + model.ATOM_PROPERTY_LIST.length,  0, arrayType);
      results[i][0] = i;
    }
  }


  // ------------------------------
  // finish setting up the model
  // ------------------------------

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
    var elemsArray, element, i, ii, num;

    if (typeof config === 'number') {
      num = config;
    } else if (config.num != null) {
      num = config.num;
    } else if (config.X) {
      num = config.X.length;
    }

    // convert from easily-readble json format to simplified array format
    elemsArray = [];
    for (i=0, ii=elements.length; i<ii; i++){
      element = elements[i];
      elemsArray[element.id] = [element.mass, element.epsilon, element.sigma];
    }

    // get a fresh model
    engine = md2d.createEngine();
    engine.setSize([width,height]);
    engine.setElements(elemsArray);
    engine.createAtoms({
      num: num
    });

    atoms = engine.atoms;
    createResultsArray();

    window.state = modelOutputState = {};

    // Initialize properties
    temperature_control = properties.temperature_control;
    temperature         = properties.temperature;
    modelSampleRate     = properties.modelSampleRate,
    chargeShading       = properties.chargeShading;
    showVDWLines        = properties.showVDWLines;
    VDWLinesRatio       = properties.VDWLinesRatio;
    showClock           = properties.showClock;
    viewRefreshInterval = properties.viewRefreshInterval;
    viscosity           = properties.viscosity;
    gravitationalField  = properties.gravitationalField;
    viewRefreshInterval = properties.viewRefreshInterval;

    engine.useLennardJonesInteraction(properties.lennard_jones_forces);
    engine.useCoulombInteraction(properties.coulomb_forces);
    engine.useThermostat(temperature_control);
    engine.setViscosity(viscosity);
    engine.setGravitationalField(gravitationalField);
    engine.setIntegrationDuration(viewRefreshInterval);

    engine.setTargetTemperature(temperature);

    if (config.X && config.Y) {
      engine.initializeAtomsFromProperties(config);
    } else {
      engine.initializeAtomsRandomly({
        temperature: temperature
      });
      if (config.relax) engine.relaxToTemperature();
    }

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

  // The next four functions assume we're are doing this for
  // all the atoms will need to be changed when different atoms
  // can have different LJ sigma values

  /** Accepts an epsilon value in eV.

      Example value for argon is 0.013 (positive)
  */
  model.setEpsilon = function(e) {
    engine.setLJEpsilon(e);
  };

  /** Accepts a sigma value in nm

    Example value for argon is 3.4 nm
  */
  model.setSigma = function(s) {
    engine.setLJSigma(s);
  };

  model.getEpsilon = function() {
    return engine.getLJEpsilon();
  };

  model.getSigma = function() {
    return engine.getLJSigma();
  };

  model.getLJCalculator = function() {
    return engine.getLJCalculator();
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
        radius    = engine.getRadiusOfElement(el);

    charge    = typeof charge    === "number" ? charge : 0;       // default for charge is 0
    friction  = typeof friction  === "number" ? friction : 0;     // default for friction is 0
    pinned    = typeof pinned    === "number" ? pinned : 0;       // default for pinned is 0
    visible   = typeof visible   === "number" ? visible : 1;      // default for visible is 1
    draggable = typeof draggable === "number" ? draggable : 1;    // default for draggable is 1

    // As a convenience to script authors, bump the atom within bounds
    if (x < radius) x = radius;
    if (x > size[0]-radius) x = size[0]-radius;
    if (y < radius) y = radius;
    if (y > size[1]-radius) y = size[1]-radius;

    // check the potential energy change caused by adding an *uncharged* atom at (x,y)
    if (engine.canPlaceAtom(el, x, y)) {
      engine.addAtom(el, x, y, vx, vy, charge, friction, pinned, visible, draggable);

      // reassign atoms to possibly-reallocated atoms array
      atoms = engine.atoms;
      results = engine.results;
      engine.computeOutputState();
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
      x = atoms[model.INDICES.X][moleculeAtoms[i]];
      y = atoms[model.INDICES.Y][moleculeAtoms[i]];
      r = atoms[model.INDICES.RADIUS][moleculeAtoms[i]];

      if (x-r < left  ) left   = x-r;
      if (x+r > right ) right  = x+r;
      if (y-r < bottom) bottom = y-r;
      if (y+r > top   ) top    = y+r;
    }

    cx = atoms[model.INDICES.X][atomIndex];
    cy = atoms[model.INDICES.Y][atomIndex];

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

    if (moveMolecule) {
      moleculeAtoms = engine.getMoleculeAtoms(i);
      if (moleculeAtoms.length > 0) {
        dx = typeof props.x === "number" ? props.x - engine.atoms[model.INDICES.X][i] : 0;
        dy = typeof props.y === "number" ? props.y - engine.atoms[model.INDICES.Y][i] : 0;
        for (j = 0, jj=moleculeAtoms.length; j<jj; j++) {
          new_x = engine.moleculeAtoms[model.INDICES.X][moleculeAtoms[j]] + dx;
          new_y = engine.moleculeAtoms[model.INDICES.Y][moleculeAtoms[j]] + dy;
          if (!model.setAtomProperties(moleculeAtoms[j], {x: new_x, y: new_y}, checkLocation, false)) {
            return false;
          }
        }
      }
    }

    if (checkLocation) {
      var x  = typeof props.x === "number" ? props.x : engine.atoms[model.INDICES.X][i],
          y  = typeof props.y === "number" ? props.y : engine.atoms[model.INDICES.Y][i],
          el = typeof props.element === "number" ? props.y : engine.atoms[model.INDICES.ELEMENT][i];

      if (!engine.canPlaceAtom(el, x, y, i)) {
        return false;
      }
    }
    engine.setAtomProperties(i, props);
    readModelState();
    return true;
  },

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
    if (x == null) x = atoms[model.INDICES.X][atomIndex];
    if (y == null) y = atoms[model.INDICES.Y][atomIndex];

    liveDragSavedFriction = atoms[model.INDICES.FRICTION][atomIndex];
    atoms[model.INDICES.FRICTION][atomIndex] = model.LIVE_DRAG_FRICTION;

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

    atoms[model.INDICES.FRICTION][atomIndex] = liveDragSavedFriction;
    model.removeSpringForce(liveDragSpringForceIndex);
  };

  // return a copy of the array of speeds
  model.get_speed = function() {
    return arrays.copy(engine.speed, []);
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
    return atoms[0].length;
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
      propCopy.atoms = engine.serialize();
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

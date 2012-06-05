/*globals $ modeler:true, require, d3, arrays, benchmark, molecule_container */
/*jslint onevar: true devel:true eqnull: true */

// modeler.js
//

var md2d = require('./md2d'),
    coreModel;

modeler = {};
modeler.VERSION = '0.2.0';

modeler.model = function(initialProperties) {
  var model = {},
      elements = initialProperties.elements || [{id: 0, mass: 39.95, epsilon: -0.1, sigma: 0.34}],
      dispatch = d3.dispatch("tick", "play", "stop", "reset", "stepForward", "stepBack", "seek"),
      temperature_control,
      lennard_jones_forces, coulomb_forces,
      stopped = true,
      tick_history_list = [],
      tick_history_list_index = 0,
      tick_counter = 0,
      new_step = false,
      pressure, pressures = [0],
      sample_time, sample_times = [],

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
      // Number of individual properties for a node
      //
      node_properties_length = 12,

      //
      // A two dimensional array consisting of arrays of node property values
      //
      nodes,

      listeners = {},

      properties = {
        temperature           : 300,
        coulomb_forces        : false,
        lennard_jones_forces  : true,
        temperature_control   : true,

        set_temperature: function(t) {
          this.temperature = t;
          if (coreModel) {
            coreModel.setTargetTemperature(t);
          }
        },

        set_temperature_control: function(tc) {
          this.temperature_control = tc;
          if (coreModel) {
            coreModel.useThermostat(tc);
          }
        },

        set_coulomb_forces: function(cf) {
          this.coulomb_forces = cf;
          if (coreModel) {
            coreModel.useCoulombInteraction(cf);
          }
        },

        set_epsilon: function(e) {
          console.log("set_epsilon: This method is temporarily deprecated");
        },

        set_sigma: function(s) {
          console.log("set_sigma: This method is temporarily deprecated");
        }
      };

  //
  // Indexes into the nodes array for the individual node property arrays
  // (re-export these from coreModel for convenience)
  //
  model.INDICES = {
    RADIUS   : md2d.INDICES.RADIUS,
    PX       : md2d.INDICES.PX,
    PY       : md2d.INDICES.PY,
    X        : md2d.INDICES.X,
    Y        : md2d.INDICES.Y,
    VX       : md2d.INDICES.VX,
    VY       : md2d.INDICES.VY,
    SPEED    : md2d.INDICES.SPEED,
    AX       : md2d.INDICES.AX,
    AY       : md2d.INDICES.AY,
    CHARGE   : md2d.INDICES.CHARGE,
    ELEMENT  : md2d.INDICES.ELEMENT
  };

  function notifyListeners(listeners) {
    $.unique(listeners);
    for (var i=0, ii=listeners.length; i<ii; i++){
      listeners[i]();
    }
  }

  function notifyListenersOfEvents(events) {
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
    notifyListeners(waitingToBeNotified);
  }

  function average_speed() {
    var i, s = 0, n = model.get_num_atoms();
    i = -1; while (++i < n) { s += coreModel.speed[i]; }
    return s/n;
  }

  function tick_history_list_is_empty() {
    return tick_history_list_index === 0;
  }

  function tick_history_list_push() {
    var i,
        newnodes = [],
        n = node_properties_length;

    i = -1; while (++i < n) {
      newnodes[i] = arrays.clone(nodes[i]);
    }
    tick_history_list.length = tick_history_list_index;
    tick_history_list_index++;
    tick_counter++;
    new_step = true;
    tick_history_list.push({
      nodes:   newnodes,
      pressure: modelOutputState.pressure,
      pe:       modelOutputState.PE,
      ke:       modelOutputState.KE,
      time:     modelOutputState.time
    });
    if (tick_history_list_index > 1000) {
      tick_history_list.splice(0,1);
      tick_history_list_index = 1000;
    }
  }

  function tick() {
    var t;

    if (tick_history_list_is_empty()) {
      tick_history_list_push();
    }

    coreModel.integrate();

    pressure = modelOutputState.pressure;
    pe       = modelOutputState.PE;
    ke       = modelOutputState.KE;
    time     = modelOutputState.time;

    pressures.push(pressure);
    pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries

    tick_history_list_push();

    if (!stopped) {
      t = Date.now();
      if (sample_time) {
        sample_time  = t - sample_time;
        if (sample_time) { sample_times.push(sample_time); }
        sample_time = t;
        sample_times.splice(0, sample_times.length - 128);
      } else {
        sample_time = t;
      }
      dispatch.tick({type: "tick"});
    } else {
      if (model_listener) { model_listener(); }
    }
    return stopped;
  }

  function reset_tick_history_list() {
    tick_history_list = [];
    tick_history_list_index = 0;
    tick_counter = -1;
  }

  function tick_history_list_reset_to_ptr() {
    tick_history_list.length = tick_history_list_index + 1;
  }

  function tick_history_list_extract(index) {
    var i, n=node_properties_length;
    if (index < 0) {
      throw new Error("modeler: request for tick_history_list[" + index + "]");
    }
    if (index >= tick_history_list.length) {
      throw new Error("modeler: request for tick_history_list[" + index + "], tick_history_list.length=" + tick_history_list.length);
    }
    i = -1; while(++i < n) {
      arrays.copy(tick_history_list[index].nodes[i], nodes[i]);
    }
    ke = tick_history_list[index].ke;
    time = tick_history_list[index].time;
    coreModel.setTime(time);
  }

  function container_pressure() {
    return pressures.reduce(function(j,k) { return j+k; })/pressures.length;
  }

  function average_rate() {
    var i, ave, s = 0, n = sample_times.length;
    i = -1; while (++i < n) { s += sample_times[i]; }
    ave = s/n;
    return (ave ? 1/ave*1000: 0);
  }

  function set_temperature(t) {
    temperature = t;
    coreModel.setTargetTemperature(t);
  }

  function set_properties(hash) {
    var property, propsChanged = [];
    for (property in hash) {
      if (hash.hasOwnProperty(property) && hash[property] !== undefined && hash[property] !== null) {
        // look for set method first, otherwise just set the property
        if (properties["set_"+property]) {
          properties["set_"+property](hash[property]);
        } else if (properties[property]) {
          properties[property] = hash[property];
        }
        propsChanged.push(property);
      }
    }
    notifyListenersOfEvents(propsChanged);
  }

  // Creates a new md2d coreModel
  // @config: either the number of atoms (for a random setup) or
  //          a hash specifying the x,y,vx,vy properties of the atoms
  function createNewCoreModel(config) {
    var elemsArray, element, i, ii;

    // convert from easily-readble json format to simplified array format
    elemsArray = [];
    for (i=0, ii=elements.length; i<ii; i++){
      element = elements[i];
      elemsArray[element.id] = [element.mass, element.epsilon, element.sigma];
    }

    // get a fresh model
    coreModel = md2d.makeModel();
    coreModel.setSize([width,height]);
    coreModel.setElements(elemsArray);
    coreModel.createAtoms({
      num: typeof config === 'number' ? config : config.X.length
    });

    nodes = coreModel.nodes;
    modelOutputState = coreModel.outputState;

    // Initialize properties
    temperature_control = properties.temperature_control;
    temperature         = properties.temperature;

    coreModel.useLennardJonesInteraction(properties.lennard_jones_forces);
    coreModel.useCoulombInteraction(properties.coulomb_forces);
    coreModel.useThermostat(temperature_control);

    coreModel.setTargetTemperature(temperature);

    if (config.X && config.Y) {
      coreModel.initializeAtomsFromProperties(config);
    } else {
      coreModel.initializeAtomsRandomly({
        temperature: temperature
      });
    }

    // tick history stuff
    reset_tick_history_list();
    new_step = true;

    return coreModel;
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

    // If no ticks have run, tick_history_list will be uninitialized.
    if (tick_history_list_is_empty()) {
      return 0;
    }

    // The first tick will push 2 states to the tick_history_list: the initialized state ("step 0")
    // and the post-tick model state ("step 1")
    // Subsequent ticks will push 1 state per tick. So subtract 1 from the length to get the step #.
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
    notifyListenersOfEvents("seek");
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

  // The next four functions assume we're are doing this for
  // all the atoms will need to be changed when different atoms
  // can have different LJ sigma values

  /** Accepts an epsilon value in eV.

      Example value for argon is 0.013 (positive)
  */
  model.setEpsilon = function(e) {
    coreModel.setLJEpsilon(e);
  };

  /** Accepts a sigma value in nm

    Example value for argon is 3.4 nm
  */
  model.setSigma = function(s) {
    coreModel.setLJSigma(s);
  };

  model.getEpsilon = function() {
    return coreModel.getLJEpsilon();
  };

  model.getSigma = function() {
    return coreModel.getLJSigma();
  };

  model.getLJCalculator = function() {
    return coreModel.getLJCalculator();
  };

  model.resetTime = function() {
    coreModel.setTime(0);
  };

  model.getTime = function() {
    return modelOutputState ? modelOutputState.time : undefined;
  };

  model.addAtom = function() {
    coreModel.addAtom.apply(coreModel, arguments);
    nodes = coreModel.nodes;
    coreModel.computeOutputState();
    if (model_listener) model_listener();
  },

  // return a copy of the array of speeds
  model.get_speed = function() {
    return arrays.copy(coreModel.speed, []);
  };

  model.get_rate = function() {
    return average_rate();
  };

  model.is_stopped = function() {
    return stopped;
  };

  model.set_lennard_jones_forces = function(lj) {
   lennard_jones_forces = lj;
   coreModel.useLennardJonesInteraction(lj);
  };

  model.set_coulomb_forces = function(cf) {
   coulomb_forces = cf;
   coreModel.useCoulombInteraction(cf);
  };

  model.get_nodes = function() {
    return nodes;
  };

  model.get_num_atoms = function() {
    return nodes[0].length;
  };

  model.on = function(type, listener) {
    dispatch.on(type, listener);
    return model;
  };

  model.tickInPlace = function() {
    dispatch.tick({type: "tick"});
    return model;
  };

  model.tick = function(num) {
    if (!arguments.length) { num = 1; }
    var i = -1;
    while(++i < num) {
      tick();
    }
    return model;
  };

  model.relax = function() {
    coreModel.relaxToTemperature();
    return model;
  };

  model.start = function() {
    return model.resume();
  };

  model.resume = function() {
    stopped = false;
    d3.timer(tick);
    dispatch.play();
    notifyListenersOfEvents("play");
    return model;
  };

  model.stop = function() {
    stopped = true;
    dispatch.stop();
    return model;
  };

  model.ke = function() {
    return modelOutputState ? modelOutputState.KE : undefined;
  };

  model.ave_ke = function() {
    return modelOutputState? modelOutputState.KE / model.get_num_atoms() : undefined;
  };

  model.pe = function() {
    return modelOutputState ? modelOutputState.PE : undefined;
  };

  model.ave_pe = function() {
    return modelOutputState? modelOutputState.PE / model.get_num_atoms() : undefined;
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
    if (!arguments.length) return coreModel.getSize();
    coreModel.setSize(x);
    return model;
  };

  // Creates a new md2d coreModel
  // @config: either the number of atoms (for a random setup) or
  //          a hash specifying the x,y,vx,vy properties of the atoms
  model.createNewAtoms = function(config) {
    return createNewCoreModel(config);
  };

  model.set = function(hash) {
    set_properties(hash);
  };

  model.get = function(property) {
    return properties[property];
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
      propCopy.atoms = coreModel.serialize();
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

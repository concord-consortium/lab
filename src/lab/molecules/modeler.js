/*globals modeler:true, d3, arrays, molecules_coulomb, molecules_lennard_jones, benchmark */
/*jslint onevar: true devel:true */

// modeler.js
//

modeler = {};
modeler.VERSION = '0.1.0';

modeler.Math = modeler.Math || {};

// Simple (Box-Muller) univariate-normal random number generator.
// Compiled from a Coffeescript version I wrote recently. --RPK
modeler.Math.normal = (function() {
  var next;
  next = null;
  return function(mean, sd) {
    var r, ret, theta, u1, u2;
    if (mean == null) mean = 0;
    if (sd == null) sd = 1;
    if (next) {
      ret = next;
      next = null;
      return ret;
    }
    u1 = Math.random();
    u2 = Math.random();
    theta = 2 * Math.PI * u1;
    r = Math.sqrt(-2 * Math.log(u2));
    next = mean + sd * (r * Math.sin(theta));
    return mean + sd * (r * Math.cos(theta));
  };
}());

modeler.makeIntegrator = function(args) {

  var setOnceState   = args.setOnceState,
      readWriteState = args.readWriteState,
      settableState  = args.settableState || {},

      outputState    = args.outputState,

      max_coulomb_distance = setOnceState.max_coulomb_distance,
      max_ljf_distance     = setOnceState.max_ljf_distance,
      size                 = setOnceState.size,

      ax                   = readWriteState.ax,
      ay                   = readWriteState.ay,
      charge               = readWriteState.charge,
      nodes                = readWriteState.nodes,
      px                   = readWriteState.px,
      py                   = readWriteState.py,
      radius               = readWriteState.radius,
      speed                = readWriteState.speed,
      vx                   = readWriteState.vx,
      vy                   = readWriteState.vy,
      x                    = readWriteState.x,
      y                    = readWriteState.y,

      coulomb_forces       = settableState.coulomb_forces,
      lennard_jones_forces = settableState.lennard_jones_forces,
      temperature_control  = settableState.temperature_control,

      twoKE,

      // Desired temperature. Called T_heatBath because will simulate coupling to an infintely large heat bath at
      // temperature T_heatBath.
      T_heatBath = 1.0,

      // coupling factor for Berendsen thermostat
      dt_over_tau = 0.01;

  function temperature_to_speed(t) {
    return 0.250 * Math.pow(Math.E/2, t);
  }

  return {

    set_coulomb_forces      : function(v) { coulomb_forces = v; },
    set_lennard_jones_forces: function(v) { lennard_jones_forces = v; },
    set_temperature_control : function(v) { temperature_control = v; },
    set_temperature         : function(v) {
      var speed = temperature_to_speed(v);
      T_heatBath = speed*speed;
    },

    integrate               : function(t) {
      // how much "time" to integrate over
      if (t == null) t = 1;

      var dt                = 1/50,                      // intra-step time
          integration_steps = t/dt,                      // number of steps
          dt_sq             = dt * dt,                   // intra-step time squared
          n = nodes[0].length,
          i, // current index
          j, // alternate member of force-pair index
          r, // current distance
          dr_sq, v_sq,
          r_sq,
          f, f_lj, f_coul, f_x, f_y,
          dx, dy,
          initial_x, initial_y,
          iloop,
          leftwall   = radius[0],
          bottomwall = radius[0],
          rightwall  = size[0] - radius[0],
          topwall    = size[1] - radius[0],
          speed_goal,
          ave_speed,
          speed_max_one_percent,
          speed_min_one_percent,
          ave_speed_max,
          ave_speed_min,
          speed_max,
          speed_min,
          speed_factor,

          PE,
          T,
          vRescaleFactor,

          // measurements to be accumulated during the integration loop
          pressure = 0;

      //
      // Loop through this inner processing loop 'integration_steps' times:
      //
      iloop = -1; while(++iloop < integration_steps) {

        T = twoKE / 2 / n;
        twoKE = 0;
        vRescaleFactor = 1 + dt_over_tau * ((T_heatBath / T) - 1);

        //
        // Use a Verlet integration to continue particle movement integrating acceleration with
        // existing position and previous position while managing collision with boundaries.
        //
        // Update positions for first half of verlet integration
        //
        i = -1; while (++i < n) {
          initial_x = x[i];
          initial_y = y[i];

          if (temperature_control) {
            vx[i] *= vRescaleFactor;
            vy[i] *= vRescaleFactor;
          }

          x[i]  += vx[i] * dt + 0.5 * dt_sq * ax[i];
          y[i]  += vy[i] * dt + 0.5 * dt_sq * ay[i];

          dx = x[i] - initial_x;
          dy = y[i] - initial_y;

          dr_sq = dx*dx + dy*dy;
          v_sq  = dr_sq / dt_sq;
          speed[i] = Math.sqrt(v_sq);

          twoKE += v_sq;

          // FIRST HALF of update of v for next time step, using a for current time step.
          vx[i] += 0.5 * dt * ax[i];
          vy[i] += 0.5 * dt * ay[i];

          // possibly bounce off vertical walls
          if (x[i] < leftwall) {
            x[i]  = leftwall + (leftwall - x[i]);
            px[i] = x[i] + dx;
            vx[i] *= -1;
            pressure += -dx/dt;
          } else if (x[i] > rightwall) {
            x[i]  = rightwall + (rightwall - x[i]);
            px[i] = x[i] + dx;
            vx[i] *= -1;
            pressure += dx/dt;
          } else {
            px[i] = initial_x;
          }

          // possibly bounce off horizontal walls
          if (y[i] < bottomwall) {
            y[i]  = bottomwall + (bottomwall - y[i]);
            py[i] = y[i] + dy;
            vy[i] *= -1;
            pressure += -dy/dt;
          } else if (y[i] > topwall) {
            y[i]  = topwall + (topwall - y[i]);
            py[i] = y[i] + dy;
            vy[i] *= -1;
            pressure += dy/dt;
          } else {
            py[i] = initial_y;
          }
        }

        // zero-out the acceleration, in order to accumulate effect of pairwise forces
        i = -1; while (++i < n) {
          ax[i] = 0;
          ay[i] = 0;
        }

        // Calculate pairwise forces and accumulate effects into acceleration vector (ax, ay)
        if (lennard_jones_forces || coulomb_forces) {
          i = -1; while (++i < n) {
            j = i; while (++j < n) {
              dx = x[j] - x[i];
              dy = y[j] - y[i];
              r_sq = dx * dx + dy * dy;
              r = Math.sqrt(r_sq);

              f_lj = 0;
              f_coul = 0;

              if (lennard_jones_forces && r < max_ljf_distance) {
                f_lj = molecules_lennard_jones.force(r);
              }
              if (coulomb_forces && r < max_coulomb_distance) {
                f_coul = molecules_coulomb.force(r, charge[i], charge[j]);
              }

              f   = f_lj + f_coul;
              f_x = f * (dx / r);
              f_y = f * (dy / r);

              ax[i] += f_x;
              ay[i] += f_y;
              ax[j] -= f_x;
              ay[j] -= f_y;
            }
          }
        }

        // SECOND HALF of update of v for next time step, using updated a for next time step.
        i = -1; while (++i < n) {
          vx[i] += 0.5 * dt * ax[i];
          vy[i] += 0.5 * dt * ay[i];
        }
      }

      // calculate potentials
      PE = 0;

      i = -1; while (++i < n) {
        j = i; while (++j < n) {
          dx = x[j] - x[i];
          dy = y[j] - y[i];
          r_sq = dx * dx + dy * dy;
          r = Math.sqrt(r_sq);

          if (lennard_jones_forces && r < max_ljf_distance) {
            PE += molecules_lennard_jones.potential(r);
          }
          if (coulomb_forces && r < max_coulomb_distance) {
            PE += molecules_coulomb.potential(r, charge[i], charge[j]);
          }
        }
      }

      // state to be read by the rest of the system
      outputState.pressure = pressure;
      outputState.PE = PE;
      outputState.KE = twoKE / 2;
    }
  };
};


modeler.model = function() {
  var model = {},
      atoms = [],
      mol_number,
      event = d3.dispatch("tick"),
      size = [100, 100],
      temperature_control,
      lennard_jones_forces, coulomb_forces,
      PE,
      ke, ave_ke,
      stopped = true,
      tick_history_list = [],
      tick_history_list_index = 0,
      tick_counter = 0,
      new_step = false,
      epsilon, sigma,
      max_ljf_repulsion = -200.0,
      min_ljf_attraction = 0.001,
      max_ljf_distance,
      min_ljf_distance,
      max_coulomb_force = 20.0,
      min_coulomb_force = 0.01,
      max_coulomb_distance,
      min_coulomb_distance,
      pressure, pressures = [0],
      sample_time, sample_times = [],
      temperature,

      integrator,
      integratorOutputState = {},
      model_listener,

      //
      // Individual property arrays for the nodes
      //
      radius, px, py, x, y, vx, vy, speed, ax, ay, halfmass, charge,

      //
      // Number of individual properties for a node
      //
      node_properties_length = 12,

      //
      // A two dimensional array consisting of arrays of node property values
      //
      nodes = arrays.create(node_properties_length, null, "regular"),

      //
      // Indexes into the nodes array for the individual node property arrays
      //
      // Access to these within this module will be faster if they are vars in this closure rather than property lookups.
      // However, publish the indices to model.INDICES for use outside this module.
      //
      RADIUS_INDEX   =  0,
      PX_INDEX       =  1,
      PY_INDEX       =  2,
      X_INDEX        =  3,
      Y_INDEX        =  4,
      VX_INDEX       =  5,
      VY_INDEX       =  6,
      SPEED_INDEX    =  7,
      AX_INDEX       =  8,
      AY_INDEX       =  9,
      HALFMASS_INDEX = 10,
      CHARGE_INDEX   = 11;


  model.INDICES = {
    RADIUS   : RADIUS_INDEX,
    PX       : PX_INDEX,
    PY       : PY_INDEX,
    X        : X_INDEX,
    Y        : Y_INDEX,
    VX       : VX_INDEX,
    VY       : VY_INDEX,
    SPEED    : SPEED_INDEX,
    AX       : AX_INDEX,
    AY       : AY_INDEX,
    HALFMASS : HALFMASS_INDEX,
    CHARGE   : CHARGE_INDEX
  };



  // Previously used with gne_atom function, which generated <mol_number> atom objects
  // for consumption by the view at each tick.
  function update_atoms() {
    atoms.length = mol_number;
  }

  //
  // The temperature_to_speed(t) function is used to map temperatures in abstract units
  // within a range of 0..10 to a goal for the average speed per atom for the system of atoms.
  //
  // Currently all atoms are unit mass. The mass property is saved as 'halfmass' -- mass/2.
  //
  // Increasing the number of atoms while keeping the average speed for an atom
  // the same will increase the total KE for the system.
  //
  // The constant Math.E/2 used below is just an empirically derived
  // number and has no specific analytic provenance.
  //
  function temperature_to_speed(t) {
    return 0.250 * Math.pow(Math.E/2, t);
  }

  function average_speed() {
    var i, s = 0, n = nodes[0].length;
    i = -1; while (++i < n) { s += speed[i]; }
    return s/n;
  }

  //
  // Calculate the minimum and maximum distances for applying lennard-jones forces
  //
  function setup_ljf_limits() {
    var i, f;
    for (i = 0; i <= 100; i+=0.001) {
      f = molecules_lennard_jones.force(i);
      if (f > max_ljf_repulsion) {
        min_ljf_distance = i;
        break;
      }
    }

    for (;i <= 100; i+=0.001) {
      f = molecules_lennard_jones.force(i);
      if (f > min_ljf_attraction) {
        break;
      }
    }

    for (;i <= 100; i+=0.001) {
      f = molecules_lennard_jones.force(i);
      if (f < min_ljf_attraction) {
        max_ljf_distance = i;
        break;
      }
    }
  }

  //
  // Calculate the minimum and maximum distances for applying coulomb forces
  //
  function setup_coulomb_limits() {
    var i, f;
    for (i = 0.001; i <= 100; i+=0.001) {
      f = molecules_coulomb.force(i, -1, 1);
      if (f < max_coulomb_force) {
        min_coulomb_distance = i;
        break;
      }
    }

    for (;i <= 100; i+=0.001) {
      f = molecules_coulomb.force(i, -1, 1);
      if (f < min_coulomb_force) {
        break;
      }
    }
    max_coulomb_distance = i;
  }

  //
  // Main Model Integration Loop
  //

  function tick_history_list_push() {
    var i,
        newnodes = [],
        n = nodes.length;

    i = -1; while (++i < n) {
      newnodes[i] = arrays.clone(nodes[i]);
    }
    tick_history_list.length = tick_history_list_index;
    tick_history_list_index++;
    tick_counter++;
    new_step = true;
    tick_history_list.push({ nodes: newnodes, ke:ke });
    if (tick_history_list_index > 1000) {
      tick_history_list.splice(0,1);
      tick_history_list_index = 1000;
    }
  }

  function tick() {
    var t;

    integrator.integrate();
    pressure = integratorOutputState.pressure;
    PE = integratorOutputState.PE;

    pressures.push(pressure);
    pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries
    // ave_speed = average_speed();
    ke = kinetic_energy();
    update_atoms();
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
      event.tick({type: "tick"});
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
    var i, n=nodes.length;
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
    update_atoms();
  }

  function set_speed(newspeed) {
    var i, change, n = nodes[0].length;
    i = -1; while (++i < n) {
      change = newspeed/speed[i];
      vx[i] = (x[i] - px[i]) * change;
      vy[i] = (y[i] - py[i]) * change;
      px[i] += vx[i];
      py[i] += vy[i];
      speed[i] = newspeed;
    }
  }

  function change_speed(factor) {
    var i, n = nodes[0].length;
    i = -1; while (++i < n) {
      vx[i] = (x[i] - px[i]) * factor;
      vy[i] = (y[i] - py[i]) * factor;
      px[i] += vx[i];
      py[i] += vy[i];
      // FIXME: was 'speed[i] *- factor;' Is the below what was intended? RPK 2-29-12
      speed[i] *= factor;
    }
  }

  function cap_speed(capspeed) {
    var i, change, n = nodes[0].length;
    i = -1; while (++i < n) {
      if (speed[i] > capspeed) {
        change = capspeed/speed[i];
        vx[i] = (x[i] - px[i]) * change;
        vy[i] = (y[i] - py[i]) * change;
        px[i] += vx[i];
        py[i] += vy[i];
        speed[i] = capspeed;
      }
    }
  }

  function set_acc(acc) {
    var i, n = nodes[0].length;
    i = -1; while (++i < n) {
      ax[i] = acc;
      ay[i] = acc;
    }
  }

  function container_pressure() {
    return pressures.reduce(function(j,k) { return j+k; })/pressures.length;
  }

  function speed_history(speeds) {
    if (arguments.length) {
      speed_history.push(speeds);
      // limit the pressures array to the most recent 16 entries
      speed_history.splice(0, speed_history.length - 100);
    } else {
      return speed_history.reduce(function(j,k) { return j+k; })/pressures.length;
    }
  }

  //
  function potential_energy() {
    // ???
    throw new Error("Huh?");
    // var i, fx, fy, p, n = nodes[0].length;
    // pe = 0;
    // i = -1; while (++i < n) {
    //   fx = ax[i];
    //   fy = ay[i];
    //   p = Math.sqrt(fx * fx + fy * fy);
    //   pe += p;
    // }
    // return pe;
  }

  // currently the nodes are all unit mass
  function kinetic_energy() {
    var i, n = nodes[0].length;
    ke = 0;
    i = -1; while (++i < n) {
      ke += halfmass[i]*speed[i]*speed[i];
    }
    ave_ke = ke / n;
    return ke;
  }

  function average_rate() {
    var i, ave, s = 0, n = sample_times.length;
    i = -1; while (++i < n) { s += sample_times[i]; }
    ave = s/n;
    return (ave ? 1/ave*1000: 0);
  }

  function resolve_collisions(annealing_steps) {
    var i;

    integrator.set_annealing_temperature_control(true);
    i = -1; while (++i < annealing_steps) {
      integrator.integrate();
    }
    integrator.set_annealing_temperature_control( false );
    PE = integratorOutputState.PE;
    ke = kinetic_energy();
    update_atoms();
  }

  function set_temperature(t) {
    temperature = t;
    if (integrator) integrator.set_temperature(temperature);
  }

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

  model.stepCounter = function() {
    return tick_counter;
  };

  model.steps = function() {
    return tick_history_list.length-1;
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
        if (model_listener) { model_listener(); }
      }
    }
    return tick_counter;
  };

  // The next four functions assume we're are doing this for
  // all the atoms will need to be changed when different atoms
  // can have different LJ sigma values

  model.set_lj_coefficients = function(e, s) {
    // am not using the coefficients beyond setting the ljf limits yet ...
    epsilon = e;
    sigma = s;
    molecules_lennard_jones.epsilon(e);
    molecules_lennard_jones.sigma(s);
    setup_ljf_limits();
  };

  model.getEpsilon = function() {
    return epsilon;
  };

  model.getSigma = function() {
    return sigma;
  };

  model.set_radius = function(r) {
    var i, n = nodes[0].length;
    i = -1; while(++i < n) { radius[i] = r; }
    update_atoms();
  };

  // return a copy of the array of speeds
  model.get_speed = function() {
    return arrays.copy(speed, []);
  };

  model.get_rate = function() {
    return average_rate();
  };

  model.set_temperature_control = function(tc) {
   temperature_control = tc;
   if (integrator) integrator.set_temperature_control(tc);
  };

  model.set_lennard_jones_forces = function(lj) {
   lennard_jones_forces = lj;
   if (integrator) integrator.set_lennard_jones_forces(lj);
  };

  model.set_coulomb_forces = function(cf) {
   coulomb_forces = cf;
   if (integrator) integrator.set_coulomb_forces(cf);
  };

  model.get_nodes = function() {
    return nodes;
  };

  model.get_atoms = function() {
    return atoms;
  };

  model.initialize = function(options) {
    options = options || {};
    var temperature,
        annealing_steps = 10;

    lennard_jones_forces = options.lennard_jones_forces || true;
    coulomb_forces       = options.coulomb_forces       || true;
    temperature_control  = options.temperature_control  || false;
    temperature          = options.temperature          || 3;

    // who is listening to model tick completions
    model_listener = options.model_listener || false;

    reset_tick_history_list();

    // setup local variables that help optimize the calculation loops
    // TODO pull this state out and pass it to the integrator
    setup_ljf_limits();
    setup_coulomb_limits();

    // pressures.push(pressure);
    // pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries

    integrator = modeler.makeIntegrator({

      setOnceState: {
        max_coulomb_distance : max_coulomb_distance,
        max_ljf_distance     : max_ljf_distance,
        size                 : size,
        max_ljf_repulsion    : max_ljf_repulsion,
        max_coulomb_force    : max_coulomb_force
      },

      settableState: {
        lennard_jones_forces : lennard_jones_forces,
        coulomb_forces       : coulomb_forces,
        temperature_control  : temperature_control
      },

      readWriteState: {
        ax     : ax,
        ay     : ay,
        charge : charge,
        nodes  : nodes,
        px     : px,
        py     : py,
        radius : radius,
        speed  : speed,
        vx     : vx,
        vy     : vy,
        x      : x,
        y      : y
      },

      outputState: integratorOutputState
    });

    set_temperature(temperature);

    tick_history_list_push();
    return model;
  };

  model.on = function(type, listener) {
    event.on(type, listener);
    return model;
  };

  model.tickInPlace = function() {
    event.tick({type: "tick"});
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

  model.nodes = function(options) {
    options = options || {};

    var num =  options.num || 50,
        xdomain = options.xdomain || 100,
        ydomain = options.ydomain || 100,
        temperature = options.temperature || 3,
        rmin = options.rmin || 4.4,
        mol_rmin_radius_factor = options.mol_rmin_radius_factor || 0.38,
        v0,
        sqrt2 = Math.sqrt(2),
        i, r, c, nrows, ncols, rowSpacing, colSpacing,

        webgl = !!window.WebGLRenderingContext,
        not_safari = benchmark.what_browser.browser !== 'Safari',

        // special-case: Typed arrays are faster almost everywhere
        // ... except for Safari
        array_type = (webgl && not_safari) ? "Float32Array" : "regular";

    mol_number = num;

    nodes = arrays.create(node_properties_length, null, "regular");

    // model.INDICES.RADIUS = 0
    nodes[model.INDICES.RADIUS] = arrays.create(num, rmin * mol_rmin_radius_factor, array_type );
    radius = nodes[model.INDICES.RADIUS];

    // model.INDICES.PX     = 1;
    nodes[model.INDICES.PX] = arrays.create(num, 0, array_type);
    px = nodes[model.INDICES.PX];

    // model.INDICES.PY     = 2;
    nodes[model.INDICES.PY] = arrays.create(num, 0, array_type);
    py = nodes[model.INDICES.PY];

    // model.INDICES.X      = 3;
    nodes[model.INDICES.X] = arrays.create(num, 0, array_type);
    x = nodes[model.INDICES.X];

    // model.INDICES.Y      = 4;
    nodes[model.INDICES.Y] = arrays.create(num, 0, array_type);
    y = nodes[model.INDICES.Y];

    // model.INDICES.VX     = 5;
    nodes[model.INDICES.VX] = arrays.create(num, 0, array_type);
    vx = nodes[model.INDICES.VX];

    // model.INDICES.VY     = 6;
    nodes[model.INDICES.VY] = arrays.create(num, 0, array_type);
    vy = nodes[model.INDICES.VY];

    // model.INDICES.SPEED  = 7;
    nodes[model.INDICES.SPEED] = arrays.create(num, 0, array_type);
    speed = nodes[model.INDICES.SPEED];

    // model.INDICES.AX     = 8;
    nodes[model.INDICES.AX] = arrays.create(num, 0, array_type);
    ax = nodes[model.INDICES.AX];

    // model.INDICES.AY     = 9;
    nodes[model.INDICES.AY] = arrays.create(num, 0, array_type);
    ay = nodes[model.INDICES.AY];

    // model.INDICES.HALFMASS = 10;
    nodes[model.INDICES.HALFMASS] = arrays.create(num, 0.5, array_type);
    halfmass = nodes[model.INDICES.HALFMASS];

    // model.INDICES.CHARGE   = 11;
    nodes[model.INDICES.CHARGE] = arrays.create(num, 0, array_type);
    charge = nodes[model.INDICES.CHARGE];

    v0 = temperature_to_speed(temperature);

    console.log('initializing to temperature %f', temperature);

    nrows = Math.ceil(Math.sqrt(num));
    ncols = Math.ceil(num / nrows);

    colSpacing = size[0] / (1+ncols);
    rowSpacing = size[1] / (1+nrows);

    // arrange molecules in a lattice. Not guaranteed to have CM in center.
    i = -1;
    for (r = 1; r <= nrows; r++) {
      for (c = 1; c <= ncols; c++) {
        i++;
        x[i] = c*colSpacing;
        y[i] = r*rowSpacing;

        vx[i] = modeler.Math.normal(v0/sqrt2);
        vy[i] = modeler.Math.normal(v0/sqrt2);

        ax[i] = 0;
        ay[i] = 0;

        if ((num - i) > i) {
          vx[num-i] = -vx[i];
          vy[num-i] = -vy[i];
        }

        speed[i]  = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
        charge[i] = 2*(i%2)-1;      // alternate negative and positive charges
      }
    }

    update_atoms();
    return model;
  };

  model.start = function() {
    model.initialize();
    return model.resume();
  };

  model.resume = function() {
    stopped = false;
    d3.timer(tick);
    return model;
  };

  model.stop = function() {
    stopped = true;
    return model;
  };

  model.ke = function() {
    return integratorOutputState ? integratorOutputState.KE : undefined;
  };

  model.ave_ke = function() {
    ave_ke = ave_ke || kinetic_energy() / nodes[0].length;
    return ave_ke;
  };

  model.pe = function() {
    return integratorOutputState ? integratorOutputState.PE : undefined;
  };

  model.ave_pe = function() {
    return PE / nodes[0].length;
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
    if (!arguments.length) return size;
    size = x;
    return model;
  };

  return model;
};

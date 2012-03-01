/*globals modeler:true, d3, arrays, molecules_coulomb, molecules_lennard_jones, benchmark */
// modeler.js
//
//

modeler = {};
modeler = {};
modeler.VERSION = '0.1.0';

modeler.model = function() {
  var model = {},
      atoms = [],
      mol_number,
      event = d3.dispatch("tick"),
      size = [100, 100],
      temperature_control,
      lennard_jones_forces, coulomb_forces,
      ke, pe, ave_ke,
      ave_speed, speed_goal, speed_factor,
      speed_max, speed_min,
      ave_speed_max, ave_speed_min,
      stopped = true,
      friction = 0.9,
      gravity = 0.1,
      theta = 0.8,
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
      step_dt = 1,                    // time in reduced units for each model step/tick
      integration_steps = 50,         // number of internal integration steps for each step
      dt = step_dt/integration_steps, // intra-step time
      dt2 = dt * dt,                  // intra-step time squared
      pressure, pressures = [0],
      sample_time, sample_times = [],
      temperature,
      links,
      linkDistance,
      linkStrength,
      model_listener;

  //
  // Individual property arrays for the nodes
  //
  var radius, px, py, x, y, vx, vy, speed, ax, ay, halfmass, charge;

  //
  // Indexes into the nodes array for the individual node property arrays
  //
  // Created as variables for faster access within this module and
  // as object properties for use outside this module.
  //

  var _radius   =  0;
  var _px       =  1;
  var _py       =  2;
  var _x        =  3;
  var _y        =  4;
  var _vx       =  5;
  var _vy       =  6;
  var _speed    =  7;
  var _ax       =  8;
  var _ay       =  9;
  var _halfmass = 10;
  var _charge   = 11;

  model.RADIUS   = 0;
  model.PX       = 1;
  model.PY       = 2;
  model.X        = 3;
  model.Y        = 4;
  model.VX       = 5;
  model.VY       = 6;
  model.SPEED    = 7;
  model.AX       = 8;
  model.AY       = 9;
  model.HALFMASS = 10;
  model.CHARGE   = 11;

  //
  // Number of individual properties for a node
  //
  var node_properties_length = 12;

  //
  // A two dimensional array consisting of arrays of node property values
  //
  var nodes = arrays.create(node_properties_length, null, "regular");

  //
  // Extract one node from the nodes arrays and return as an object
  //
  function generate_atom(i) {
    var o = {};
    o.index  = i;
    o.radius = nodes[_radius  ][i];
    o.px     = nodes[_px      ][i];
    o.py     = nodes[_py      ][i];
    o.x      = nodes[_x       ][i];
    o.y      = nodes[_y       ][i];
    o.vx     = nodes[_vx      ][i];
    o.vy     = nodes[_vy      ][i];
    o.speed  = nodes[_speed   ][i];
    o.ax     = nodes[_ax      ][i];
    o.ay     = nodes[_ay      ][i];
    o.mass   = nodes[_halfmass][i]*2;
    o.charge = nodes[_charge][i];
    return o;
  }

  function update_atoms() {
    var i, n = mol_number;
    i = -1; while (++i < n) {
      atoms[i] = generate_atom(i);
    }
    atoms.length = n;
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
    return 0.0050 * Math.pow(Math.E/2, t);
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

  function run_tick() {
    var n = nodes[0].length,
        i, // current index
        j, // alternate member of force-pair index
        l, // current distance
        r2, te2,
        ljf, coul, xf, yf,
        dx, dy,
        initial_x, initial_y,
        iloop,
        leftwall   = radius[0],
        bottomwall = radius[0],
        rightwall  = size[0] - radius[0],
        topwall    = size[1] - radius[0],
        speed_max_one_percent,
        speed_min_one_percent;

    //
    // Loop through this inner processing loop 'integration_steps' times:
    //
    pressure = 0;
    iloop = -1;
    while(++iloop < integration_steps) {

      //
      // Use a Verlet integration to continue particle movement integrating acceleration with
      // existing position and previous position while managing collision with boundaries.
      //
      // Update positions for first half of verlet integration
      //
      i = -1; while (++i < n) {
        initial_x = x[i];
        initial_y = y[i];

        x[i]  += vx[i] * dt + 0.5 * dt2 * ax[i];
        y[i]  += vy[i] * dt + 0.5 * dt2 * ay[i];
        vx[i] += 0.5 * dt * ax[i];
        vy[i] += 0.5 * dt * ay[i];

        dx = x[i] - initial_x;
        dy = y[i] - initial_y;
        l = Math.sqrt(dx * dx + dy * dy);
        speed[i] = l;
        if (x[i] < leftwall) {
          x[i] = leftwall + (leftwall - x[i]);
          px[i] = x[i] + dx;
          py[i] = initial_y;
          vx[i] *= -1;
          pressure += speed[i];
        } else if (x[i] > rightwall) {
          x[i] = rightwall + (rightwall - x[i]);
          px[i] = x[i] + dx;
          py[i] = initial_y;
          vx[i] *= -1;
          pressure += speed[i];
        } else if (y[i] < bottomwall) {
          y[i] = bottomwall + (bottomwall - y[i]);
          py[i] = y[i] + dy;
          px[i] = initial_x;
          vy[i] *= -1;
          pressure += speed[i];
        } else if (y[i] > topwall) {
          y[i] = topwall + (topwall - y[i]);
          py[i] = y[i] + dy;
          px[i] = initial_x;
          vy[i] *= -1;
          pressure += speed[i];
        } else {
          px[i] = initial_x;
          py[i] = initial_y;
        }
      }

      // zero-out the acceleration
      i = -1; while (++i < n) {
        ax[i] = 0;
        ay[i] = 0;
      }

      te2 = 0;

      //
      // Use brute-force technique to calculate lennard-jones and coulomb forces
      //
      if (lennard_jones_forces || coulomb_forces) {
        i = -1; while (++i < n) {
          j = i; while (++j < n) {
            dx = x[j] - x[i];
            dy = y[j] - y[i];
            r2 = dx * dx + dy * dy;
            l = Math.sqrt(r2);
            if (lennard_jones_forces && l < max_ljf_distance) {
              ljf  = Math.max(max_ljf_repulsion, molecules_lennard_jones.force(l));

              // alternate way to calculate ljf ...
              // http://www.pages.drexel.edu/~cfa22/msim/node28.html
              // http://www.pages.drexel.edu/~cfa22/msim/codes/mdlj.c
              // r6i   = 1.0 / ( r2 * r2);
              // r12i  = r6i * r6i;
              // te2  += 4 * (r12i - r6i);
              // f2    = 48 * (r12i - 0.5 * r6i);

              // another alternate ...
              // r2   = dx * dx + dy * dy;
              // r2i  = 1.0 / r2;
              // r6i  = r2i * r2i * r2i;
              // r12i = r6i * r6i;
              // pe  += 4 * (r12i - r6i);
              // f2    = 48 * (Math.pow(r2i, 7) - 0.5 * Math.pow(r2i, 4));
              // fx = dx * f2;
              // fy = dy * f2;

              xf = dx / l * ljf;
              yf = dy / l * ljf;
              ax[i] += xf;
              ay[i] += yf;
              ax[j] -= xf;
              ay[j] -= yf;
            }
            if (coulomb_forces && l < max_coulomb_distance) {
              coul  = Math.min(max_coulomb_force, molecules_coulomb.force(l, charge[i], charge[j]));
              pe +=  molecules_coulomb.energy(l, charge[i], charge[j]);
              xf = dx / l * coul;
              yf = dy / l * coul;
              ax[i] += xf;
              ay[i] += yf;
              ax[j] -= xf;
              ay[j] -= yf;
            }
          }
        }
      }

      //
      // Dynamically adjust 'temperature' of system.
      //
      if (temperature_control) {
        ave_speed             = average_speed();
        ave_speed_max         = speed_goal * 1.1;
        ave_speed_min         = speed_goal * 0.9;
        speed_max             = speed_goal * 2;
        speed_max_one_percent = speed_max  * 0.01;
        speed_min             = speed_goal * 0.5;
        speed_min_one_percent = speed_min  * 0.01;

        i = -1; while (++i < n) {
          if (ave_speed > ave_speed_max) {
            // If the average speed for an atom is greater than 110% of the speed_goal
            // proportionately reduce the acceleration
            ax[i] *= 0.5;
            ay[i] *= 0.5;

            // And if the speed for this atom is greater than speed_max reduce the
            // velocity of the atom by creating a new, closer previous position.
            if (speed[i] > speed_max) {
              speed_factor = speed_max/speed[i];
              vx[i] *= speed_factor;
              vy[i] *= speed_factor;
              speed[i] = speed_max - (Math.random() * speed_max_one_percent);
              px[i] = x[i] - vx[i];
              py[i] = y[i] - vy[i];
            }
          }

          else if (ave_speed < ave_speed_min) {
            // If the average speed for an atom is less than 90% of the speed_goal
            // proportionately increase the acceleration.
            ax[i] *= 2.0;
            ay[i] *= 2.0;

            // And if the speed for this atom is less than speed_min increase the
            // velocity of the atom by creating a new previous position further away.
            if (speed[i] < speed_min) {
              speed_factor = speed_min/speed[i];
              vx[i] *= speed_factor;
              vy[i] *= speed_factor;
              speed[i] = speed_min +  (Math.random() * speed_min_one_percent);
              px[i] = x[i] - vx[i];
              py[i] = y[i] - vy[i];
            }
          }
        }
      }

      //
      // Complete second-half of the velocity-verlet integration with updated force values
      i = -1; while (++i < n) {
        vx[i] += 0.5 * dt * ax[i];
        vy[i] += 0.5 * dt * ay[i];
      }
    }
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

  function calculate_kinetic_and_potential_energy() {
    var i, s, k, fx, fy, p, n = nodes[0].length;
    ke = 0;
    pe = 0;
    i = -1; while (++i < n) {
      s = speed[i];
      k =  s * s * halfmass[i];
      ke += k;
      fx = ax[i];
      fy = ay[i];
      p = fx + fx;
      pe += p;
    }
    ave_ke = ke / n;
  }

  function tick() {
    var t;
    run_tick();
    pressures.push(pressure);
    pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries
    // ave_speed = average_speed();
    calculate_kinetic_and_potential_energy();
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
    var i, fx, fy, p, n = nodes[0].length;
    pe = 0;
    i = -1; while (++i < n) {
      fx = ax[i];
      fy = ay[i];
      p = Math.sqrt(fx * fx + fy * fy);
      pe += p;
    }
    return pe;
  }

  // currently the nodes are all unit mass
  function kinetic_energy() {
    var i, s, k, n = nodes[0].length;
    ke = 0;
    i = -1; while (++i < n) {
      s = speed[i];
      k =  s * s * halfmass[i];
      ke += k;
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
    var i, save_temperature_control = temperature_control;
    temperature_control = true;
    i = -1; while (++i < annealing_steps) {
      run_tick();
    }
    temperature_control = save_temperature_control;
    calculate_kinetic_and_potential_energy();
    update_atoms();
  }

  function set_temperature(t) {
    temperature = t;
    speed_goal = temperature_to_speed(temperature);
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
  };

  model.set_lennard_jones_forces = function(lj) {
   lennard_jones_forces = lj;
  };

  model.set_coulomb_forces = function(cf) {
   coulomb_forces = cf;
  };

  model.get_atoms = function() {
    return atoms;
  };

  model.initialize = function(options) {
    options = options || {};
    var temperature,
        annealing_steps = 10;

    lennard_jones_forces = options.lennard_jones_forces || true;
    coulomb_forces = options.coulomb_forces || true;
    temperature_control = options.temperature_control || false;
    temperature = options.temperature || 3;

    // who is listening to model tick completions
    model_listener = options.model_listener || false;

    reset_tick_history_list();

    // setup localvariable that help optimize the calculation loops
    setup_ljf_limits();
    setup_coulomb_limits();

    // pressures.push(pressure);
    // pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries

    set_temperature(temperature);
    resolve_collisions(annealing_steps);

    ave_speed = average_speed();
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
        dTheta,
        v0,
        i;

    mol_number = num;

    nodes = arrays.create(node_properties_length, null, "regular");

    var webgl = !!window.WebGLRenderingContext;
    var not_safari = benchmark.what_browser.browser !== 'Safari';

    // special-case: Typed arrays are faster almost everywhere
    // ... except for Safari
    var array_type = (webgl && not_safari) ? "Float32Array" : "regular";

    // model.RADIUS = 0
    nodes[model.RADIUS] = arrays.create(num, rmin * mol_rmin_radius_factor, array_type );
    radius = nodes[model.RADIUS];

    // model.PX     = 1;
    nodes[model.PX] = arrays.create(num, 0, array_type);
    px = nodes[model.PX];

    // model.PY     = 2;
    nodes[model.PY] = arrays.create(num, 0, array_type);
    py = nodes[model.PY];

    // model.X      = 3;
    nodes[model.X] = arrays.create(num, 0, array_type);
    x = nodes[model.X];

    // model.Y      = 4;
    nodes[model.Y] = arrays.create(num, 0, array_type);
    y = nodes[model.Y];

    // model.VX     = 5;
    nodes[model.VX] = arrays.create(num, 0, array_type);
    vx = nodes[model.VX];

    // model.VY     = 6;
    nodes[model.VY] = arrays.create(num, 0, array_type);
    vy = nodes[model.VY];

    // model.SPEED  = 7;
    nodes[model.SPEED] = arrays.create(num, 0, array_type);
    speed = nodes[model.SPEED];

    // model.AX     = 8;
    nodes[model.AX] = arrays.create(num, 0, array_type);
    ax = nodes[model.AX];

    // model.AY     = 9;
    nodes[model.AY] = arrays.create(num, 0, array_type);
    ay = nodes[model.AY];

    // model.MASS     = 10;
    nodes[model.HALFMASS] = arrays.create(num, 0.5, array_type);
    halfmass = nodes[model.HALFMASS];

    // model.CHARGE   = 11;
    nodes[model.CHARGE] = arrays.create(num, 0, array_type);
    charge = nodes[model.CHARGE];

    // initialize particles with 0 net momentum by spacing initial velocities equally around a circle
    dTheta = 2*Math.PI / num;
    v0 = temperature_to_speed(temperature);

    i = -1; while (++i < num) {
        px[i] = Math.random() * xdomain * 0.8 + xdomain * 0.1;  // previous x
        py[i] = Math.random() * ydomain * 0.8 + ydomain * 0.1;  // previous y
        vx[i] = v0*Math.cos(dTheta*i);
        vy[i] = v0*Math.sin(dTheta*i);
         x[i] = vx[i] + px[i];
         y[i] = vy[i] + py[i];
     speed[i] = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);  // == v0
        ax[i] = 0;
        ay[i] = 0;
    charge[i] = 2*(i%2)-1;      // alternate negative and positive charges
        // speed_data.push(speed[i]);
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
    return ke = ke || kinetic_energy();
  };

  model.ave_ke = function() {
    return ave_ke = ave_ke || kinetic_energy();
  };

  model.pe = function() {
    pe = pe || potential_energy();
    return pe;
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

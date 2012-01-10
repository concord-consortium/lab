//
// modeler.js
//
//

modeler = {};
modeler.layout = {};
modeler.VERSION = '0.1.0';

modeler.layout.model = function() {
  var model = {},
      event = d3.dispatch("tick"),
      size = [1, 1],
      temperature_control = true,
      lennard_jones_forces = true,
      coulomb_forces = true,
      ke, pe,
      ave_speed, speed_goal, speed_factor,
      ave_speed_max, ave_speed_min,
      speed_max_pos, speed_max_neg,
      drag,
      stopped = true,
      friction = .9,
      charge = -0.1,
      gravity = .1,
      theta = .8,
      interval,
      tick_history_list = [],
      tick_history_list_index = 0,
      tick_counter = 0,
      new_step = false,
      forces,
      epsilon, sigma,
      max_ljf_repulsion = -200.0,
      min_ljf_attraction = 0.001,
      max_ljf_distance,
      min_ljf_distance,
      max_coulomb_force = 20.0,
      min_coulomb_force = 0.01,
      max_coulomb_distance,
      min_coulomb_distance,
      integration_steps = 50,
      dt = 1/integration_steps,
      dt2 = dt * dt,
      overlap,
      pressure, pressures = [0],
      sample_time, sample_times = [];

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
  var node_properties_length = 11;

  //
  // A two dimensional array consisting of arrays of node property values
  //
  var nodes = molecules_arrays.create(node_properties_length, null, "regular");

  //
  // Extract one node from the nodes arrays and return as an object
  //
  function molecule(i) {
    var o = {};
    o.index  = i,
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
    return o
  }

  function update_molecules() {
    var i, n = mol_number, results = [];
    i = -1; while (++i < n) {
      molecules[i] = molecule(i)
    }
    molecules.length = n;
  }


  //
  // The temperature_to_speed(t) function is used to map temperatures in abstract units
  // within a range of 0..10 to a goal for the average speed per atom for the system of atoms. 
  //
  // Currently all atoms are unit mass. The mass property is saved as 'halfmass' -- mass/2.
  //
  // Increasing the number of atoms while keeping the average spped for an atom 
  // the same will increase the total KE for the system.
  //
  // The constant Math.E/2 used below is just an empirically derived
  // number and has no specific analytic provenance.
  //
  function temperature_to_speed(t) {
    return 0.0050 * Math.pow(Math.E/2, t);
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
        q,
        i, // current index
        j, // alternate member of force-pair index
        s, // current source
        t, // current target
        l, // current distance
        k, // current force
        t, // current system time
        r2, r6i,
        ljf, coul, xf, yf,
        dx, dy, mag2,
        initial_x, initial_y,
        iloop,
        leftwall   = radius[0],
        bottomwall = radius[0],
        rightwall  = size[0] - radius[0],
        topwall    = size[1] - radius[0];
  
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
        vy[i] += 0.5 * dt * ay[i]

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
      
      //
      // Use brute-force technique to calculate lennard-jones and coulomb forces
      //
      if (lennard_jones_forces || coulomb_forces) {
        i = -1; while (++i < n) {
          j = i; while (++j < n) {
            dx = x[j] - x[i]
            dy = y[j] - y[i]
            r2 = dx * dx + dy * dy;
            l = Math.sqrt(r2);
            if (lennard_jones_forces && l < max_ljf_distance) { 
              ljf  = Math.max(max_ljf_repulsion, molecules_lennard_jones.force(l));
              // alternate way to calculate ljf ...
              // http://www.pages.drexel.edu/~cfa22/msim/node28.html
              // http://www.pages.drexel.edu/~cfa22/msim/codes/mdlj.c
              // r6i   = 1.0/(r2*r2);
              // ljf     = 48*(r6i*r6i-0.5*r6i);
              // e    += 4*(r6i*r6i - r6i) - (shift?ecut:0.0);
              // vir += 48*(r6i*r6i-0.5*r6i);
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
        ave_speed = average_speed();
        ave_speed_max = speed_goal * 1.1;
        ave_speed_min = speed_goal * 0.9;
        speed_max = speed_goal * 2;
        speed_max_one_percent = speed_max * 0.01;
        speed_min = speed_goal * 0.5;
        speed_min_one_percent = speed_min * 0.01;
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
              speed[i] = speed_max - (Math.random() * speed_max_one_percent)
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
  function tick() {
    run_tick();
    pressures.push(pressure);
    pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries
    // ave_speed = average_speed();
    calculate_kinetic_and_potential_energy();
    update_molecules();
    tick_history_list_push();
    if (!stopped) { 
      t = Date.now();
      if (sample_time) {
        sample_time  = t - sample_time
        if (sample_time) { sample_times.push(sample_time) };
        sample_time = t;
        sample_times.splice(0, sample_times.length - 128);
      } else {
        sample_time = t;
      }
      event.tick({type: "tick"}); 
    } else {
      
    }
    return stopped
  }
  
  function reset_tick_history_list() {
    tick_history_list = [];
    tick_history_list_index = 0;
    tick_counter = -1;
  }
  
  function tick_history_list_reset_to_ptr() {
    tick_history_list.length = tick_history_list_index + 1
  }
  
  function tick_history_list_push() {
    var i, j, 
        newnode, newnodes = [], 
        n=nodes.length;
    i = -1; while(++i < n) {
      newnodes[i] = molecules_arrays.clone(nodes[i])
    }
    tick_history_list.length = tick_history_list_index;
    tick_history_list_index++;
    tick_counter++;
    new_step = true;
    tick_history_list.push({ nodes: newnodes, ke:ke });
    if (tick_history_list_index > 1000) {
      tick_history_list.splice(0,1)
      tick_history_list_index = 1000
    } 
  }
  
  function tick_history_list_extract(index) {
    var i, n=nodes.length;
    if (index < 0) {
      throw new Error("modeler: request for tick_history_list[" + index + "]")
    };
    if (index >= (tick_history_list.length)) {
      throw new Error("modeler: request for tick_history_list[" + index + "], tick_history_list.length=" + tick_history_list.length)
    };
    i = -1; while(++i < n) {
      molecules_arrays.copy(tick_history_list[index].nodes[i], nodes[i])
    }
    ke = tick_history_list[index].ke;
    update_molecules();
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
      speed[i] *- factor;
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
    return pressures.reduce(function(j,k) { return j+k })/pressures.length
  }
  
  function speed_history(speeds) {
    if (arguments.length) {
      speed_history.push(speeds);
      // limit the pressures array to the most recent 16 entries
      speed_history.splice(0, speed_history.length - 100)
    } else {
      return speed_history.reduce(function(j,k) { return j+k })/pressures.length
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
    return ke;
  }

  function average_speed() {
    var i, s = 0, n = nodes[0].length;
    i = -1; while (++i < n) { s += speed[i] }
    return s/n;
  }

  function average_rate() {
    var i, ave, s = 0, n = sample_times.length;
    i = -1; while (++i < n) { s += sample_times[i] }
    ave = s/n;
    return (ave ? 1/ave*1000: 0)
  }

  function resolve_collisions() {
    var i; save_temperature_control = temperature_control;
    temperature_control = true;
    i = -1; while (++i < 10) {
      run_tick();
    }
    temperature_control = save_temperature_control;
    update_molecules();
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
    var stats;
    stats = { speed: average_speed(),
              ke: ke,
              temperature: temperature,
              pressure: container_pressure(),
              current_step: tick_counter,
              steps: tick_history_list.length-1
            };
    return stats;
  }

  model.stepCounter = function() {
    return tick_counter
  }

  model.steps = function() {
    return tick_history_list.length-1
  }

  model.isNewStep = function() {
    return new_step
  }

  model.stepBack = function() {
    stopped = true;
    new_step = false;
    if (tick_history_list_index > 1) {
      tick_history_list_index--;
      tick_counter--;
      tick_history_list_extract(tick_history_list_index-1);
      model_listener();
    }
    return tick_counter
  }
  
  model.stepForward = function() {
    stopped = true;
    if (tick_history_list_index < (tick_history_list.length)) {
      tick_history_list_extract(tick_history_list_index)
      tick_history_list_index++;
      tick_counter++
      model_listener();
    } else {
      tick();
      model_listener();
    }
    return tick_counter
  }

  model.on = function(type, listener) {
    event.on(type, listener);
    return model;
  };
  
  model.tickInPlace = function() {
    event.tick({type: "tick"});
    return model;
  };

  model.tick = function() {
    tick();
    return model;
  };

  model.set_lj_coefficients = function(e, s) {
    // am not using the coefficients beyond setting the ljf limits yet ...
    epsilon = e;
    sigma = s;
    setup_ljf_limits();
    return model;
  };

  model.set_radius = function(r) {
    var i, n = nodes[0].length;
    i = -1; while(++i < n) { radius[i] = r };
    update_molecules();
  }

  model.get_speed = function(speed_data) {
    if (!arguments.length) { var speed_data = [] };
    return molecules_arrays.copy(speed, speed_data);
  }
  
  model.get_rate = function() {
    return average_rate();
  }

 model.set_temperature_control = function(tc) {
   temperature_control = tc;
 }

 model.set_lennard_jones_forces = function(lj) {
   lennard_jones_forces = lj;
 }

 model.set_coulomb_forces = function(cf) {
   coulomb_forces = cf;
 }

  model.initialize = function() {
    var i, j, k, o,
        radius, px, py, x, y, vx, vy, speed, ax, ay,
        _radius, _px, _py, _x, _y, _vx, _vy, _speed, _ax, _ay,
        n = nodes[0].length,
        w = size[0], h = size[1],
        temperature = 4,
        speed_goal,
        max_ljf_repulsion, min_ljf_attraction,
        max_ljf_distance, min_ljf_distance;

        // mention the functions so they get into the containing closure:
        molecule, update_molecules,
        tick,
        reset_tick_history_list,
        tick_history_list_reset_to_ptr,
        tick_history_list_push,
        tick_history_list_extract,
        set_speed,
        change_speed,
        cap_speed,
        set_acc,
        container_pressure,
        speed_history,
        potential_energy,
        kinetic_energy,
        average_speed,
        resolve_collisions,
        set_temperature;

    speed_goal = temperature_to_speed(temperature);
    setup_ljf_limits();
    setup_coulomb_limits();
    resolve_collisions();
    // pressures.push(pressure);
    // pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries
    ave_speed = average_speed();
    ke = kinetic_energy();
    pe = potential_energy();
    tick_history_list_push();
    return model
  };

  model.nodes = function(num, xdomain, ydomain, temperature, rmin, mol_rmin_radius_factor) {
    
    nodes = molecules_arrays.create(node_properties_length, null, "regular");
    
    var webgl = !!window.WebGLRenderingContext;
    var not_safari = benchmark.what_browser.browser != "Safari";
    
    var array_type = (webgl && not_safari) ? "Float32Array" : "regular";

    // model.RADIUS = 0
    nodes[model.RADIUS] = molecules_arrays.create(num, rmin * mol_rmin_radius_factor, array_type);
    radius = nodes[model.RADIUS];

    // model.PX     = 1;
    nodes[model.PX] = molecules_arrays.create(num, 0, array_type);
    px = nodes[model.PX];

    // model.PY     = 2;
    nodes[model.PY] = molecules_arrays.create(num, 0, array_type);
    py = nodes[model.PY];

    // model.X      = 3;
    nodes[model.X] = molecules_arrays.create(num, 0, array_type);
    x = nodes[model.X];

    // model.Y      = 4;
    nodes[model.Y] = molecules_arrays.create(num, 0, array_type);
    y = nodes[model.Y];

    // model.VX     = 5;
    nodes[model.VX] = molecules_arrays.create(num, 0, array_type);
    vx = nodes[model.VX];

    // model.VY     = 6;
    nodes[model.VY] = molecules_arrays.create(num, 0, array_type);
    vy = nodes[model.VY];

    // model.SPEED  = 7;
    nodes[model.SPEED] = molecules_arrays.create(num, 0, array_type);
    speed = nodes[model.SPEED];

    // model.AX     = 8;
    nodes[model.AX] = molecules_arrays.create(num, 0, array_type);
    ax = nodes[model.AX];

    // model.AY     = 9;
    nodes[model.AY] = molecules_arrays.create(num, 0, array_type);
    ay = nodes[model.AY];

    // model.MASS     = 10;
    nodes[model.HALFMASS] = molecules_arrays.create(num, 0.5, array_type);
    halfmass = nodes[model.HALFMASS];

    // model.CHARGE   = 11;
    nodes[model.CHARGE] = molecules_arrays.create(num, 0, array_type);
    charge = nodes[model.CHARGE];

    i = -1; while (++i < num) {
        px[i] = Math.random() * xdomain * 0.8 + xdomain * 0.1;
        py[i] = Math.random() * ydomain * 0.8 + ydomain * 0.1;
         x[i] = px[i] + Math.random() * temperature/100 - temperature/200;
         y[i] = py[i] + Math.random() * temperature/100 - temperature/200;
        vx[i] = x[i] - px[i];
        vy[i] = y[i] - py[i];
     speed[i] = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
        ax[i] = 0;
        ay[i] = 0;
    charge[i] = (Math.random() > 0.5) ? 1 : -1;
        // speed_data.push(speed[i]);
    };
    update_molecules();
    return model
  }

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
    ke = ke || kinetic_energy();
    return ke
  };

  model.pe = function() {
    pe = pe || potential_energy();
    return pe
  };

  model.speed = function() {
    return average_speed();
  };

  model.pressure = function() {
    return container_pressure();
  };

  model.temperature = function(x) {
    if (!arguments.length) return temperature;
    set_temperature(x)
    return model;
  };

  model.links = function(x) {
    if (!arguments.length) return links;
    links = x;
    return model;
  };

  model.size = function(x) {
    if (!arguments.length) return size;
    size = x;
    return model;
  };

  model.linkDistance = function(x) {
    if (!arguments.length) return linkDistance;
    linkDistance = d3.functor(x);
    return model;
  };

  model.linkStrength = function(x) {
    if (!arguments.length) return linkStrength;
    linkStrength = d3.functor(x);
    return model;
  };

  model.friction = function(x) {
    if (!arguments.length) return friction;
    friction = x;
    return model;
  };

  model.charge = function(x) {
    if (!arguments.length) return charge;
    charge = typeof x === "function" ? x : +x;
    return model;
  };

  model.gravity = function(x) {
    if (!arguments.length) return gravity;
    gravity = x;
    return model;
  };

  model.theta = function(x) {
    if (!arguments.length) return theta;
    theta = x;
    return model;
  };

  return model;
};

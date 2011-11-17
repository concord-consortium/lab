(function() {

var modeler = {};
modeler.layout = {};

var root = this;

modeler.VERSION = '0.1.0';

modeler.layout.model = function() {
  var model = {},
      event = d3.dispatch("tick"),
      size = [1, 1],
      ke,
      ave_speed, speed_goal, speed_factor,
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
      max_ljf_repulsion = -20.0,
      min_ljf_attraction = 0.0001,
      min_ljf_distance,
      max_ljf_distance,
      integration_loop = 10,
      overlap,
      pressure,
      pressures = [0];

  //
  // Individual property arrays for the nodes
  //
  var radius, px, py, x, y, vx, vy, speed, ax, ay;
  
  //
  // Indexes into the nodes array for the individual node property arrays
  //
  // Created as variables for faster access within this module and
  // as object properties for use outside this module.
  // 
  
  var _radius =  0;
  var _px     =  1;
  var _py     =  2;
  var _x      =  3;
  var _y      =  4;
  var _vx     =  5;
  var _vy     =  6;
  var _speed  =  7;
  var _ax     =  8;
  var _ay     =  9;

  model.RADIUS = 0;
  model.PX     = 1;
  model.PY     = 2;
  model.X      = 3;
  model.Y      = 4;
  model.VX     = 5;
  model.VY     = 6;
  model.SPEED  = 7;
  model.AX     = 8;
  model.AY     = 9;

  //
  // Number of individual properties for a node
  //
  var node_properties_length = 10;

  //
  // A two dimensional array consisting of arrays of node property values
  //
  var nodes = arrays.create(node_properties_length, null, "regular");

  //
  // The temperature_to_speed(t) function is used to map temperatures in abstract units
  // within a range of 0..10 to a goal for the average speed per atom for the system of atoms. 
  //
  // Currently all atoms are unit mass.
  //
  // Increasing the number of atoms while keeping the average spped for an atom 
  // the same will increase the total KE for the system.
  //
  // The constant Math.E/2 used below is just an empirically derived
  // number and has no specific analytic provenance.
  //
  function temperature_to_speed(t) {
    return 0.0150 * Math.pow(Math.E/2, t);
  }
  
  //
  // Calculate the minimum and maximum distances for applying lennard-jones forces
  //
  function setup_ljf_limits() {
    var i, f;
    for (i = 0; i <= 100; i+=0.001) {
      f = lennard_jones.force(i);
      if (f > max_ljf_repulsion) {
        min_ljf_distance = i;
        break;
      }
    }

    for (;i <= 100; i+=0.001) {
      f = lennard_jones.force(i);
      if (f > min_ljf_attraction) {
        break;
      }
    }

    for (;i <= 100; i+=0.001) {
      f = lennard_jones.force(i);
      if (f < min_ljf_attraction) {
        max_ljf_distance = i;
        break;
      }
    }
  }

  //
  // Main Model Integration Loop
  //
  function tick() {
    var n = nodes[0].length,
        q,
        i, // current index
        s, // current source
        t, // current target
        l, // current distance
        k, // current force
        t, // current system time
        dx, dy, mag2, lx, ly,
        initial_x, initial_y,
        iloop,
        leftwall   = radius[0],
        bottomwall = radius[0],
        rightwall  = size[0] - radius[0],
        topwall    = size[1] - radius[0];
  
    //
    // Loop through this inner processing loop 'integration_loop' times:
    //
    pressure = 0;
    iloop = -1; 
    while(++iloop < integration_loop) {
  
      //
      // Compute and use a quadtree center of mass and apply lennard-jones forces
      //
      // q = d3.geom.quadtree(nodes);
      // i = -1; while (++i < n) {
      //   o = nodes[i];
      //   q.visit(ljforces(o));
      // }
      
      
      //
      // Use brute-force technique to apply the lennard-jones forces
      // 
      i = -1; while (++i < n) {
        j = i; while (++j < n) {
          dx = x[j] - x[i]
          dy = y[j] - y[i]
          l = Math.sqrt(dx * dx + dy * dy);
          if (l < max_ljf_distance) { 
            ljf  = Math.max(max_ljf_repulsion, lennard_jones.force(l)/integration_loop);
            xf = dx / l * ljf;
            yf = dy / l * ljf;
            ax[i] += xf;
            ay[i] += yf;
            ax[j] -= xf;
            ay[j] -= yf;
          }
        }
      }
      //
      // Dynamically adjust 'temperature' of system.
      //
      ave_speed = average_speed();
      speed_max = speed_goal * 2;
      speed_min = speed_goal * 0.3;
      i = -1; while (++i < n) {
        speed_factor = speed_max/speed[i];
        if (ave_speed > (speed_goal * 1.1)) {

          // If the average speed for an atom is greater than 110% of the speed_goal
          // reduce the acceleration by one half
          ax[i] *= 0.5;
          ay[i] *= 0.5;
      
          // And if the speed for this atom is greater than speed_max 
          // reduce the velocity of the atom by creating a new, closer previous position.
          if (speed[i] > speed_max) {
            vx[i] *= speed_factor;
            vy[i] *= speed_factor;
            speed[i] = speed_max;
            px[i] = x[i] - vx[i];
            py[i] = y[i] - vy[i];
          }
        } 
      
        // Else if the average speed for an atom is less than 90% of the speed_goal
        // double the acceleration.
        else if (ave_speed < (speed_goal * 0.90)) {
          ax[i] *= 2;
          ay[i] *= 2;
      
          // And if the speed for this atom is less than speed_min
          // increase the velocity of the atom by creating a new previous position
          // further away.
          if (speed[i] < speed_min) {
            vx[i] *= speed_factor;
            vy[i] *= speed_factor;
            speed[i] = speed_min;
            px[i] = x[i] - vx[i];
            py[i] = y[i] - vy[i];
          }
        }
      }
  
      // Use a Verlet integration to continue particle movement integrating acceleration with 
      // existing position and previous position while managing collision with boundaries.
      i = -1; while (++i < n) {
        initial_x = x[i];
        initial_y = y[i];
        x[i] = 2 * initial_x - px[i] + ax[i] / integration_loop;
        y[i] = 2 * initial_y - py[i] + ay[i] / integration_loop;
        dx = x[i] - initial_x;
        // dx = Math.min(dx, 4)
        dy = y[i] - initial_y;
        // dy =  Math.min(dy, 4)
        vx[i] = dx;
        vy[i] = dy;
        ax[i] = 0;
        ay[i] = 0;
        l = Math.sqrt(dx * dx + dy * dy);
        speed[i] = l;
        if (x[i] < leftwall) {
          x[i] = leftwall + (leftwall - x[i]);
          px[i] = x[i] + dx;
          py[i] = initial_y;
          pressure += speed[i];
        } else if (x[i] > rightwall) {
          x[i] = rightwall + (rightwall - x[i]);
          px[i] = x[i] + dx;
          py[i] = initial_y;
          pressure += speed[i];
        } else if (y[i] < bottomwall) {
          y[i] = bottomwall + (bottomwall - y[i]);
          py[i] = y[i] + dy;
          px[i] = initial_x;
          pressure += speed[i];
        } else if (y[i] > topwall) {
          y[i] = topwall + (topwall - y[i]);
          py[i] = y[i] + dy;
          px[i] = initial_x;
          pressure += speed[i];
        } else {
          px[i] = initial_x;
          py[i] = initial_y;
        }
      }
    }
    pressures.push(pressure);
    pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries
    // ave_speed = average_speed();
    ke = kinetic_energy();
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
  
  //
  // Extract one node from the nodes arrays and return as an object
  //
  function molecule(i) {
    var o = {};
    o.index  = i,
    o.radius = nodes[_radius][i];
    o.px     = nodes[_px    ][i];
    o.py     = nodes[_py    ][i];
    o.x      = nodes[_x     ][i];
    o.y      = nodes[_y     ][i];
    o.vx     = nodes[_vx    ][i];
    o.vy     = nodes[_vy    ][i];
    o.speed  = nodes[_speed ][i];
    o.ax     = nodes[_ax    ][i];
    o.ay     = nodes[_ay    ][i];
    return o
  }

  function update_molecules() {
    var i, n = nodes[0].length, results = [];
    i = -1; while (++i < n) {
      molecules[i] = molecule(i)
    }
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
      newnodes[i] = arrays.clone(nodes[i])
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
      arrays.copy(tick_history_list[index].nodes[i], nodes[i])
    }
    ke = tick_history_list[index].ke;
    update_molecules();
  }
  
  // function tick_history_list_ke_data() {
  //   var i = -1, j, o, oldnodes,
  //   newnode, 
  //   savednodes = tick_history_list[index], 
  //   n=nodes.length;
  //   while(++i < n) {
  //     oldnodes = mode_history
  //     o = nodes[i];
  //     for (var j in o) {
  //       if (savednodes[i].hasOwnProperty(j)) {
  //         o[j] = savednodes[i][j];
  //       }
  //     }
  //   }
  // }
  
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
  
  // currently the nodes are all unit mass
  function kinetic_energy() {
    var i, s = 0, n = nodes[0].length;
    i = -1; while (++i < n) { 
      s += speed[i] 
    }
    return ke = s * s;
  }
  
  function test1() {
    var a = 1;
    var b = 2;
    return a + b;
  }

  function average_speed() {
    var i, s = 0, n = nodes[0].length;
    i = -1; while (++i < n) { s += speed[i] }
    return s/n;
  }

  function average_speed2() {
    var i, s = 0, n = nodes[0].length;
    i = -1; while (++i < n) { s += speed[i] }
    return s/n;
  }

  function apply_verlet() {
    var n = nodes[0].length,
        i, // current index
        dx, dy, mag2, l, lx, ly,
        initial_x, initial_y,
        leftwall   = radius[0],
        bottomwall = radius[0],
        rightwall  = size[0] - radius[0],
        topwall    = size[1] - radius[0];
  
    i = -1; while (++i < n) {
      initial_x = x[i];
      initial_y = y[i];
      x[i] = 2 * initial_x - px[i] + ax[i] / integration_loop;
      y[i] = 2 * initial_y - py[i] + ay[i] / integration_loop;
      dx = x[i] - initial_x;
      // dx = Math.min(dx, 4)
      dy = y[i] - initial_y;
      // dy =  Math.min(dy, 4)
      vx[i] = dx;
      vy[i] = dy;
      ax[i] = 0;
      ay[i] = 0;
      l = Math.sqrt(dx * dx + dy * dy);
      speed[i] = l;
      if (x[i] < leftwall) {
        x[i] = leftwall + (leftwall - x[i]);
        px[i] = x[i] + dx;
        py[i] = initial_y;
        pressure += speed[i];
      } else if (x[i] > rightwall) {
        x[i] = rightwall + (rightwall - x[i]);
        px[i] = x[i] + dx;
        py[i] = initial_y;
        pressure += speed[i];
      } else if (y[i] < bottomwall) {
        y[i] = bottomwall + (bottomwall - y[i]);
        py[i] = y[i] + dy;
        px[i] = initial_x;
        pressure += speed[i];
      } else if (y[i] > topwall) {
        y[i] = topwall + (topwall - y[i]);
        py[i] = y[i] + dy;
        px[i] = initial_x;
        pressure += speed[i];
      } else {
        px[i] = initial_x;
        py[i] = initial_y;
      }
    }
  }
  
  //
  // Dynamically adjust 'temperature' of system.
  //
  function adjust_temperature() {
    var n = nodes[0].length,
        i, // current index
        o, // current object
        speed_max,
        speed_min,
        speed_factor;
    
    avg_speed = average_speed();
    speed_max = speed_goal * 10;
    speed_min = speed_goal * 0.1;
    speed_factor = speed_goal/speed;
    i = -1; while (++i < n) {
      if (speed[i] > (speed_goal * 1.1)) {
        // If the average speed for an atom is greater than 110% of the speed_goal
        // reduce the acceleration by one half
        ax[i] *= 0.5;
        ay[i] *= 0.5;
        // And if the speed for this atom is greater than the 10 times the current speed_goal
        // reduce the velocity of the atom by creating a new, closer previous position.
        if (speed[i] > speed_max) {
          vx[i] *= speed_max/speed[i];
          vy[i] *= speed_max/speed[i];
          speed[i] = speed_max;
          px[i] = x[i] - vx[i];
          py[i] = y[i] - vy[i];
        }
      } 
      // Else if the average speed for an atom is less than 90% of the speed_goal
      // double the acceleration.
      else if (speed < (speed_goal * 0.90)) {
        ax[i] *= 2;
        ay[i] *= 2;
        // And if the speed for this atom is less than the 10% of the current speed_goal
        // increase the velocity of the atom by creating a new previous position
        // further away.
        if (speed[i] < speed_min) {
          vx[i] *= speed_max/speed[i];
          vy[i] *= speed_max/speed[i];
          speed[i] = speed_min;
          px[i] = x[i] - vx[i];
          py[i] = y[i] - vy[i];
        }
      }
    }
  }
  
  // function repulse(node) {
  //   return function(quad, x1, y1, x2, y2) {
  //     if (quad.point !== node) {
  //       var dx = quad.cx - node.x,
  //           dy = quad.cy - node.y,
  //           dn = 1 / Math.sqrt(dx * dx + dy * dy);
  // 
  //       /* Barnes-Hut criterion. */
  //       if ((x2 - x1) * dn < theta) {
  //         var k = quad.charge * dn * dn;
  //         node.px -= dx * k;
  //         node.py -= dy * k;
  //         return true;
  //       }
  // 
  //       if (quad.point && isFinite(dn)) {
  //         var k = quad.pointCharge * dn * dn;
  //         node.px -= dx * k;
  //         node.py -= dy * k;
  //       }
  //     }
  //     return !quad.charge;
  //   };
  // }
  // 
  // function repulse2(node) {
  //   return function(quad, x1, y1, x2, y2) {
  //     if (quad.point !== node) {
  //       var dx = quad.cx - node.x,
  //           dy = quad.cy - node.y,
  //           dn = 1 / Math.sqrt(dx * dx + dy * dy);
  // 
  //       /* Barnes-Hut criterion. */
  //       if ((x2 - x1) * dn < 0.8) {
  //         var k = quad.charge * dn * dn;
  //         node.px -= dx * k;
  //         node.py -= dy * k;
  //         return true;
  //       }
  // 
  //       if (quad.point && isFinite(dn)) {
  //         var k = quad.pointCharge * dn * dn;
  //         node.px -= dx * k;
  //         node.py -= dy * k;
  //       }
  //     }
  //     return !quad.charge;
  //   };
  // }
  // 
  // function relax_system(nodes) {
  //   var n = nodes[0].length, q, i, o;
  //   modeler_original_forceAccumulate(q = d3.geom.quadtree(nodes), nodes)
  //   i = -1; while (++i < n) {
  //     if (!(o = nodes[i]).fixed) {
  //       q.visit(repulse2(o));
  //     }
  //   }
  // }
  
  function resolve_collisions() {
    var n = nodes[0].length, i, j, k, 
        dx, dy, l, lx, ly, mag2, ljf, xf, yf;
  
    k = -1; while(++k < integration_loop * 4) {
      // apply ljforces
      i = -1; while (++i < n) {
        j = i; while (++j < n) {
          dx = x[j] - x[i]
          dy = y[j] - y[i]
          lx = Math.abs(dx);
          ly = Math.abs(dy);
          mag2 = lx * lx + ly * ly;
          l = Math.max(lx, ly);
          l = 0.5 * (l + (mag2/l));
          l = 0.5 * (l + (mag2/l));
          ljf  = Math.max(max_ljf_repulsion, lennard_jones.force(l));
          xf = dx / l * ljf;
          yf = dy / l * ljf;
          ax[i] += xf;
          ay[i] += yf;
          ax[j] -= xf;
          ay[j] -= yf;
        }
      }
      cap_speed(temperature_to_speed(temperature)*2);
      adjust_temperature();
      apply_verlet();
    }
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
    // if (tick_history_list_index == tick_history_list.length) { tick_history_list_index-- };
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
    // am not using the coefficenmts yet ...
    epsilon = e;
    sigma = s;
    setup_ljf_limits();
    return model;
  };

  model.set_radius = function(r) {
    var i, n = nodes[0].length;
    i = -1; while(++i < n) { radius[i] = r };
  }

  model.get_speed = function(speed_data) {
    if (!arguments.length) { var speed_data = [] };
    return arrays.copy(speed, speed_data);
  }

  model.initialize = function() {
    var i, j, k, o,
        radius, px, py, x, y, vx, vy, speed, ax, ay,
        _radius, _px, _py, _x, _y, _vx, _vy, _speed, _ax, _ay,
        n = nodes[0].length,
        w = size[0], h = size[1],
        temperature = 4;
        speed_goal = temperature_to_speed(temperature),
        max_ljf_repulsion, min_ljf_attraction,
        max_ljf_distance, min_ljf_distance,

        // mention the functions so they get into the containing closure:
        molecule, update_molecules,
        temperature_to_speed,
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
        kinetic_energy,
        average_speed,
        apply_verlet,
        adjust_temperature,
        resolve_collisions,
        set_temperature;

    setup_ljf_limits();
    resolve_collisions();
    // pressures.push(pressure);
    // pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries
    avg_speed = average_speed();
    ke = kinetic_energy();
    tick_history_list_push();
    return model
  };

  model.nodes = function(molecules, num, xdomain, ydomain, temperature, rmin, mol_rmin_radius_factor) {
    if (!arguments.length) return molecules;
    var molecules = molecules;
    molecules.length = num;

    nodes = arrays.create(node_properties_length, null, "regular");
    
    var webgl = !!window.WebGLRenderingContext;
    var not_safari = benchmark.what_browser.browser != "Safari";
    
    var array_type = (webgl && not_safari) ? "Float32Array" : "regular";

    // model.RADIUS = 0
    nodes[model.RADIUS] = arrays.create(num, rmin * mol_rmin_radius_factor, array_type);
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

  // use `node.call(model.drag)` to make nodes draggable
  // model.drag = function() {
  //   if (!drag) drag = d3.behavior.drag()
  //       .on("dragstart", dragstart)
  //       .on("drag", modeler_forceDrag)
  //       .on("dragend", modeler_forceDragEnd);
  // 
  //   this.on("mouseover.model", modeler_forceDragOver)
  //       .on("mouseout.model", modeler_forceDragOut)
  //       .call(drag);
  // };
  // 
  // function dragstart(d) {
  //   modeler_forceDragOver(modeler_forceDragNode = d);
  //   modeler_forceDragForce = model;
  // }

  return model;
};

// var modeler_forceDragForce,
//     modeler_forceDragNode;
// 
// function modeler_forceDragOver(d) {
//   d.fixed |= 2;
// }
// 
// function modeler_forceDragOut(d) {
//   if (d !== modeler_forceDragNode) d.fixed &= 1;
// }
// 
// function modeler_forceDragEnd() {
//   modeler_forceDrag();
//   modeler_forceDragNode.fixed &= 1;
//   modeler_forceDragForce = modeler_forceDragNode = null;
// }
// 
// function modeler_forceDrag() {
//   modeler_forceDragNode.px += d3.event.dx;
//   modeler_forceDragNode.py += d3.event.dy;
//   modeler_forceDragForce.resume(); // restart annealing
// }


// function modeler_original_forceAccumulate(quad, charges) {
//   var cx = 0,
//       cy = 0;
//   quad.charge = 0;
//   if (!quad.leaf) {
//     var nodes = quad.nodes,
//         n = nodes[0].length,
//         i = -1,
//         c;
//     while (++i < n) {
//       c = nodes[i];
//       if (c == null) continue;
//       modeler_original_forceAccumulate(c, charges);
//       quad.charge += c.charge;
//       cx += c.charge * c.cx;
//       cy += c.charge * c.cy;
//     }
//   }
//   if (quad.point) {
//     // jitter internal nodes that are coincident
//     if (!quad.leaf) {
//       quad.point.x += Math.random() - .5;
//       quad.point.y += Math.random() - .5;
//     }
//     var k = 0.1 * charges[quad.point.index];
//     quad.charge += quad.pointCharge = k;
//     cx += k * quad.point.x;
//     cy += k * quad.point.y;
//   }
//   quad.cx = cx / quad.charge;
//   quad.cy = cy / quad.charge;
// }
// 
// function modeler_forceAccumulate(quad, forces, boundary) {
//   var cx = 0,
//       cy = 0;
//   
//   quad.charge = 0;
//   if (!quad.leaf) {
//     var nodes = quad.nodes,
//         n = nodes[0].length,
//         i = -1,
//         c;
//     while (++i < n) {
//       c = nodes[i];
//       if (c == null) continue;
//       modeler_forceAccumulate(c, forces);
//       quad.charge += c.charge;
//       cx += c.charge * c.cx;
//       cy += c.charge * c.cy;
//     }
//   }
//   if (quad.point) {
//     // jitter internal nodes that are coincident
//     if (!quad.leaf) {
//       quad.point.x += Math.random() - .5;
//       quad.point.y += Math.random() - .5;
//     }
//     var k = forces[quad.point.index];
//     quad.charge += quad.pointCharge = k;
//     cx += k * quad.point.x;
//     cy += k * quad.point.y;
//   }
//   quad.cx = cx / quad.charge;
//   quad.cy = cy / quad.charge;
// }
// 
// function modeler_forceLinkDistance(link) {
//   return 20;
// }
// 
// function modeler_forceLinkStrength(link) {
//   return 1;
// }

// export namespace
if (root !== 'undefined') { root.modeler = modeler; }
})();

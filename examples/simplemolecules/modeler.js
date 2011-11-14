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
      drag,
      stopped = true,
      friction = .9,
      charge = -0.1,
      gravity = .1,
      theta = .8,
      interval,
      nodes = [],
      tick_history_list = [],
      tick_history_list_index = 0,
      tick_counter = -1,
      new_step = false,
      links = [],
      distances,
      strengths,
      forces,
      ljforce,
      maxforce = 5.0,
      maxf = 0,
      integration_loop = 10,
      integration_factor = 30,
      overlap,
      speed,
      speed_goal,
      speed_factor,
      speed_max_pos, speed_max_neg,
      pressure,
      pressures = [0];

  //
  // The temperature_to_speed(t) function is used to map temperatures in abstract units
  // within a arnge of 0..10 to a goal for the average speed per atom for the system of atoms. 
  //
  // Currently all atoms are unit mass.
  //
  // Increasing the number of atoms while keeping the average spped for an atom 
  // the same will increase the total KE for the system.
  //
  
  function temperature_to_speed(t) {
    return 0.0200 * Math.pow(1.5, t);
  }

  //
  // Main Model Integration Loop
  //
  function tick() {
    var n = nodes.length,
        m = links.length,
        q,
        i, // current index
        o, // current object
        s, // current source
        t, // current target
        l, // current distance
        k, // current force
        x, // x-distance
        y, // y-distance
        iloop,
        leftwall   = nodes[0].radius,
        bottomwall = nodes[0].radius,
        rightwall  = size[0] - nodes[0].radius,
        topwall    = size[1] - nodes[0].radius,
        xstep,
        ystep;

    //
    // Loop through this inner processing loop 'integration_loop' times:
    //
    pressure = 0;
    iloop = -1; 
    while(++iloop < integration_loop) {

      //
      // Compute and use a quadtree center of mass and apply lennard-jones forces
      //
      q = d3.geom.quadtree(nodes);
      i = -1; while (++i < n) {
        o = nodes[i];
        q.visit(ljforces(o));
      }

      //
      // Dynamically adjust 'temperature' of system.
      //
      speed = average_speed();
      speed_max = speed_goal * 2;
      speed_min = speed_goal * 0.3;
      speed_factor = speed_goal/speed;
      i = -1; while (++i < n) {
        o = nodes[i];
        if (speed > (speed_goal * 1.1)) {
      
          // If the average speed for an atom is greater than 110% of the speed_goal
          // reduce the acceleration by one half
          o.ax *= 0.5;
          o.ay *= 0.5;
      
          // And if the speed for this atom is greater than the 10 times the current speed_goal
          // reduce the velocity of the atom by creating a new, closer previous position.
          if (o.speed > speed_max) {
            o.vx *= speed_max/o.speed;
            o.vy *= speed_max/o.speed;
            o.speed = speed_max;
            o.px = o.x - o.vx;
            o.py = o.y - o.vy;
          }
        } 
      
        // Else if the average speed for an atom is less than 90% of the speed_goal
        // double the acceleration.
        else if (speed < (speed_goal * 0.90)) {
          o.ax *= 2;
          o.ay *= 2;
      
          // And if the speed for this atom is less than the 10% of the current speed_goal
          // increase the velocity of the atom by creating a new previous position
          // further away.
          if (o.speed < speed_min) {
            o.vx *= speed_max/o.speed;
            o.vy *= speed_max/o.speed;
            o.speed = speed_min;
            o.px = o.x - o.vx;
            o.py = o.y - o.vy;
          }
        }
      }

      // Use a Verlet integration to continue particle movement integrating acceleration with 
      // existing position and previous position while managing collision with boundaries.
      i = -1; while (++i < n) {
        o = nodes[i];
        x = o.x;
        y = o.y;
        o.x = 2 * x - o.px + o.ax / integration_factor;
        o.y = 2 * y - o.py + o.ay / integration_factor;
        xstep = o.x - x;
        xstep = Math.min(xstep, 4)
        ystep = o.y - y;
        ystep =  Math.min(ystep, 4)
        o.ax = 0;
        o.ay = 0;
        if (o.x < leftwall) {
          o.x = leftwall + (leftwall - o.x);
          o.px = o.x + xstep;
          o.py = y;
          pressure += o.speed;
        } else if (o.x > rightwall) {
          o.x = rightwall + (rightwall - o.x);
          o.px = o.x + xstep;
          o.py = y;
          pressure += o.speed;
        } else if (o.y < bottomwall) {
          o.y = bottomwall + (bottomwall - o.y);
          o.py = o.y + ystep;
          o.px = x;
          pressure += o.speed;
        } else if (o.y > topwall) {
          o.y = topwall + (topwall - o.y);
          o.py = o.y + ystep;
          o.px = x;
          pressure += o.speed;
        } else {
          o.px = x;
          o.py = y;
        }
        o.vx = o.x - o.px;
        o.vy = o.y - o.py;
        o.speed = Math.sqrt(xstep * xstep + ystep * ystep);
      }
    }
    pressures.push(pressure);
    pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries
    speed = average_speed();
    ke = kinetic_energy();
    tick_history_list_push();
    if (!stopped) { event.tick({type: "tick"}); };
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
    var i = -1, j, o, 
    newnode, 
    newnodes = [], 
    n=nodes.length;
    while(++i < n) {
      o = nodes[i];
      newnode = {};
      for (var j in o) {
        if (o.hasOwnProperty(j)) {
          newnode[j] = o[j];
        }
      }
      newnodes.push(newnode)
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
    var i = -1, j, o, newnode, n=nodes.length;
    if (index < 0) {
      throw new Error("modeler: request for tick_history_list[" + index + "]")
    };
    if (index >= (tick_history_list.length)) {
      throw new Error("modeler: request for tick_history_list[" + index + "], tick_history_list.length=" + tick_history_list.length)
    };
    var tick_history = tick_history_list[index];
    var savednodes = tick_history.nodes
    while(++i < n) {
      o = nodes[i];
      for (var j in o) {
        if (savednodes[i].hasOwnProperty(j)) {
          o[j] = savednodes[i][j];
        }
      }
    };
    ke = tick_history.ke;
  }

  function tick_history_list_ke_data() {
    var i = -1, j, o, oldnodes,
    newnode, 
    savednodes = tick_history_list[index], 
    n=nodes.length;
    while(++i < n) {
      oldnodes = mode_history
      o = nodes[i];
      for (var j in o) {
        if (savednodes[i].hasOwnProperty(j)) {
          o[j] = savednodes[i][j];
        }
      }
    }
  }

  function ljforces(node) {
    var r = node.radius * 5,
        nx1 = node.x - r,
        nx2 = node.x + r,
        ny1 = node.y - r,
        ny2 = node.y + r;
    return function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== node)) {
        var x = node.x - quad.point.x,
            y = node.y - quad.point.y,
            l = Math.sqrt(x * x + y * y),
            f, xf, yf;
        f = ljforce(l) / 2;
        // maxf = Math.min(maxforce, f);
        f = Math.max(-maxforce, f);
        xf = x / l * f;
        yf = y / l * f;
        node.ax       -= xf;
        node.ay       -= yf;
        quad.point.ax += xf;
        quad.point.ay += yf;
      }
      return x1 > nx2
          || x2 < nx1
          || y1 > ny2
          || y2 < ny1;
    };
  }

  function set_speed(newspeed) {
    var i, change, n = nodes.length;
    i = -1; while (++i < n) {
      o = nodes[i];
      change = newspeed/o.speed;
      o.vx = (o.x - o.px) * change;
      o.vy = (o.y - o.py) * change;
      o.px += o.vx;
      o.py += o.vy;
      o.speed = newspeed;
    }
  }

  function change_speed(factor) {
    var i, n = nodes.length;
    i = -1; while (++i < n) {
      o = nodes[i];
      o.vx = (o.x - o.px) * factor;
      o.vy = (o.y - o.py) * factor;
      o.px += o.vx;
      o.py += o.vy;
      o.speed *- factor;
    }
  }

  function cap_speed(capspeed) {
    var i, change, n = nodes.length;
    i = -1; while (++i < n) {
      o = nodes[i];
      if (o.speed > capspeed) {
        change = capspeed/o.speed;
        o.vx = (o.x - o.px) * change;
        o.vy = (o.y - o.py) * change;
        o.px += o.vx;
        o.py += o.vy;
        o.speed = capspeed;
      }
    }
  }

  function set_acc(acc) {
    var i, n = nodes.length;
    i = -1; while (++i < n) {
      nodes[i].ax = acc;
      nodes[i].ay = acc;
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
    var i, ke, speed = 0, n = nodes.length;
    i = -1; while (++i < n) { 
      speed += nodes[i].speed 
    }
    ke = speed * speed
    return ke;
  }

  function average_speed() {
    var i, speed = 0, n = nodes.length;
    i = -1; while (++i < n) { speed += nodes[i].speed }
    return speed/n;
  }

  function apply_verlet() {
    var n = nodes.length,
        i, // current index
        o, // current object
        x, // x-distance
        y, // y-distance
        leftwall   = nodes[0].radius,
        bottomwall = nodes[0].radius,
        rightwall  = size[0] - nodes[0].radius,
        topwall    = size[1] - nodes[0].radius,
        xstep,
        ystep;

    i = -1; while (++i < n) {
      o = nodes[i];
      x = o.x;
      y = o.y;
      o.x = 2 * x - o.px + o.ax / integration_factor;
      o.y = 2 * y - o.py + o.ay / integration_factor;
      xstep = o.x - x;
      xstep = Math.min(xstep, 4)
      ystep = o.y - y;
      ystep =  Math.min(ystep, 4)
      o.ax = 0;
      o.ay = 0;
      if (o.x < leftwall) {
        o.x = leftwall + (leftwall - o.x);
        o.px = o.x + xstep;
        o.py = y;
        pressure += o.speed;
      } else if (o.x > rightwall) {
        o.x = rightwall + (rightwall - o.x);
        o.px = o.x + xstep;
        o.py = y;
        pressure += o.speed;
      } else if (o.y < bottomwall) {
        o.y = bottomwall + (bottomwall - o.y);
        o.py = o.y + ystep;
        o.px = x;
        pressure += o.speed;
      } else if (o.y > topwall) {
        o.y = topwall + (topwall - o.y);
        o.py = o.y + ystep;
        o.px = x;
        pressure += o.speed;
      } else {
        o.px = x;
        o.py = y;
      }
      o.vx = o.x - o.px;
      o.vy = o.y - o.py;
      o.speed = Math.sqrt(xstep * xstep + ystep * ystep);
    }
  }

  //
  // Dynamically adjust 'temperature' of system.
  //
  function adjust_temperature() {
    var n = nodes.length,
        i, // current index
        o, // current object
        x, // x-distance
        y, // y-distance
        speed,
        speed_max,
        speed_min,
        speed_factor;
    
    speed = average_speed();
    speed_max = speed_goal * 10;
    speed_min = speed_goal * 0.1;
    speed_factor = speed_goal/speed;
    i = -1; while (++i < n) {
      o = nodes[i];
      if (speed > (speed_goal * 1.1)) {
        // If the average speed for an atom is greater than 110% of the speed_goal
        // reduce the acceleration by one half
        o.ax *= 0.5;
        o.ay *= 0.5;
        // And if the speed for this atom is greater than the 10 times the current speed_goal
        // reduce the velocity of the atom by creating a new, closer previous position.
        if (o.speed > speed_max) {
          o.vx *= speed_max/o.speed;
          o.vy *= speed_max/o.speed;
          o.speed = speed_max;
          o.px = o.x - o.vx;
          o.py = o.y - o.vy;
        }
      } 
      // Else if the average speed for an atom is less than 90% of the speed_goal
      // double the acceleration.
      else if (speed < (speed_goal * 0.90)) {
        o.ax *= 2;
        o.ay *= 2;
        // And if the speed for this atom is less than the 10% of the current speed_goal
        // increase the velocity of the atom by creating a new previous position
        // further away.
        if (o.speed < speed_min) {
          o.vx *= speed_max/o.speed;
          o.vy *= speed_max/o.speed;
          o.speed = speed_min;
          o.px = o.x - o.vx;
          o.py = o.y - o.vy;
        }
      }
    }
  }

  function repulse(node) {
    return function(quad, x1, y1, x2, y2) {
      if (quad.point !== node) {
        var dx = quad.cx - node.x,
            dy = quad.cy - node.y,
            dn = 1 / Math.sqrt(dx * dx + dy * dy);

        /* Barnes-Hut criterion. */
        if ((x2 - x1) * dn < theta) {
          var k = quad.charge * dn * dn;
          node.px -= dx * k;
          node.py -= dy * k;
          return true;
        }

        if (quad.point && isFinite(dn)) {
          var k = quad.pointCharge * dn * dn;
          node.px -= dx * k;
          node.py -= dy * k;
        }
      }
      return !quad.charge;
    };
  }

  function repulse2(node) {
    return function(quad, x1, y1, x2, y2) {
      if (quad.point !== node) {
        var dx = quad.cx - node.x,
            dy = quad.cy - node.y,
            dn = 1 / Math.sqrt(dx * dx + dy * dy);

        /* Barnes-Hut criterion. */
        if ((x2 - x1) * dn < 0.8) {
          var k = quad.charge * dn * dn;
          node.px -= dx * k;
          node.py -= dy * k;
          return true;
        }

        if (quad.point && isFinite(dn)) {
          var k = quad.pointCharge * dn * dn;
          node.px -= dx * k;
          node.py -= dy * k;
        }
      }
      return !quad.charge;
    };
  }

  function relax_system(nodes) {
    var n = nodes.length, q, i, o;
    modeler_original_forceAccumulate(q = d3.geom.quadtree(nodes), nodes)
    i = -1; while (++i < n) {
      if (!(o = nodes[i]).fixed) {
        q.visit(repulse2(o));
      }
    }
  }
  
  function resolve_collisions(nodes) {
    var n = nodes.length, q, i, j;
    j = -1; while(j++ < integration_loop * 4) {
      q = d3.geom.quadtree(nodes);
      i = -1; while (++i < n) {
        if (!(o = nodes[i]).fixed) {
          q.visit(ljforces(o));
        }
      }
      cap_speed(temperature_to_speed(temperature)*2);
      adjust_temperature();
      apply_verlet();
    }
  }

  function set_temperature(t) {
    temperature = t;
    speed_goal = temperature_to_speed(temperature);
  }

  model.nodes = function(x) {
    if (!arguments.length) return nodes;
    nodes = x;
    reset_tick_history_list();
    return model;
  };

  model.getStats = function() {
    return {
      speed: average_speed(),
      ke: ke,
      temperature: temperature,
      pressure: container_pressure(),
      current_step: tick_counter,
      steps: tick_history_list.length-1
    }
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

  model.initialize = function() {
    var i,
        j,
        n = nodes.length,
        m = links.length,
        w = size[0],
        h = size[1],
        neighbors,
        o;

    for (i = 0; i < n; ++i) {
      (o = nodes[i]).index = i;
      o.weight = 0;
    }
    
    charges = [];
    if (typeof charge === "function") {
      for (i = 0; i < n; ++i) {
        charges[i] = +charge.call(this, nodes[i], i);
      }
    } else {
      for (i = 0; i < n; ++i) {
        charges[i] = charge;
      }
    }

    distances = [];
    strengths = [];
    forces = [];
    for (i = 0; i < n; ++i) {
      forces[i] = charge;
    }
    resolve_collisions(nodes);
    pressures.push(pressure);
    pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries
    speed = average_speed();
    ke = kinetic_energy();
    tick_history_list_push();
    return model
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
    return ke;
  };

  model.speed = function() {
    var speed = average_speed();
    return speed * speed;
  };

  model.pressure = function() {
    return container_pressure();
  };

  model.temperature = function(x) {
    if (!arguments.length) return temperature;
    set_temperature(x)
    return model;
  };

  model.ljforce = function(x) {
    if (!arguments.length) return ljforce;
    ljforce = x;
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
  model.drag = function() {
    if (!drag) drag = d3.behavior.drag()
        .on("dragstart", dragstart)
        .on("drag", modeler_forceDrag)
        .on("dragend", modeler_forceDragEnd);

    this.on("mouseover.model", modeler_forceDragOver)
        .on("mouseout.model", modeler_forceDragOut)
        .call(drag);
  };

  function dragstart(d) {
    modeler_forceDragOver(modeler_forceDragNode = d);
    modeler_forceDragForce = model;
  }

  return model;
};

var modeler_forceDragForce,
    modeler_forceDragNode;

function modeler_forceDragOver(d) {
  d.fixed |= 2;
}

function modeler_forceDragOut(d) {
  if (d !== modeler_forceDragNode) d.fixed &= 1;
}

function modeler_forceDragEnd() {
  modeler_forceDrag();
  modeler_forceDragNode.fixed &= 1;
  modeler_forceDragForce = modeler_forceDragNode = null;
}

function modeler_forceDrag() {
  modeler_forceDragNode.px += d3.event.dx;
  modeler_forceDragNode.py += d3.event.dy;
  modeler_forceDragForce.resume(); // restart annealing
}


function modeler_original_forceAccumulate(quad, charges) {
  var cx = 0,
      cy = 0;
  quad.charge = 0;
  if (!quad.leaf) {
    var nodes = quad.nodes,
        n = nodes.length,
        i = -1,
        c;
    while (++i < n) {
      c = nodes[i];
      if (c == null) continue;
      modeler_original_forceAccumulate(c, charges);
      quad.charge += c.charge;
      cx += c.charge * c.cx;
      cy += c.charge * c.cy;
    }
  }
  if (quad.point) {
    // jitter internal nodes that are coincident
    if (!quad.leaf) {
      quad.point.x += Math.random() - .5;
      quad.point.y += Math.random() - .5;
    }
    var k = 0.1 * charges[quad.point.index];
    quad.charge += quad.pointCharge = k;
    cx += k * quad.point.x;
    cy += k * quad.point.y;
  }
  quad.cx = cx / quad.charge;
  quad.cy = cy / quad.charge;
}

function modeler_forceAccumulate(quad, forces, boundary) {
  var cx = 0,
      cy = 0;
  
  quad.charge = 0;
  if (!quad.leaf) {
    var nodes = quad.nodes,
        n = nodes.length,
        i = -1,
        c;
    while (++i < n) {
      c = nodes[i];
      if (c == null) continue;
      modeler_forceAccumulate(c, forces);
      quad.charge += c.charge;
      cx += c.charge * c.cx;
      cy += c.charge * c.cy;
    }
  }
  if (quad.point) {
    // jitter internal nodes that are coincident
    if (!quad.leaf) {
      quad.point.x += Math.random() - .5;
      quad.point.y += Math.random() - .5;
    }
    var k = forces[quad.point.index];
    quad.charge += quad.pointCharge = k;
    cx += k * quad.point.x;
    cy += k * quad.point.y;
  }
  quad.cx = cx / quad.charge;
  quad.cy = cy / quad.charge;
}

function modeler_forceLinkDistance(link) {
  return 20;
}

function modeler_forceLinkStrength(link) {
  return 1;
}

// export namespace
if (root !== 'undefined') { root.modeler = modeler; }
})();

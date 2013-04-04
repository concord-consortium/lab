/*global define: true */
/*jslint eqnull: true, boss: true, loopfunc: true*/

define(function (require, exports, module) {

  var arrays               = require('arrays'),
      arrayTypes           = require('common/array-types'),
      console              = require('common/console'),
      CloneRestoreWrapper  = require('common/models/engines/clone-restore-wrapper');

  exports.createEngine = function() {

    var // the object to be returned
        engine,

        // If a numeric value include gravitational field in force calculations,
        // otherwise value should be false
        gravitationalField = false,

        // Whether system dimensions have been set. This is only allowed to happen once.
        sizeHasBeenInitialized = false,

        // System dimensions as [x, y]. Default value can be changed until turles are created.
        size = [50, 50],

        // System dimensions as minX, minYm, maxX, maxY. Default value can be changed until turles are created.
        minX = -25,
        minY = -25,
        maxX =  25,
        maxY =  25,

        // The current model time in ticks.
        time = 0,

        // The current integration time step
        dt,

        // Square of integration time step.
        dt_sq,

        // ####################################################################
        //                      Body Properties

        // Individual property arrays for the bodies, indexed by planet number
        radius, x, y, vx, vy, px, py, ax, ay, mass, speed,

        // An object that contains references to the above planet-property arrays
        bodies,

        // The number of bodies in the system.
        N = 0,

        // booleans indicating whether the planet world wraps
        horizontalWrapping,
        verticalWrapping,

        // Initializes basic data structures.
        initialize = function () {
          createBodiesArray(0);
        },

        /**
          Extend all arrays in arrayContainer to `newLength`. Here, arrayContainer is expected to be `bodies`
          `elements`, `radialBonds`, etc. arrayContainer might be an array or an object.
          TODO: this is just interim solution, in the future only objects will be expected.
        */
        extendArrays = function(arrayContainer, newLength) {
          var i, len;
          if (Array.isArray(arrayContainer)) {
            // Array of arrays.
            for (i = 0, len = arrayContainer.length; i < len; i++) {
              if (arrays.isArray(arrayContainer[i]))
                arrayContainer[i] = arrays.extend(arrayContainer[i], newLength);
            }
          } else {
            // Object with arrays defined as properties.
            for (i in arrayContainer) {
              if(arrayContainer.hasOwnProperty(i)) {
                if (arrays.isArray(arrayContainer[i]))
                  arrayContainer[i] = arrays.extend(arrayContainer[i], newLength);
              }
            }
          }
        },

        /**
          Set up "shortcut" references, e.g., x = bodies.x
        */
        assignShortcutReferences = {

          bodies: function() {
            radius         = bodies.radius;
            x              = bodies.x;
            y              = bodies.y;
            vx             = bodies.vx;
            vy             = bodies.vy;
            px             = bodies.px;
            py             = bodies.py;
            ax             = bodies.ax;
            ay             = bodies.ay;
            mass           = bodies.mass;
            speed          = bodies.speed;
            pinned         = bodies.pinned;
          }

        },


        createBodiesArray = function(num) {
          bodies  = engine.bodies  = {};

          // TODO. DRY this up by letting the property list say what type each array is
          bodies.radius         = arrays.create(num, 0, arrayTypes.float);
          bodies.x              = arrays.create(num, 0, arrayTypes.float);
          bodies.y              = arrays.create(num, 0, arrayTypes.float);
          bodies.vx             = arrays.create(num, 0, arrayTypes.float);
          bodies.vy             = arrays.create(num, 0, arrayTypes.float);
          bodies.px             = arrays.create(num, 0, arrayTypes.float);
          bodies.py             = arrays.create(num, 0, arrayTypes.float);
          bodies.ax             = arrays.create(num, 0, arrayTypes.float);
          bodies.ay             = arrays.create(num, 0, arrayTypes.float);
          bodies.mass           = arrays.create(num, 0, arrayTypes.floatType);
          bodies.speed          = arrays.create(num, 0, arrayTypes.float);
          bodies.pinned         = arrays.create(num, 0, arrayTypes.uint8);

          // For the sake of clarity, manage all bodies properties in one
          // place (engine). In the future, think about separation of engine
          // properties and view-oriented properties like these:
          bodies.marked         = arrays.create(num, 0, arrayTypes.uint8);
          bodies.visible        = arrays.create(num, 0, arrayTypes.uint8);

          assignShortcutReferences.bodies();
        },

        // Constrain Body i to the area between the walls by simulating perfectly elastic collisions with the walls.
        // Note this may change the linear and angular momentum.
        bounceBodyOffWalls = function(i) {
          var r = radius[i],
              leftwall = minX + r,
              bottomwall = minY + r,
              rightwall = maxX - r,
              topwall = maxY - r,
              width = size[0],
              height = size[1];

          if (horizontalWrapping) {
            // wrap around vertical walls
            if (x[i] + radius[i] < leftwall) {
              x[i] += width;
            } else if (x[i] - radius[i] > rightwall) {
              x[i] -= width;
            }
          } else {
            // Bounce off vertical walls.
            if (x[i] < leftwall) {
              while (x[i] < leftwall - width) {
                x[i] += width;
              }
              x[i]  = leftwall + (leftwall - x[i]);
              vx[i] *= -1;
              px[i] *= -1;
            } else if (x[i] > rightwall) {
              while (x[i] > rightwall + width) {
                x[i] -= width;
              }
              x[i]  = rightwall - (x[i] - rightwall);
              vx[i] *= -1;
              px[i] *= -1;
            }
          }

          if (verticalWrapping) {
            // wrap around horizontal walls
            if (y[i] + radius[i] < bottomwall) {
              y[i] += height;
            } else if (y[i] - radius[i] > topwall) {
              y[i] -= height;
            }
          } else {
            // Bounce off horizontal walls
            if (y[i] < bottomwall) {
              while (y[i] < bottomwall - height) {
                y[i] += height;
              }
              y[i]  = bottomwall + (bottomwall - y[i]);
              vy[i] *= -1;
              py[i] *= -1;
            } else if (y[i] > topwall) {
              while (y[i] > topwall + height) {
                y[i] -= height;
              }
              y[i]  = topwall - (y[i] - topwall);
              vy[i] *= -1;
              py[i] *= -1;
            }
          }
        },

        // Accumulate acceleration into a(t + dt) from all possible interactions, fields
        // and forces connected with bodies.
        updateBodiesAccelerations = function () {
          var i, inverseMass;

          if (N === 0) return;

          // Zero out a(t) for accumulation of forces into a(t + dt).
          for (i = 0; i < N; i++) {
            ax[i] = ay[i] = 0;
          }

          // // Convert ax, ay from forces to accelerations!
          // for (i = 0; i < N; i++) {
          //   inverseMass = 1/mass[i];
          //   ax[i] *= inverseMass;
          //   ay[i] *= inverseMass;
          // }

          // ######################################
          // ax and ay are FORCES below this point
          // ######################################
          updateGravitationalAccelerations();

        },


        updateGravitationalAccelerations = function() {
          var i, j, dx, dy, rSq, gfx, gfy;

          i = -1; while (++i < N) {
            m1 = mass[i];
            j = i; while (++j < N) {
              dx = x[j] - x[i];
              dy = y[j] - y[i];
              rSq = dx * dx + dy * dy;
              l = Math.sqrt(rSq);
              m2 = mass[j];
              gf = gravitationalField * m1 * m2 / rSq;
              gfx = dx / l * gf;
              gfy = dy / l * gf;
              ax[i] += gfx;
              ay[i] += gfy;
              ax[j] -= gfx;
              ay[j] -= gfy;
            }
          }
        },

        // Half of the update of v(t + dt) and p(t + dt) using a. During a single integration loop,
        // call once when a = a(t) and once when a = a(t+dt).
        halfUpdateVelocity = function() {
          var i, m;
          for (i = 0; i < N; i++) {
            m = mass[i];
            vx[i] += 0.5 * ax[i] * dt;
            px[i] = m * vx[i];
            vy[i] += 0.5 * ay[i] * dt;
            py[i] = m * vy[i];
          }
        },

        // Calculate r(t + dt, i) from v(t + 0.5 * dt).
        updateBodiesPosition = function() {
          var width100  = size[0] * 100,
              height100 = size[1] * 100,
              xPrev, yPrev, i;

          for (i = 0; i < N; i++) {
            xPrev = x[i];
            yPrev = y[i];

            x[i] += vx[i] * dt;
            y[i] += vy[i] * dt;

            // Bounce off walls.
            bounceBodyOffWalls(i);
          }
        },

        // Removes velocity and acceleration from pinned Bodies.
        pinBodies = function() {
          var i;

          for (i = 0; i < N; i++) {
            if (pinned[i]) {
              vx[i] = vy[i] = ax[i] = ay[i] = 0;
            }
          }
        },

        // Update speed using velocities.
        updateBodiesSpeed = function() {
          var i;

          for (i = 0; i < N; i++) {
            speed[i] = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
          }
        };

        // ####################################################################
        // ####################################################################

    engine = {

      // Our timekeeping is really a convenience for users of this lib, so let them reset time at will
      setTime: function(t) {
        time = t;
      },

      setDimensions: function(v) {
        if (sizeHasBeenInitialized) {
          throw new Error("The SolarSystem model's size has already been set, and cannot be reset.");
        }
        minX = v[0];
        minY = v[1];
        maxX = v[2];
        maxY = v[3];
        size = [maxX - minX, maxY - minY];
        sizeHasBeenInitialized = true;
      },

      getDimensions: function() {
        return [minX, maxX, minY, maxY];
      },

      setHorizontalWrapping: function(v) {
        horizontalWrapping = !!v;
      },

      setVerticalWrapping: function(v) {
        verticalWrapping = !!v;
      },

      setGravitationalField: function(gf) {
        if (typeof gf === "number" && gf !== 0) {
          gravitationalField = gf;
        } else {
          gravitationalField = false;
        }
      },

      setBodyProperties: function (i, props) {
        var key, idx, rest, j;

        props.radius = 1;

        // Set all properties from props hash.
        for (key in props) {
          if (props.hasOwnProperty(key)) {
            bodies[key][i] = props[key];
          }
        }

        // Update properties which depend on other properties.
        speed[i] = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
      },

      /**
        The canonical method for adding an planet to the collections of bodies.

        If there isn't enough room in the 'bodies' array, it (somewhat inefficiently)
        extends the length of the typed arrays by ten to have room for more bodies.

        @returns the index of the new planet
      */
      addBody: function(props) {
        if (N + 1 > bodies.x.length) {
          extendArrays(bodies, N + 10);
          assignShortcutReferences.bodies();
        }

        // Set acceleration of new planet to zero.
        props.ax = props.ay = 0;

        // Increase number of bodies.
        N++;

        // Set provided properties of new planet.
        engine.setBodyProperties(N - 1, props);

      },

      removeBody: function(idx) {
        var i, len, prop,
            l, list, lists;

        if (idx >= N) {
          throw new Error("Body " + idx + " doesn't exist, so it can't be removed.");
        }

        // Shift bodies properties and zero last element.
        // It can be optimized by just replacing the last
        // planet with planet 'i', however this approach
        // preserves more expectable bodies indexing.
        for (i = idx; i < N; i++) {
          for (prop in bodies) {
            if (bodies.hasOwnProperty(prop)) {
              if (i === N - 1)
                bodies[prop][i] = 0;
              else
                bodies[prop][i] = bodies[prop][i + 1];
            }
          }
        }

        // Update number of bodies!
        N--;

        // Update accelerations of bodies.
        updateParticlesAccelerations();
      },

      setupBodiesRandomly: function(options) {

        var // if a temperature is not explicitly requested, we just need any nonzero number

            nrows = Math.floor(Math.sqrt(N)),
            ncols = Math.ceil(N/nrows),

            i, r, c, rowSpacing, colSpacing,
            vMagnitude, vDirection, props;

        colSpacing = size[0] / (1 + ncols);
        rowSpacing = size[1] / (1 + nrows);

        // Arrange bodies in a lattice.
        i = -1;

        for (r = 1; r <= nrows; r++) {
          for (c = 1; c <= ncols; c++) {
            i++;
            if (i === N) break;
            vMagnitude = math.normal(1, 1/4);
            vDirection = 2 * Math.random() * Math.PI;

            props = {
              x:       c * colSpacing,
              y:       r * rowSpacing,
              vx:      vMagnitude * Math.cos(vDirection),
              vy:      vMagnitude * Math.sin(vDirection)
            };
            engine.setBodyProperties(i, props);
          }
        }
      },

      // Velocity Verlet integration scheme.
      // See: http://en.wikipedia.org/wiki/Verlet_integration#Velocity_Verlet
      // The current implementation is:
      // 1. Calculate: v(t + 0.5 * dt) = v(t) + 0.5 * a(t) * dt
      // 2. Calculate: r(t + dt) = r(t) + v(t + 0.5 * dt) * dt
      // 3. Derive a(t + dt) from the interaction potential using r(t + dt)
      // 4. Calculate: v(t + dt) = v(t + 0.5 * dt) + 0.5 * a(t + dt) * dt
      integrate: function(duration, _dt) {
        var steps, iloop, tStart = time;

        // How much time to integrate over, in fs.
        if (duration === undefined)  duration = 100;

        // The length of an integration timestep, in fs.
        if (_dt === undefined) _dt = 0.1;

        dt = _dt;        // dt is a closure variable that helpers need access to
        dt_sq = dt * dt; // the squared time step is also needed by some helpers.

        // Calculate accelerations a(t), where t = 0.
        // Later this is not necessary, as a(t + dt) from
        // previous step is used as a(t) in the current step.
        if (time === 0) {
          updateBodiesAccelerations();
        }

        // Number of steps.
        steps = Math.floor(duration / dt);

        for (iloop = 1; iloop <= steps; iloop++) {
          time = tStart + iloop * dt;

          // Calculate v(t + 0.5 * dt) using v(t) and a(t).
          halfUpdateVelocity();

          // Clearing the acceleration here from pinned bodies will cause the acceleration
          // to be zero for both halfUpdateVelocity methods and updateBodyPosition, freezing the planet.
          pinBodies();

          // Update r(t + dt) using v(t + 0.5 * dt).
          updateBodiesPosition();

          // Accumulate accelerations into a(t + dt) from all possible interactions, fields
          // and forces connected with atoms.
          updateBodiesAccelerations();

          // Calculate v(t + dt) using v(t + 0.5 * dt) and a(t + dt).
          halfUpdateVelocity();

          // Now that we have velocity v(t + dt), update speed.
          updateBodiesSpeed();

        } // end of integration loop

      },


      getNumberOfBodies: function() {
        return N;
      },

      /**
        Compute the model state and store into the passed-in 'state' object.
        (Avoids GC hit of throwaway object creation.)
      */
      // TODO: [refactoring] divide this function into smaller chunks?
      computeOutputState: function(state) {
        var i, j,
            i1, i2, i3,
            el1, el2,
            dx, dy,
            dxij, dyij, dxkj, dykj,
            cosTheta, theta,
            r_sq, rij, rkj,
            k, dr, angleDiff,
            gravPEInMWUnits,
            // Total kinetic energy, in MW units.
            KEinMWUnits,
            // Potential energy, in eV.
            PE;

        // State to be read by the rest of the system:
        state.time           = time;
      },

      // ######################################################################
      //                State definition of the engine

      // Return array of objects defining state of the engine.
      // Each object in this list should implement following interface:
      // * .clone()        - returning complete state of that object.
      // * .restore(state) - restoring state of the object, using 'state'
      //                     as input (returned by clone()).
      getState: function() {
        return [
          // Use wrapper providing clone-restore interface to save the hashes-of-arrays
          // that represent model state.
          new CloneRestoreWrapper(bodies),

          // Save time value.
          // Create one-line wrapper to provide required interface.
          {
            clone: function () {
              return time;
            },
            restore: function(state) {
              engine.setTime(state);
            }
          }
        ];
      }
    };

    // Initialization
    initialize();

    // Finally, return Public API.
    return engine;
  };
});

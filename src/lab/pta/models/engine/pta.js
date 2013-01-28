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
        //                      Turtle Properties

        // Individual property arrays for the turtles, indexed by turtle number
        radius, x, y, vx, vy, px, py, ax, ay, speed,

        // An object that contains references to the above turtle-property arrays
        turtles,

        // The number of turtles in the system.
        N = 0,

        // booleans indicating whether the turtle world wraps
        horizontalWrapping,
        verticalWrapping,

        // Initializes basic data structures.
        initialize = function () {
          createTurtlesArray(0);
        },

        /**
          Extend all arrays in arrayContainer to `newLength`. Here, arrayContainer is expected to be `turtles`
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
          Set up "shortcut" references, e.g., x = turtles.x
        */
        assignShortcutReferences = {

          turtles: function() {
            radius         = turtles.radius;
            x              = turtles.x;
            y              = turtles.y;
            vx             = turtles.vx;
            vy             = turtles.vy;
            px             = turtles.px;
            py             = turtles.py;
            ax             = turtles.ax;
            ay             = turtles.ay;
            speed          = turtles.speed;
          }

        },


        createTurtlesArray = function(num) {
          turtles  = engine.turtles  = {};

          // TODO. DRY this up by letting the property list say what type each array is
          turtles.radius         = arrays.create(num, 0, arrayTypes.float);
          turtles.x              = arrays.create(num, 0, arrayTypes.float);
          turtles.y              = arrays.create(num, 0, arrayTypes.float);
          turtles.vx             = arrays.create(num, 0, arrayTypes.float);
          turtles.vy             = arrays.create(num, 0, arrayTypes.float);
          turtles.px             = arrays.create(num, 0, arrayTypes.float);
          turtles.py             = arrays.create(num, 0, arrayTypes.float);
          turtles.ax             = arrays.create(num, 0, arrayTypes.float);
          turtles.ay             = arrays.create(num, 0, arrayTypes.float);
          turtles.speed          = arrays.create(num, 0, arrayTypes.float);

          // For the sake of clarity, manage all turtles properties in one
          // place (engine). In the future, think about separation of engine
          // properties and view-oriented properties like these:
          turtles.marked         = arrays.create(num, 0, arrayTypes.uint8);
          turtles.visible        = arrays.create(num, 0, arrayTypes.uint8);

          assignShortcutReferences.turtles();
        },

        // Constrain Turtle i to the area between the walls by simulating perfectly elastic collisions with the walls.
        // Note this may change the linear and angular momentum.
        bounceTurtleOffWalls = function(i) {
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
        // and forces connected with turtles.
        updateTurtlesAccelerations = function () {
          var i, inverseMass;

          if (N === 0) return;

          // Zero out a(t) for accumulation of forces into a(t + dt).
          for (i = 0; i < N; i++) {
            ax[i] = ay[i] = 0;
          }
        },

        // Half of the update of v(t + dt) and p(t + dt) using a. During a single integration loop,
        // call once when a = a(t) and once when a = a(t+dt).
        halfUpdateVelocity = function() {
          var i;
          for (i = 0; i < N; i++) {
            vx[i] += 0.5 * ax[i] * dt;
            px[i] = vx[i];
            vy[i] += 0.5 * ay[i] * dt;
            py[i] = vy[i];
          }
        },

        // Calculate r(t + dt, i) from v(t + 0.5 * dt).
        updateTurtlesPosition = function() {
          var width100  = size[0] * 100,
              height100 = size[1] * 100,
              xPrev, yPrev, i;

          for (i = 0; i < N; i++) {
            xPrev = x[i];
            yPrev = y[i];

            x[i] += vx[i] * dt;
            y[i] += vy[i] * dt;

            // Bounce off walls.
            bounceTurtleOffWalls(i);
          }
        },

        // Update speed using velocities.
        updateTurtlesSpeed = function() {
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
          throw new Error("The PTA model's size has already been set, and cannot be reset.");
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

      setTurtleProperties: function (i, props) {
        var key, idx, rest, j;

        props.radius = 1;

        // Set all properties from props hash.
        for (key in props) {
          if (props.hasOwnProperty(key)) {
            turtles[key][i] = props[key];
          }
        }

        // Update properties which depend on other properties.
        speed[i] = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
      },

      /**
        The canonical method for adding an turtle to the collections of turtles.

        If there isn't enough room in the 'turtles' array, it (somewhat inefficiently)
        extends the length of the typed arrays by ten to have room for more turtles.

        @returns the index of the new turtle
      */
      addTurtle: function(props) {
        if (N + 1 > turtles.x.length) {
          extendArrays(turtles, N + 10);
          assignShortcutReferences.turtles();
        }

        // Set acceleration of new turtle to zero.
        props.ax = props.ay = 0;

        // Increase number of turtles.
        N++;

        // Set provided properties of new turtle.
        engine.setTurtleProperties(N - 1, props);

      },

      removeTurtle: function(idx) {
        var i, len, prop,
            l, list, lists;

        if (idx >= N) {
          throw new Error("Turtle " + idx + " doesn't exist, so it can't be removed.");
        }

        // Shift turtles properties and zero last element.
        // It can be optimized by just replacing the last
        // turtle with turtle 'i', however this approach
        // preserves more expectable turtles indexing.
        for (i = idx; i < N; i++) {
          for (prop in turtles) {
            if (turtles.hasOwnProperty(prop)) {
              if (i === N - 1)
                turtles[prop][i] = 0;
              else
                turtles[prop][i] = turtles[prop][i + 1];
            }
          }
        }

        // Update number of turtles!
        N--;

        // Update accelerations of turtles.
        updateParticlesAccelerations();
      },

      setupTurtlesRandomly: function(options) {

        var // if a temperature is not explicitly requested, we just need any nonzero number

            nrows = Math.floor(Math.sqrt(N)),
            ncols = Math.ceil(N/nrows),

            i, r, c, rowSpacing, colSpacing,
            vMagnitude, vDirection, props;

        colSpacing = size[0] / (1 + ncols);
        rowSpacing = size[1] / (1 + nrows);

        // Arrange turtles in a lattice.
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
            engine.setTurtleProperties(i, props);
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
        if (_dt === undefined) _dt = 1;

        dt = _dt;        // dt is a closure variable that helpers need access to
        dt_sq = dt * dt; // the squared time step is also needed by some helpers.

        // Calculate accelerations a(t), where t = 0.
        // Later this is not necessary, as a(t + dt) from
        // previous step is used as a(t) in the current step.
        if (time === 0) {
          updateTurtlesAccelerations();
        }

        // Number of steps.
        steps = Math.floor(duration / dt);

        for (iloop = 1; iloop <= steps; iloop++) {
          time = tStart + iloop * dt;

          // Calculate v(t + 0.5 * dt) using v(t) and a(t).
          halfUpdateVelocity();

          // Update r(t + dt) using v(t + 0.5 * dt).
          updateTurtlesPosition();

          // Accumulate accelerations into a(t + dt) from all possible interactions, fields
          // and forces connected with atoms.
          updateTurtlesAccelerations();

          // Calculate v(t + dt) using v(t + 0.5 * dt) and a(t + dt).
          halfUpdateVelocity();

          // Now that we have velocity v(t + dt), update speed.
          updateTurtlesSpeed();

        } // end of integration loop

      },


      getNumberOfTurtles: function() {
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
          new CloneRestoreWrapper(turtles),

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

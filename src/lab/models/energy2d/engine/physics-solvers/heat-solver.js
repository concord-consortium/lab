/*jslint indent: false */
// TODO: set JSHint/JSLint options
//
// lab/models/energy2d/engines/heat-solver.js
//
var RELAXATION_STEPS = 5,
    Boundary_UPPER = 0,
    Boundary_RIGHT = 1,
    Boundary_LOWER = 2,
    Boundary_LEFT = 3,
    
    
    // TODO: remove it, use array module!
    createArray = function (size, fill) {
      size = size || ARRAY_SIZE;
      fill = fill || 0;
      var a = new Array(size);
      
      if (a[size-1] == fill) {
          return a;
      } else {
          for (var i = 0; i < size; i++) {
              a[i] = fill;
          }
      } 
      return a;
    },
    
    copyArray = function (destination, source) {
        var source_length = source.length;
        for (var i = 0; i < source_length; i++) {
            destination[i] = source[i];
        }
    };
    

exports.makeHeatSolver = function(dimx, dimy) {
  var nx = dimx,
      ny = dimy,
      nx1 = nx - 1,
      ny1 = ny - 1,
      nx2 = nx - 2,
      ny2 = ny - 2,
      
      relaxationSteps = RELAXATION_STEPS,
      // internal array that stores the previous temperature results
      t0 = createArray(nx * ny, 0),
      
      // following params have to be set by core model
      timeStep,      
      boundary,
      // external arrays
      conductivity,
      capacity,
      density,
      u,
      v,
      tb,
      q,
      fluidity,
      //
      deltaX,
      deltaY,
      
      //
      // Private methods
      //
      macCormack  = function(t) {
        var tx = 0.5 * timeStep / deltaX;
        var ty = 0.5 * timeStep / deltaY;
        
        var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;
    
        for (var i = 1; i < nx1; i++) {
            inx = i * nx;
            inx_minus_nx = inx - nx;
            for (var j = 1; j < ny1; j++) {
                jinx = inx + j;
                jinx_minus_nx = jinx - nx;
                jinx_plus_nx = jinx + nx;
                jinx_minus_1 = jinx - 1;
                jinx_plus_1 = jinx + 1;
                if (fluidity[jinx]) {
                    t0[jinx] = t[jinx] - tx
                    * (u[jinx_plus_nx] * t[jinx_plus_nx] - u[jinx_minus_nx] * t[jinx_minus_nx]) - ty
                    * (v[jinx_plus_1] * t[jinx_plus_1] - v[jinx_minus_1] * t[jinx_minus_1]);
                }
            }
        }
        applyBoundary(t0);
    
        for (var i = 1; i < nx1; i++) {
            inx = i * nx;
            for (var j = 1; j < ny1; j++) {
                jinx = inx + j;
                if (fluidity[jinx]) {
                    jinx_minus_nx = jinx - nx;
                    jinx_plus_nx = jinx + nx;
                    jinx_minus_1 = jinx - 1;
                    jinx_plus_1 = jinx + 1;
                    
                    t[jinx] = 0.5 * (t[jinx] + t0[jinx]) - 0.5 * tx * u[jinx]
                    * (t0[jinx_plus_nx] - t0[jinx_minus_nx]) - 0.5 * ty * v[jinx]
                    * (t0[jinx_plus_1] - t0[jinx_minus_1]);
                }
            }
        }
        applyBoundary(t);
      },
      
      applyBoundary  = function(t) {
        var b = boundary;
        var tN, tS, tW, tE;
        var inx;
        if (b instanceof DirichletHeatBoundary) {
            tN = b.getTemperatureAtBorder(Boundary_UPPER);
            tS = b.getTemperatureAtBorder(Boundary_LOWER);
            tW = b.getTemperatureAtBorder(Boundary_LEFT);
            tE = b.getTemperatureAtBorder(Boundary_RIGHT);
            for (var i = 0; i < nx; i++) {
                inx = i * nx;
                t[inx] = tN;
                t[inx + ny1] = tS;
            }
            for (var j = 0; j <  ny; j++) {
                t[j] = tW;
                t[nx1 * nx + j] = tE;
            }
        } else if (b instanceof NeumannHeatBoundary) {
            fN = b.getFluxAtBorder(Boundary_UPPER);
            fS = b.getFluxAtBorder(Boundary_LOWER);
            fW = b.getFluxAtBorder(Boundary_LEFT);
            fE = b.getFluxAtBorder(Boundary_RIGHT);
            for (var i = 0; i < nx; i++) {
                inx = i * nx;
                inx_ny1 = inx + ny1;
                t[inx] = t[inx + 1] + fN * deltaY / conductivity[inx];
                t[inx_ny1] = t[inx + ny2] - fS * deltaY / conductivity[inx_ny1];
            }
            for (var j = 0; j < ny; j++) {
                t[j] = t[nx + j] - fW * deltaX / conductivity[j];
                t[nx1 * nx + j] = t[nx2 * nx + j] + fE * deltaX / conductivity[nx1 * nx + j];
            }
        }
      };
      
  return {
    
    solve: function(convective, t, q) {
      copyArray(t0, t);
           
      var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;
      
         
      var hx = 0.5 / (deltaX * deltaX);
      var hy = 0.5 / (deltaY * deltaY);
      var rij, sij, axij, bxij, ayij, byij;
      var invTimeStep = 1.0 / timeStep;
  
      for (var k = 0; k < relaxationSteps; k++) {
        for (var i = 1; i < nx1; i++) {
          inx = i * nx;
          for (var j = 1; j < ny1; j++) {
            jinx = inx + j;
            if (isNaN(tb[jinx])) {
              jinx_minus_nx = jinx - nx;
              jinx_plus_nx = jinx + nx;
              jinx_minus_1 = jinx - 1;
              jinx_plus_1 = jinx + 1;

              sij = capacity[jinx] * density[jinx] * invTimeStep;
              rij = conductivity[jinx];
              axij = hx * (rij + conductivity[jinx_minus_nx]);
              bxij = hx * (rij + conductivity[jinx_plus_nx]);
              ayij = hy * (rij + conductivity[jinx_minus_1]);
              byij = hy * (rij + conductivity[jinx_plus_1]);
              t[jinx] = (t0[jinx] * sij + q[jinx] + axij * t[jinx_minus_nx] + bxij
                        * t[jinx_plus_nx] + ayij * t[jinx_minus_1] + byij * t[jinx_plus_1]) /
                        (sij + axij + bxij + ayij + byij);
            } else {
              t[jinx] = tb[jinx];
            }
          }
        }
        applyBoundary(t);
      }
      if (convective) {
        // advect(t)
        macCormack(t);
      }
    },
    
    // setters
    setTimeStep: function (v) {
      timeStep = v;
    },
    setConductivity: function (a) {
      conductivity = a;
    },
    setCapacity: function (a) {
      capacity = a;
    },
    setDensity: function (a) {
      density = a;
    },
    setPower: function (a) {
      q = a;
    },
    setU: function (a) {
      u = a;
    },
    setV: function (a) {
      v = a;
    },
    setTb: function (a) {
      tb = a;
    },
    setFluidity: function (a) {
      fluidity = a;
    },
    setBoundarySettings: function (b) {
      if (b.temperature_at_border)
        boundary = new DirichletHeatBoundary(b);
      else
        boundary = new NeumannHeatBoundary(b);
    },
    setGridCellSize: function (dx, dy) {
      deltaX = dx;
      deltaY = dy;
    }
  };
};

// TODO: reorganize boundary settings classes 
function DirichletHeatBoundary(boundary_settings) {
    // by default all temperatures are zero
    var settings;
    if (boundary_settings) {
        settings = boundary_settings.temperature_at_border;
    } else {
        settings = { upper: 0, lower: 0, left: 0, right: 0 };
    }
    this.temperature_at_border = createArray(4, 0); // unit: centigrade
    this.setTemperatureAtBorder(Boundary_UPPER, settings.upper);
    this.setTemperatureAtBorder(Boundary_LOWER, settings.lower);
    this.setTemperatureAtBorder(Boundary_LEFT, settings.left);
    this.setTemperatureAtBorder(Boundary_RIGHT, settings.right);
};

DirichletHeatBoundary.prototype.getTemperatureAtBorder  = function(side) {
    if (side < Boundary_UPPER || side > Boundary_LEFT)
        throw new Error("DirichletHeatBoundary: side parameter illegal.");
    return this.temperature_at_border[side];
};

DirichletHeatBoundary.prototype.setTemperatureAtBorder  = function(side, value) {
    if (side < Boundary_UPPER || side > Boundary_LEFT)
        throw new Error("DirichletHeatBoundary: side parameter illegal.");
    this.temperature_at_border[side] = value;
};


function NeumannHeatBoundary(boundary_settings) {
    var settings;
    if (boundary_settings) {
        settings = boundary_settings.flux_at_border;
    } else {
        settings = { upper: 0, lower: 0, left: 0, right: 0 };
    }
    this.flux_at_border = createArray(4, 0); // heat flux: unit w/m^2
    this.setFluxAtBorder(Boundary_UPPER, settings.upper);
    this.setFluxAtBorder(Boundary_LOWER, settings.lower);
    this.setFluxAtBorder(Boundary_LEFT, settings.left);
    this.setFluxAtBorder(Boundary_RIGHT, settings.right);
};

NeumannHeatBoundary.prototype.getFluxAtBorder  = function(side) {
    if (side < Boundary_UPPER || side > Boundary_LEFT)
        throw new Error ("NeumannHeatBoundary: side parameter illegal.");
    return this.flux_at_border[side];
};

NeumannHeatBoundary.prototype.setFluxAtBorder  = function(side, value) {
    if (side < Boundary_UPPER || side > Boundary_LEFT)
        throw new Error ("NeumannHeatBoundary: side parameter illegal.");
    this.flux_at_border[side] = value;
};
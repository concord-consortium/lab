/*jslint indent: false */
// TODO: set JSHint/JSLint options
//
// lab/models/energy2d/engines/fluid-solver.js
//
var RELAXATION_STEPS = 5,
    GRAVITY = 0;
    
    
exports.makeFluidSolver = function (dimx, dimy) {
  var nx = dimx,
      ny = dimy,
      nx1 = nx - 1,
      ny1 = ny - 1,
      nx2 = nx - 2,
      ny2 = ny - 2,

      relaxationSteps = RELAXATION_STEPS,
      gravity = GRAVITY,
      
      // following params have to be set by core model  
      deltaX,
      deltaY,
      i2dx,
      i2dy,
      idxsq,
      idysq,

      timeStep,
      thermalBuoyancy,
      buoyancyApproximation,
      viscosity,

      t,
      fluidity,
      uWind,
      vWind,
      
      u0 = createArray(nx * ny, 0),
      v0 = createArray(nx * ny, 0),
      vorticity = createArray(nx * ny, 0),
      stream = createArray(nx * ny, 0),
      
      // 
      // Private methods
      //
      
      // b == 1 horizontal; b == 2 vertical 
      applyBoundary = function (b, f) {
        var horizontal = b == 1;
        var vertical = b == 2;
        
        var inx;
    
        var inx_plus1, inx_plus_ny1, inx_plus_ny2;
        var nx_plusj;
        var nx1nx, nx2nx;
        
        nx1nx = nx1 * nx;
        nx2nx = nx2 * nx;
        
        for (var i = 1; i < nx1; i++) {
          inx = i * nx;
          inx_plus1 = inx + 1;
          inx_plus_ny1 = inx + ny1;
          inx_plus_ny2 = inx + ny2;
          // upper side
          f[inx] = vertical ? -f[inx_plus1] : f[inx_plus1];
          // lower side
          f[inx_plus_ny1] = vertical ? -f[inx_plus_ny2] : f[inx_plus_ny2];
        }
        for (var j = 1; j < ny1; j++) {
          // left side
          nx_plusj = nx + j;
          f[j] = horizontal ? -f[nx_plusj] : f[nx_plusj];
          // right side
          f[nx1nx + j] = horizontal ? -f[nx2nx + j] : f[nx2nx + j];
        }
        
        // upper-left corner
        f[0] = 0.5 * (f[nx] + f[1]);
        // upper-right corner
        f[nx1nx] = 0.5 * (f[nx2nx] + f[nx1nx + 1]);
        // lower-left corner
        f[ny1] = 0.5 * (f[nx + ny1] + f[ny2]);
        // lower-right corner
        f[nx1nx + ny1] = 0.5 * (f[nx2nx + ny1] + f[nx1nx + ny2]);
      };
    
  return {
    // TODO: swap the two arrays instead of copying them every time?
    solve: function(u, v) {
    if (thermalBuoyancy !== 0) {
        applyBuoyancy(v);
    }
    setObstacleVelocity(u, v);
    if (viscosity > 0) { // inviscid case
      diffuse(1, u0, u);
      diffuse(2, v0, v);
      conserve(u, v, u0, v0);
      setObstacleVelocity(u, v);
    }
    
      copyArray(u0, u);
      copyArray(v0, v);
      advect(1, u0, u);
      advect(2, v0, v);
      conserve(u, v, u0, v0);
      setObstacleVelocity(u, v); 
    },

    // setters
    setTimeStep: function (v) {
      timeStep = v;
    },
    setThermalBuoyancy: function (v) {
      thermalBuoyancy = v;
    },
    setBuoyancyApproximation: function (v) {
      buoyancyApproximation = v;
    },
    setViscosity: function (v) {
      viscosity = v;
    },
    setTemperature: function (a) {
      t = a;
    },
    setFluidity: function (a) {
      fluidity = a;
    },
    setUWind: function (a) {
      uWind = a;  
    },
    setVWind: function (a) {
      vWind = a;
    },
    setGridCellSize: function(dx, dy) {
      deltaX = dx;
      deltaY = dy;
      i2dx = 0.5 / deltaX;
      i2dy = 0.5 / deltaY;
      idxsq = 1.0 / (deltaX * deltaX);
      idysq = 1.0 / (deltaY * deltaY);
    }
  };
};


// *******************************************************
//
//   FluidSolver2D
//
// *******************************************************


/* b=1 horizontal; b=2 vertical */
// int b, float[][] f
model2d.FluidSolver2D.prototype.applyBoundary = function(b, f) {
    var horizontal = b == 1;
    var vertical = b == 2;
    
    var nx = this.nx;
    var nx1 = this.nx1;
    var ny1 = this.ny1;
    var nx2 = this.nx2;
    var ny2 = this.ny2;

    var inx;

    var inx_plus1, inx_plus_ny1, inx_plus_ny2;
    var nx_plusj;
    var nx1nx, nx2nx;
    
    nx1nx = nx1 * nx;
    nx2nx = nx2 * nx;
    
    for (var i = 1; i < nx1; i++) {
        inx = i * nx;
        inx_plus1 = inx + 1;
        inx_plus_ny1 = inx + ny1;
        inx_plus_ny2 = inx + ny2;
        // upper side
        f[inx] = vertical ? -f[inx_plus1] : f[inx_plus1];
        // lower side
        f[inx_plus_ny1] = vertical ? -f[inx_plus_ny2] : f[inx_plus_ny2];
    }
    for (var j = 1; j < ny1; j++) {
        // left side
        nx_plusj = nx + j;
        f[j] = horizontal ? -f[nx_plusj] : f[nx_plusj];
        // right side
        f[nx1nx + j] = horizontal ? -f[nx2nx + j] : f[nx2nx + j];
    }
    
    // upper-left corner
    f[0] = 0.5 * (f[nx] + f[1]);
    // upper-right corner
    f[nx1nx] = 0.5 * (f[nx2nx] + f[nx1nx + 1]);
    // lower-left corner
    f[ny1] = 0.5 * (f[nx + ny1] + f[ny2]);
    // lower-right corner
    f[nx1nx + ny1] = 0.5 * (f[nx2nx + ny1] + f[nx1nx + ny2]);
};

// float[][] u, float[][] v
model2d.FluidSolver2D.prototype.setObstacleVelocity = function(u, v) {
    var count = 0;
    var uw, vw;
    
    var nx = this.nx;
    var nx1 = this.nx1;
    var ny1 = this.ny1;

    var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

    var fluidity = this.fluidity;
    var uWind = this.uWind;
    var vWind = this.vWind;

    for (var i = 1; i < nx1; i++) {
        inx = i * nx;
        for (var j = 1; j < ny1; j++) {
            jinx = inx + j;
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;
            
            if (!fluidity[jinx]) {
                uw = uWind[jinx];
                vw = vWind[jinx];
                count = 0;
                if (fluidity[jinx_minus_nx]) {
                    count++;
                    u[jinx] = uw - u[jinx_minus_nx];
                    v[jinx] = vw + v[jinx_minus_nx];
                } else if (fluidity[jinx_plus_nx]) {
                    count++;
                    u[jinx] = uw - u[jinx_plus_nx];
                    v[jinx] = vw + v[jinx_plus_nx];
                }
                if (fluidity[jinx_minus_1]) {
                    count++;
                    u[jinx] = uw + u[jinx_minus_1];
                    v[jinx] = vw - v[jinx_minus_1];
                } else if (fluidity[jinx_plus_1]) {
                    count++;
                    u[jinx] = uw + u[jinx_plus_1];
                    v[jinx] = vw - v[jinx_plus_1];
                }
                if (count == 0) {
                    u[jinx] = uw;
                    v[jinx] = vw;
                }
            }
        }
    }
};

// ensure dx/dn = 0 at the boundary (the Neumann boundary condition)
// float[][] x
model2d.FluidSolver2D.prototype.setObstacleBoundary = function(x) {
    
    var nx = this.nx;
    var nx1 = this.nx1;
    var ny1 = this.ny1;
    
    var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

    var fluidity = this.fluidity;
    
    for (var i = 1; i < nx1; i++) {
        inx = i * nx;
        for (var j = 1; j < ny1; j++) {
            jinx = inx + j;
            if (!fluidity[jinx]) {
                
                jinx_minus_nx = jinx - nx;
                jinx_plus_nx = jinx + nx;
                jinx_minus_1 = jinx - 1;
                jinx_plus_1 = jinx + 1;
                
                if (fluidity[jinx_minus_nx]) {
                    x[jinx] = x[jinx_minus_nx];
                } else if (fluidity[jinx_plus_nx]) {
                    x[jinx] = x[jinx_plus_nx];
                }
                if (fluidity[jinx_minus_1]) {
                    x[jinx] = x[jinx_minus_1];
                } else if (fluidity[jinx_plus_1]) {
                    x[jinx] = x[jinx_plus_1];
                }
            }
        }
    }
};

// int i, int j
model2d.FluidSolver2D.prototype.getMeanTemperature = function(i, j) {
    var lowerBound = 0;
    var upperBound = this.ny;
    var t0 = 0;
    
    var nx = this.nx;
    var ny = this.ny;
    
    var inx_plus_k;
    
    var fluidity = this.fluidity;
    var t = this.t;
    
    // search for the upper bound
    for (var k = j - 1; k > 0; k--) {
        inx_plus_k = i * nx + k;
        if (!fluidity[inx_plus_k]) {
            lowerBound = k;
            break;
        }
    }

    for (var k = j + 1; k < ny; k++) {
        inx_plus_k = i * nx + k;
        if (!fluidity[inx_plus_k]) {
            upperBound = k;
            break;
        }
    }

    for (var k = lowerBound; k < upperBound; k++) {
        inx_plus_k = i * nx + k;
        t0 += t[inx_plus_k];
    }
    return t0 / (upperBound - lowerBound);
};

// float[][] f
model2d.FluidSolver2D.prototype.applyBuoyancy = function(f) {
    var g = this.gravity * this.timeStep;
    var b = this.thermalBuoyancy * this.timeStep;
    var t0;
    
    var nx = this.nx;
    var nx1 = this.nx1;
    var ny1 = this.ny1;

    var fluidity = this.fluidity;
    var t = this.t;

    var inx, jinx;
    
    switch (this.buoyancyApproximation) {
    case model2d.BUOYANCY_AVERAGE_ALL:
        t0 = model2d.getAverage(t);
        for (var i = 1; i < nx1; i++) {
            inx = i * nx;
            for (var j = 1; j < ny1; j++) {
                jinx = inx + j;
                if (fluidity[jinx]) {
                    f[jinx] += (g - b) * t[jinx] + b * t0;
                }
            }
        }
        break;
    case model2d.BUOYANCY_AVERAGE_COLUMN:
        for (var i = 1; i < nx1; i++) {
            inx = i * nx;
            for (var j = 1; j < ny1; j++) {
                jinx = inx + j;
                if (fluidity[jinx]) {
                    t0 = this.getMeanTemperature(i, j);
                    f[jinx] += (g - b) * t[jinx] + b * t0;
                }
            }
        }
        break;
    }
};

/*
 * enforce the continuity condition div(V)=0 (velocity field must be
 * divergence-free to conserve mass) using the relaxation method:
 * http://en.wikipedia.org/wiki/Relaxation_method. This procedure solves the
 * Poisson equation.
 */
// float[][] u, float[][] v, float[][] phi, float[][] div
model2d.FluidSolver2D.prototype.conserve = function(u, v, phi, div) {

    var nx = this.nx;
    var nx1 = this.nx1;
    var ny1 = this.ny1;

    var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

    var idxsq = this.idxsq;
    var idysq = this.idysq;

    var i2dx = this.i2dx;
    var i2dy = this.i2dy;

    var fluidity = this.fluidity;

    for (var i = 1; i < nx1; i++) {
        inx = i * nx;
        for (var j = 1; j < ny1; j++) {
            jinx = inx + j;
            if (fluidity[jinx]) {

                jinx_minus_nx = jinx - nx;
                jinx_plus_nx = jinx + nx;
                jinx_minus_1 = jinx - 1;
                jinx_plus_1 = jinx + 1;
                
                div[jinx] = (u[jinx_plus_nx] - u[jinx_minus_nx]) * i2dx + (v[jinx_plus_1] - v[jinx_minus_1])
                        * i2dy;
                phi[jinx] = 0;
            }
        }
    }
    this.applyBoundary(0, div);
    this.applyBoundary(0, phi);
    this.setObstacleBoundary(div);
    this.setObstacleBoundary(phi);

    var s = 0.5 / (idxsq + idysq);

    for (var k = 0; k < this.relaxationSteps; k++) {
        for (var i = 1; i < nx1; i++) {
            inx = i * nx;
            for (var j = 1; j < ny1; j++) {
                jinx = inx + j;
                if (fluidity[jinx]) {
                    
                    jinx_minus_nx = jinx - nx;
                    jinx_plus_nx = jinx + nx;
                    jinx_minus_1 = jinx - 1;
                    jinx_plus_1 = jinx + 1;
                    
                    phi[jinx] = s
                            * ((phi[jinx_minus_nx] + phi[jinx_plus_nx]) * idxsq
                                    + (phi[jinx_minus_1] + phi[jinx_plus_1]) * idysq - div[jinx]);
                }
            }
        }
    }

    for (var i = 1; i < nx1; i++) {
        inx = i * nx;
        for (var j = 1; j < ny1; j++) {
            jinx = inx + j;
            if (fluidity[jinx]) {
                
                jinx_minus_nx = jinx - nx;
                jinx_plus_nx = jinx + nx;
                jinx_minus_1 = jinx - 1;
                jinx_plus_1 = jinx + 1;
                
                u[jinx] -= (phi[jinx_plus_nx] - phi[jinx_minus_nx]) * i2dx;
                v[jinx] -= (phi[jinx_plus_1] - phi[jinx_minus_1]) * i2dy;
            }
        }
    }
    this.applyBoundary(1, u);
    this.applyBoundary(2, v);
};

// float[][] u, float[][] v
// return float[][]
model2d.FluidSolver2D.prototype.getStreamFunction = function(u, v) {

    // if (vorticity == null)
    //     vorticity = new float[nx][ny];
    // if (stream == null)
    //     stream = new float[nx][ny];

    calculateVorticity(u, v);
    calculateStreamFunction();
    return this.stream;
};

model2d.FluidSolver2D.prototype.calculateStreamFunction = function() {
    var s = 0.5 / (this.idxsq + this.idysq);

    var nx = this.nx;
    var nx1 = this.nx1;
    var ny1 = this.ny1;

    var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

    var fluidity = this.fluidity;
    var vorticity = this.vorticity;

    for (var i = 0; i < nx; i++) {
        stream[i] = 0;
    }
    for (var k = 0; k < this.relaxationSteps; k++) {
        for (var i = 1; i < nx1; i++) {
            inx = i * nx;
            for (var j = 1; j < ny1; j++) {
                jinx = inx + j;
                if (fluidity[jinx]) {
                    
                    jinx_minus_nx = jinx - nx;
                    jinx_plus_nx = jinx + nx;
                    jinx_minus_1 = jinx - 1;
                    jinx_plus_1 = jinx + 1;

                    stream[jinx] = s
                            * ((stream[jinx_minus_nx] + stream[jinx_plus_nx]) * idxsq
                                    + (stream[jinx_minus_1] + stream[jinx_plus_1]) * idysq + vorticity[jinx]);
                }
            }
        }
        this.applyBoundary(0, stream);
        this.setObstacleBoundary(stream);
    }
};

// float[][] u, float[][] v
model2d.FluidSolver2D.prototype.calculateVorticity = function(u, v) {
    var du_dy, dv_dx;
    
    var nx = this.nx;
    var nx1 = this.nx1;
    var ny1 = this.ny1;

    var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

    var deltaX2 = 2 * this.deltaX;
    var deltaY2 = 2 * this.deltaY;
    
    var fluidity = this.fluidity;
    var vorticity = this.vorticity;
    
    for (var i = 1; i < nx1; i++) {
        inx = i * nx;
        for (var j = 1; j < ny1; j++) {
            jinx = inx + j;
            if (fluidity[jinx]) {

                jinx_minus_nx = jinx - nx;
                jinx_plus_nx = jinx + nx;
                jinx_minus_1 = jinx - 1;
                jinx_plus_1 = jinx + 1;

                du_dy = (u[jinx_plus_1] - u[jinx_minus_1]) / deltaY2;
                dv_dx = (v[jinx_plus_nx] - v[jinx_minus_nx]) / deltaX2;
                vorticity[jinx] = du_dy - dv_dx;
            }
        }
    }
    this.applyBoundary(0, vorticity);
    this.setObstacleBoundary(vorticity);
};


// int b, float[][] f0, float[][] f
model2d.FluidSolver2D.prototype.diffuse = function(b, f0, f) {
    model2d.copyArray(f0, f);

    var hx = this.timeStep * this.viscosity * this.idxsq;
    var hy = this.timeStep * this.viscosity * this.idysq;
    var dn = 1.0 / (1 + 2 * (hx + hy));

    var fluidity = this.fluidity;

    var nx = this.nx;
    var nx1 = this.nx1;
    var ny1 = this.ny1;

    var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

    for (var k = 0; k < this.relaxationSteps; k++) {
        for (var i = 1; i < nx1; i++) {
            inx = i * nx;
            for (var j = 1; j < ny1; j++) {
                jinx = inx + j;
                if (fluidity[jinx]) {
                    
                    jinx_minus_nx = jinx - nx;
                    jinx_plus_nx = jinx + nx;
                    jinx_minus_1 = jinx - 1;
                    jinx_plus_1 = jinx + 1;
                    
                    f[jinx] = (f0[jinx] + hx * (f[jinx_minus_nx] + f[jinx_plus_nx]) + hy
                            * (f[jinx_minus_1] + f[jinx_plus_1]))
                            * dn;
                }
            }
        }
        this.applyBoundary(b, f);
    }

};

// int b, float[][] f0, float[][] f
model2d.FluidSolver2D.prototype.advect = function(b, f0, f) {
    this.macCormack(b, f0, f);
};

// MacCormack
// int b, float[][] f0, float[][] f
model2d.FluidSolver2D.prototype.macCormack = function(b, f0, f) {

    var tx = 0.5 * this.timeStep / this.deltaX;
    var ty = 0.5 * this.timeStep / this.deltaY;

    var nx = this.nx;
    var nx1 = this.nx1;
    var ny1 = this.ny1;

    var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

    var fluidity = this.fluidity;
    var u0 = this.u0;
    var v0 = this.v0;

    for (var i = 1; i < nx1; i++) {
        inx = i * nx;
        for (var j = 1; j < ny1; j++) {
            jinx = inx + j;
            if (fluidity[jinx]) {
                
                jinx_minus_nx = jinx - nx;
                jinx_plus_nx = jinx + nx;
                jinx_minus_1 = jinx - 1;
                jinx_plus_1 = jinx + 1;
                
                f[jinx] = f0[jinx]
                        - tx
                        * (u0[jinx_plus_nx] * f0[jinx_plus_nx] - u0[jinx_minus_nx]
                                * f0[jinx_minus_nx])
                        - ty
                        * (v0[jinx_plus_1] * f0[jinx_plus_1] - v0[jinx_minus_1]
                                * f0[jinx_minus_1]);
            }
        }
    }

    this.applyBoundary(b, f);

    for (var i = 1; i < nx1; i++) {
        inx = i * nx;
        for (var j = 1; j < ny1; j++) {
            jinx = inx + j;
            if (fluidity[jinx]) {
                
                jinx_minus_nx = jinx - nx;
                jinx_plus_nx = jinx + nx;
                jinx_minus_1 = jinx - 1;
                jinx_plus_1 = jinx + 1;
                
                f0[jinx] = 0.5 * (f0[jinx] + f[jinx]) - 0.5 * tx
                        * u0[jinx] * (f[jinx_plus_nx] - f[jinx_minus_nx]) - 0.5
                        * ty * v0[jinx] * (f[jinx_plus_1] - f[jinx_minus_1]);
            }
        }
    }

    model2d.copyArray(f, f0);

    this.applyBoundary(b, f);
};
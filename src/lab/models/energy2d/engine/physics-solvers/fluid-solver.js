/*jslint indent: false */
// TODO: set JSHint/JSLint options
//
// lab/models/energy2d/engines/fluid-solver.js
//
var arrays = require('../arrays/arrays.js').arrays,

    RELAXATION_STEPS = 5,
    GRAVITY = 0,
    
    BUOYANCY_AVERAGE_ALL = 0,
    BUOYANCY_AVERAGE_COLUMN = 1;
    
    
exports.makeFluidSolver = function (model) {
  var nx = model.getGridWidth(),
      ny = model.getGridHeight(),
  
      // Basic simulation parameters.
      model_options         = model.getModelOptions(),
      timeStep              = model_options.timestep,
      thermalBuoyancy       = model_options.thermal_buoyancy,
      buoyancyApproximation = model_options.buoyancy_approximation,
      viscosity             = model_options.background_viscosity,
      
      deltaX = model_options.model_width / model.getGridWidth(),
      deltaY = model_options.model_height / model.getGridHeight(),
      
      relaxationSteps = RELAXATION_STEPS,
      gravity = GRAVITY,
           
      // Simulation arrays provided by model.
      t        = model.getTemperatureArray(),
      fluidity = model.getFluidityArray(),
      uWind    = model.getUWindArray(),
      vWind    = model.getVWindArray(),
      
      // Internal simulation arrays.
      array_type = model.getArrayType(),
      u0         = arrays.create(nx * ny, 0, array_type),
      v0         = arrays.create(nx * ny, 0, array_type),
      
      // Convenience variables.   
      i2dx  = 0.5 / deltaX,
      i2dy  = 0.5 / deltaY,
      idxsq = 1.0 / (deltaX * deltaX),
      idysq = 1.0 / (deltaY * deltaY),
      
      nx1 = nx - 1,
      ny1 = ny - 1,
      nx2 = nx - 2,
      ny2 = ny - 2,
      
      // 
      // Private methods
      //
      
      // TODO: Formatting, functions organization!
      
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
      },
      
      setObstacleVelocity = function(u, v) {
        var count = 0;
        var uw, vw;
        
        var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;
    
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
        },
        
        
      // ensure dx/dn = 0 at the boundary (the Neumann boundary condition)
      // float[][] x
      setObstacleBoundary = function(x) {
        var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;
        
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
    },
    
      getMeanTemperature = function(i, j) {
        var lowerBound = 0;
        var upperBound = ny;
        var t0 = 0;
        
        
        var inx_plus_k;
        
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
      },
      
      applyBuoyancy = function(f) {
        var g = gravity * timeStep;
        var b = thermalBuoyancy * timeStep;
        var t0;
    
        var inx, jinx;
        
        switch (buoyancyApproximation) {
        case BUOYANCY_AVERAGE_ALL:
            t0 = getAverage(t);
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
        case BUOYANCY_AVERAGE_COLUMN:
            for (var i = 1; i < nx1; i++) {
                inx = i * nx;
                for (var j = 1; j < ny1; j++) {
                    jinx = inx + j;
                    if (fluidity[jinx]) {
                        t0 = getMeanTemperature(i, j);
                        f[jinx] += (g - b) * t[jinx] + b * t0;
                    }
                }
            }
            break;
        }
    },
    
    conserve = function(u, v, phi, div) {
      var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;
    
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
      applyBoundary(0, div);
      applyBoundary(0, phi);
      setObstacleBoundary(div);
      setObstacleBoundary(phi);
  
      var s = 0.5 / (idxsq + idysq);
  
      for (var k = 0; k < relaxationSteps; k++) {
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
      applyBoundary(1, u);
      applyBoundary(2, v);
    },
    
    diffuse = function(b, f0, f) {
      arrays.copy(f, f0);
  
      var hx = timeStep * viscosity * idxsq;
      var hy = timeStep * viscosity * idysq;
      var dn = 1.0 / (1 + 2 * (hx + hy));
 
      var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;
  
      for (var k = 0; k < relaxationSteps; k++) {
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
          applyBoundary(b, f);
      }
    },
    
      advect = function(b, f0, f) {
        macCormack(b, f0, f);
      };

      // MacCormack
      macCormack = function(b, f0, f) {
      
          var tx = 0.5 * timeStep / deltaX;
          var ty = 0.5 * timeStep / deltaY;
      
          var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;
      
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
      
          applyBoundary(b, f);
      
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
      
          arrays.copy(f0, f);
      
          applyBoundary(b, f);
        };
        
  return {
    // TODO: swap the two arrays instead of copying them every time?
    solve: function(u, v) {
      if (thermalBuoyancy !== 0) {
        applyBuoyancy(v);
      }
      setObstacleVelocity(u, v);
      if (viscosity > 0) {  
        // inviscid case
        diffuse(1, u0, u);
        diffuse(2, v0, v);
        conserve(u, v, u0, v0);
        setObstacleVelocity(u, v);
      }
      arrays.copy(u, u0);
      arrays.copy(v, v0);
      advect(1, u0, u);
      advect(2, v0, v);
      conserve(u, v, u0, v0);
      setObstacleVelocity(u, v); 
    }
  };
};
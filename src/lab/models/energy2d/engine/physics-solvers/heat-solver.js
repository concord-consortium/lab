/*jslint indent: false */
// TODO: set JSHint/JSLint options
//
// lab/models/energy2d/engines/heat-solver.js
//

var arrays = require('../arrays/arrays.js').arrays,
    
    RELAXATION_STEPS = 5,
    Boundary_UPPER = 0,
    Boundary_RIGHT = 1,
    Boundary_LOWER = 2,
    Boundary_LEFT = 3;
    
  
exports.makeHeatSolver = function(model) {
  var nx = model.getGridWidth(),
      ny = model.getGridHeight(),
            
      // Basic simulation parameters.
      model_options = model.getModelOptions(),
      timeStep = model_options.timestep,      
      boundary = model_options.boundary,
      
      deltaX = model_options.model_width / model.getGridWidth(),
      deltaY = model_options.model_height / model.getGridHeight(),
      
      relaxationSteps = RELAXATION_STEPS,
                        
      // Simulation arrays provided by model.
      conductivity = model.getConductivityArray(),
      capacity     = model.getCapacityArray(),
      density      = model.getDensityArray(),
      u            = model.getUVelocityArray(),
      v            = model.getVVelocityArray(),
      tb           = model.getBoundaryTemperatureArray(),
      q            = model.getPowerArray(),
      fluidity     = model.getFluidityArray(),
      
      // Internal array that stores the previous temperature results.
      t0 = arrays.create(nx * ny, 0, model.getArrayType()),
      
      // Convenience variables.  
      nx1 = nx - 1,
      ny1 = ny - 1,
      nx2 = nx - 2,
      ny2 = ny - 2,     

      //
      // Private methods
      //
      macCormack  = function(t) {
        var tx = 0.5 * timeStep / deltaX,
            ty = 0.5 * timeStep / deltaY,
            i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;
    
        for (i = 1; i < nx1; i++) {
          inx = i * nx;
          inx_minus_nx = inx - nx;
          for (j = 1; j < ny1; j++) {
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
    
        for (i = 1; i < nx1; i++) {
          inx = i * nx;
          for (j = 1; j < ny1; j++) {
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
        var b = boundary,
            tN, tS, tW, tE,
            i, j, inx;
            
        if (b instanceof DirichletHeatBoundary) {
          tN = b.getTemperatureAtBorder(Boundary_UPPER);
          tS = b.getTemperatureAtBorder(Boundary_LOWER);
          tW = b.getTemperatureAtBorder(Boundary_LEFT);
          tE = b.getTemperatureAtBorder(Boundary_RIGHT);
          for (i = 0; i < nx; i++) {
            inx = i * nx;
            t[inx] = tN;
            t[inx + ny1] = tS;
          }
          for (j = 0; j <  ny; j++) {
            t[j] = tW;
            t[nx1 * nx + j] = tE;
          }
        } else if (b instanceof NeumannHeatBoundary) {
          fN = b.getFluxAtBorder(Boundary_UPPER);
          fS = b.getFluxAtBorder(Boundary_LOWER);
          fW = b.getFluxAtBorder(Boundary_LEFT);
          fE = b.getFluxAtBorder(Boundary_RIGHT);
          for (i = 0; i < nx; i++) {
            inx = i * nx;
            inx_ny1 = inx + ny1;
            t[inx] = t[inx + 1] + fN * deltaY / conductivity[inx];
            t[inx_ny1] = t[inx + ny2] - fS * deltaY / conductivity[inx_ny1];
          }
          for (j = 0; j < ny; j++) {
            t[j] = t[nx + j] - fW * deltaX / conductivity[j];
            t[nx1 * nx + j] = t[nx2 * nx + j] + fE * deltaX / conductivity[nx1 * nx + j];
          }
        }
      };
    
    
 return {
    solve: function(convective, t, q) {
      var rij, sij, axij, bxij, ayij, byij,
          hx = 0.5 / (deltaX * deltaX),
          hy = 0.5 / (deltaY * deltaY),
          invTimeStep = 1.0 / timeStep,
          k, i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;
  
      arrays.copy(t, t0);
      
      for (k = 0; k < relaxationSteps; k++) {
        for (i = 1; i < nx1; i++) {
          inx = i * nx;
          for (j = 1; j < ny1; j++) {
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
                        * t[jinx_plus_nx] + ayij * t[jinx_minus_1] + byij * t[jinx_plus_1]) 
                        / (sij + axij + bxij + ayij + byij);
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
    }
  };
};

// TODO: reorganize boundary settings classes 
function DirichletHeatBoundary(boundary_settings, array_type) {
    // by default all temperatures are zero
    var settings;
    if (boundary_settings) {
        settings = boundary_settings.temperature_at_border;
    } else {
        settings = { upper: 0, lower: 0, left: 0, right: 0 };
    }
    // unit: centigrade
    this.temperature_at_border = arrays.create(4, 0, array_type); 
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


function NeumannHeatBoundary(boundary_settings, array_type) {
    var settings;
    if (boundary_settings) {
        settings = boundary_settings.flux_at_border;
    } else {
        settings = { upper: 0, lower: 0, left: 0, right: 0 };
    }
    // heat flux unit: w/m^2
    this.flux_at_border = arrays.create(4, 0, array_type); 
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
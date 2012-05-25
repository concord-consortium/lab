//     model2d.js 0.1.0
//     (c) 2010 The Concord Consortium
//     created by Stephen Bannasch
//     model2d.js may be freely distributed under the LGPL license.

(function() {

var model2d = {};
var root = this;
model2d.VERSION = '0.1.0';

// Constants

model2d.AIR_THERMAL_CONDUCTIVITY = 0.025;       // Air's thermal conductivity = 0.025 W/(m*K)
model2d.AIR_SPECIFIC_HEAT = 1012;               // Air's specific heat = 1012 J/(kg*K)
model2d.AIR_DENSITY = 1.204;                    // Air's density = 1.204 kg/m^3 at 25 C


/*
 * By default, air's kinematic viscosity = 1.568 x 10^-5 m^2/s at 27 C is
 * used. It can be set to zero for inviscid fluid.
 */
model2d.AIR_VISCOSITY = 0.00001568;


model2d.BUOYANCY_AVERAGE_ALL = 0;
model2d.BUOYANCY_AVERAGE_COLUMN = 1;

model2d.Boundary_UPPER = 0;
model2d.Boundary_RIGHT = 1;
model2d.Boundary_LOWER = 2;
model2d.Boundary_LEFT = 3;

model2d.NX = 100;
model2d.NY = 100;
model2d.ARRAY_SIZE = model2d.NX * model2d.NY;

model2d.array_type = "regular";

function createArray(size, fill) {
    size = size || model2d.ARRAY_SIZE;
    fill = fill || 0;
    var a;
    if (model2d.array_type === "typed") {
        a = new Float64Array(size);
    } else {
        a = new Array(size);
    }
    if (a[size-1] == fill) {
        return a;
    } else {
        for (var i = 0; i < size; i++) {
            a[i] = fill;
        }
    } 
    return a;
}

model2d.default_config = {
    model:{
        timestep: 0.1,
        measurement_interval: 100,
        viewupdate_interval: 20,
        sunny: true,
        sun_angle: 1.5707964,
        solar_power_density: 20000,
        solar_ray_count: 24,
        solar_ray_speed: 0.001,
        photon_emission_interval: 5,
        convective: true,
        background_conductivity: 0.25,
        thermal_buoyancy: 0.00025,
        buoyancy_approximation: 1,
        background_density: 1,

        boundary:{
            flux_at_border:{
                upper: 0,
                lower: 0,
                left: 0,
                right: 0
            }
        },

        sensor:{
            thermometer:[
                {
                    x: 0.75,
                    y: 6
                },
                {
                    x: 1.75,
                    y: 6
                },
                {
                    x: 8,
                    y: 6
                }
            ]
        },

        structure:{
            part:[
                {
                    rectangle:{
                        x: 4.5,
                        y: 4.5,
                        width: 1,
                        height: 1
                    },
                    thermal_conductivity: 1,
                    specific_heat: 1300,
                    density: 25,
                    transmission: 0,
                    reflection: 0,
                    absorption: 1,
                    emissivity: 0,
                    temperature: 50,
                    constant_temperature: true,
                    filled: false
                }
            ]
        }
    },

    view:{
        minimum_temperature: 0,
        maximum_temperature: 50,
    }
};


model2d.Model2D = function(options, array_type) {

    if (!options) {
        options = model2d.default_config;
    };

    if (!options.model) {
        options.model = {};
    };

    if (!array_type) {
        array_type = "regular";
    };
    model2d.array_type = array_type;
    
    var opt = options.model;
    this.timeStep = opt.timestep != undefined ? opt.timestep : 0.1;
    this.measurementInterval = opt.measurement_interval != undefined ? opt.measurement_interval : 100;
    this.viewUpdateInterval = opt.view_update_interval != undefined ? opt.view_update_interval : 20;
    this.sunny = opt.sunny != undefined ? opt.sunny : true; 
    this.sun_angle = opt.sun_angle != undefined ? opt.sun_angle : 1.5707964;                
    this.solarPowerDensity = opt.solar_power_density != undefined ? opt.solar_power_density : 20000;
    this.solarRayCount = opt.solar_ray_count != undefined ? opt.solar_ray_count : 24;
    this.solarRaySpeed = opt.solar_ray_speed != undefined ? opt.solar_ray_speed : 0.001;
    this.photonEmissionInterval = opt.photon_emission_interval != undefined ? opt.photon_emission_interval : 5;
    this.convective = opt.convective != undefined ? opt.convective : true;
    this.thermalBuoyancy = opt.thermal_buoyancy != undefined ? opt.thermal_buoyancy : 0.00025;
    this.buoyancyApproximation = opt.buoyancy_approximation != undefined ? opt.buoyancy_approximation : 1;

    this.BUOYANCY_AVERAGE_ALL = 0;
    this.BUOYANCY_AVERAGE_COLUMN = 1;

    this.indexOfStep = 0;

    this.backgroundConductivity = opt.background_conductivity != undefined ? opt.background_conductivity : 10 * model2d.AIR_THERMAL_CONDUCTIVITY;
    this.backgroundViscosity = opt.background_viscosity != undefined ? opt.background_viscosity : 10 * model2d.AIR_VISCOSITY;
    this.backgroundSpecificHeat = opt.background_specific_heat != undefined ? opt.background_specific_heat : model2d.AIR_SPECIFIC_HEAT;
    this.backgroundDensity = opt.background_density != undefined ? opt.background_density : model2d.AIR_DENSITY;
    this.backgroundTemperature = opt.background_temperature != undefined ? opt.background_temperature : 0;

    this.boundary_settings = options.model.boundary || 
        { temperature_at_border: { upper: 0, lower: 0, left: 0, right: 0 } };

    if (options.model.structure && options.model.structure.part) {
        var parts_options = options.model.structure.part;
        if (parts_options.constructor != Array)
            parts_options = [parts_options];
        this.parts = new Array(parts_options.length);
        for (var i = 0; i < parts_options.length; i++)
            this.parts[i] = new model2d.Part(parts_options[i]);
    }

    this.nx = model2d.NX;
    this.ny = model2d.NY;
    this.nx1 = this.nx - 1;
    this.ny1 = this.ny - 1;
    

    // length in x direction (unit: meter)
    this.lx = opt.model_width != undefined ? opt.model_width : 10;

    // length in y direction (unit: meter)
    this.ly = opt.model_height != undefined ? opt.model_height : 10;

    this.deltaX = this.lx / this.nx;
    this.deltaY = this.ly / this.ny;

    // booleans
    this.running;
    this.notifyReset;

    // optimization flags (booleans)
    this.hasPartPower = false;
    this.radiative = false; // not fully implemented yet

    // temperature array
    
    this.t = createArray(model2d.ARRAY_SIZE, 0);
    // this.t = createArray(model2d.ARRAY_SIZE, 0);

    // internal temperature boundary array
    this.tb = createArray(model2d.ARRAY_SIZE, 0);

    for (var i = 0; i < model2d.ARRAY_SIZE; i++) {
        this.t[i] = this.backgroundTemperature;
        this.tb[i] = NaN;
    }
    
    // velocity x-component array (m/s)
    this.u = createArray(model2d.ARRAY_SIZE, 0);
    
    // velocity y-component array (m/s)
    this.v = createArray(model2d.ARRAY_SIZE, 0);

    // internal heat generation array
    this.q = createArray(model2d.ARRAY_SIZE, 0);
    
    // wind speed
    this.uWind = createArray(model2d.ARRAY_SIZE, 0);
    this.vWind = createArray(model2d.ARRAY_SIZE, 0);
    
    // conductivity array
    this.conductivity = createArray(model2d.ARRAY_SIZE, 0);
    for (var i = 0; i < model2d.ARRAY_SIZE; i++) {
        this.conductivity[i] = this.backgroundConductivity;
    }
    
    // specific heat capacity array
    this.capacity = createArray(model2d.ARRAY_SIZE, 0);
    for (var i = 0; i < model2d.ARRAY_SIZE; i++) {
        this.capacity[i] = this.backgroundSpecificHeat;
    }
    
    // density array
    this.density = createArray(model2d.ARRAY_SIZE, 0);
    for (var i = 0; i < model2d.ARRAY_SIZE; i++) {
        this.density[i] = this.backgroundDensity;
    }
    
    // fluid cell array
    this.fluidity = createArray(model2d.ARRAY_SIZE, 0);
    for (var i = 0; i < model2d.ARRAY_SIZE; i++) {
        this.fluidity[i] = true;
    }
    
    // Photons
    this.photons = [];

    this.heatSolver = new model2d.HeatSolver2D(this.nx, this.ny, this);
    this.heatSolver.timeStep = this.timeStep;
    this.heatSolver.capacity = this.capacity;
    this.heatSolver.conductivity = this.conductivity;
    this.heatSolver.density = this.density;
    this.heatSolver.power = this.q;
    this.heatSolver.u = this.u;
    this.heatSolver.v = this.v;
    this.heatSolver.tb = this.tb;
    this.heatSolver.fluidity = this.fluidity;
    
    this.fluidSolver = new model2d.FluidSolver2D(this.nx, this.ny, this);
    this.fluidSolver.timeStep = this.timeStep;
    this.fluidSolver.fluidity = this.fluidity;
    this.fluidSolver.t = this.t;
    this.fluidSolver.uWind = this.uWind;
    this.fluidSolver.vWind = this.vWind;

    this.raySolver = new model2d.RaySolver2D(this.lx, this.ly);
    this.raySolver.q = this.q;

    this.setGridCellSize();
    this.setupMaterialProperties();
};

model2d.Model2D.prototype.setupMaterialProperties = function() {
    if (!this.parts)
        return;
    
    var parts = this.parts;
    var t = this.t;
    var fluidity = this.fluidity;
    var conductivity = this.conductivity;
    var capacity = this.capacity;
    var density = this.density;
    var uWind = this.uWind;
    var vWind = this.vWind;
    var tb = this.tb;
    var q = this.q;
    
    var part, indexes, idx;
    // workaround, to treat overlapping parts as original Energy2D
    for (var i = parts.length - 1; i >= 0; i--) { 
        part = parts[i];
        indexes = this.getFieldsOccupiedByPart(part);
        for(var ii = 0; ii < indexes.length; ii++) {
            idx = indexes[ii];
            
            t[idx] = part.temperature;
            q[idx] = part.power;
            fluidity[idx] = false;
            conductivity[idx] = part.thermal_conductivity;
            capacity[idx] = part.specific_heat;
            density[idx] = part.density;
            
            if (part.wind_speed != 0) {
                uWind[idx] = part.wind_speed * Math.cos(part.wind_angle);
                vWind[idx] = part.wind_speed * Math.sin(part.wind_angle);
            }
            
            if (part.constant_temperature)
                tb[idx] = part.temperature;
        }
    }
};

// TODO: divide this function into smaller parts
model2d.Model2D.prototype.getFieldsOccupiedByPart = function(part) {
    var indexes;
    var ny = this.ny;
    var nx1 = this.nx1;
    var ny1 = this.ny1;
    var dx = nx1 / this.lx;
    var dy = ny1 / this.ly;
    
    if (part.rectangle) {
        var rect = part.rectangle;
        var i0 = Math.min(Math.max(Math.ceil(rect.x * dx), 0), nx1);
        var j0 = Math.min(Math.max(Math.ceil(rect.y * dy), 0), ny1);
        var i_max = Math.min(Math.max(Math.floor((rect.x + rect.width) * dx), 0), nx1);
        var j_max = Math.min(Math.max(Math.floor((rect.y + rect.height) * dy), 0), ny1);
        indexes = new Array((i_max - i0 + 1) * (j_max - j0 + 1));
        var idx = 0;
        for (var i = i0; i <= i_max; i++) {
            for (var j = j0; j <= j_max; j++) {
                indexes[idx++] = i * ny + j;
            }
        }
        return indexes;
    }
    
    if (part.ellipse) {
        var ellipse = part.ellipse;
        var px = ellipse.x * dx;
        var py = ellipse.y * dy;
        var ra = ellipse.a * 0.5 * dx;
        var rb = ellipse.b * 0.5 * dy;
        
        var i0 = Math.min(Math.max(Math.ceil(px - ra), 0), nx1);
        var i_max = Math.min(Math.max(Math.floor(px + ra), 0), nx1);
        var j0, j_max, eq;
        indexes = [];
        var idx = 0;
        for (var i = i0; i <= i_max; i++) {
            // solve equation x^2/a^2 + y^2/b^2 < 1 for given x (=> i)
            // to get range of y (=> j)
            eq = Math.sqrt(1 - (i - px)*(i - px)/(ra * ra));
            j0 = Math.min(Math.max(Math.ceil(py - rb * eq), 0), ny1);
            j_max = Math.min(Math.max(Math.floor(py + rb * eq), 0), ny1);
            for (var j = j0; j <= j_max; j++) {
                indexes[idx++] = i * ny + j;
            }
        }
        return indexes;
    }
    
    if (part.ring) {
        var ring = part.ring;
        var px = ring.x * dx;
        var py = ring.y * dy;
        var ra = ring.outer * 0.5 * dx;
        var rb = ring.outer * 0.5 * dy;
        var ra_inner = ring.inner * 0.5 * dx;
        var rb_inner = ring.inner * 0.5 * dy;
        
        var i0 = Math.min(Math.max(Math.ceil(px - ra), 0), nx1);
        var i_max = Math.min(Math.max(Math.floor(px + ra), 0), nx1);
        var j0, j1, j2, j_max, eq;
        indexes = [];
        var idx = 0;
        for (var i = i0; i <= i_max; i++) {
            // solve equation x^2/a^2 + y^2/b^2 < 1 for given x (=> i)
            // to get range of y (=> j)
            eq = Math.sqrt(1 - (i - px)*(i - px)/(ra * ra));
            j0 = Math.min(Math.max(Math.ceil(py - rb * eq), 0), ny1);
            j_max = Math.min(Math.max(Math.floor(py + rb * eq), 0), ny1);
            
            if (Math.abs(i - px) < ra_inner) {
                // also calculate inner ellipse
                eq = Math.sqrt(1 - (i - px)*(i - px)/(ra_inner * ra_inner));
                j1 = Math.min(Math.max(Math.ceil(py - rb_inner * eq), 0), ny1);
                j2 = Math.min(Math.max(Math.floor(py + rb_inner * eq), 0), ny1);
                for (var j = j0; j <= j1; j++)
                    indexes[idx++] = i * ny + j;  
                for (var j = j2; j <= j_max; j++)
                    indexes[idx++] = i * ny + j;
            } else {
                // consider only outer ellipse
                for (var j = j0; j <= j_max; j++) 
                    indexes[idx++] = i * ny + j;
            }
        }
        return indexes;
    }
    
    if (part.polygon) {
        var polygon = part.polygon;
        var count = polygon.count;
        var verts = polygon.vertices;
        var x_coords = new Array(count);
        var y_coords = new Array(count);
        var x_min = Number.MAX_VALUE, x_max = Number.MIN_VALUE; 
        var y_min = Number.MAX_VALUE, y_max = Number.MIN_VALUE;
        for (var i = 0; i < count; i++) {
            x_coords[i] = verts[i * 2] * dx;
            y_coords[i] = verts[i * 2 + 1] * dy;
            if (x_coords[i] < x_min)
                x_min = x_coords[i];
            if (x_coords[i] > x_max)
                x_max = x_coords[i];
            if (y_coords[i] < y_min)
                y_min = y_coords[i];
            if (y_coords[i] > y_max)
                y_max = y_coords[i];
        }
        
        var i0 = Math.min(Math.max(Math.round(x_min), 0), nx1);
        var j0 = Math.min(Math.max(Math.round(y_min), 0), ny1);
        var i_max = Math.min(Math.max(Math.round(x_max), 0), nx1);
        var j_max = Math.min(Math.max(Math.round(y_max), 0), ny1);
        indexes = [];
        var idx = 0;
        for (var i = i0; i <= i_max; i++) {
            for (var j = j0; j <= j_max; j++) {
                if (this.pointInsidePolygon(count, x_coords, y_coords, i, j)) {
                    indexes[idx++] = i * ny + j;
                }
            }
        }
        return indexes;
    }
    return [];
};

// TODO: move this function (e.g. to MathUtils) during refactoring 
// Based on: http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
// It is optional to repeat the first vertex at the end of list of polygon vertices.
model2d.Model2D.prototype.pointInsidePolygon = function(nvert, vertx, verty, testx, testy) {
    var i, j, c = 0;
    for (i = 0, j = nvert - 1; i < nvert; j = i++) {
        if (((verty[i]>testy) != (verty[j]>testy)) &&
            (testx < (vertx[j]-vertx[i]) * (testy-verty[i]) / (verty[j]-verty[i]) + vertx[i]))
            c = !c;
    }
    return c;
};

model2d.Model2D.prototype.reset = function() {
    var array_size = model2d.ARRAY_SIZE;
    for (var i = 0; i < array_size; i++) {
        
        for (var i = 0; i < model2d.ARRAY_SIZE; i++) {
            this.t[i] = this.backgroundTemperature;
            this.tb[i] = NaN;
        }

        // velocity x-component array (m/s)
        this.u[i] = 0;

        // velocity y-component array (m/s)
        this.v[i] = 0;

        // internal heat generation array
        this.q[i] = 0;

        // wind speed
        this.uWind[i] = 0;
        this.vWind[i] = 0;
        
        this.u0[i] = 0;
        this.v0[i] = 0;

        this.vorticity[i] = 0;
        this.stream[i] = 0;
    }
};

model2d.Model2D.prototype.setGridCellSize = function() {
    this.heatSolver.setGridCellSize(this.deltaX, this.deltaY);
    this.fluidSolver.setGridCellSize(this.deltaX, this.deltaY);
    this.raySolver.setGridCellSize(this.deltaX, this.deltaY);
};

model2d.Model2D.prototype.nextStep = function() {
    if (this.radiative) {
        if (this.indexOfStep % this.photonEmissionInterval == 0) {
            this.refreshPowerArray();
            if (this.sunny)
                this.raySolver.sunShine(this.photons, this.parts);
            this.raySolver.radiate(this);
        }
        this.raySolver.solve(this);
    }
    if (this.convective) {
        this.fluidSolver.solve(this.u, this.v);
    }
    this.heatSolver.solve(this.convective, this.t, this.q);
    // if (indexOfStep % measurementInterval == 0) {
    //     takeMeasurement();
    // }
    // if (indexOfStep % viewUpdateInterval == 0) {
    //     notifyVisualizationListeners();
    // }
    this.indexOfStep++;    
};

// boolean sunny
model2d.Model2D.prototype.setSunny = function(sunny) {
    this.sunny = sunny;
    if (sunny) {
        this.radiative = true;
    } else {
        this.photons = [];
    }
};

model2d.Model2D.prototype.refreshPowerArray = function() {
    var nx = this.nx;
    var ny = this.ny;
    
    var deltaX = this.deltaX;
    var deltaY = this.deltaY;

    var q = this.q;
    
    this.checkPartPower();

    for (var i = 0; i < nx; i++) {
        x = i * deltaX;
        inx = i * nx;
        for (var j = 0; j < ny; j++) {
            y = j * deltaY;
            
            jinx = inx + j;
            // jinx_minus_nx = jinx - nx;
            // jinx_plus_nx = jinx + nx;
            // jinx_minus_1 = jinx - 1;
            // jinx_plus_1 = jinx + 1;
            
            q[jinx] = 0;
            if (this.hasPartPower) {
                // synchronized (parts) {
                //     for (Part p : parts) {
                //         if (p.getPower() != 0 && p.getShape().contains(x, y)) {
                //             // no overlap of parts will be allowed
                //             q[i][j] = p.getPower();
                //             break;
                //         }
                //     }
                // }
            }
        }
    }
};

model2d.Model2D.prototype.refreshTemperatureBoundaryArray = function() {
    var nx = this.nx;
    var ny = this.ny;
    
    var inx, jinx;

    for (var i = 0; i < nx; i++) {
        inx = i * nx;
        x = i * deltaX;
        for (var j = 0; j < ny; j++) {
            
            jinx = inx + j;
            // jinx_minus_nx = jinx - nx;
            // jinx_plus_nx = jinx + nx;
            // jinx_minus_1 = jinx - 1;
            // jinx_plus_1 = jinx + 1;
            
            y = j * deltaY;
            tb[jinx] = Float.NaN;
            // synchronized (parts) {
            //     for (Part p : parts) {
            //         if (p.getConstantTemperature() && p.getShape().contains(x, y)) {
            //             tb[i][j] = p.getTemperature();
            //             break;
            //         }
            //     }
            // }
        }
    }
};


model2d.Model2D.prototype.reallyReset = function() {
    this.setInitialTemperature();
    this.setInitialVelocity();
    this.photons.clear();
    this.heatSolver.reset();
    this.fluidSolver.reset();
};

model2d.Model2D.prototype.checkPartPower = function() {
    this.hasPartPower = false;
    // synchronized (parts) {
    //     for (Part p : parts) {
    //         if (p.getPower() != 0) {
    //             hasPartPower = true;
    //             break;
    //         }
    //     }
    // }
};

model2d.Model2D.prototype.checkPartRadiation = function() {
    this.radiative = sunny;
    if (!this.radiative) {
        // synchronized (parts) {
        //     for (Part p : parts) {
        //         if (p.getEmissivity() > 0) {
        //             radiative = true;
        //             break;
        //         }
        //     }
        // }
    }
};

//
// Utilities
//

model2d.copyArray = function(destination, source) {
    var source_length = source.length;
    for (var i = 0; i < source_length; i++) {
        destination[i] = source[i];
    }
};

/** @return true if x is between a and b. */
// float a, float b, float x
model2d.between = function(a, b, x) {
    return x < Math.max(a, b) && x > Math.min(a, b);
};

// float[] array
model2d.getMax = function(array) {
    return Math.max.apply( Math, array );
};

// float[] array
model2d.getMin = function(array) {
    return Math.min.apply( Math, array );
};

// FloatxxArray[] array
model2d.getMaxTypedArray = function(array) {
    var max = Number.MIN_VALUE;
    var length = array.length;
    var test;
    for (var i = 0; i < length; i++) {
        test = array[i];
        max = test > max ? test : max;
    }
    return max;
};

// FloatxxArray[] array
model2d.getMinTypedArray = function(array) {
    var min = Number.MAX_VALUE;
    var length = array.length;
    var test;
    for (var i = 0; i < length; i++) {
        test = array[i];
        min = test < min ? test : min;
    }
    return min;
};

// float[] array
model2d.getMaxAnyArray = function(array) {
    try {
        return Math.max.apply( Math, array );
    }
    catch (e) {
        if (e instanceof TypeError) {
            var max = Number.MIN_VALUE;
            var length = array.length;
            var test;
            for (var i = 0; i < length; i++) {
                test = array[i];
                max = test > max ? test : max;
            }
            return max;
        }
    }
};

// float[] array
model2d.getMinAnyArray = function(array) {
    try {
        return Math.min.apply( Math, array );
    }
    catch (e) {
        if (e instanceof TypeError) {
            var min = Number.MAX_VALUE;
            var length = array.length;
            var test;
            for (var i = 0; i < length; i++) {
                test = array[i];
                min = test < min ? test : min;
            }
            return min;
        }
    }
};

model2d.getAverage = function(array) {
    var acc = 0;
    var length = array.length;
    for (var i = 0; i < length; i++) {
        acc += array[i];
    };
    return acc / length;
};


//*******************************************************
//
//   Part
//
// *******************************************************

model2d.Part = function(options) {
    if (!options)
        options = {};
    
    // shape
    this.rectangle = options.rectangle;
    this.ellipse = options.ellipse;
    this.ring = options.ring;
    this.polygon = options.polygon;
    
    if (this.polygon && typeof (this.polygon.vertices) == "string") {
        var count = this.polygon.count;
        this.polygon.vertices = this.polygon.vertices.split(', ');
        if (count * 2 != this.polygon.vertices.length)
            throw new Error("Part: polygon contains different vertices count than declared in the count parameter.");
        for (var i = 0; i < count * 2; i++) { 
            this.polygon.vertices[i] = Number(this.polygon.vertices[i])
        }
    }
    
    // source properties
    this.thermal_conductivity = options.thermal_conductivity != undefined ? options.thermal_conductivity : 1;
    this.specific_heat = options.specific_heat != undefined ? options.specific_heat : 1300;
    this.density = options.density != undefined ? options.density : 25;
    this.temperature = options.temperature != undefined ? options.temperature : 0;
    this.constant_temperature = options.constant_temperature != undefined ? options.constant_temperature : false;
    this.power = options.power != undefined ? options.power : 0;
    this.wind_speed = options.wind_speed != undefined ? options.wind_speed : 0;
    this.wind_angle = options.wind_angle != undefined ? options.wind_angle : 0;
    
    // optical properties (ray solver not implemented)
    this.transmission = options.transmission != undefined ? options.transmission : 0;
    this.reflection = options.reflection != undefined ? options.reflection : 0;
    this.absorption = options.absorption != undefined ? options.absorption : 1;
    this.emissivity = options.emissivity != undefined ? options.emissivity : 0;
    
    // visual properties
    this.visible = options.visible != undefined ? options.visible : true;
    this.filled = options.filled != undefined ? options.filled : true;
    this.draggable = options.draggable != undefined ? options.draggable : true; 
    this.color = options.color;
    this.texture = options.texture; 
    this.label = options.label;
    this.uid = options.uid;
};

model2d.Part.prototype.getLabel = function() {
    var s;
    var label = this.label;
    if (label === "%temperature")
        s = this.temperature + " \u00b0C";
    else if (label === "%density")
        s = this.density + " kg/m\u00b3";
    else if (label === "%specific_heat")
        s = this.specific_heat + " J/(kg\u00d7\u00b0C)";
    else if (label === "%thermal_conductivity")
        s = this.thermal_conductivity + " W/(m\u00d7\u00b0C)";
    else if (label === "%power_density")
        s = this.power + " W/m\u00b3";
    else if (label === "%area") {
        if (this.rectangle) {
            s = (this.rectangle.width * this.rectangle.height) + " m\u00b2";
        } else if (this.ellipse) {
            s = (this.ellipse.width * this.ellipse.height * 0.25 * Math.PI) + " m\u00b2";
        }
    } else if (label === "%width") {
        if (this.rectangle) {
            s = this.rectangle.width + " m";
        } else if (this.ellipse) {
            s = this.ellipse.width + " m";
        }
    } else if (label === "%height") {
        if (this.rectangle) {
            s = this.rectangle.height + " m";
        } else if (this.ellipse) {
            s = this.ellipse.height + " m";
        }
    }
    else {
        s = label;
    }
    return s;
};

// *******************************************************
//
//   HeatSolver2D
//
// *******************************************************

model2d.HeatSolver2D = function(nx, ny, model) {

    // Float arrays
    this.conductivity = model.conductivity;
    this.capacity = model.capacity;
    this.density = model.density;
    this.u = model.u;
    this.v = model.v;
    this.tb = model.tb;
    this.q = model.q;
    
    // Boolean array
    this.fluidity = model.fluidity;
    
    this.nx = nx;
    this.ny = ny;
    this.nx1 = nx - 1;
    this.ny1 = ny - 1;
    this.nx2 = nx - 2;
    this.ny2 = ny - 2;

    this.timeStep = 0.1;
    this.relaxationSteps = 5;
    
    // array that stores the previous temperature results
    this.t0 = createArray(model2d.ARRAY_SIZE, 0);

    if (model.boundary_settings.temperature_at_border)
        this.boundary = new model2d.DirichletHeatBoundary(model.boundary_settings);
    else
        this.boundary = new model2d.NeumannHeatBoundary(model.boundary_settings);
};

model2d.HeatSolver2D.prototype.setGridCellSize = function(deltaX, deltaY) {
    this.deltaX = deltaX;
    this.deltaY = deltaY;
};

model2d.HeatSolver2D.prototype.solve = function(convective, t, q) {
    model2d.copyArray(this.t0, t);
   
    var nx = this.nx;
    var nx1 = this.nx1;
    var ny1 = this.ny1;
    
    var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;
    
    var conductivity = this.conductivity;
    var capacity = this.capacity;
    var density = this.density;

    var tb = this.tb;
    var t0 = this.t0;
    
    var hx = 0.5 / (this.deltaX * this.deltaX);
    var hy = 0.5 / (this.deltaY * this.deltaY);
    var rij, sij, axij, bxij, ayij, byij;
    var invTimeStep = 1.0 / this.timeStep;

    for (var k = 0; k < this.relaxationSteps; k++) {
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
        this.applyBoundary(t);
    }
    if (convective) {
        this.advect(t);
    }
};

model2d.HeatSolver2D.prototype.advect = function(t) {
    this.macCormack(t);
};

model2d.HeatSolver2D.prototype.macCormack  = function(t) {
    var tx = 0.5 * this.timeStep / this.deltaX;
    var ty = 0.5 * this.timeStep / this.deltaY;
    
    var nx = this.nx;
    var nx1 = this.nx1;
    var ny1 = this.ny1;
    
    var inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;
    
    var fluidity = this.fluidity;

    var t0 = this.t0;
    var u = this.u;
    var v = this.v;

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
    this.applyBoundary(t0);

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
    this.applyBoundary(t);
};

model2d.HeatSolver2D.prototype.applyBoundary  = function(t) {
    var nx = this.nx;
    var ny = this.ny;
    var nx1 = this.nx1;
    var ny1 = this.ny1;
    var nx2 = this.nx2;
    var ny2 = this.ny2;
    var conductivity = this.conductivity;
    var deltaX = this.deltaX;
    var deltaY = this.deltaY;
    var b = this.boundary;
    var tN, tS, tW, tE;
    var inx;
    if (b instanceof model2d.DirichletHeatBoundary) {
        tN = b.getTemperatureAtBorder(model2d.Boundary_UPPER);
        tS = b.getTemperatureAtBorder(model2d.Boundary_LOWER);
        tW = b.getTemperatureAtBorder(model2d.Boundary_LEFT);
        tE = b.getTemperatureAtBorder(model2d.Boundary_RIGHT);
        for (var i = 0; i < nx; i++) {
            inx = i * nx;
            t[inx] = tN;
            t[inx + ny1] = tS;
        }
        for (var j = 0; j <  ny; j++) {
            t[j] = tW;
            t[nx1 * nx + j] = tE;
        }
    } else if (b instanceof model2d.NeumannHeatBoundary) {
        fN = b.getFluxAtBorder(model2d.Boundary_UPPER);
        fS = b.getFluxAtBorder(model2d.Boundary_LOWER);
        fW = b.getFluxAtBorder(model2d.Boundary_LEFT);
        fE = b.getFluxAtBorder(model2d.Boundary_RIGHT);
        for (var i = 0; i < this.nx; i++) {
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

model2d.DirichletHeatBoundary = function(boundary_settings) {
    // by default all temperatures are zero
    var settings;
    if (boundary_settings) {
        settings = boundary_settings.temperature_at_border;
    } else {
        settings = { upper: 0, lower: 0, left: 0, right: 0 };
    }
    this.temperature_at_border = createArray(4, 0); // unit: centigrade
    this.setTemperatureAtBorder(model2d.Boundary_UPPER, settings.upper);
    this.setTemperatureAtBorder(model2d.Boundary_LOWER, settings.lower);
    this.setTemperatureAtBorder(model2d.Boundary_LEFT, settings.left);
    this.setTemperatureAtBorder(model2d.Boundary_RIGHT, settings.right);
};

model2d.DirichletHeatBoundary.prototype.getTemperatureAtBorder  = function(side) {
    if (side < model2d.Boundary_UPPER || side > model2d.Boundary_LEFT)
        throw new Error("DirichletHeatBoundary: side parameter illegal.");
    return this.temperature_at_border[side];
};

model2d.DirichletHeatBoundary.prototype.setTemperatureAtBorder  = function(side, value) {
    if (side < model2d.Boundary_UPPER || side > model2d.Boundary_LEFT)
        throw new Error("DirichletHeatBoundary: side parameter illegal.");
    this.temperature_at_border[side] = value;
};


model2d.NeumannHeatBoundary = function(boundary_settings) {
    var settings;
    if (boundary_settings) {
        settings = boundary_settings.flux_at_border;
    } else {
        settings = { upper: 0, lower: 0, left: 0, right: 0 };
    }
    this.flux_at_border = createArray(4, 0); // heat flux: unit w/m^2
    this.setFluxAtBorder(model2d.Boundary_UPPER, settings.upper);
    this.setFluxAtBorder(model2d.Boundary_LOWER, settings.lower);
    this.setFluxAtBorder(model2d.Boundary_LEFT, settings.left);
    this.setFluxAtBorder(model2d.Boundary_RIGHT, settings.right);
};

model2d.NeumannHeatBoundary.prototype.getFluxAtBorder  = function(side) {
    if (side < model2d.Boundary_UPPER || side > model2d.Boundary_LEFT)
        throw new Error ("NeumannHeatBoundary: side parameter illegal.");
    return this.flux_at_border[side];
};

model2d.NeumannHeatBoundary.prototype.setFluxAtBorder  = function(side, value) {
    if (side < model2d.Boundary_UPPER || side > model2d.Boundary_LEFT)
        throw new Error ("NeumannHeatBoundary: side parameter illegal.");
    this.flux_at_border[side] = value;
};


// *******************************************************
//
//   FluidSolver2D
//
// *******************************************************

model2d.FluidSolver2D = function(nx, ny, model) {
    this.i2dx = null;
    this.i2dy == null;
    this.idxsq = null;
    this.idysq = null;
    this.deltaX = model.deltaX;
    this.deltaY = model.deltaY;
    
    this.relaxationSteps = 5;
    this.timeStep = model.timeStep;
    this.thermalBuoyancy = model.thermalBuoyancy;
    this.gravity = 0;
    this.buoyancyApproximation = model.buoyancyApproximation;  // model2d.BUOYANCY_AVERAGE_COLUMN;
    this.viscosity = model.backgroundViscosity;

    this.uWind = model.uWind;
    this.vWind = model.vWind;

    this.model = model;
    this.nx = model.nx;
    this.ny = model.ny;
    this.nx1 = nx - 1;
    this.ny1 = ny - 1;
    this.nx2 = nx - 2;
    this.ny2 = ny - 2;
    
    this.u0 = createArray(model2d.ARRAY_SIZE, 0);
    this.v0 = createArray(model2d.ARRAY_SIZE, 0);
    this.vorticity = createArray(model2d.ARRAY_SIZE, 0);
    this.stream = createArray(model2d.ARRAY_SIZE, 0);
};

model2d.FluidSolver2D.prototype.reset = function() {
    var array_size = model2d.ARRAY_SIZE;
    for (var i = 0; i < array_size; i++) {
        this.u0[i] = 0;
        this.v0[i] = 0;
        this.vorticity[i] = 0;
        this.stream[i] = 0;
    }
};

// TODO: swap the two arrays instead of copying them every time?
// float[][] u, float[][] v
model2d.FluidSolver2D.prototype.solve = function(u, v) {
    if (this.thermalBuoyancy != 0) {
        this.applyBuoyancy(v);
    }
    this.setObstacleVelocity(u, v);
    if (this.viscosity > 0) { // inviscid case
        this.diffuse(1, this.u0, u);
        this.diffuse(2, this.v0, v);
        this.conserve(u, v, this.u0, this.v0);
        this.setObstacleVelocity(u, v);
    }
    
    model2d.copyArray(this.u0, u);
    model2d.copyArray(this.v0, v);
    this.advect(1, this.u0, u);
    this.advect(2, this.v0, v);
    this.conserve(u, v, this.u0, this.v0);
    this.setObstacleVelocity(u, v);
};

model2d.FluidSolver2D.prototype.setGridCellSize = function(deltaX, deltaY) {
    this.deltaX = deltaX;
    this.deltaY = deltaY;
    this.i2dx = 0.5 / deltaX;
    this.i2dy = 0.5 / deltaY;
    this.idxsq = 1.0 / (deltaX * deltaX);
    this.idysq = 1.0 / (deltaY * deltaY);
};

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

// *******************************************************
//
//   RaySolver2D
//
// *******************************************************

// float lx, float ly
model2d.RaySolver2D = function(lx, ly) {
    
    this.lx = lx;
    this.ly = ly;
    
    this.deltaX = null;
    this.deltaY = null;

    this.sunAngle = Math.PI * 0.5;
    
    this.rayCount = 24;
    this.solarPowerDensity = 2000;
    this.rayPower = this.solarPowerDensity;
    
    this.raySpeed = 0.1;
    
    this.q = createArray(model2d.ARRAY_SIZE, 0);
    
    this.i2dx = null;
    this.i2dy == null;
    this.idxsq = null;
    this.idysq = null;
    this.deltaX = null;
    this.deltaY = null;
    
    this.relaxationSteps = 5;
    this.thermalBuoyancy = 0.00025;
    this.gravity = 0;
    this.buoyancyApproximation = 1;  // model2d.BUOYANCY_AVERAGE_COLUMN;
    this.viscosity = 10 * model2d.AIR_VISCOSITY;
    this.timeStep = 0.1;

    this.uWind = null;
    this.vWind = null;

    this.nx = model2d.nx;
    this.ny = model2d.ny;
    this.nx1 = this.nx - 1;
    this.ny1 = this.ny - 1;
    this.nx2 = this.nx - 2;
    this.ny2 = this.ny - 2;
    
    this.u0 = createArray(model2d.ARRAY_SIZE, 0);
    this.v0 = createArray(model2d.ARRAY_SIZE, 0);
    this.vorticity = createArray(model2d.ARRAY_SIZE, 0);
    this.stream = createArray(model2d.ARRAY_SIZE, 0);
};

model2d.RaySolver2D.prototype.setSolarPowerDensity = function(solarPowerDensity) {
    this.solarPowerDensity = solarPowerDensity;
    this.rayPower = solarPowerDensity * 24 / this.rayCount;
};

model2d.RaySolver2D.prototype.setSolarRayCount = function(solarRayCount) {
    this.rayCount = solarRayCount;
    this.rayPower = this.solarPowerDensity * 24 / this.rayCount;
};

model2d.RaySolver2D.prototype.setGridCellSize = function(deltaX, deltaY) {
    this.deltaX = deltaX;
    this.deltaY = deltaY;
};

// loat x, float y, List<Part> parts
model2d.RaySolver2D.prototype.isContained = function(x, y, parts) {
    var parts_length = parts.length;
    for (var i = 0; i < parts_length; i++) {
        if (parts[i].contains(x, y)) {
            return true;
        }
    } 
    return false;
};

// float sunAngle
model2d.RaySolver2D.prototype.setSunAngle = function(sunAngle) {
    this.sunAngle = Math.PI - sunAngle;
};

model2d.RaySolver2D.prototype.getSunAngle = function() {
  return Math.PI - sunAngle;
};


// Model2D model
model2d.RaySolver2D.prototype.radiate = function(model2d) {
    // synchronized (model2d.getParts()) {
    //   for (Part p : model2d.getParts()) {
    //     if (p.getEmissivity() > 0)
    //       p.radiate(model2d);
    //   }
    // }
};


model2d.RaySolver2D.prototype.solve = function(model2d) {
  this.photons = model2d.photons;
  if (this.photons.length == 0)
    return;

  var photon = null;

  var timeStep = this.timeStep;
  var nx = model2d.nx;
  var ny = model2d.ny;

  // Since a photon is emitted at a given interval, its energy
  // has to be divided evenly for internal power generation at
  // each second. The following factor takes this into account.
  var factor = 1.0 / (timeStep * model2d.photonEmissionInterval);
  var idx = 1.0 / this.deltaX;
  var idy = 1.0 / this.deltaY;
  var i, j;
  
  var nx_minus_1 = nx - 1;
  var ny_minus_1 = ny - 1;

  // boolean remove;

  var photonCount = this.photons.length;
  for (var i = 0; i < photonCount; i++) {
      photon = photons[i];
      photon.move(timeStep);
      // if (model.getPartCount() > 0) {
      //     remove = false;
      //     synchronized (model.getParts()) {
      //         for (Part part : model.getParts()) {
      //             if (Math.abs(part.getReflection() - 1) < 0.001f) {
      //                 if (part.reflect(p, timeStep))
      //                     break;
      //             } else if (Math.abs(part.getAbsorption() - 1) < 0.001f) {
      //                 if (part.absorb(p)) {
      //                     i = Math.min(nx, Math.round(p.getX() * idx));
      //                     j = Math.min(ny, Math.round(p.getY() * idy));
      //                     q[i][j] = p.getEnergy() * factor;
      //                     remove = true;
      //                     break;
      //                 }
      //             }
      //         }
      //     }
      //     if (remove)
      //         it.remove();
      // }
  }
  this.applyBoundary(photons);
};



// List<Photon> photons
model2d.RaySolver2D.prototype.applyBoundary = function(photons) {
    var photonCount = this.photons.length;
    var lx = this.lx;
    var ly = this.ly;
    var remainingPhotons = [];
    for (var i = 0; i < photonCount; i++) {
        photon = photons[i];
        if (photon.isContained(0, lx, 0, ly)) {
            remainingPhotons.push(photon);
        }
    }
    photons = remainingPhotons;
};


// List<Photon> photons, List<Part> parts
model2d.RaySolver2D.prototype.sunShine = function(photons, parts) {
  if (this.sunAngle < 0)
    return;
  var s = Math.abs(Math.sin(this.sunAngle));
  var c = Math.abs(Math.cos(this.sunAngle));

  var lx = this.lx;
  var ly = this.ly;

  var spacing = s * ly < c * lx ? ly / c : lx / s;
  spacing /= this.rayCount;
  this.shootAtAngle(spacing / s, spacing / c, photons, parts);
};

// float dx, float dy, List<Photon> photons, List<Part> parts
model2d.RaySolver2D.prototype.shootAtAngle = function(dx, dy, photons, parts) {
    var lx = this.lx;
    var ly = this.ly;
    var sunAngle = this.sunAngle;
    var rayPower = this.rayPower;
    var raySpeed = this.raySpeed;
    var m = this.lx / dx;
    var n = this.ly / dy;
    var x, y;
    return;
    if (this.sunAngle >= 0 && this.sunAngle < 0.5 * Math.PI) {
        y = 0;
        for (var i = 1; i <= m; i++) {
            x = dx * i;
            if (!this.isContained(x, y, parts))
            photons.push(new model2d.Photon(x, y, rayPower, sunAngle, raySpeed));
        }
        x = 0;
        for (var i = 0; i <= n; i++) {
            y = dy * i;
            if (!this.isContained(x, y, parts))
            photons.push(new model2d.Photon(x, y, rayPower, sunAngle, raySpeed));
        }
    } else if (sunAngle < 0 && sunAngle >= -0.5 * Math.PI) {
        y = ly;
        for (var i = 1; i <= m; i++) {
            x = dx * i;
            if (!this.isContained(x, y, parts))
            photons.push(new model2d.Photon(x, y, rayPower, sunAngle, raySpeed));
        }
        x = 0;
        for (var i = 0; i <= n; i++) {
            y = ly - dy * i;
            if (!this.isContained(x, y, parts))
            photons.push(new model2d.Photon(x, y, rayPower, sunAngle, raySpeed));
        }
    } else if (sunAngle < Math.PI + 0.001 && sunAngle >= 0.5 * Math.PI) {
        y = 0;
        for (var i = 0; i <= m; i++) {
            x = lx - dx * i;
            if (!this.isContained(x, y, parts))
            photons.push(new model2d.Photon(x, y, rayPower, sunAngle, raySpeed));
        }
        x = lx;
        for (var i = 1; i <= n; i++) {
            y = dy * i;
            if (!this.isContained(x, y, parts))
            photons.push(new model2d.Photon(x, y, rayPower, sunAngle, raySpeed));
        }
    } else if (sunAngle >= -Math.PI && sunAngle < -0.5 * Math.PI) {
        y = ly;
        for (var i = 0; i <= m; i++) {
            x = lx - dx * i;
            if (!this.isContained(x, y, parts))
            photons.push(new model2d.Photon(x, y, thisr.ayPower, sunAngle, raySpeed));
        }
        x = lx;
        for (var i = 1; i <= n; i++) {
            y = ly - dy * i;
            if (!this.isContained(x, y, parts))
            photons.push(new model2d.Photon(x, y, rayPower, sunAngle, raySpeed));
        }
    }
};


// *******************************************************
//
//   Photons
//
// *******************************************************

// float x, float y, float energy, float c
model2d.Photon = function(x, y, energy, angle, c) {
    this.x = x;
    this.y = y;
    this.energy = energy;
    this.c = c;
    this.setAngle(angle);
};


model2d.Photon.prototype.setAngle = function(angle) {
    this.vx =  Math.cos(angle) * this.c;
    this.vy =  Math.sin(angle) * this.c;
};

// float xmin, float xmax, float ymin, float ymax
model2d.Photon.prototype.isContained = function(xmin, xmax, ymin, ymax) {
    return x >= xmin && x <= xmax && y >= ymin && y <= ymax;
};

// float dt
model2d.Photon.prototype.move = function(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
};


// *******************************************************
//
//   Graphics Canvas
//
// *******************************************************

/**
* HSV to RGB color conversion
*
* H runs from 0 to 360 degrees
* S and V run from 0 to 100
* 
* Ported from the excellent java algorithm by Eugene Vishnevsky at:
* http://www.cs.rit.edu/~ncs/color/t_convert.html
* 
* http://snipplr.com/view.php?codeview&id=14590
*
*/
function hsvToRgb(h, s, v) {
    var r, g, b;
    var i;
    var f, p, q, t;

    // Make sure our arguments stay in-range
    h = Math.max(0, Math.min(360, h));
    s = Math.max(0, Math.min(100, s));
    v = Math.max(0, Math.min(100, v));

    // We accept saturation and value arguments from 0 to 100 because that's
    // how Photoshop represents those values. Internally, however, the
    // saturation and value are calculated from a range of 0 to 1. We make
    // That conversion here.
    s /= 100;
    v /= 100;

    if(s == 0) {
        // Achromatic (grey)
        r = g = b = v;
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    h /= 60; // sector 0 to 5
    i = Math.floor(h);
    f = h - i; // factorial part of h
    p = v * (1 - s);
    q = v * (1 - s * f);
    t = v * (1 - s * (1 - f));

    switch(i) {
        case 0:
        r = v;
        g = t;
        b = p;
        break;

        case 1:
        r = q;
        g = v;
        b = p;
        break;

        case 2:
        r = p;
        g = v;
        b = t;
        break;

        case 3:
        r = p;
        g = q;
        b = v;
        break;

        case 4:
        r = t;
        g = p;
        b = v;
        break;

        default: // case 5:
        r = v;
        g = p;
        b = q;
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
var red_color_table   = [];
var blue_color_table  = [];
var green_color_table = [];

model2d.setupRGBAColorTables = function() {
    var rgb = [];
    for(var i = 0; i < 256; i++) {
        rgb = hsvToRgb(i, 100, 90);
        red_color_table[i]   = rgb[0];
        blue_color_table[i]  = rgb[1];
        green_color_table[i] = rgb[2];
    }
};

model2d.initCanvas = function(canvas, width, height) {
    canvas.width = width;
    canvas.height = height;   
};

//TODO: move all properties and functions connected with drawing to another module
model2d.MAX_DISPLAY_TEMP = 50;
model2d.MIN_DISPLAY_TEMP = 0;
model2d.displayTemperatureCanvas = function(canvas, model) {
    if (model.nx != canvas.width || model.ny != canvas.height) 
        throw new Error("displayTemperatureCanvas: canvas dimensions have to be the same as model grid dimensions.");
    if (red_color_table.length == 0) {
        model2d.setupRGBAColorTables();
    };
    var max_hue = red_color_table.length - 1;
    
    var nx = model.nx;
    var ny = model.ny;
    
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, nx, ny);
    ctx.fillStyle = "rgb(0,0,0)";
    
    // constants, as looking for min and max temperature caused that  
    // areas with constant temperatures were chaning their color
    var min = model2d.MIN_DISPLAY_TEMP; // model2d.getMinAnyArray(t);
    var max = model2d.MAX_DISPLAY_TEMP; //model2d.getMaxAnyArray(t);
    
    var scale = max_hue / (max - min);
    var hue;
    var imageData = ctx.getImageData(0, 0, nx, ny);
    var data = imageData.data;
    var t = model.t;
    var iny;
    var pix_index = 0;
    var pix_stride = 4 * nx;
    for (var i = 0; i < nx; i++) {
        iny = i * ny;
        pix_index = 4 * i;
        for (var j = 0; j < ny; j++) {
            hue =  max_hue - Math.round(scale * (t[iny + j] - min));
            if (hue < 0) hue = 0;
            else if (hue > max_hue) hue = max_hue;
            data[pix_index]     = red_color_table[hue];
            data[pix_index + 1] = blue_color_table[hue];
            data[pix_index + 2] = green_color_table[hue];
            data[pix_index + 3] = 255;
            pix_index += pix_stride;
        }
    };
    ctx.putImageData(imageData, 0, 0);
};

model2d.displayTemperatureCanvasWithSmoothing = function(canvas, model) {
    if (red_color_table.length == 0) {
        model2d.setupRGBAColorTables();
    };
    var max_hue = red_color_table.length - 1;
    
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgb(0,0,0)";

    var width = canvas.width;
    var height = canvas.height;
    
    var nx = model.nx;
    var ny = model.ny;
    
    var dx = nx / width;
    var dy = ny / height;

    var t = model.t;
    
    // constants, as looking for min and max temperature caused that  
    // areas with constant temperatures were changing their color
    var min = model2d.MIN_DISPLAY_TEMP; // model2d.getMinAnyArray(t);
    var max = model2d.MAX_DISPLAY_TEMP; //model2d.getMaxAnyArray(t);
    
    var scale = max_hue / (max - min);
    var avg_temp, hue;
    var imageData = ctx.getImageData(0, 0, width, height);
    var data = imageData.data;
    var x, x0, x1, s0, s1, y, y0, y1, t0, t1, x0stride, x1stride;
    var pix_index = 0;
    var pix_stride = 4 * width;
    for (var i = 0; i < width; i++) {
        x = i * dx;
        x0 = Math.floor(x);
        x1 = x0 + 1 < nx ? x0 + 1 : x0;
        s1 = x - x0;
        s0 = 1 - s1;
        x0stride = x0 * ny;
        x1stride = x1 * ny;
        pix_index = 4 * i;
        for (var j = 0; j < height; j++) {
            y = j * dy;
            y0 = Math.floor(y);
            y1 = y0 + 1 < ny ? y0 + 1 : y0;
            t1 = y - y0;
            t0 = 1 - t1;
            avg_temp = s0 * (t0 * t[x0stride + y0] + t1 * t[x0stride + y1]) +
                       s1 * (t0 * t[x1stride + y0] + t1 * t[x1stride + y1]);
            hue =  max_hue - Math.round(scale * (avg_temp - min));
            if (hue < 0) hue = 0;
            else if (hue > max_hue) hue = max_hue;
            data[pix_index]     = red_color_table[hue];
            data[pix_index + 1] = blue_color_table[hue];
            data[pix_index + 2] = green_color_table[hue];
            data[pix_index + 3] = 255;
            pix_index += pix_stride;
        }
    };
    ctx.putImageData(imageData, 0, 0);
};

model2d.displayParts = function(canvas, parts, scene_width, scene_height) {
    if (this.textures.length == 0) {
        this.setupTextures();
    }
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "black";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.font = "12px sans-serif";
    ctx.textBaseline = "middle";
        
    var scale_x = canvas.width / scene_width;
    var scale_y = canvas.height / scene_height;
        
    var part, label, label_x, label_y, label_width, last_composite_op,
        px, py, pa, pb, pw, ph, vert_count, verts, x_pos, y_pos,
        length = parts.length;
    for (var i = 0; i < length; i++) {
        part = parts[i];
        
        if (!part.visible)
        	continue;
        	
        if (part.rectangle) {
           px = part.rectangle.x * scale_x - 1;        // "- 1 / + 2" too keep positions 
           py = part.rectangle.y * scale_y - 1;        // consistent with Energy2d
           pw = part.rectangle.width * scale_x + 2;    
           ph = part.rectangle.height * scale_y + 2;   
           label_x = px + 0.5 * pw;
           label_y = py + 0.5 * ph;
           ctx.beginPath();
           ctx.moveTo(px, py);
           ctx.lineTo(px + pw, py);
           ctx.lineTo(px + pw, py + ph);
           ctx.lineTo(px, py + ph);
           ctx.lineTo(px, py);
           ctx.closePath();
        }
        
        if (part.polygon) {
            vert_count = part.polygon.count;
            verts = part.polygon.vertices;
            label_x = 0;
            label_y = 0;
            ctx.beginPath();
            ctx.moveTo(verts[0] * scale_x, verts[1] * scale_y);
            for (var j = 1; j < vert_count; j++) {
                x_pos = verts[j * 2] * scale_x;
                y_pos = verts[j * 2 + 1] * scale_y;
                label_x += x_pos;
                label_y += y_pos
                ctx.lineTo(x_pos, y_pos);
            }
            ctx.closePath();
            label_x /= vert_count;
            label_y /= vert_count;
        }
        
        if (part.ellipse || part.ring) {
            if (part.ellipse) {
                px = part.ellipse.x * scale_x;
                py = part.ellipse.y * scale_y;
                pa = part.ellipse.a * scale_x * 0.5;
                pb = part.ellipse.b * scale_y * 0.5;
            } else { 
                px = part.ring.x * scale_x;
                py = part.ring.y * scale_y;
                pa = part.ring.outer * scale_x * 0.5;
                pb = part.ring.outer * scale_y * 0.5;
            }
            label_x = px;
            label_y = py;
            
            drawEllipse(ctx, px, py, pa, pb);
            // if ring is being drawn, 
            // its interior will be deleted later
        }
        
        if (part.filled) {
            ctx.fillStyle = this.getPartColor(part);
            ctx.fill();     
        }
        if (part.texture) {
            // TODO: add support of different patterns
            ctx.fillStyle = ctx.createPattern(this.textures[0], "repeat");
            ctx.fill();
        }
        ctx.stroke();
        
        if (part.ring) {
            // it's time to delete ring's interior
            px = part.ring.x * scale_x;
            py = part.ring.y * scale_y;
            pa = part.ring.inner * scale_x * 0.5;
            pb = part.ring.inner * scale_y * 0.5;  
            
            drawEllipse(ctx, px, py, pa, pb);
            last_composite_op = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fill();
            ctx.globalCompositeOperation = last_composite_op;
            ctx.stroke();
        }
        
        if (part.label) {
            ctx.fillStyle = "white";
            label = part.getLabel();
            label_width = ctx.measureText(label).width;
            ctx.fillText(label, label_x - 0.5 * label_width, label_y);
        }
        
    }
    
    function drawEllipse(ctx, px, py, pa, pb) {
        var x_pos, y_pos;
        ctx.beginPath();
        for (var t = 0 * Math.PI; t < 2 * Math.PI; t += 0.1) {
            x_pos = px + (pa * Math.cos(t));
            y_pos = py + (pb * Math.sin(t));
        
            if (t == 0) {
                ctx.moveTo(x_pos, y_pos);
            } else {
                ctx.lineTo(x_pos, y_pos);
            }
        }
        ctx.closePath();
    }
};

model2d.getPartColor = function(part) {
    var default_fill_color = "gray";
    var color;
    
    var max_hue = red_color_table.length - 1;
    var min_temp = model2d.MIN_DISPLAY_TEMP;
    var max_temp = model2d.MAX_DISPLAY_TEMP;
    var scale = max_hue / (max_temp - min_temp);
    
    if (part.color) {
        color = part.color.toString(16);
        while(color.length < 6) {
            color = '0' + color;
        }
    } else if (part.power > 0) {
        color = "FFFF00";
    } else if (part.power < 0) {
        color = "B0C4DE";
    } else if (part.constant_temperature) {
        var hue = max_hue - Math.round(scale * (part.temperature - min_temp));  
        color = "rgb(" + red_color_table[hue] + ","
                       + blue_color_table[hue] + ","
                       + green_color_table[hue] + ")";
               
   } else {
       color = default_fill_color;
   }
   return color;
}

model2d.textures = [];

model2d.setupTextures = function() {
    var width = 10;
    var height = 10;
    var texture_canvas = window.document.createElement('canvas');
    texture_canvas.width = width;
    texture_canvas.height = height;
   
    var ctx = texture_canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, height);
    ctx.stroke();
    
    this.textures.push(texture_canvas);
};

model2d.displayVectorField = function(canvas, u, v, nx, ny, spacing) {  
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgb(175,175,175)";
    ctx.lineWidth = 1;

    var dx = canvas.width / nx;
    var dy = canvas.height / ny;
    
    var x0, y0;
    var uij, vij;
    
    var iny, ijny;
    for (var i = 0; i < nx; i += spacing) {
        iny = i * ny;
        x0 = i * dx;
        for (var j = 0; j < ny; j += spacing) {
            ijny = iny + j;
            y0 = j * dy;
            uij = u[ijny];
            vij = v[ijny];
            if (uij * uij + vij * vij > 1e-15) {
                model2d.drawVector(ctx, x0, y0, uij, vij);
            }
        }
    }
};

model2d.VECTOR_SCALE = 100;
model2d.WING_COS = Math.cos(0.523598776);
model2d.WING_SIN = Math.sin(0.523598776);
model2d.drawVector = function(canvas_ctx, x, y, vx, vy) {
    canvas_ctx.beginPath(); 
    var r = 1.0 / Math.sqrt(vx*vx + vy*vy);
    var arrowx = vx * r;
    var arrowy = vy * r;
    var x1 = x + arrowx * 8 + vx * model2d.VECTOR_SCALE;
    var y1 = y + arrowy * 8 + vy * model2d.VECTOR_SCALE;
    canvas_ctx.moveTo(x, y);  
    canvas_ctx.lineTo(x1, y1);
    
    r = 4;
    var wingx = r * (arrowx * model2d.WING_COS + arrowy * model2d.WING_SIN);
    var wingy = r * (arrowy * model2d.WING_COS - arrowx * model2d.WING_SIN);
    canvas_ctx.lineTo(x1 - wingx, y1 - wingy);
    canvas_ctx.moveTo(x1, y1);
    
    wingx = r * (arrowx * model2d.WING_COS - arrowy * model2d.WING_SIN);
    wingy = r * (arrowy * model2d.WING_COS + arrowx * model2d.WING_SIN);
    canvas_ctx.lineTo(x1 - wingx, y1 - wingy);
    
    canvas_ctx.stroke();
};

model2d.displayVelocityLengthCanvas = function(canvas, model) {
    if (model.nx != canvas.width || model.ny != canvas.height) 
        throw new Error("displayVelocityLengthCanvas: canvas dimensions have to be the same as model grid dimensions.");
    if (red_color_table.length == 0) {
        model2d.setupRGBAColorTables();
    };
    var max_hue = red_color_table.length - 1;
    
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgb(0,0,0)";

    var columns = model.nx;
    var rows = model.ny;
   
    var hue;
    var ycols;

    var u = model.u;
    var v = model.v;
    
    var min = 0;
    
    // look for max value
    var max = Number.MIN_VALUE;
    var length = u.length;
    var test;
    for(var i = 0; i < length; i++) {
        test = u[i]*u[i] + v[i]*v[i];
        if (test > max)
            max = test;
    }
    var scale = red_color_table.length / (max - min);
    var velocity;
    var imageData = ctx.getImageData(0, 0, 100, 100);
    var data = imageData.data;
    var pix_index = 0;
    var pix_stride = 4 * rows;
    for (var y = 0; y < rows; y++) {
        ycols = y * rows;
        pix_index = 4 * y;
        for (var x = 0; x < columns; x++) {
            velocity = u[ycols + x]*u[ycols + x] + v[ycols + x]*v[ycols + x];
            hue =  max_hue - Math.round(scale * velocity - min);
            if (hue < 0) hue = 0;
            else if (hue > max_hue) hue = max_hue;
            data[pix_index]     = red_color_table[hue];
            data[pix_index + 1] = blue_color_table[hue];
            data[pix_index + 2] = green_color_table[hue];
            data[pix_index + 3] = 255;
            pix_index += pix_stride;
        }
    };
    ctx.putImageData(imageData, 0, 0);
};

model2d.displayTemperatureTable = function(destination, model) {
    var columns = model.nx;
    var rows = model.ny;
    var temp;
    var tableStr = "";
    for (var x = 0; x < columns; x++) {
        for (var y = 0; y < rows; y++) {
            temp = model.t[y * columns + x];
            tableStr += sprintf("%2.0f ", temp);
        }
        tableStr += '\n';
    }
    destination.innerHTML = tableStr;
};

// export namespace
if (root !== undefined) root.model2d = model2d;
})();

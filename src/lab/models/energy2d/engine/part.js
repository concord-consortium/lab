/*jslint indent: false */
// TODO: set JSHint/JSLint options
//
// lab/models/energy2d/engines/part.js
//


// TODO: organize code
exports.Part = function(options) {
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

exports.Part.prototype.getLabel = function() {
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
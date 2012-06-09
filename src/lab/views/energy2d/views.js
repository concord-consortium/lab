//     model2d.js 0.1.0
//     (c) 2010 The Concord Consortium
//     created by Stephen Bannasch
//     model2d.js may be freely distributed under the LGPL license.

(function() {

var model2d = {};
var root = this;
model2d.VERSION = '0.1.0';

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
    if (model.getGridWidth() != canvas.width || model.getGridHeight() != canvas.height) 
        throw new Error("displayTemperatureCanvas: canvas dimensions have to be the same as model grid dimensions.");
    if (red_color_table.length == 0) {
        model2d.setupRGBAColorTables();
    };
    var max_hue = red_color_table.length - 1;
    
    var nx = model.getGridWidth();
    var ny = model.getGridHeight();
    
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
    var t = model.getTemperatureArray();
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
    
    var nx = model.getGridWidth();
    var ny = model.getGridHeight();
    
    var dx = nx / width;
    var dy = ny / height;

    var t = model.getTemperatureArray();
    
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
    for (var i = 1; i < nx - 1; i += spacing) {
        iny = i * ny;
        x0 = (i + 0.5) * dx; // + 0.5 to move arrow into field center
        for (var j = 1; j < ny - 1; j += spacing) {
            ijny = iny + j;
            y0 = (j + 0.5) * dy; // + 0.5 to move arrow into field center
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
    if (model.getGridWidth() != canvas.width || model.getGridHeight() != canvas.height) 
        throw new Error("displayVelocityLengthCanvas: canvas dimensions have to be the same as model grid dimensions.");
    if (red_color_table.length == 0) {
        model2d.setupRGBAColorTables();
    };
    var max_hue = red_color_table.length - 1;
    
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgb(0,0,0)";

    var columns = model.getGridWidth();
    var rows = model.getGridHeight();
   
    var hue;
    var ycols;

    var u = model.getUVelocityArray();
    var v = model.getVVelocityArray();
    
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
    var columns = model.getGridWidth();
    var rows = model.getGridHeight();
    var t = model.getTemperatureArray();
    var temp;
    var tableStr = "";
    for (var x = 0; x < columns; x++) {
        for (var y = 0; y < rows; y++) {
            temp = t[y * columns + x];
            tableStr += temp.toFixed(1) + ' ';
        }
        tableStr += '\n';
    }
    destination.innerHTML = tableStr;
};

// export namespace
if (root !== undefined) root.model2d = model2d;
})();

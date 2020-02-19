/*jslint indent: 2, browser: true, newcap: true, sub: true */ 
import view_helpers from 'models/energy2d/views/helpers';

var
// Dependencies.
  

  // Object with available color palettes.
  color_palette,
  // Constructor function.
  ColorPalette;

// Setup basic color palettes.
color_palette = {};
color_palette['0'] = color_palette['RAINBOW'] = [
  [0, 0, 128],
  [20, 50, 120],
  [20, 100, 200],
  [10, 150, 150],
  [120, 180, 50],
  [220, 200, 10],
  [240, 160, 36],
  [225, 50, 50],
  [230, 85, 110],
  [250, 250, 250],
  [255, 255, 255]
];
color_palette['1'] = color_palette['IRON'] = [
  [40, 20, 100],
  [80, 20, 150],
  [150, 20, 150],
  [200, 50, 120],
  [220, 80, 80],
  [230, 120, 30],
  [240, 200, 20],
  [240, 220, 80],
  [255, 255, 125],
  [250, 250, 250],
  [255, 255, 255]
];
color_palette['2'] = color_palette['GRAY'] = [
  [50, 50, 50],
  [75, 75, 75],
  [100, 100, 100],
  [125, 125, 125],
  [150, 150, 150],
  [175, 175, 175],
  [200, 200, 200],
  [225, 225, 225],
  [250, 250, 250],
  [255, 255, 255]
];
color_palette['3'] = color_palette['RAINBOW2'] = (function() {
  var HSVToRGB = view_helpers.HSVToRGB,
    length = 256,
    rgb = new Array(length),
    i;

  for (i = 0; i < length; i += 1) {
    rgb[i] = view_helpers.HSVToRGB(length - 1 - i, 100, 90);
  }
  return rgb;
}());

ColorPalette = function(color_palette_id) {
  if (color_palette_id === undefined || color_palette_id === 'DEFAULT') {
    color_palette_id = 'RAINBOW';
  }
  this.color_palette_id = color_palette_id;
};

ColorPalette.prototype.getRGBArray = function() {
  if (color_palette[this.color_palette_id] !== undefined) {
    return color_palette[this.color_palette_id];
  }
};

// Export constructor function.
export default ColorPalette;

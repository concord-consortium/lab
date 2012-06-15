/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/views/energy2d/utils-color.js
//

// define namespace
energy2d.namespace('energy2d.views.utils');

// HSV to RGB color conversion.
//
// H runs from 0 to 360 degrees,
// S and V run from 0 to 100.
// 
// Ported from the excellent java algorithm by Eugene Vishnevsky at:
// http://www.cs.rit.edu/~ncs/color/t_convert.html
// http://snipplr.com/view.php?codeview&id=14590
energy2d.views.utils.HSVToRGB = function (h, s, v) {
  'use strict';
  var
    r, g, b,
    i,
    f, p, q, t;

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

  if (s === 0) {
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

  switch (i) {
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
};

energy2d.views.utils.setupRGBTemperatureColorTables = function (red, green, blue) {
  'use strict';
  var
    HSVToRGB = energy2d.views.utils.HSVToRGB,
    rgb = [],
    i;

  for (i = 0; i < 256; i += 1) {
    rgb = energy2d.views.utils.HSVToRGB(i, 100, 90);
    red[i]   = rgb[0];
    blue[i]  = rgb[1];
    green[i] = rgb[2];
  }
};
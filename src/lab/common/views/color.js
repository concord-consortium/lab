/*global define: false, d3: false */

/**
 * Tiny module providing useful functions for color manipulation.
 */
define(function () {

  function parseColor(color) {
    // d3.rgb is handy, however it cannor parse RGBA colors. Use it regexp to
    // parse rgba if it's necessary. Note that alpha channel will be ignored!
    var rgba = color.match(/rgba\(([0-9]+),([0-9]+),([0-9]+),([0-9]+)\)/i);
    if (rgba !== null) {
      return d3.rgb(rgba[1], rgba[2], rgba[3]);
    } else {
      return d3.rgb(color);
    }
  }

  return {
    /**
     * Returns color contrasting to specified background color (black or white).
     * Note that if background color specifies alpha channel (e.g. rgba(0,0,0,0.5)),
     * it will be ignored!
     * @param  {string} bg Web-compatible color definition (e.g. "red", "#ff0012", "#000").
     * @return {string} Contrasting color - "#000" or "#fff".
     */
    contrastingColor: function (bg) {
      bg = parseColor(bg);
      // Calculate luminance in YIQ color space.
      // This ensures that color will be visible on background.
      // This simple algorithm is described here:
      // http://www.w3.org/TR/AERT#color-contrast
      return (bg.r * 299 + bg.g * 587 + bg.b * 114) / 1000 >= 128 ? '#000' : '#fff';
    },

    /**
     * Converts color string to number.
     * @param  {string} bg Web-compatible color definition (e.g. "red", "#ff0012", "#000").
     * @return {number} Numeric value, e.g. 0xff000 when argument is "#f00", "#ff0000" or "red".
     */
    color2number: function (colorString) {
      return parseInt(parseColor(colorString).toString().substr(1), 16);
    }
  };
});

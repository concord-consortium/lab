
/**
 * Tiny module providing useful functions for color manipulation.
 */
function d3rgba(color) {
  // Use regexp to parse rgba if it's necessary.
  var rgba = color.match(/rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+(?:\.\d+)?)\)/i);
  if (rgba !== null) {
    return {
      rgb: d3.rgb(rgba[1], rgba[2], rgba[3]),
      a: Number(rgba[4])
    };
  } else {
    return {
      rgb: d3.rgb(color),
      a: 1
    };
  }
}

export default {
  /**
   * d3.rgb is handy, however it cannot parse RGBA colors.
   * @param  {string} color Web-compatible color definition (e.g. "red", "#ff0012", "#000", rgba(10,10,10,0.5).
   * @return {object} Object containing two properties: `rgb` - d3.rgb color and `a` - alpha value.
   */
  d3rgba: d3rgba,

  /**
   * Returns color contrasting to specified background color (black or white).
   * Note that if background color specifies alpha channel (e.g. rgba(0,0,0,0.5)),
   * it will be ignored!
   * @param  {string} bg Web-compatible color definition (e.g. "red", "#ff0012", "#000").
   * @return {string} Contrasting color - "#000" or "#fff".
   */
  contrastingColor: function(bg) {
    bg = d3rgba(bg).rgb;
    // Calculate luminance in YIQ color space.
    // This ensures that color will be visible on background.
    // This simple algorithm is described here:
    // http://www.w3.org/TR/AERT#color-contrast
    return (bg.r * 299 + bg.g * 587 + bg.b * 114) / 1000 >= 128 ? '#000' : '#fff';
  },

  /**
   * Converts color string to number.
   * @param  {string} colorString Web-compatible color definition (e.g. "red", "#ff0012", "#000").
   * @return {number} Numeric value, e.g. 0xff000 when argument is "#f00", "#ff0000" or "red".
   */
  color2number: function(colorString) {
    return parseInt(d3rgba(colorString).rgb.toString().substr(1), 16);
  }
};

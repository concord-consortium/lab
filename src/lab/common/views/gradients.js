/*global define: false */

define(function () {
  return {
    /**
     * Creates a new radial gradient or updates existing one.
     *
     * @param  {[type]} id
     * @param  {[type]} lightColor
     * @param  {[type]} medColor
     * @param  {[type]} darkColor
     * @param  {[type]} container SVG container which will be used to store gradients definitions.
     * @return {string}           Gradient URL string, e.g. "url(#green-gradient)"
     */
    createRadialGradient: function (id, lightColor, medColor, darkColor, container) {
      var gradientUrl,
          defs,
          gradient;
      defs = container.select("defs");
      if (defs.empty()) {
        // Store gradients in 'defs' element.
        defs = container.append("defs");
      }

      gradient = defs.select("#" + id);

      if (gradient.empty()) {
        // Create a new gradient.
        gradient = defs.append("radialGradient")
          .attr("id", id)
          .attr("cx", "50%")
          .attr("cy", "47%")
          .attr("r", "53%")
          .attr("fx", "35%")
          .attr("fy", "30%");
      } else {
        gradient.selectAll("stop").remove()
      }

      gradient.append("stop")
        .attr("stop-color", lightColor)
        .attr("offset", "0%");
      gradient.append("stop")
        .attr("stop-color", medColor)
        .attr("offset", "40%");
      gradient.append("stop")
        .attr("stop-color", darkColor)
        .attr("offset", "80%");
      gradient.append("stop")
        .attr("stop-color", medColor)
        .attr("offset", "100%");

      gradientUrl = "url(#" + id + ")";
      // Store main color (for now - dark color) of the gradient.
      // Useful for radial bonds. Keys are URLs for convenience.
      this.mainColorOfGradient[gradientUrl] = darkColor;
      return gradientUrl;
    },

    /**
     * Hash which defines the main color of a given gradient.
     * Note that for convenience, keys are in forms of URLs (e.g. url(#some-gradient)).
     * e.g. useful for MD2D radial bonds, which can adjust their color to gradient.
     */
    mainColorOfGradient: {}
  };
});

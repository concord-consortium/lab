/*global define: false console: true */

define(function (require) {
  // Dependencies.
  var publicAPI;

  publicAPI = {
    // Hash which defines the main color of a given created gradient.
    // E.g. useful for radial bonds, which can adjust their color to gradient.
    // Note that for convenience, keys are in forms of URLs (e.g. url(#some-gradient)).
    mainColorOfGradient: {},
    createRadialGradient: function (id, lightColor, medColor, darkColor, mainContainer) {
      var gradientUrl,
          gradient = mainContainer.append("defs")
          .append("radialGradient")
          .attr("id", id)
          .attr("cx", "50%")
          .attr("cy", "47%")
          .attr("r", "53%")
          .attr("fx", "35%")
          .attr("fy", "30%");
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
      publicAPI.mainColorOfGradient[gradientUrl] = darkColor;
      return gradientUrl;
    }
  };

  return publicAPI;
});

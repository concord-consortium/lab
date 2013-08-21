/*global define: false*/

define(function() {
  return {
    units: {
      time: {
        name: "second",
        pluralName: "seconds",
        symbol: "s"
      },
      distance: {
        name: "meter",
        pluralName: "meters",
        symbol: "m"
      },
      temperature: {
        name: "degree Celsius",
        pluaralName: "degrees Celsius",
        symbol: "°C"
      },
      lightIntensity: {
        name: "lux",
        pluralName: "lux",
        symbol: "lux"
      },
      force: {
        name: "Newton",
        pluralName: "Newtons",
        symbol: "N"
      },
      // Yes, for some sensors, we willfully conflate type of quantity with its measurement units
      pH: {
        name: "pH Unit",
        pluralName: "pH Units",
        symbol: "pH"
      },
      ppm: {
        name: "part per million",
        pluralName: "parts per million",
        symbol: "ppm"
      }
    }
  };
});

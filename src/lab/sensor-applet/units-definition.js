/*global define: false*/

// The keys are taken from the values of the 'measurementType' property
// of the elements of ./sensor-definitions

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
      light: {
        name: "lux",
        pluralName: "lux",
        symbol: "lux"
      },
      force: {
        name: "Newton",
        pluralName: "Newtons",
        symbol: "N"
      },
      ph: {
        name: "pH Unit",
        pluralName: "pH Units",
        symbol: "pH"
      },
      co2: {
        name: "part per million",
        pluralName: "parts per million",
        symbol: "ppm"
      },
      o2: {
        name: "part per million",
        pluralName: "parts per million",
        symbol: "ppm"
      }
    }
  };
});

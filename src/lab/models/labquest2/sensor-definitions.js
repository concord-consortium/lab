define(function() {
  // Information about sensor types, indexed by the units reported by the LabQuest2.

  return {
    lux: {
      sensorName: "light sensor",
      measurementName: "Light",
      measurementType: "light",
      tareable: false,
      minReading: 0,
      maxReading: 2000
    },

    m: {
      sensorName: "motion sensor",
      measurementName: "Distance",
      measurementType: "distance",
      tareable: true,
      minReading: 0,
      maxReading: 4
    }
  };
});

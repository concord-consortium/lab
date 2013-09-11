/*global define: false*/

define(function() {
  return {
    goMotion: {
      appletClass: 'goio',

      // Name of the measurement being made, for display in UI
      measurementName: "Distance",

      // measurement type, as accepted by applet's getSensorRequest method
      measurementType: 'distance',

      // measurement type, as returned by getTypeConstantName method.
      // The returned values are taken from the QUANTITY_* constants in the sensor project
      // See https://github.com/concord-consortium/sensor/blob/2da0693e4d92d8c107be802f29eab2688a83b26b/src/main/java/org/concord/sensor/SensorConfig.java
      typeConstantName: 'distance',

      // fully specified, readable name of the sensor: e.g., "GoIO pH Sensor"
      sensorName: "GoMotion",

      // readable name of the interface device the sensor connects to, e..g, "GoIO"
      deviceName: "GoMotion",

      samplesPerSecond: 20,
      tareable: true
    },

    goLinkTemperature: {
      appletClass: 'goio',
      measurementName: "Temperature",
      measurementType: 'temperature',
      // QUANTITY_TEMPERATURE
      typeConstantName: 'temperature',
      sensorName: "GoIO Temperature Sensor",
      deviceName: "GoIO",
      samplesPerSecond: 10,
      tareable: false
    },

    goLinkLight: {
      appletClass: 'goio',
      measurementName: "Light Intensity",
      measurementType: 'light',
      // QUANTITY_LIGHT
      typeConstantName: 'light',
      sensorName: "GoIO Light Sensor",
      deviceName: "GoIO",
      samplesPerSecond: 10,
      tareable: false
    },

    goLinkForce: {
      appletClass: 'goio',
      measurementName: "Force",
      measurementType: 'force',
      // QUANTITY_FORCE
      typeConstantName: 'force',
      sensorName: "GoIO Force Sensor",
      deviceName: "GoIO",
      samplesPerSecond: 20,
      tareable: true
    },

    goLinkPH: {
      appletClass: 'goio',
      measurementName: "Acidity",
      measurementType: 'ph',
      // QUANTITY_PH
      typeConstantName: 'ph',
      sensorName: "GoIO pH Sensor",
      deviceName: "GoIO",
      samplesPerSecond: 10,
      tareable: false
    },

    goLinkCO2: {
      appletClass: 'goio',
      measurementName: "CO₂ Concentration",
      measurementType: 'co2',
      // QUANTITY_CO2_GAS
      typeConstantName: 'co2_gas',
      sensorName: "GoIO CO₂ sensor",
      deviceName: "GoIO",
      samplesPerSecond: 1,
      tareable: false
    },

    goLinkO2: {
      appletClass: 'goio',
      measurementName: "O₂ Concentration",
      measurementType: 'o2',
      // QUANTITY_OXYGEN_GAS
      typeConstantName: 'oxygen_gas',
      sensorName: "GoIO O₂ sensor",
      deviceName: "GoIO",
      samplesPerSecond: 1,
      tareable: false
    },

    labQuestMotion: {
      appletClass: 'labquest',
      measurementName: "Distance",
      measurementType: 'distance',
      // QUANTITY_DISTANCE
      typeConstantName: 'distance',
      sensorName: "LabQuest Motion Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 20,
      tareable: true
    },

    labQuestTemperature: {
      appletClass: 'labquest',
      measurementName: "Temperature",
      measurementType: 'temperature',
      // QUANTITY_TEMPERATURE
      typeConstantName: 'temperature',
      sensorName: "LabQuest Temperature Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 10,
      tareable: false
    },

    labQuestLight: {
      appletClass: 'labquest',
      measurementName: "Light Intensity",
      measurementType: 'light',
      // QUANTITY_LIGHT
      typeConstantName: 'light',
      sensorName: "LabQuest Light Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 10,
      tareable: false
    },

    labQuestForce: {
      appletClass: 'labquest',
      measurementName: "Force",
      measurementType: 'force',
      // QUANTITY_FORCE
      typeConstantName: 'force',
      sensorName: "LabQuest Force Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 20,
      tareable: true
    },

    labQuestPH: {
      appletClass: 'labquest',
      measurementName: "Acidity",
      measurementType: 'ph',
      // QUANTITY_PH
      typeConstantName: 'ph',
      sensorName: "LabQuest pH Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 10,
      tareable: false
    },

    labQuestCO2: {
      appletClass: 'labquest',
      measurementName: "CO₂ Concentration",
      measurementType: 'co2',
      // QUANTITY_CO2_GAS
      typeConstantName: 'co2_gas',
      sensorName: "LabQuest CO₂ sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 1,
      tareable: false
    },

    labQuestO2: {
      appletClass: 'labquest',
      measurementName: "O₂ Concentration",
      measurementType: 'o2',
      // QUANTITY_OXYGEN_GAS
      typeConstantName: 'oxygen_gas',
      sensorName: "LabQuest O₂ sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 1,
      tareable: false
    }
  };
});

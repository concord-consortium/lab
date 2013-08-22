/*global define: false*/

define(function() {
  return {
    goMotion: {
      appletClass: 'goio',
      measurementType: 'distance',

      // fully specified, readable name of the sensor: e.g., "GoIO pH Sensor"
      sensorName: "GoMotion",

      // readable name of the interface device the sensor connects to, e..g, "GoIO"
      deviceName: "GoMotion",

      samplesPerSecond: 20,
      tareable: true
    },

    goLinkTemperature: {
      appletClass: 'goio',
      measurementType: 'temperature',
      sensorName: "GoIO Temperature Sensor",
      deviceName: "GoIO",
      samplesPerSecond: 10,
      tareable: false
    },

    goLinkLight: {
      appletClass: 'goio',
      measurementType: 'lightIntensity',
      sensorName: "GoIO Light Sensor",
      deviceName: "GoIO",
      samplesPerSecond: 10,
      tareable: false
    },

    goLinkForce: {
      appletClass: 'goio',
      measurementType: 'force',
      sensorName: "GoIO Force Sensor",
      deviceName: "GoIO",
      samplesPerSecond: 20,
      tareable: true
    },

    goLinkPH: {
      appletClass: 'goio',
      measurementType: 'pH',
      sensorName: "GoIO pH Sensor",
      deviceName: "GoIO",
      samplesPerSecond: 10,
      tareable: false
    },

    goLinkCO2: {
      appletClass: 'goio',
      sensorName: "GoIO CO₂ sensor",
      deviceName: "GoIO",
      measurementType: 'ppm',
      samplesPerSecond: 1,
      tareable: false
    },

    goLinkO2: {
      appletClass: 'goio',
      sensorName: "GoIO O₂ sensor",
      deviceName: "GoIO",
      measurementType: 'ppm',
      samplesPerSecond: 1,
      tareable: false
    },

    labQuestMotion: {
      appletClass: 'labquest',
      measurementType: 'distance',
      sensorName: "LabQuest Motion Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 20,
      tareable: true
    },

    labQuestTemperature: {
      appletClass: 'labquest',
      measurementType: 'temperature',
      sensorName: "LabQuest Temperature Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 10,
      tareable: false
    },

    labQuestLight: {
      appletClass: 'labquest',
      measurementType: 'lightIntensity',
      sensorName: "LabQuest Light Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 10,
      tareable: false
    },

    labQuestForce: {
      appletClass: 'labquest',
      measurementType: 'force',
      sensorName: "LabQuest Force Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 20,
      tareable: true
    },

    labQuestPH: {
      appletClass: 'labquest',
      measurementType: 'pH',
      sensorName: "LabQuest pH Sensor",
      deviceName: "LabQuest",
      samplesPerSecond: 10,
      tareable: false
    },

    labQuestCO2: {
      appletClass: 'labquest',
      sensorName: "LabQuest CO₂ sensor",
      deviceName: "LabQuest",
      measurementType: 'ppm',
      samplesPerSecond: 1,
      tareable: false
    },

    labQuestO2: {
      appletClass: 'labquest',
      sensorName: "LabQuest O₂ sensor",
      deviceName: "LabQuest",
      measurementType: 'ppm',
      samplesPerSecond: 1,
      tareable: false
    }
  };
});

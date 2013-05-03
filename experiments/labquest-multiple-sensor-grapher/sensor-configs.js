SENSOR_CONFIGS = {
  "LabQuest temperature": {
    "graphOptions": {
      title: "LabQuest Temperature Sensor",
      xlabel:    "Time (s)",
      xmin: 0, xmax: 60,
      ylabel:    "Temperature, (Degrees C)",
      ymin: 10, ymax: 40,
      realTime: true,
      sampleInterval: 0.1,
      markAllDataPoints: false,
      dataChange: false
    },
    "sensor": {
      "deviceType": "labquest",
      "sensors": [
        { "type": "temperature" }
      ]
    }
  },
  "LabQuest distance": {
    "graphOptions": {
      title: "LabQuest Distance Sensor",
      xlabel:    "Time (s)",
      xmin: 0, xmax: 20,
      ylabel:    "Distance, (m)",
      ymin: 0, ymax: 4,
      realTime: true,
      sampleInterval: 0.05,
      markAllDataPoints: false,
      dataChange: false
    },
    "sensor": {
      "deviceType": "labquest",
      "sensors": [
        { "type": "distance" }
      ]
    }
  },
  "LabQuest force (5N)": {
    "graphOptions": {
      title: "LabQuest Force (5N) Sensor",
      xlabel:    "Time (s)",
      xmin: 0, xmax: 20,
      ylabel:    "Force, (N)",
      ymin: -5, ymax: 5,
      realTime: true,
      sampleInterval: 0.05,
      markAllDataPoints: false,
      dataChange: false
    },
    "sensor": {
      "deviceType": "labquest",
      "sensors": [
        { "type": "force 5n" }
      ]
    }
  },
  "LabQuest force (50N)": {
    "graphOptions": {
      title: "LabQuest Force (50N) Sensor",
      xlabel:    "Time (s)",
      xmin: 0, xmax: 20,
      ylabel:    "Force, (N)",
      ymin: -50, ymax: 50,
      realTime: true,
      sampleInterval: 0.05,
      markAllDataPoints: false,
      dataChange: false
    },
    "sensor": {
      "deviceType": "labquest",
      "sensors": [
        { "type": "force 50n" }
      ]
    }
  },
  "LabQuest CO2": {
    "graphOptions": {
      title: "LabQuest CO2 Sensor",
      xlabel:    "Time (s)",
      xmin: 0, xmax: 60,
      ylabel:    "CO2, (ppm)",
      ymin: 0, ymax: 5000,
      realTime: true,
      sampleInterval: 1.0,
      markAllDataPoints: false,
      dataChange: false
    },
    "sensor": {
      "deviceType": "labquest",
      "sensors": [
        { "type": "co2" }
      ]
    }
  },
  "LabQuest O2": {
    "graphOptions": {
      title: "LabQuest O2 Sensor",
      xlabel:    "Time (s)",
      xmin: 0, xmax: 60,
      ylabel:    "O2, (%)",
      ymin: 0, ymax: 100,
      realTime: true,
      sampleInterval: 1.0,
      markAllDataPoints: false,
      dataChange: false
    },
    "sensor": {
      "deviceType": "labquest",
      "sensors": [
        { "type": "o2" }
      ]
    }
  },
  "LabQuest pH": {
    "graphOptions": {
      title: "LabQuest pH Sensor",
      xlabel:    "Time (s)",
      xmin: 0, xmax: 60,
      ylabel:    "pH, (pH)",
      ymin: 0, ymax: 14,
      realTime: true,
      sampleInterval: 0.1,
      markAllDataPoints: false,
      dataChange: false
    },
    "sensor": {
      "deviceType": "labquest",
      "sensors": [
        { "type": "ph" }
      ]
    }
  },
  "LabQuest light": {
    "graphOptions": {
      title: "LabQuest Light Sensor",
      xlabel:    "Time (s)",
      xmin: 0, xmax: 60,
      ylabel:    "Light, (Lux)",
      ymin: 0, ymax: 10000,
      realTime: true,
      sampleInterval: 0.1,
      markAllDataPoints: false,
      dataChange: false
    },
    "sensor": {
      "deviceType": "labquest",
      "sensors": [
        { "type": "light" }
      ]
    }
  },
  "Pseudo Sound": {
    "graphOptions": {
      title: "Pseudo Sound Sensor",
      xlabel:    "Time (s)",
      xmin: 0, xmax: 60,
      ylabel:    "Sound level, (db)",
      ymin: 0, ymax: 120,
      realTime: true,
      sampleInterval: 0.1,
      markAllDataPoints: false,
      dataChange: false
    },
    "sensor": {
      "deviceType": "pseudo",
      "sensors": [
        {
          "type": "manual",
          "precision": 1,
          "min": 0.0,
          "max": 120.0,
          "stepSize": 1.0,
          "sensorType": 14
        }
      ]
    }
  }
};

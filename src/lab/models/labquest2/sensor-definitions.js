define(function() {
  // Information about sensor types, indexed by the units reported by the LabQuest2.

  return {
    "lux": {
      "sensorName": "Light",
      "measurementName": "Illumination",
      "measurementType": "illumination",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 6000.0
    },
    "m": {
      "sensorName": "Motion",
      "measurementName": "Position",
      "measurementType": "position",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 2.0
    },
    "m/s²": {
      "sensorName": "Accelerometer",
      "measurementName": "Acceleration",
      "measurementType": "acceleration",
      "tareable": true,
      "minReading": -50.0,
      "maxReading": 50.0
    },
    "g": {
      "sensorName": "Accelerometer",
      "measurementName": "Acceleration",
      "measurementType": "acceleration",
      "tareable": true,
      "minReading": -5.0,
      "maxReading": 5.0
    },
    "N/kg": {
      "sensorName": "Accelerometer",
      "measurementName": "Acceleration",
      "measurementType": "acceleration",
      "tareable": true,
      "minReading": -25.0,
      "maxReading": 25.0
    },
    "mg/L": {
      "sensorName": "Dissolved Oxygen",
      "measurementName": "DO",
      "measurementType": "do",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 12.0
    },
    "kPa": {
      "sensorName": "Pressure",
      "measurementName": "Pressure",
      "measurementType": "pressure",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 220.0
    },
    "mm Hg": {
      "sensorName": "Pressure",
      "measurementName": "Pressure",
      "measurementType": "pressure",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 2000.0
    },
    "in Hg": {
      "sensorName": "Pressure",
      "measurementName": "Pressure",
      "measurementType": "pressure",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 80.0
    },
    "mbar": {
      "sensorName": "Pressure",
      "measurementName": "Pressure",
      "measurementType": "pressure",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 2200.0
    },
    "psi": {
      "sensorName": "Pressure",
      "measurementName": "Pressure",
      "measurementType": "pressure",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 40.0
    },
    "atm": {
      "sensorName": "Pressure",
      "measurementName": "Pressure",
      "measurementType": "pressure",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 2.5
    },
    "torr": {
      "sensorName": "Pressure",
      "measurementName": "Pressure",
      "measurementType": "pressure",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 2000.0
    },
    "nC": {
      "sensorName": "Charge Sensor",
      "measurementName": "Charge",
      "measurementType": "charge",
      "tareable": false,
      "minReading": -20.0,
      "maxReading": 20.0
    },
    "V": {
      "sensorName": "Voltage",
      "measurementName": "Potential",
      "measurementType": "potential",
      "tareable": true,
      "minReading": -30.0,
      "maxReading": 30.0
    },
    "ppm": {
      "sensorName": "CO2 Gas",
      "measurementName": "CO2",
      "measurementType": "co2",
      "tareable": false,
      "minReading": 0.0,
      "maxReading": 5000.0
    },
    "ppt": {
      "sensorName": "CO2 Gas",
      "measurementName": "CO2",
      "measurementType": "co2",
      "tareable": false,
      "minReading": 0.0,
      "maxReading": 5.0
    },
    "%": {
      "sensorName": "CO2 Gas",
      "measurementName": "CO2",
      "measurementType": "co2",
      "tareable": false,
      "minReading": 0.0,
      "maxReading": 0.5
    },
    "%T": {
      "sensorName": "Colorimeter",
      "measurementName": "Transmittance",
      "measurementType": "transmittance",
      "tareable": false,
      "minReading": 0.0,
      "maxReading": 100.0
    },
    "µS/cm": {
      "sensorName": "Conductivity",
      "measurementName": "Conductivity",
      "measurementType": "conductivity",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 2000.0
    },
    "dS/m": {
      "sensorName": "Conductivity",
      "measurementName": "Conductivity",
      "measurementType": "conductivity",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 2.0
    },
    "A": {
      "sensorName": "Current",
      "measurementName": "Current",
      "measurementType": "current",
      "tareable": true,
      "minReading": -1.2,
      "maxReading": 1.2
    },
    "mA": {
      "sensorName": "Current",
      "measurementName": "Current",
      "measurementType": "current",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 500.0
    },
    "°C": {
      "sensorName": "Temperature",
      "measurementName": "Temperature",
      "measurementType": "temperature",
      "tareable": false,
      "minReading": 0.0,
      "maxReading": 50.0
    },
    "degC": {
      "sensorName": "Temperature",
      "measurementName": "Temperature",
      "measurementType": "temperature",
      "tareable": false,
      "minReading": 0.0,
      "maxReading": 50.0
    },
    "°F": {
      "sensorName": "Temperature",
      "measurementName": "Temperature",
      "measurementType": "temperature",
      "tareable": false,
      "minReading": 30.0,
      "maxReading": 100.0
    },
    "degF": {
      "sensorName": "Temperature",
      "measurementName": "Temperature",
      "measurementType": "temperature",
      "tareable": false,
      "minReading": 30.0,
      "maxReading": 100.0
    },
    "K": {
      "sensorName": "Temperature",
      "measurementName": "Temperature",
      "measurementType": "temperature",
      "tareable": false,
      "minReading": 250.0,
      "maxReading": 400.0
    },
    "N": {
      "sensorName": "Force",
      "measurementName": "Force",
      "measurementType": "force",
      "tareable": true,
      "minReading": -50.0,
      "maxReading": 50.0
    },
    "lb": {
      "sensorName": "Force",
      "measurementName": "Force",
      "measurementType": "force",
      "tareable": true,
      "minReading": -12.5,
      "maxReading": 12.5
    },
    "mV": {
      "sensorName": null,
      "measurementName": "Potential",
      "measurementType": "potential",
      "tareable": true,
      "minReading": -500.0,
      "maxReading": 1100.0
    },
    "m/s": {
      "sensorName": "Motion",
      "measurementName": "Velocity",
      "measurementType": "velocity",
      "tareable": true,
      "minReading": -5.0,
      "maxReading": 5.0
    },
    "ft/s": {
      "sensorName": "Anemometer",
      "measurementName": "Speed",
      "measurementType": "speed",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 100.0
    },
    "ft": {
      "sensorName": "Motion",
      "measurementName": "Position",
      "measurementType": "position",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 6.0
    },
    "kg": {
      "sensorName": "Hand Dynamometer",
      "measurementName": "Force",
      "measurementType": "force",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 50.0
    },
    "v": {
      "sensorName": "Heart Rate",
      "measurementName": "Signal",
      "measurementType": "signal",
      "tareable": false,
      "minReading": 0.0,
      "maxReading": 3.0
    },
    "mT": {
      "sensorName": "Magnetic Field",
      "measurementName": "Magnetic Field",
      "measurementType": "magnetic field",
      "tareable": true,
      "minReading": -8.0,
      "maxReading": 8.0
    },
    "G": {
      "sensorName": "Magnetic Field",
      "measurementName": "Magnetic Field",
      "measurementType": "magnetic field",
      "tareable": true,
      "minReading": -80.0,
      "maxReading": 80.0
    },
    "rad": {
      "sensorName": "Rotary Motion",
      "measurementName": "Angle",
      "measurementType": "angle",
      "tareable": true,
      "minReading": -15.0,
      "maxReading": 15.0
    },
    "°": {
      "sensorName": "Rotary Motion",
      "measurementName": "Angle",
      "measurementType": "angle",
      "tareable": true,
      "minReading": -1000.0,
      "maxReading": 1000.0
    },
    "cm": {
      "sensorName": "Linear Position Sensor",
      "measurementName": "Position",
      "measurementType": "position",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 15.0
    },
    "dB": {
      "sensorName": "Sound Level",
      "measurementName": "Sound Level",
      "measurementType": "sound level",
      "tareable": true,
      "minReading": 40.0,
      "maxReading": 110.0
    },
    "rel": {
      "sensorName": "Spectrophotometer",
      "measurementName": "Intensity",
      "measurementType": "intensity",
      "tareable": false,
      "minReading": 0.0,
      "maxReading": 1.0
    },
    "Rel": {
      "sensorName": "Spectrophotometer",
      "measurementName": "Fluorescence 405 nm",
      "measurementType": "fluorescence 405 nm",
      "tareable": false,
      "minReading": 0.0,
      "maxReading": 1.0
    },
    "Rel.": {
      "sensorName": "Spectrophotometer",
      "measurementName": "Fluorescence 500 nm",
      "measurementType": "fluorescence 500 nm",
      "tareable": false,
      "minReading": 0.0,
      "maxReading": 1.0
    },
    "L/s": {
      "sensorName": "Spirometer",
      "measurementName": "Flow Rate",
      "measurementType": "flow rate",
      "tareable": true,
      "minReading": -4.0,
      "maxReading": 4.0
    },
    "mL/s": {
      "sensorName": "Spirometer",
      "measurementName": "Flow Rate",
      "measurementType": "flow rate",
      "tareable": true,
      "minReading": -4000.0,
      "maxReading": 4000.0
    },
    "NTU": {
      "sensorName": "Turbidity",
      "measurementName": "Turbidity",
      "measurementType": "turbidity",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 50.0
    },
    "mW/m²": {
      "sensorName": "UV Sensor",
      "measurementName": "UV Intensity",
      "measurementType": "uv intensity",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 20000.0
    },
    "mL": {
      "sensorName": "Drop Counter",
      "measurementName": "Volume",
      "measurementType": "volume",
      "tareable": false,
      "minReading": 0.0,
      "maxReading": 3.0
    },
    "f": {
      "sensorName": "Altitude",
      "measurementName": "Altitude",
      "measurementType": "altitude",
      "tareable": true,
      "minReading": -300.0,
      "maxReading": 300.0
    },
    "mph": {
      "sensorName": "Anemometer",
      "measurementName": "Speed",
      "measurementType": "speed",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 10.0
    },
    "km/h": {
      "sensorName": "Anemometer",
      "measurementName": "Speed",
      "measurementType": "speed",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 20.0
    },
    "knots": {
      "sensorName": "Anemometer",
      "measurementName": "Speed",
      "measurementType": "speed",
      "tareable": true,
      "minReading": 0.0,
      "maxReading": 50.0
    }
  };
});

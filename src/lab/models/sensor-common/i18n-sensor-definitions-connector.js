define(function() {
  // Information about sensor types, indexed by the units reported by the LabQuest2.
  return function(i18n) {
    return {
      "lux": {
        "sensorName": i18n.t("sensor.names.light"),
        "measurementName": i18n.t("sensor.measurements.light_level"),
        "measurementType": "light level",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 2000.0
      },
      "m": {
        "sensorName": i18n.t("sensor.names.motion"),
        "measurementName": i18n.t("sensor.measurements.position"),
        "measurementType": "position",
        "tareable": true,
        "minReading": -2.0,
        "maxReading": 2.0
      },
      "m/s²": {
        "sensorName": i18n.t("sensor.names.accelerometer"),
        "measurementName": i18n.t("sensor.measurements.acceleration"),
        "measurementType": "acceleration",
        "tareable": true,
        "minReading": -50.0,
        "maxReading": 50.0
      },
      "m/s^2": {
        "sensorName": i18n.t("sensor.names.accelerometer"),
        "measurementName": i18n.t("sensor.measurements.acceleration"),
        "measurementType": "acceleration",
        "tareable": true,
        "minReading": -50.0,
        "maxReading": 50.0
      },
      "g": {
        "sensorName": i18n.t("sensor.names.accelerometer"),
        "measurementName": i18n.t("sensor.measurements.acceleration"),
        "measurementType": "acceleration",
        "tareable": true,
        "minReading": -5.0,
        "maxReading": 5.0
      },
      "N/kg": {
        "sensorName": i18n.t("sensor.names.accelerometer"),
        "measurementName": i18n.t("sensor.measurements.acceleration"),
        "measurementType": "acceleration",
        "tareable": true,
        "minReading": -25.0,
        "maxReading": 25.0
      },
      "mg/L": {
        "sensorName": i18n.t("sensor.names.dissolved_oxygen"),
        "measurementName": i18n.t("sensor.measurements.dissolved_oxygen"),
        "measurementType": "do",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 12.0
      },
      "kPa": {
        "sensorName": i18n.t("sensor.names.pressure"),
        "measurementName": i18n.t("sensor.measurements.pressure"),
        "measurementType": "pressure",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 220.0
      },
      "mm Hg": {
        "sensorName": i18n.t("sensor.names.pressure"),
        "measurementName": i18n.t("sensor.measurements.pressure"),
        "measurementType": "pressure",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 2000.0
      },
      "in Hg": {
        "sensorName": i18n.t("sensor.names.pressure"),
        "measurementName": i18n.t("sensor.measurements.pressure"),
        "measurementType": "pressure",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 80.0
      },
      "mbar": {
        "sensorName": i18n.t("sensor.names.pressure"),
        "measurementName": i18n.t("sensor.measurements.pressure"),
        "measurementType": "pressure",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 2200.0
      },
      "psi": {
        "sensorName": i18n.t("sensor.names.pressure"),
        "measurementName": i18n.t("sensor.measurements.pressure"),
        "measurementType": "pressure",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 40.0
      },
      "atm": {
        "sensorName": i18n.t("sensor.names.pressure"),
        "measurementName": i18n.t("sensor.measurements.pressure"),
        "measurementType": "pressure",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 2.5
      },
      "torr": {
        "sensorName": i18n.t("sensor.names.pressure"),
        "measurementName": i18n.t("sensor.measurements.pressure"),
        "measurementType": "pressure",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 2000.0
      },
      "nC": {
        "sensorName": i18n.t("sensor.names.charge_sensor"),
        "measurementName": i18n.t("sensor.measurements.charge"),
        "measurementType": "charge",
        "tareable": false,
        "minReading": -20.0,
        "maxReading": 20.0
      },
      "V": {
        "sensorName": i18n.t("sensor.names.voltage"),
        "measurementName": i18n.t("sensor.measurements.potential"),
        "measurementType": "potential",
        "tareable": true,
        "minReading": -30.0,
        "maxReading": 30.0
      },
      "pH": {
        "sensorName": i18n.t("sensor.names.pH"),
        "measurementName": i18n.t("sensor.measurements.pH"),
        "measurementType": "ph",
        "tareable": false,
        "minReading": 0.0,
        "maxReading": 14.0
      },
      "ppm": {
        "sensorName": i18n.t("sensor.names.CO2_gas"),
        "measurementName": i18n.t("sensor.measurements.CO2"),
        "measurementType": "co2",
        "tareable": false,
        "minReading": 0.0,
        "maxReading": 5000.0
      },
      "ppt": {
        "sensorName": i18n.t("sensor.names.CO2_gas"),
        "measurementName": i18n.t("sensor.measurements.CO2"),
        "measurementType": "co2",
        "tareable": false,
        "minReading": 0.0,
        "maxReading": 5.0
      },
      "%": {
        "sensorName": i18n.t("sensor.names.CO2_gas"),
        "measurementName": i18n.t("sensor.measurements.CO2"),
        "measurementType": "co2",
        "tareable": false,
        "minReading": 0.0,
        "maxReading": 0.5
      },
      "%T": {
        "sensorName": i18n.t("sensor.names.colorimeter"),
        "measurementName": i18n.t("sensor.measurements.transmittance"),
        "measurementType": "transmittance",
        "tareable": false,
        "minReading": 0.0,
        "maxReading": 100.0
      },
      "µS/cm": {
        "sensorName": i18n.t("sensor.names.conductivity"),
        "measurementName": i18n.t("sensor.measurements.conductivity"),
        "measurementType": "conductivity",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 2000.0
      },
      "dS/m": {
        "sensorName": i18n.t("sensor.names.conductivity"),
        "measurementName": i18n.t("sensor.measurements.conductivity"),
        "measurementType": "conductivity",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 2.0
      },
      "A": {
        "sensorName": i18n.t("sensor.names.current"),
        "measurementName": i18n.t("sensor.measurements.current"),
        "measurementType": "current",
        "tareable": true,
        "minReading": -1.2,
        "maxReading": 1.2
      },
      "mA": {
        "sensorName": i18n.t("sensor.names.current"),
        "measurementName": i18n.t("sensor.measurements.current"),
        "measurementType": "current",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 500.0
      },
      "°C": {
        "sensorName": i18n.t("sensor.names.temperature"),
        "measurementName": i18n.t("sensor.measurements.temperature"),
        "measurementType": "temperature",
        "tareable": false,
        "minReading": 0.0,
        "maxReading": 40.0
      },
      "degC": {
        "sensorName": i18n.t("sensor.names.temperature"),
        "measurementName": i18n.t("sensor.measurements.temperature"),
        "measurementType": "temperature",
        "tareable": false,
        "minReading": 0.0,
        "maxReading": 40.0
      },
      "°F": {
        "sensorName": i18n.t("sensor.names.temperature"),
        "measurementName": i18n.t("sensor.measurements.temperature"),
        "measurementType": "temperature",
        "tareable": false,
        "minReading": 30.0,
        "maxReading": 100.0
      },
      "degF": {
        "sensorName": i18n.t("sensor.names.temperature"),
        "measurementName": i18n.t("sensor.measurements.temperature"),
        "measurementType": "temperature",
        "tareable": false,
        "minReading": 30.0,
        "maxReading": 100.0
      },
      "K": {
        "sensorName": i18n.t("sensor.names.temperature"),
        "measurementName": i18n.t("sensor.measurements.temperature"),
        "measurementType": "temperature",
        "tareable": false,
        "minReading": 250.0,
        "maxReading": 400.0
      },
      "N": {
        "sensorName": i18n.t("sensor.names.force"),
        "measurementName": i18n.t("sensor.measurements.force"),
        "measurementType": "force",
        "tareable": true,
        "minReading": -50.0,
        "maxReading": 50.0
      },
      "lb": {
        "sensorName": i18n.t("sensor.names.force"),
        "measurementName": i18n.t("sensor.measurements.force"),
        "measurementType": "force",
        "tareable": true,
        "minReading": -12.5,
        "maxReading": 12.5
      },
      "mV": {
        "sensorName": null,
        "measurementName": i18n.t("sensor.measurements.potential"),
        "measurementType": "potential",
        "tareable": true,
        "minReading": -500.0,
        "maxReading": 1100.0
      },
      "m/s": {
        "sensorName": i18n.t("sensor.names.motion"),
        "measurementName": i18n.t("sensor.measurements.velocity"),
        "measurementType": "velocity",
        "tareable": true,
        "minReading": -5.0,
        "maxReading": 5.0
      },
      "ft/s": {
        "sensorName": i18n.t("sensor.names.anemometer"),
        "measurementName": i18n.t("sensor.measurements.speed"),
        "measurementType": "speed",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 100.0
      },
      "ft": {
        "sensorName": i18n.t("sensor.names.motion"),
        "measurementName": i18n.t("sensor.measurements.position"),
        "measurementType": "position",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 6.0
      },
      "kg": {
        "sensorName": i18n.t("sensor.names.hand_dynamometer"),
        "measurementName": i18n.t("sensor.measurements.force"),
        "measurementType": "force",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 50.0
      },
      "v": {
        "sensorName": i18n.t("sensor.names.heart_rate"),
        "measurementName": i18n.t("sensor.measurements.signal"),
        "measurementType": "signal",
        "tareable": false,
        "minReading": 0.0,
        "maxReading": 3.0
      },
      "mT": {
        "sensorName": i18n.t("sensor.names.magnetic_field"),
        "measurementName": i18n.t("sensor.measurements.magnetic_field"),
        "measurementType": "magnetic field",
        "tareable": true,
        "minReading": -8.0,
        "maxReading": 8.0
      },
      "G": {
        "sensorName": i18n.t("sensor.names.magnetic_field"),
        "measurementName": i18n.t("sensor.measurements.magnetic_field"),
        "measurementType": "magnetic field",
        "tareable": true,
        "minReading": -80.0,
        "maxReading": 80.0
      },
      "rad": {
        "sensorName": i18n.t("sensor.names.rotary_motion"),
        "measurementName": i18n.t("sensor.measurements.angle"),
        "measurementType": "angle",
        "tareable": true,
        "minReading": -15.0,
        "maxReading": 15.0
      },
      "°": {
        "sensorName": i18n.t("sensor.names.rotary_motion"),
        "measurementName": i18n.t("sensor.measurements.angle"),
        "measurementType": "angle",
        "tareable": true,
        "minReading": -1000.0,
        "maxReading": 1000.0
      },
      "cm": {
        "sensorName": i18n.t("sensor.names.linear_position_sensor"),
        "measurementName": i18n.t("sensor.measurements.position"),
        "measurementType": "position",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 15.0
      },
      "dB": {
        "sensorName": i18n.t("sensor.names.sound_level"),
        "measurementName": i18n.t("sensor.measurements.sound_level"),
        "measurementType": "sound level",
        "tareable": true,
        "minReading": 40.0,
        "maxReading": 110.0
      },
      "dbA": {
        "sensorName": i18n.t("sensor.names.sound_level"),
        "measurementName": i18n.t("sensor.measurements.sound_level"),
        "measurementType": "sound level",
        "tareable": true,
        "minReading": 40.0,
        "maxReading": 110.0
      },
      "rel": {
        "sensorName": i18n.t("sensor.names.spectrophotometer"),
        "measurementName": i18n.t("sensor.measurements.intensity"),
        "measurementType": "intensity",
        "tareable": false,
        "minReading": 0.0,
        "maxReading": 1.0
      },
      "Rel": {
        "sensorName": i18n.t("sensor.names.spectrophotometer"),
        "measurementName": i18n.t("sensor.measurements.fluorescence_405_nm"),
        "measurementType": "fluorescence 405 nm",
        "tareable": false,
        "minReading": 0.0,
        "maxReading": 1.0
      },
      "Rel.": {
        "sensorName": i18n.t("sensor.names.spectrophotometer"),
        "measurementName": i18n.t("sensor.measurements.fluorescence_500_nm"),
        "measurementType": "fluorescence 500 nm",
        "tareable": false,
        "minReading": 0.0,
        "maxReading": 1.0
      },
      "L/s": {
        "sensorName": i18n.t("sensor.names.spirometer"),
        "measurementName": i18n.t("sensor.measurements.flow_rate"),
        "measurementType": "flow rate",
        "tareable": true,
        "minReading": -4.0,
        "maxReading": 4.0
      },
      "mL/s": {
        "sensorName": i18n.t("sensor.names.spirometer"),
        "measurementName": i18n.t("sensor.measurements.flow_rate"),
        "measurementType": "flow rate",
        "tareable": true,
        "minReading": -4000.0,
        "maxReading": 4000.0
      },
      "NTU": {
        "sensorName": i18n.t("sensor.names.turbidity"),
        "measurementName": i18n.t("sensor.measurements.turbidity"),
        "measurementType": "turbidity",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 50.0
      },
      "mW/m²": {
        "sensorName": i18n.t("sensor.names.UV_sensor"),
        "measurementName": i18n.t("sensor.measurements.UV_intensity"),
        "measurementType": "uv intensity",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 20000.0
      },
      "mL": {
        "sensorName": i18n.t("sensor.names.drop_counter"),
        "measurementName": i18n.t("sensor.measurements.volume"),
        "measurementType": "volume",
        "tareable": false,
        "minReading": 0.0,
        "maxReading": 3.0
      },
      "f": {
        "sensorName": i18n.t("sensor.names.altitude"),
        "measurementName": i18n.t("sensor.measurements.altitude"),
        "measurementType": "altitude",
        "tareable": true,
        "minReading": -300.0,
        "maxReading": 300.0
      },
      "mph": {
        "sensorName": i18n.t("sensor.names.anemometer"),
        "measurementName": i18n.t("sensor.measurements.speed"),
        "measurementType": "speed",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 10.0
      },
      "km/h": {
        "sensorName": i18n.t("sensor.names.anemometer"),
        "measurementName": i18n.t("sensor.measurements.speed"),
        "measurementType": "speed",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 20.0
      },
      "knots": {
        "sensorName": i18n.t("sensor.names.anemometer"),
        "measurementName": i18n.t("sensor.measurements.speed"),
        "measurementType": "speed",
        "tareable": true,
        "minReading": 0.0,
        "maxReading": 50.0
      }
    };
  };
});

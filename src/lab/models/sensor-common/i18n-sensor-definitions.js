define(function(require) {
  var sensorDefinitions = require('sensor-applet').sensorDefinitions;

  return function getTranslatedSensorDefinitions(i18n) {
    sensorDefinitions.goMotion.measurementName = i18n.t("sensor.measurements.distance");
    sensorDefinitions.goTemp.measurementName = i18n.t("sensor.measurements.temperature");
    sensorDefinitions.goLinkTemperature.measurementName = i18n.t("sensor.measurements.temperature");
    sensorDefinitions.goLinkLight.measurementName = i18n.t("sensor.measurements.light_intensity");
    sensorDefinitions.goLinkForce.measurementName = i18n.t("sensor.measurements.force");
    sensorDefinitions.goLinkPH.measurementName = i18n.t("sensor.measurements.acidity");
    sensorDefinitions.goLinkCO2.measurementName = i18n.t("sensor.measurements.CO2_concentration");
    sensorDefinitions.goLinkO2.measurementName = i18n.t("sensor.measurements.O2_concentration");
    sensorDefinitions.labQuestMotion.measurementName = i18n.t("sensor.measurements.distance");
    sensorDefinitions.labQuestTemperature.measurementName = i18n.t("sensor.measurements.temperature");
    sensorDefinitions.labQuestLight.measurementName = i18n.t("sensor.measurements.light_intensity");
    sensorDefinitions.labQuestForce.measurementName = i18n.t("sensor.measurements.force");
    sensorDefinitions.labQuestPH.measurementName = i18n.t("sensor.measurements.acidity");
    sensorDefinitions.labQuestCO2.measurementName = i18n.t("sensor.measurements.CO2_concentration");
    sensorDefinitions.labQuestO2.measurementName = i18n.t("sensor.measurements.O2_concentration");
    return sensorDefinitions;
  };
});

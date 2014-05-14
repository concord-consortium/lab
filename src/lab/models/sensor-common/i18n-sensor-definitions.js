define(function(require) {
  var sensorDefinitions = require('sensor-applet').sensorDefinitions;

  return function getTranslatedSensorDefinitions(i18n) {
    sensorDefinitions.goMotion.measurementName = i18n.t("sensor.measurements.distance");
    sensorDefinitions.goMotion.sensorName = i18n.t("sensor.names.goMotion");

    sensorDefinitions.goTemp.measurementName = i18n.t("sensor.measurements.temperature");
    sensorDefinitions.goTemp.sensorName = i18n.t("sensor.names.goTemp");

    sensorDefinitions.goLinkTemperature.measurementName = i18n.t("sensor.measurements.temperature");
    sensorDefinitions.goLinkTemperature.sensorName = i18n.t("sensor.names.goLinkTemperature");

    sensorDefinitions.goLinkLight.measurementName = i18n.t("sensor.measurements.light_intensity");
    sensorDefinitions.goLinkLight.sensorName = i18n.t("sensor.names.goLinkLight");

    sensorDefinitions.goLinkForce.measurementName = i18n.t("sensor.measurements.force");
    sensorDefinitions.goLinkForce.sensorName = i18n.t("sensor.names.goLinkForce");

    sensorDefinitions.goLinkPH.measurementName = i18n.t("sensor.measurements.acidity");
    sensorDefinitions.goLinkPH.sensorName = i18n.t("sensor.names.goLinkPH");

    sensorDefinitions.goLinkCO2.measurementName = i18n.t("sensor.measurements.CO2_concentration");
    sensorDefinitions.goLinkCO2.sensorName = i18n.t("sensor.names.goLinkCO2");

    sensorDefinitions.goLinkO2.measurementName = i18n.t("sensor.measurements.O2_concentration");
    sensorDefinitions.goLinkO2.sensorName = i18n.t("sensor.names.goLinkO2");

    sensorDefinitions.labQuestMotion.measurementName = i18n.t("sensor.measurements.distance");
    sensorDefinitions.labQuestMotion.sensorName = i18n.t("sensor.names.labQuestMotion");

    sensorDefinitions.labQuestTemperature.measurementName = i18n.t("sensor.measurements.temperature");
    sensorDefinitions.labQuestTemperature.sensorName = i18n.t("sensor.names.labQuestTemperature");

    sensorDefinitions.labQuestLight.measurementName = i18n.t("sensor.measurements.light_intensity");
    sensorDefinitions.labQuestLight.sensorName = i18n.t("sensor.names.labQuestLight");

    sensorDefinitions.labQuestForce.measurementName = i18n.t("sensor.measurements.force");
    sensorDefinitions.labQuestForce.sensorName = i18n.t("sensor.names.labQuestForce");

    sensorDefinitions.labQuestPH.measurementName = i18n.t("sensor.measurements.acidity");
    sensorDefinitions.labQuestPH.sensorName = i18n.t("sensor.names.labQuestPH");

    sensorDefinitions.labQuestCO2.measurementName = i18n.t("sensor.measurements.CO2_concentration");
    sensorDefinitions.labQuestCO2.sensorName = i18n.t("sensor.names.labQuestCO2");

    sensorDefinitions.labQuestO2.measurementName = i18n.t("sensor.measurements.O2_concentration");
    sensorDefinitions.labQuestO2.sensorName = i18n.t("sensor.names.labQuestO2");

    return sensorDefinitions;
  };
});

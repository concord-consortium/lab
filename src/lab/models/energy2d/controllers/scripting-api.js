/*global define: false */

define(function () {

  return function Energy2DScriptingAPI (api, model) {

    return {
      getTemperatureAt: function getTemperatureAt(x, y) {
        return model.getTemperatureAt(x, y);
      },

      getAverageTemperatureAt: function getAverageTemperatureAt(x, y) {
        return model.getAverageTemperatureAt(x, y);
      },

      getSensor: function getSensor(i) {
        return model.getSensorsArray()[i];
      },

      getPart: function getPart(i) {
        return model.getPartsArray()[i];
      },

      addPart: function addPart(props) {
        model.addPart(props);
      },

      removePart: function removePart(i) {
        model.removePart(i);
      },

      getNumberOfParts: function getNumberOfParts() {
        return model.getPartsArray().length;
      },

      syncTemperature: function syncTemperature() {
        model.syncTemperature();
      }
    };
  };
});

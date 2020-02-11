/*global define: false */

export default function Energy2DScriptingAPI(parent) {

  return {
    getTemperatureAt: function getTemperatureAt(x, y) {
      return parent.model.getTemperatureAt(x, y);
    },

    getAverageTemperatureAt: function getAverageTemperatureAt(x, y) {
      return parent.model.getAverageTemperatureAt(x, y);
    },

    getSensor: function getSensor(i) {
      return parent.model.getSensorsArray()[i];
    },

    getPart: function getPart(i) {
      return parent.model.getPartsArray()[i];
    },

    addPart: function addPart(props) {
      parent.model.addPart(props);
    },

    removePart: function removePart(i) {
      parent.model.removePart(i);
    },

    getNumberOfParts: function getNumberOfParts() {
      return parent.model.getPartsArray().length;
    },

    syncTemperature: function syncTemperature() {
      parent.model.syncTemperature();
    }
  };
};

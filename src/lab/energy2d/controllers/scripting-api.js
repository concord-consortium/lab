/*global define: false, model: false */

define(function () {

  return function MD2DScriptingAPI (api) {

    return {
      getTemperatureAt: function getTemperatureAt(x, y) {
        return model.getTemperatureAt(x, y);
      },

      getAverageTemperatureAt: function getAverageTemperatureAt(x, y) {
        return model.getAverageTemperatureAt(x, y);
      }
    };
  };
});

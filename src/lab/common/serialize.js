/*global define: false, $ */

define(function(require) {

  var arrays = require('arrays'),

      infinityToString = function (array) {
        var i, len;
        for (i = 0, len = array.length; i < len; i++) {
          if (array[i] === Infinity) {
            array[i] = Infinity.toString();
          }
        }
      };

  return function serialize(metaData, propertiesHash, count) {
    var result = {}, propName, prop;
    for (propName in metaData) {
      if (metaData.hasOwnProperty(propName)) {
        if (propertiesHash[propName] !== undefined && metaData[propName].serialize !== false) {
          prop = propertiesHash[propName];
          if (arrays.isArray(prop)) {
            result[propName] = count !== undefined ? arrays.copy(arrays.extend(prop, count), []) : arrays.copy(prop, []);
            // JSON doesn't allow Infinity values so convert them to strings.
            infinityToString(result[propName]);
          }
          else if (typeof prop === 'object') {
            result[propName] = $(true, {}, prop);
          }
          else {
            result[propName] = prop;
          }
        }
      }
    }
    return result;
  };

});

/*global define: false, $ */

define(function(require) {

  var arrays = require('arrays');

  return function serialize(metaData, propertiesHash, count) {
    var result = {}, propName, prop;
    for (propName in metaData) {
      if (metaData.hasOwnProperty(propName)) {
        if (propertiesHash[propName] !== undefined && metaData[propName].serialize !== false) {
          prop = propertiesHash[propName];
          if (arrays.isArray(prop)) {
            result[propName] = count !== undefined ? arrays.copy(arrays.extend(prop, count), []) : arrays.copy(prop, []);
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

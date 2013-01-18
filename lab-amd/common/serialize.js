/*global define: false */

define(function(require) {

  var arrays = require('arrays');

  return function serialize(metaData, propertiesHash, count) {
    var result = {}, propName, array;
    for (propName in metaData) {
      if (metaData.hasOwnProperty(propName)) {
        if (propertiesHash[propName] !== undefined && metaData[propName].serialize !== false) {
          array = propertiesHash[propName];
          result[propName] = count !== undefined ? arrays.extend(array, count) : arrays.clone(array);
        }
      }
    }
    return result;
  };

});

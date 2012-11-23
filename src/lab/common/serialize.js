/*global define: false */

define(function(require) {

  var arrays = require('arrays');

  return function serialize(metaData, propertiesHash) {
    var result = {}, propName, array;
    for (propName in metaData) {
      if (metaData.hasOwnProperty(propName)) {
        if (propertiesHash[propName] !== undefined && metaData[propName].serialize !== false) {
          array = propertiesHash[propName];
          result[propName] = arrays.clone(array);
        }
      }
    }
    return result;
  };

});

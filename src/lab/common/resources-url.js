/*global define: false */

define(function (require) {
  var config = require('lab.config');
  return function (resourcePath) {
    return config.rootUrl + "/resources/" + resourcePath;
  };
});

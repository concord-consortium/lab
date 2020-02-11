/*global define: false */

import $__lab_config from 'lab.config';
var config = $__lab_config;
export default function(resourcePath) {
  return config.rootUrl + "/resources/" + resourcePath;
};

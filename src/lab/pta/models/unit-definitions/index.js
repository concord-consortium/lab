/*global define*/

define(function(require) {
  var defs = {
        pta: require('pta/models/unit-definitions/pta'),
        mks: require('pta/models/unit-definitions/mks')
      },
      _ = require('underscore');

  return {
    get: function(name) {
      var ret;
      if (name === 'pta') return defs.pta;

      // For any unit type not in defs[name].units (e.g., temperature does not need to be redefined
      // in MKS), fall back to the PTA unit definition.
      ret = _.extend({}, defs[name]);
      ret.units = _.extend({}, defs.pta.units, defs[name].units);
      return ret;
    }
  };
});

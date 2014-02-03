/*global define*/

define(function(require) {
  var defs = {
        solarSystem: require('models/solar-system/models/unit-definitions/solar-system')
      },
      _ = require('underscore');

  return {
    get: function(name) {
      var ret;
      if (name === 'solar-system') return defs.solarSystem;

      // For any unit type not in defs[name].units (e.g., temperature does not need to be redefined
      // in MKS), fall back to the SolarSystem unit definition.
      ret = _.extend({}, defs[name]);
      ret.units = _.extend({}, defs.solarSystem.units, defs[name].units);
      return ret;
    }
  };
});

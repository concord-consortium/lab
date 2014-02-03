/*global define*/
/*jshint eqnull: true*/

define(function(require) {

  var _ = require('underscore'),
      constants = require('models/md2d/models/engine/constants/index'),
      coulomb = require('models/md2d/models/engine/potentials/coulomb'),
      COULOMB_CONSTANT = constants.COULOMB_CONSTANT.as(constants.unit.METERS_PER_FARAD),
      baseUnitTypes = ['length', 'mass', 'time'];

  return function UnitsTranslation(unitsDefinition) {

    var // multiply MD2D-units value by this to get the value in SI units
        siFactor = {},

        // multiply MD2D-units value by this to get the value in translated (macroscopic) units
        factor = {},

        force;

    _.each(baseUnitTypes, function (unitType) {
      var u = unitsDefinition.units[unitType];
      siFactor[unitType] = u.valueInSIUnits / u.representationInMD2DUnits;
    });

    siFactor.inverseTime = 1 / siFactor.time;
    siFactor.velocity = siFactor.length / siFactor.time;
    siFactor.acceleration = siFactor.velocity / siFactor.time;
    siFactor.force = siFactor.mass * siFactor.acceleration;

    // The factor should first convert an MD2D value, which is in *eV*, to amu nm/fs^2:
    siFactor.energy = constants.ratio(constants.unit.MW_ENERGY_UNIT, { per: constants.unit.EV });
    // Then it should convert amu/fs^2 to N and nm to m, yielding Joules:
    siFactor.energy *= siFactor.force * siFactor.length;

    siFactor.dampingCoefficient = siFactor.force / siFactor.velocity;
    // stiffness is eV/nm^2; convert eV -> J and 1/nm^2 -> 1/m^2 (yielding N/m)
    siFactor.stiffness = siFactor.energy / siFactor.length / siFactor.length;
    // rotational stiffness is in eV/rad; convert eV -> N⋅m -- no need to convert radians
    siFactor.rotationalStiffness = siFactor.energy / siFactor.length;

    // Force between charge +1 and -1, 1 distance unit apart, with dielectric constant 1
    force = coulomb.force(1, -1, 1, 1);
    // See disdcussion at http://lab.dev.concord.org/doc/models/md2d/macroscopic-units/
    siFactor.charge = Math.sqrt(force * siFactor.force * siFactor.length * siFactor.length / COULOMB_CONSTANT);

    _.each(_.keys(siFactor), function(unitType) {
      factor[unitType] = siFactor[unitType] / unitsDefinition.units[unitType].valueInSIUnits;
    });

    return {
      translateToModelUnits: function(translatedUnitsValue, unitType) {
        if (factor[unitType] == null) {
          return translatedUnitsValue;
        }
        return translatedUnitsValue / factor[unitType];
      },

      translateFromModelUnits: function(md2dUnitsValue, unitType) {
        if (factor[unitType] == null) {
          return md2dUnitsValue;
        }
        return md2dUnitsValue * factor[unitType];
      }
    };
  };
});

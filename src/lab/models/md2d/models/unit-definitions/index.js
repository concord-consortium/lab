/*global define*/

import $__models_md_d_models_unit_definitions_md_d from 'models/md2d/models/unit-definitions/md2d';
import $__models_md_d_models_unit_definitions_mks from 'models/md2d/models/unit-definitions/mks';
import $__underscore from 'underscore';
var defs = {
    md2d: $__models_md_d_models_unit_definitions_md_d,
    mks: $__models_md_d_models_unit_definitions_mks
  },
  _ = $__underscore;

export default {
  get: function(name) {
    var ret;
    if (name === 'md2d') return defs.md2d;

    // For any unit type not in defs[name].units (e.g., temperature does not need to be redefined
    // in MKS), fall back to the MD2D unit definition.
    ret = _.extend({}, defs[name]);
    ret.units = _.extend({}, defs.md2d.units, defs[name].units);
    return ret;
  }
};

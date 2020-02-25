import md2dUnits from "models/md2d/models/unit-definitions/md2d";
import mksUnits from "models/md2d/models/unit-definitions/mks";
import _ from "underscore";

var defs = {
  md2d: md2dUnits,
  mks: mksUnits
};

export default {
  get: function (name) {
    var ret;
    if (name === "md2d") return defs.md2d;

    // For any unit type not in defs[name].units (e.g., temperature does not need to be redefined
    // in MKS), fall back to the MD2D unit definition.
    ret = _.extend({}, defs[name]);
    ret.units = _.extend({}, defs.md2d.units, defs[name].units);
    return ret;
  }
};

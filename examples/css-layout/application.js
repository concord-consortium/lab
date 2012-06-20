/*
  Implementation of "Complex Atoms Model" with layout & model initialization redone from scratch as
  much as possible.
*/

(function() {
  var height, mitigateGlobals, model, numAtoms, width;

  mitigateGlobals = function(_arg) {
    var g, globals, namespace, _i, _len;
    namespace = _arg.namespace;
    globals = ['modeler'];
    for (_i = 0, _len = globals.length; _i < _len; _i++) {
      g = globals[_i];
      namespace[g] = window[g];
      delete window[g];
    }
    return null;
  };

  /*
    Main
  */

  width = 10;

  height = 5;

  numAtoms = 100;

  mitigateGlobals({
    namespace: Lab
  });

  model = Lab.modeler.model({
    temperature: 300,
    lennard_jones_forces: true,
    coulomb_forces: false,
    temperature_control: false,
    width: width,
    height: height
  });

  model.createNewAtoms({
    relax: true,
    num: numAtoms
  });

  Lab.model = model;

  $(document).ready(function() {
    Lab.moleculesView('#molecules', model, {
      grid_lines: true,
      xunits: true,
      yunits: true
    });
    return model.resume();
  });

}).call(this);

/*global define */

/**
  This plugin adds quantum dynamics functionality to the MD2D engine.

  Datatable changes:

    atoms:
      excitation: an int representing the current level of excitation of an atom, from
        floor (0) to an arbitrary level. In this model each atom is assumed to have one
        single electron that can be excited to any of a finite number of levels. The
        actual energy of each level is defined by the atom's element

    elements: no changes

  New serialized properties:

    elementEnergyLevels: A 2-dimensional array defining energy levels for each element

*/


define(function () {

  return function QuantumDynamics(props) {

    var arrays               = require('arrays'),
        arrayTypes           = require('common/array-types'),

        elementEnergyLevels  = props.elementEnergyLevels,

        atoms,

        updateAtomsTable = function() {
          var num = atoms.x.length;

          atoms.excitation = arrays.create(num, 0, arrayTypes.int8Type);
        };

    // Public API.
    api = {
      initialize: function (dataTables) {
        atoms = dataTables.atoms;
        updateAtomsTable();
      }
    };

    return api;
  };

});

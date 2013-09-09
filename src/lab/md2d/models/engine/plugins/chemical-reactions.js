/*global define */

/**
  This plugin adds chemical reactions functionality to the MD2D engine.

  Datatable changes:
    atoms:
      sharedElectrons: an int representing the number of valence electrons currently shared
        with other atom. When sharedElectrons + valenceElectrons == 8 (or == 2 for helium), atom
        will no longer participate in chemical reactions.
*/

define(function(require) {


  return function ChemicalReactions(engine, _properties) {

    var arrays           = require('arrays'),
        arrayTypes       = require('common/array-types'),
        metadata         = require('md2d/models/metadata'),
        validator        = require('common/validator'),

        properties       = validator.validateCompleteness(metadata.chemicalReactions, _properties),

        api,

        valenceElectrons = properties.valenceElectrons,

        atoms;

    function updateAtomsTable() {
      var length = atoms.x.length;

      atoms.sharedElectrons = arrays.create(length, 0, arrayTypes.int8Type);
    }

    // Public API.
    api = {
      initialize: function(dataTables) {
        atoms     = dataTables.atoms;
        updateAtomsTable();
      },

      performActionWithinIntegrationLoop: function(neighborList, dt, time) {
        // TODO
      },

      // This function is required by the MD2D engine, so return empty array as
      // nothing has to be serialized in this plugin.
      getState: function() {
        return [];
      }
    };

    return api;
  };

});

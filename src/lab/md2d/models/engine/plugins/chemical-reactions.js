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

  var BOND_LEN_RATIO = 0.6; // follows Classic MW constant.

  // Dot product of [x1, y1] and [x2, y2] vectors.
  function dot(x1, y1, x2, y2) {
    return x1 * x2 + y1 * y2;
  }

  return function ChemicalReactions(engine, _properties) {

    var arrays           = require('arrays'),
        arrayTypes       = require('common/array-types'),
        metadata         = require('md2d/models/metadata'),
        validator        = require('common/validator'),

        properties       = validator.validateCompleteness(metadata.chemicalReactions, _properties),

        api,

        valenceElectrons = properties.valenceElectrons,
        bondEnergy       = properties.bondEnergy,

        atoms,
        elements,
        radialBonds;

    function updateAtomsTable() {
      var length = atoms.x.length;

      atoms.sharedElectrons = arrays.create(length, 0, arrayTypes.int8Type);
    }

    function isRadical(i) {
      var v = valenceElectrons[atoms.element[i]],
          s = atoms.sharedElectrons[i];

      // First case handles Helium which has only one valence electron and can accept just
      // one shared electron. Other atoms just try to reach 8 valence electrons.
      return !(v === 1 && s === 1) && (v + s < 8);
    }

    function createBonds(neighborList) {
      var N     = engine.getNumberOfAtoms(),
          nlist = neighborList.getList(),
          i, len,
          a1, a2,
          el1, el2,
          xi, yi, xij, yij, ijsq, bondLen;

      // Get all proximal pairs of atoms, using neighborList.
      for (a1 = 0; a1 < N; a1++) {
        el1 = atoms.element[a1];
        xi = atoms.x[a1];
        yi = atoms.y[a1];

        for (i = neighborList.getStartIdxFor(a1), len = neighborList.getEndIdxFor(a1); i < len; i++) {
          a2 = nlist[i];

          el2 = atoms.element[a2];
          xij = xi - atoms.x[a2];
          yij = yi - atoms.y[a2];

          ijsq = xij * xij + yij * yij;
          bondLen = BOND_LEN_RATIO * (elements.sigma[el1] + elements.sigma[el2]);

          if (ijsq < bondLen * bondLen) {
            // Distance is less than possible bond length, check if there will be a collision.
            collide(a1, a2, xij, yij, ijsq);
          }
        }
      }
    }

    function willCollide(a1, a2, xij, yij) {
      // Dot product is used to calculate cosinus of angle. Atoms are considered to be colliding
      // when they are going towards each other and angle between velocity vectors and vector that
      // connects both atoms is less than 90 degrees.
      return !(dot(atoms.vx[a1], atoms.vy[a1], xij, yij) >= 0.0 &&
               dot(atoms.vx[a2], atoms.vy[a2], xij, yij) <= 0.0);
    }

    function collide(a1, a2, xij, yij, ijsq) {
      if (isRadical(a1) && isRadical(a2) && willCollide(a1, a2, xij, yij)) {
        makeBond(a1, a2, ijsq);
      }
    }

    function makeBond(a1, a2, ijsq) {
      var el1 = atoms.element[a1],
          el2 = atoms.element[a2],
          en  = bondEnergy[el1][el2],
          length, strength, dpot;

      if (en <= 0) return; // Fast path when bond energy is less than 0.

      length   = BOND_LEN_RATIO * (elements.sigma[el1] + elements.sigma[el2]);
      // In Classic MW bond strength is in units of eV per 0.01 nm. Convert to eV/nm (x 1e4) and use
      // the same method to calculate bond strength.
      strength = 2e4 * Math.sqrt(elements.epsilon[el1] * elements.epsilon[el2]);

      engine.addRadialBond({
        atom1: a1,
        atom2: a2,
        length: length,
        strength: strength,
        // Default type. Should we use metadata to provide default values?
        type: 101
      });

      // Update shared electrons count.
      atoms.sharedElectrons[a1] += 1;
      atoms.sharedElectrons[a2] += 1;

      // Energy conservation.
      dpot = Math.sqrt(ijsq) - length;
      dpot = -0.5 * strength * dpot * dpot;
      dpot += en;

      conserveEnergy(dpot, a1, a2);
    }

    function conserveEnergy(energyChange, a1, a2) {
      var oldKE = engine.getAtomKineticEnergy(a1) + engine.getAtomKineticEnergy(a2),
          newKE = oldKE + energyChange,
          ratio = Math.sqrt(newKE / oldKE);

      atoms.vx[a1] *= ratio;
      atoms.vy[a1] *= ratio;
      atoms.vx[a2] *= ratio;
      atoms.vy[a2] *= ratio;

      // TODO: probably we shouldn't store (px, py) at all, but calculate it when needed.
      atoms.px[a1] *= ratio;
      atoms.py[a1] *= ratio;
      atoms.px[a2] *= ratio;
      atoms.py[a2] *= ratio;
    }

    // Gets chemical potential energy stored in radial bonds.
    function getBondsChemicalPE() {
      var PE = 0,
          el1, el2,
          i, len;

      for (i = 0, len = engine.getNumberOfRadialBonds(); i < len; ++i) {
        el1 = atoms.element[radialBonds.atom1[i]];
        el2 = atoms.element[radialBonds.atom2[i]];
        PE -= bondEnergy[el1][el2];
      }

      return PE;
    }

    // Public API.
    api = {
      initialize: function (dataTables) {
        atoms       = dataTables.atoms;
        elements    = dataTables.elements;
        radialBonds = dataTables.radialBonds;
        updateAtomsTable();
      },

      performActionWithinIntegrationLoop: function (neighborList) {
        createBonds(neighborList);
      },

      // This function is required by the MD2D engine, so return empty array as
      // nothing has to be serialized in this plugin.
      getState: function () {
        return [];
      },

      processOutputState: function (state) {
        state.PE += getBondsChemicalPE();
      }
    };

    return api;
  };

});

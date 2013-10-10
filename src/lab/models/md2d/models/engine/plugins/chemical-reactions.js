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

  var BOND_LEN_RATIO = 0.6, // follows Classic MW constant.
      // Based on the Classic MW constants defining bond style.
      BOND_TYPE = {
        1: 101, // single bond
        2: 107, // double bond
        3: 108  // tripe bond
      };

  // Dot product of [x1, y1] and [x2, y2] vectors.
  function dot(x1, y1, x2, y2) {
    return x1 * x2 + y1 * y2;
  }

  return function ChemicalReactions(engine, _properties) {

    var arrays           = require('arrays'),
        arrayTypes       = require('common/array-types'),
        metadata         = require('models/md2d/models/metadata'),
        validator        = require('common/validator'),
        constants        = require('models/md2d/models/engine/constants/index'),
        unit             = constants.unit,

        properties       = validator.validateCompleteness(metadata.chemicalReactions, _properties),

        api,

        valenceElectrons = properties.valenceElectrons,
        bondEnergy       = properties.bondEnergy,
        activationEnergy = properties.activationEnergy,

        // Helper array used only during bonds exchange process. When atom has radial bonds (one or
        // more), one of them (random) will be stored in this array. It will be exchanged with
        // free radical in case of collision.
        bondToExchange   = [],

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

    function getUnpairedElectrons(i) {
      var v = valenceElectrons[atoms.element[i]];
      if (v === 1) {
        return 1 - atoms.sharedElectrons[i]; // = 2 - 1 valence electron - sharedElectrons
      } else {
        // Don't support quadruple bonds, as they are unrealistic and can cause problems
        // (e.g. there is :C=C:, but not C==C).
        return Math.min(3, 8 - v - atoms.sharedElectrons[i]);
      }
    }

    // Returns length of bond between elements i and j.
    function getBondLength(i, j) {
      return BOND_LEN_RATIO * (elements.sigma[i] + elements.sigma[j]);
    }

    // Returns strength of bond between elements i and j.
    function getBondStrength(i, j) {
      // In Classic MW bond strength is in units of eV per 0.01 nm. Convert to eV/nm (x 1e4) and use
      // the same method to calculate bond strength.
      return 2e4 * Math.sqrt(elements.epsilon[i] * elements.epsilon[j]);
    }

    // Returns a number indicating whether a bond between atoms atom1 and atom2 would be
    // a single (1), double (2) or triple (3) bond.
    function getPossibleBondType(atom1, atom2) {
      return Math.min(getUnpairedElectrons(atom1), getUnpairedElectrons(atom2));
    }

    // Returns a number indicating type of existing radial bond.
    function getBondType(bondIdx) {
      // Convert 101, 107, 108 into 1, 2, 3.
      var type = radialBonds.type[bondIdx] - 105;
      // We will get -4 for 101 and 2, 3 for 107, 108.
      return type < 0 ? 1 : type;
    }

    // Returns bond chemical energy between elements i and j. Type indicates whether it's a single
    // (1 or undefined), double (2) or triple (3) bond.
    function getBondEnergy(i, j, type) {
      if (type === undefined) type = 1;
      switch(type) {
        case 1:
        return bondEnergy[i + "-" + j] || bondEnergy[j + "-" + i] || bondEnergy["default"];
        case 2:
        return bondEnergy[i + "=" + j] || bondEnergy[j + "=" + i] || getBondEnergy(i, j, 1) * 2;
        case 3:
        return bondEnergy[i + "=-" + j] || bondEnergy[j + "=-" + i] || getBondEnergy(i, j, 1) * 3;
      }
    }

    // Returns activation energy when element i collides with j-k pair.
    function getActivationEnergy(i, j, k) {
      return activationEnergy[i + "+" + j + "-" + k] ||
             activationEnergy[j + "+" + k + "-" + j] || // order of j-k pair doesn't matter.
             activationEnergy["default"];
    }

    // Returns energy needed to exchange bond between element i and j-k pair. So when collision
    // has bigger energy than returned value, bond should transform from j-k to i-j.
    function getEnergyForBondExchange(i, j, k, oldType, newType) {
      var oldEnergy = getBondEnergy(j, k, oldType),
          newEnergy = getBondEnergy(i, j, newType);

      if (newEnergy > oldEnergy) {
        // The final state is more stable, i-j bond (new) has more chemical energy than j-k (old).
        // Such transition should be easy, return just activation energy.
        return getActivationEnergy(i, j, k);
      } else {
        // The final state is less stable, i-j bond (new) is has less chemical energy than j-k (old).
        // Such transition should be harder, return activation energy and chemical energies
        // difference.
        return getActivationEnergy(i, j, k) + oldEnergy - newEnergy;
      }
    }

    // TODO: we shouldn't have to do it explicitely at each step. Perhaps we should just modify add
    // and remove radial bond operations to make sure that sharedElectron count is always correct
    // (e.g. listen on approprieate events, but it's impossible at the moment).
    function validateSharedElectronsCount() {
      var type, i, len;
      for (i = 0, len = engine.getNumberOfAtoms(); i < len; i++) {
        atoms.sharedElectrons[i] = 0;
      }
      for (i = 0, len = engine.getNumberOfRadialBonds(); i < len; i++) {
        type = getBondType(i);
        atoms.sharedElectrons[radialBonds.atom1[i]] += type;
        atoms.sharedElectrons[radialBonds.atom2[i]] += type;
      }
    }

    function updateBondToExchangeArray() {
      var i, len;
      bondToExchange.length = 0;
      for (i = 0, len = engine.getNumberOfRadialBonds(); i < len; i++) {
        // Of course when a1 or a2 has more than one radial bond, only one will be saved.
        // However that's perfectly fine, as it's enough for bonds exchange mechanism.
        bondToExchange[radialBonds.atom1[i]] = bondToExchange[radialBonds.atom2[i]] = i;
      }
    }

    function destroyBonds() {
      var i, len,
          a1, a2, el1, el2, dpot,
          xij, yij, ijsq, bondLen, bondType, chemEnergy;

      for (i = 0, len = engine.getNumberOfRadialBonds(); i < len; ++i) {
        a1 = radialBonds.atom1[i];
        a2 = radialBonds.atom2[i];
        bondLen = radialBonds.length[i];

        xij = atoms.x[a1] - atoms.x[a2];
        yij = atoms.y[a1] - atoms.y[a2];
        ijsq = xij * xij + yij * yij;

        dpot = Math.sqrt(ijsq) - bondLen;

        if (dpot > 0) {
          // Bond is longer than its basic length, there is potential energy.
          dpot = 0.5 * radialBonds.strength[i] * dpot * dpot;
          // Bond chemical energy.
          el1 = atoms.element[a1];
          el2 = atoms.element[a2];
          bondType = getBondType(i);
          chemEnergy = getBondEnergy(el1, el2, bondType);
          if (dpot > chemEnergy) {
            // Potential energy is larger than chemical energy, destroy bond.
            dpot -= chemEnergy;
            // LJ potential will now be calculated, take it into account.
            dpot += engine.ljCalculator[el1][el2].potentialFromSquaredDistance(ijsq);
            if (conserveEnergy(dpot, a1, a2)) {
              engine.removeRadialBond(i);
              // Update shared electrons count.
              atoms.sharedElectrons[a1] -= bondType;
              atoms.sharedElectrons[a2] -= bondType;
            }
          }
        }
      }
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

          // Ignore bonded atoms.
          if (engine.atomsBonded(a1, a2)) continue;

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
      var a1Radical, a2Radical;

      if (willCollide(a1, a2, xij, yij)) {
        a1Radical = isRadical(a1);
        a2Radical = isRadical(a2);

        if (a1Radical && a2Radical) {
          // Simple case, two radicals, just create a new bond.
          makeBond(a1, a2, ijsq);
        } else if (a1Radical && bondToExchange[a2] !== undefined) {
          tryToExchangeBond(a1, a2, bondToExchange[a2], xij, yij, ijsq);
        } else if (a2Radical && bondToExchange[a1] !== undefined) {
          tryToExchangeBond(a2, a1, bondToExchange[a1], xij, yij, ijsq);
        }
      }
    }

    function makeBond(a1, a2, ijsq) {
      var el1 = atoms.element[a1],
          el2 = atoms.element[a2],
          bondType = getPossibleBondType(a1, a2),
          en  = getBondEnergy(el1, el2, bondType),
          length, strength, dpot;

      if (en <= 0) return; // Fast path when bond energy is less than 0.

      length = getBondLength(el1, el2);
      strength = getBondStrength(el1, el2);

      // Energy conservation:
      // 1. Radial bond potential energy.
      dpot = Math.sqrt(ijsq) - length;
      dpot = -0.5 * strength * dpot * dpot;
      // 2. Bond chemical energy.
      dpot += en;
      // 3. LJ potential between particles (it will disappear as engine doesn't calculate LJ
      //    interaction between bonded particles) .
      dpot -= engine.ljCalculator[el1][el2].potentialFromSquaredDistance(ijsq);

      if (conserveEnergy(dpot, a1, a2)) {
        engine.addRadialBond({
          atom1: a1,
          atom2: a2,
          length: length,
          strength: strength,
          type: BOND_TYPE[bondType]
        });

        // Update shared electrons count.
        atoms.sharedElectrons[a1] += bondType;
        atoms.sharedElectrons[a2] += bondType;

        // In theory we can update bondToExchange with the newly created bond. However if we don't
        // do it, we won't exchange the bond in the same step we created it. It makes sense - things
        // will be clearer when e.g. user observes simulation in slow motion and tries to analyze
        // single step of chemical reaction.
      }
    }

    function tryToExchangeBond(a1, a2, bondIdx, xij, yij, ijsq) {
      var a3 = radialBonds.atom1[bondIdx] !== a2 ?
               radialBonds.atom1[bondIdx] : radialBonds.atom2[bondIdx],
          el1 = atoms.element[a1],
          el2 = atoms.element[a2],
          el3 = atoms.element[a3],

          oldType = getBondType(bondIdx),
          // Take into account that a2 shared electron count is now affected by old bond.
          newType = Math.min(getUnpairedElectrons(a1), getUnpairedElectrons(a2) + oldType),

          minCollisionEnergy = getEnergyForBondExchange(el1, el2, el3, oldType, newType),

          // Calculate the line-of-centers energy.
          ijsr = 1.0 / Math.sqrt(ijsq),
          vxij = atoms.vx[a1] - atoms.vx[a2],
          vyij = atoms.vy[a1] - atoms.vy[a2],
          vxy = vxij * xij * ijsr + vyij * yij * ijsr,

          a1Mass = atoms.mass[a1],
          a2Mass = atoms.mass[a2],

          collisionEnergy = constants.convert(a1Mass * a2Mass / (a1Mass + a2Mass) * vxy * vxy,
                            { from: unit.MW_ENERGY_UNIT, to: unit.EV }),

          newLength, newStrength, oldLength, oldStrength,
          lenDiff, dpot;

      // Use reduced mass to compute head-on kinetic energy.
      if (collisionEnergy > minCollisionEnergy) {
        // Kinetic energy is big enough to transfer radial bond.

        newLength = getBondLength(el1, el2);
        newStrength = getBondStrength(el1, el2);
        oldLength = radialBonds.length[bondIdx];
        oldStrength = radialBonds.strength[bondIdx];

        // Conserve energy.
        // New bond configuration.
        // 1. Radial bond potential energy.
        lenDiff = Math.sqrt(ijsq) - newLength;
        dpot = -0.5 * newStrength * lenDiff * lenDiff;
        // 2. Bond chemical energy.
        dpot += getBondEnergy(el1, el2, newType);
        // 3. LJ potential between particles (it will disappear as engine doesn't calculate LJ
        //    interaction between bonded particles) .
        dpot -= engine.ljCalculator[el1][el2].potentialFromSquaredDistance(ijsq);

        // Old bond configuration.
        xij = atoms.x[a2] - atoms.x[a3];
        yij = atoms.y[a2] - atoms.y[a3];
        ijsq = xij * xij + yij * yij;
        // 1. Radial bond potential energy.
        lenDiff = Math.sqrt(ijsq) - oldLength;
        dpot -= -0.5 * oldStrength * lenDiff * lenDiff;
        // 2. Bond chemical energy.
        dpot -= getBondEnergy(el2, el3, oldType);
        // 3. LJ potential between particles.
        dpot += engine.ljCalculator[el2][el3].potentialFromSquaredDistance(ijsq);

        if (conserveEnergy(dpot, a1, a2, a3)) {
          // Update bond, change it from a2-d3 to a1-a2.
          engine.setRadialBondProperties(bondIdx, {
            atom1: a1,
            atom2: a2,
            length: newLength,
            strength: newStrength,
            type: BOND_TYPE[newType]
          });

          atoms.sharedElectrons[a1] += newType;
          atoms.sharedElectrons[a2] += newType - oldType;
          atoms.sharedElectrons[a3] -= oldType;

          // a3 is no longer connected to bond with ID = bondIdx.
          if (bondToExchange[a3] === bondIdx) bondToExchange[a3] = undefined;
          // a2 is still connected to bond with ID = bondIdx, however if we set bondToExchange[a2]
          // to undefined, the same bond won't be transfered again during this step. It's not
          // necessary, but it will limit number of reactions during single step, making things
          // easier to observe and follow (otherwise the bond can exchanged multiple times during
          // one step, what can be confusing for users that will see only the final result).
          bondToExchange[a2] = undefined;
        }
      }
    }

    // Conserves energy. Returns false when it's impossible, so parent function should handle such
    // situation and perhaps doesn't execute operation that leads to such energy change.
    function conserveEnergy(energyChange, a1, a2, a3) {
      var oldKE = engine.getAtomKineticEnergy(a1) +
                  engine.getAtomKineticEnergy(a2) +
                  (a3 !== undefined ? engine.getAtomKineticEnergy(a3) : 0),
          newKE = oldKE + energyChange,
          ratio;

      if (newKE <= 0) {
        // Energy can't be conserved using these 2 (or 3) atoms.
        return false;
      }

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
      if (a3 !== undefined) {
        atoms.vx[a3] *= ratio;
        atoms.vy[a3] *= ratio;
        atoms.px[a3] *= ratio;
        atoms.py[a3] *= ratio;
      }

      // Energy is conserved.
      return true;
    }

    // Gets chemical potential energy stored in radial bonds.
    function getBondsChemicalPE() {
      var PE = 0,
          i, len;

      for (i = 0, len = engine.getNumberOfRadialBonds(); i < len; ++i) {
        PE -= getBondEnergy(atoms.element[radialBonds.atom1[i]],
                            atoms.element[radialBonds.atom2[i]],
                            getBondType(i));
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

      performActionWithinIntegrationLoop: function (neighborList, dt, time) {
        if ((time / dt) % 50 === 0) {
          // Perform action every 50 timesteps.
          validateSharedElectronsCount();
          destroyBonds();
          // Update bondToExchange array after .destroyBonds() call! bondToExchange array is used
          // only by .createBonds() function anyway.
          updateBondToExchangeArray();
          createBonds(neighborList);
        }
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

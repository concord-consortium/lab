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
  var arrays             = require('arrays'),
      arrayTypes         = require('common/array-types'),
      metadata           = require('models/md2d/models/metadata'),
      validator          = require('common/validator'),
      constants          = require('models/md2d/models/engine/constants/index'),
      getAngleBetweenVec = require('models/md2d/models/engine/math/utils').getAngleBetweenVec,
      unit               = constants.unit,

      BOND_LEN_RATIO = 0.6, // follows Classic MW constant.
      // Based on the Classic MW constants defining bond style.
      BOND_TYPE = {
        1: 101, // single bond
        2: 107, // double bond
        3: 108  // tripe bond
      },
      BOND_TYPE_INV = (function() {
        var result = {};
        Object.keys(BOND_TYPE).forEach(function (key) {
          result[BOND_TYPE[key]] = key;
        });
        return result;
      }()),

      ANGULAR_BOND_STRENGTH = 50; // follows Classic MW default value.

  // Dot product of [x1, y1] and [x2, y2] vectors.
  function dot(x1, y1, x2, y2) {
    return x1 * x2 + y1 * y2;
  }

  // Returns true if array1 and array2 have at least one common element, false otherwise.
  function commonElement(array1, array2) {
    var len1 = array1.length,
        len2 = array2.length,
        i, j, el1;
    // It's a brutal force approach, but note that maximum length of the array is 4. We use that
    // function to compare if two atoms have a common bonded atom. In chemical reactions, only
    // 4 bonds can be formed per atom.
    for (i = 0; i < len1; i++) {
      el1 = array1[i];
      for (j = 0; j < len2; j++) {
        if (el1 === array2[j]) return true;
      }
    }
    return false;
  }

  return function ChemicalReactions(engine, _properties) {
    var api,

        properties         = validator.validateCompleteness(metadata.chemicalReactions, _properties),
        updateInterval     = properties.updateInterval,
        createAngularBonds = properties.createAngularBonds,
        noLoops            = properties.noLoops,
        valenceElectrons   = properties.valenceElectrons,
        bondEnergy         = properties.bondEnergy,
        activationEnergy   = properties.activationEnergy,
        bondProbability    = properties.bondProbability,

        // Helper array used only during bonds exchange process. When atom has radial bonds (one or
        // more), one of them (random) will be stored in this array. It will be exchanged with
        // free radical in case of collision.
        bondToExchange   = [],

        // Flag indicating whether bonds were changed during last calculations. If so, forces
        // recalculation should be triggered.
        bondsChanged = false,

        // Set of modified atoms, so atoms that have bonds added or removed.
        modifiedAtoms = {},

        atoms,
        elements,
        radialBonds,
        angularBonds;

    function updateAtomsTable() {
      var length = atoms.x.length;

      atoms.sharedElectrons = arrays.create(length, 0, arrayTypes.int8Type);
    }

    function isRadical(i) {
      var v = valenceElectrons[atoms.element[i]],
          s = atoms.sharedElectrons[i];
      return (s < v) && (v + s < 8);
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

    function getUnpairedElectrons(i) {
      // Don't support quadruple bonds, as they are unrealistic and can cause problems
      // (e.g. there is :C=C:, but not C==C).
      var v = valenceElectrons[atoms.element[i]];
      return Math.min(Math.min(8 - v, v) - atoms.sharedElectrons[i]);
    }

    // Returns a number indicating whether a bond between atoms atom1 and atom2 would be
    // a single (1), double (2) or triple (3) bond.
    // Bond type will be based on two factors:
    // - available electron slots,
    // - probability, e.g. it's more likely than single bond will be formed instead of double or
    //   triple (see: bondProbability option)
    function getPossibleBondType(atom1, atom2, atom2Mod) {
      if (atom2Mod === undefined) atom2Mod = 0;
      var maxType = Math.min(3, getUnpairedElectrons(atom1), getUnpairedElectrons(atom2) + atom2Mod);
      // Only single bond is possible or no bond at all.
      if (maxType <= 1) {
        return maxType;
      } else {
        // Use probabilistic approach to choose a bond type.
        var prob = getBondTypeProbability(atoms.element[atom1], atoms.element[atom2]),
            randomValue = Math.random();

        if (maxType === 3) {
          if (randomValue < prob[0]) {
            return 1;
          } else if (randomValue < prob[0] + prob[1]) {
            return 2;
          } else {
            return 3;
          }
        } else { // maxType === 2
          // Note that when only single or double bond can be created, we add triple bond
          // likelihood to single bond likelihood! So for default 80% - 15% - 5% configuration,
          // we will end up with 85% for single bond and 15% for double bond.
          if (randomValue < prob[0] + prob[2]) {
            return 1;
          } else {
            return 2;
          }
        }
      }
    }

    // Returns a number indicating type of existing radial bond.
    function getBondType(bondIdx) {
      // Convert 101, 107, 108 into 1, 2, 3.
      var type = radialBonds.type[bondIdx] - 105;
      // We will get -4 for 101 and 2, 3 for 107, 108.
      return type < 0 ? 1 : type;
    }

    // TODO: (micro-)optimize functions below (?). They can be more elegant and require less work.

    // Returns bond chemical energy between elements i and j. Type indicates whether it's a single
    // (1 or undefined), double (2) or triple (3) bond.
    function getBondEnergy(i, j, type) {
      if (type === undefined) type = 1;
      switch(type) {
        case 1:
        return bondEnergy[i + "-" + j] != null ? bondEnergy[i + "-" + j] :
               bondEnergy[j + "-" + i] != null ? bondEnergy[j + "-" + i] :
                                                 bondEnergy["default"];
        case 2:
        return bondEnergy[i + "=" + j] != null ? bondEnergy[i + "=" + j] :
               bondEnergy[j + "=" + i] != null ? bondEnergy[j + "=" + i] :
                                                 getBondEnergy(i, j, 1) * 2;
        case 3:
        return bondEnergy[i + "#" + j] != null ? bondEnergy[i + "#" + j] :
               bondEnergy[j + "#" + i] != null ? bondEnergy[j + "#" + i] :
                                                  getBondEnergy(i, j, 1) * 3;
      }
    }

    // Returns activation energy when element i collides with j-k pair.
    function getActivationEnergy(i, j, k) {
            // order of j-k pair doesn't matter.
      return activationEnergy[i + "+" + j + "-" + k] != null ? activationEnergy[i + "+" + j + "-" + k] :
             activationEnergy[i + "+" + k + "-" + j] != null ? activationEnergy[i + "+" + k + "-" + j] :
                                                               activationEnergy["default"];
    }

    // Returns bond probability when element i collides with j.
    function getBondTypeProbability(i, j) {
            // order of j-k pair doesn't matter.
      return bondProbability[i + "-" + j] != null ? bondProbability[i + "-" + j] :
             bondProbability[j + "-" + i] != null ? bondProbability[j + "+" + i] :
                                                    bondProbability["default"];
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

    function addRadialBond(props, a1, a2, bondType) {
      props.atom1 = a1;
      props.atom2 = a2;
      props.type = BOND_TYPE[bondType];
      engine.addRadialBond(props);
      bondsChanged = true;
      modifiedAtoms[a1] = true;
      modifiedAtoms[a2] = true;
      // Update shared electrons count.
      atoms.sharedElectrons[a1] += bondType;
      atoms.sharedElectrons[a2] += bondType;
      // In theory we can update bondToExchange with the newly created bond. However if we don't
      // do it, we won't exchange the bond in the same step we created it. It makes sense - things
      // will be clearer when e.g. user observes simulation in slow motion and tries to analyze
      // single step of chemical reaction.
    }

    function removeRadialBond(i, a1, a2, bondType) {
      engine.removeRadialBond(i, true);
      bondsChanged = true;
      modifiedAtoms[a1] = true;
      modifiedAtoms[a2] = true;
      // Update shared electrons count.
      atoms.sharedElectrons[a1] -= bondType;
      atoms.sharedElectrons[a2] -= bondType;
    }

    function transferRadialBond(i, props, a1, a2, a3, newType, oldType) {
      props.atom1 = a1;
      props.atom2 = a2;
      props.type = BOND_TYPE[newType];
      engine.setRadialBondProperties(i, props, true);
      bondsChanged = true;
      modifiedAtoms[a1] = true;
      modifiedAtoms[a2] = true;
      modifiedAtoms[a3] = true;
      // Update shared electrons count.
      atoms.sharedElectrons[a1] += newType;
      atoms.sharedElectrons[a2] += newType - oldType;
      atoms.sharedElectrons[a3] -= oldType;
      // a3 is no longer connected to bond with ID = bondIdx.
      if (bondToExchange[a3] === i) bondToExchange[a3] = undefined;
      // a2 is still connected to bond with ID = bondIdx, however if we set bondToExchange[a2]
      // to undefined, the same bond won't be transfered again during this step. It's not
      // necessary, but it will limit number of reactions during single step, making things
      // easier to observe and follow (otherwise the bond can exchanged multiple times during
      // one step, what can be confusing for users that will see only the final result).
      bondToExchange[a2] = undefined;
    }

    function addAngularBond(props) {
      engine.addAngularBond(props);
      bondsChanged = true;
    }

    function setAngularBondProperties(i, props) {
      engine.setAngularBondProperties(i, props);
      bondsChanged = true;
    }

    function cleanupModifiedAtomsAndFlags() {
      bondsChanged = false;
      Object.keys(modifiedAtoms).forEach(function (key) {
        delete modifiedAtoms[key];
      });
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

    // When forcedCleanup equals to true, all bonds will be removed.
    function destroyBonds(forcedCleanup) {
      var i, a1, a2, el1, el2, dpot,
          xij, yij, ijsq, bondLen, bondType, chemEnergy,
          bondRemoved;

      i = 0;
      while (i < engine.getNumberOfRadialBonds()) {
        bondRemoved = false;

        a1 = radialBonds.atom1[i];
        a2 = radialBonds.atom2[i];
        bondLen = radialBonds.length[i];

        xij = atoms.x[a1] - atoms.x[a2];
        yij = atoms.y[a1] - atoms.y[a2];
        ijsq = xij * xij + yij * yij;

        dpot = Math.sqrt(ijsq) - bondLen;

        if (dpot > 0 || forcedCleanup) {
          // Bond is longer than its basic length, there is potential energy.
          dpot = 0.5 * radialBonds.strength[i] * dpot * dpot;
          // Bond chemical energy.
          el1 = atoms.element[a1];
          el2 = atoms.element[a2];
          bondType = getBondType(i);
          chemEnergy = getBondEnergy(el1, el2, bondType);
          if (dpot > chemEnergy || forcedCleanup) {
            // Potential energy is larger than chemical energy, destroy bond.
            dpot -= chemEnergy;
            // LJ potential will now be calculated, take it into account.
            dpot += engine.ljCalculator[el1][el2].potentialFromSquaredDistance(ijsq);
            if (engine.addKEToAtoms(dpot, a1, a2)) {
              removeRadialBond(i, a1, a2, bondType);
              bondRemoved = true;
            } else if (forcedCleanup) {
              // If it is impossible to add given amount of KE to just two atoms, try to add it
              // to all atoms. It's best what we can do to try to conserve energy during forced
              // cleanup.
              engine.addKEToAtoms(dpot);
              removeRadialBond(i, a1, a2, bondType);
              bondRemoved = true;
            }
          }
        }
        // After bond removal, all other bonds are re-indexed!
        if (!bondRemoved) i++;
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
      var a1Radical, a2Radical, bothRadical, a1a2Exchange, a2a1Exchange;

      if (willCollide(a1, a2, xij, yij)) {
        a1Radical = isRadical(a1);
        a2Radical = isRadical(a2);
        bothRadical = a1Radical && a2Radical;
        a1a2Exchange = a1Radical && bondToExchange[a2] !== undefined;
        a2a1Exchange = a2Radical && bondToExchange[a1] !== undefined;

        if (bothRadical || a1a2Exchange || a2a1Exchange) {
          // Check if there is a common element in directly bonded atoms. If so, don't let the
          // chemical reaction happen, as we don't want to form triangles. Note that we defer
          // this check as much as it's possible, as it can be little bit expensive.
          if (commonElement(engine.getBondedAtoms(a1), engine.getBondedAtoms(a2))) return;
          // If "noLoops" mode is enabled, check whether a1 is a part of the same molecule as a2.
          if (noLoops && engine.getMoleculeAtoms(a2).indexOf(a1) !== -1) return;

          if (bothRadical) {
            // Simple case, two radicals, just create a new bond.
            makeBond(a1, a2, ijsq);
          } else if (a1a2Exchange) {
            tryToExchangeBond(a1, a2, bondToExchange[a2], xij, yij, ijsq);
          } else if (a2a1Exchange) {
            tryToExchangeBond(a2, a1, bondToExchange[a1], xij, yij, ijsq);
          }
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

      if (engine.addKEToAtoms(dpot, a1, a2)) {
        addRadialBond({
          length: length,
          strength: strength
        }, a1, a2, bondType);
      }
    }

    function tryToExchangeBond(a1, a2, bondIdx, xij, yij, ijsq) {
      var el1 = atoms.element[a1],
          el2 = atoms.element[a2],
          a1Old = radialBonds.atom1[bondIdx],
          a2Old = radialBonds.atom2[bondIdx],
          el1Old = atoms.element[a1Old],
          el2Old = atoms.element[a2Old],
          // Atom that can lose the bond, it has to be different from a1 and a2.
          a3 = a1Old !== a1 && a1Old !== a2 ? a1Old : a2Old,
          el3 = atoms.element[a3],

          oldType = getBondType(bondIdx),
          // Take into account that a2 shared electron count is now affected by old bond!
          newType = getPossibleBondType(a1, a2, oldType),

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
        xij = atoms.x[a1Old] - atoms.x[a2Old];
        yij = atoms.y[a1Old] - atoms.y[a2Old];
        ijsq = xij * xij + yij * yij;
        // 1. Radial bond potential energy.
        lenDiff = Math.sqrt(ijsq) - oldLength;
        dpot -= -0.5 * oldStrength * lenDiff * lenDiff;
        // 2. Bond chemical energy.
        dpot -= getBondEnergy(el1Old, el2Old, oldType);
        // 3. LJ potential between particles.
        dpot += engine.ljCalculator[el1Old][el2Old].potentialFromSquaredDistance(ijsq);

        if (engine.addKEToAtoms(dpot, a1, a2, a3)) {
          // Update bond, change it from a2-d3 to a1-a2.
          transferRadialBond(bondIdx, {
            length: newLength,
            strength: newStrength
          }, a1, a2, a3, newType, oldType);
        }
      }
    }

    function removeAngularBondOfModfiedAtoms() {
      // Remove all angular bonds that have modified atoms as a central atom (atom3 prop).
      // Use such "strange" form of loop, as while removing one bonds, other change their indexing.
      // So, after removal of bond 5, we should check bond 5 again, as it would be another bond
      // (previously indexed as 6).
      var i = 0;
      while (i < engine.getNumberOfAngularBonds()) {
        if (modifiedAtoms[angularBonds.atom3[i]]) {
          engine.removeAngularBond(i, true);
        } else {
          i++;
        }
      }
    }

    function tryToMakeAngularBondsStronger() {
      var i, len, a1, a2, a3, dpot;
      // Try to make angular bonds with strength equal to 0 stronger (if we can conserve energy).
      // Such bonds were added earlier when kinetic energy of atoms was too small to compensate
      // potential energy of angular bond. It's very likely to happen when bond between atoms is
      // much smaller or bigger than expected.
      for (i = 0, len = engine.getNumberOfAngularBonds(); i < len; i++) {
        if (angularBonds.strength[i] === 0) {
          a1 = angularBonds.atom1[i];
          a2 = angularBonds.atom2[i];
          a3 = angularBonds.atom3[i];
          dpot = angularBonds.angle[i] - getAngleBetweenAtoms(a1, a2, a3);
          dpot = -0.5 * ANGULAR_BOND_STRENGTH * dpot * dpot;

          if (engine.addKEToAtoms(dpot, a1, a2, a3)) {
            setAngularBondProperties(i, {
              strength: ANGULAR_BOND_STRENGTH
            });
          }
        }
      }
    }

    // Returns angle between a1-a3 and a2-a3 vectors.
    function getAngleBetweenAtoms(a1, a2, a3) {
      return getAngleBetweenVec(atoms.x[a1], atoms.y[a1],
                                atoms.x[a2], atoms.y[a2],
                                atoms.x[a3], atoms.y[a3]);
    }

    function getMoleculeAngle(valenceElectrons, sharedElectrons, bondsCount) {
      // Angle depends on number of regions of electric charge around atom. A region of electric
      // charge could be either an unshared pair of electrons or a shared pair (in a bond).
      // The regions of electron density will repel each other to minimize energy, so the following
      // angles are associated with regions of electron density:
      //
      // 4 regions = 90 degree angle
      // 3 regions = 120 degree angle
      // 2 regions = 180 degree angle
      //
      // There calculation about regions of electron density needs to consider the valence setting
      // for the central atom in a triplet grouping. Assuming single bonds this is what we get:
      // valence 1 = n/a (can't be a central atom in a triplet)
      // valence 2 = 2 regions
      // valence 3 = 3 regions
      // valence 4 = 4 regions
      // valence 5 = 4 regions (Two electrons will pair to become a shared pair and not bond. Three bonds possible.)
      // valence 6 = 4 regions (Two pairs of unshared electrons will occur. Two bonds possible.)
      // valence 7 = n/a (can't be a central atom in a triplet)
      // valence 8 = n/a (no bonds can form - this is a noble gas element)
      //
      // If double or triple bonds form then regions of electron density become merged, reducing
      // the total number of regions. Only atoms with valence 3 - 5 could be central atoms and
      // form double or triple bonds.
      // valence 3 with one double bond = 2 regions of electron density
      // valence 4 with one double bond = 3 regions of electron density
      // valence 4 with two double bonds = 2 regions of electron density
      // valence 4 with one triple bond = 2 regions of electron density
      // valence 5 with one double bond = 3 regions of electron density
      //
      // See related PT story: https://www.pivotaltracker.com/story/show/58090710
      //
      // Actually we can implement the whole algorithm using this simple formula:
      return 2 * Math.PI / (Math.min(4, valenceElectrons) - (sharedElectrons - bondsCount));
    }

    function setupNewAngularBonds() {
      var i, len, a1, a2, type, angle, ba, possibleBonds;
      // Construct helper structure containing bonded atoms.
      var bondedAtoms = [];
      for (i = 0, len = engine.getNumberOfRadialBonds(); i < len; i++) {
        a1 = radialBonds.atom1[i];
        a2 = radialBonds.atom2[i];
        type = BOND_TYPE_INV[radialBonds.type];
        if (modifiedAtoms[a1]) {
          if (!bondedAtoms[a1]) {
            bondedAtoms[a1] = [a2];
          } else {
            bondedAtoms[a1].push(a2);
          }
        }
        if (modifiedAtoms[a2]) {
          if (!bondedAtoms[a2]) {
            bondedAtoms[a2] = [a1];
          } else {
            bondedAtoms[a2].push(a1);
          }
        }
      }

      // Finally construct new angular bonds.
      for (i = 0, len = bondedAtoms.length; i < len; i++) {
        ba = bondedAtoms[i];
        if (!ba || ba.length < 2) continue;

        angle = getMoleculeAngle(valenceElectrons[atoms.element[i]], atoms.sharedElectrons[i], ba.length);

        if (ba.length === 2) {
          // e.g. A -- B -- A
          a1 = ba[0];
          a2 = ba[1];
          addAngularBondBetween(a1, a2, i, angle);
        } else {
          possibleBonds = [];
          if (ba.length === 3) {
            // e.g. A -- B -- A
            //           |
            //           A
            pushPossibleBond(possibleBonds, ba[0], ba[1], i);
            pushPossibleBond(possibleBonds, ba[0], ba[2], i);
            pushPossibleBond(possibleBonds, ba[1], ba[2], i);
          } else if (ba.length === 4) {
            // e.g.      A
            //           |
            //      A -- B -- A
            //           |
            //           A
            pushPossibleBond(possibleBonds, ba[0], ba[1], i);
            pushPossibleBond(possibleBonds, ba[0], ba[2], i);
            pushPossibleBond(possibleBonds, ba[0], ba[3], i);
            pushPossibleBond(possibleBonds, ba[1], ba[2], i);
            pushPossibleBond(possibleBonds, ba[1], ba[3], i);
            pushPossibleBond(possibleBonds, ba[2], ba[3], i);
          }
          possibleBonds.sort(comparePossibleBonds);
          createFirstNPossibleBonds(possibleBonds, ba.length - 1, angle);
        }
      }
    }

    function pushPossibleBond(arr, a1, a2, aCentral) {
      arr.push({
        angle: getAngleBetweenAtoms(a1, a2, aCentral),
        a1: a1,
        a2: a2,
        aCentral: aCentral
      });
    }

    function comparePossibleBonds(a, b) {
      if (a.angle < b.angle) return -1;
      if (a.angle > b.angle) return 1;
      return 0;
    }

    function createFirstNPossibleBonds(array, N, bondAngle) {
      var i, bondDef;
      for (i = 0; i < N; i++) {
        bondDef = array[i];
        addAngularBondBetween(bondDef.a1, bondDef.a2, bondDef.aCentral, bondAngle, bondDef.angle);
      }
    }

    function addAngularBondBetween(a1, a2, aCentral, bondAngle, currentAngle) {
      if (!currentAngle) {
        currentAngle = getAngleBetweenAtoms(a1, a2, aCentral);
      }
      var props = {
        atom1: a1,
        atom2: a2,
        atom3: aCentral,
        angle: bondAngle
      };
      // Calculate potential energy of angular bond.
      var dpot = bondAngle - currentAngle;
      dpot = -0.5 * ANGULAR_BOND_STRENGTH * dpot * dpot;
      // If we can't conserve energy, add a "fake" angular bond with strength equal to 0.
      // During next steps we will try to make it stronger when the angular bond potential
      // energy will be smaller of kinetic energy of atoms bigger.
      if (engine.addKEToAtoms(dpot, a1, a2, aCentral)) {
        props.strength = ANGULAR_BOND_STRENGTH;
      } else {
        props.strength = 0;
      }
      addAngularBond(props);
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
        atoms        = dataTables.atoms;
        elements     = dataTables.elements;
        radialBonds  = dataTables.radialBonds;
        angularBonds = dataTables.angularBonds;
        updateAtomsTable();
      },

      performActionWithinIntegrationLoop: function (neighborList, dt, time) {
        // Below there is a stateless way to check if we should perform calculations or not.
        // Calculations should be performed every <update_interval> femtoseconds. In theory we could just
        // remember the last time we did calculations and then check if the current time is larger
        // (or equal) than the last + <interval>. However, due to tick history seeking, we can't make
        // an assumption that time value will be always bigger than during the previous function
        // execution.
        var mod = time % updateInterval;
        if (mod === 0 || (mod < dt && Math.floor(time / updateInterval) === Math.round(time / updateInterval))) {
          cleanupModifiedAtomsAndFlags();
          validateSharedElectronsCount();
          destroyBonds();
          // Update bondToExchange array after .destroyBonds() call! bondToExchange array is used
          // only by .createBonds() function anyway.
          updateBondToExchangeArray();
          createBonds(neighborList);

          if (createAngularBonds) {
            if (Object.keys(modifiedAtoms).length > 0) {
              // Some reaction took place, update angular bonds.
              removeAngularBondOfModfiedAtoms();
              tryToMakeAngularBondsStronger();
              setupNewAngularBonds();
            } else {
              // In fact this call can be placed before the whole if-else statement. However this
              // is a small optimization, as we can setup optimal order of function calls.
              tryToMakeAngularBondsStronger();
            }
          }

          if (bondsChanged) {
            // Update forces coming from new bonds configuration (!).
            engine.updateParticlesAccelerations();
          }
        }
      },

      // This function is required by the MD2D engine, so return empty array as
      // nothing has to be serialized in this plugin.
      getState: function () {
        return [];
      },

      processOutputState: function (state) {
        state.PE += getBondsChemicalPE();
      },

      /**
       * Sets bond energy (dissociation energy) of a bond.
       * @param {string} bondDescription e.g. "1-1" means single bond between element 1 and 1,
       *                                 "1=2" means double bond between element 1 and 2 etc.
       * @param {number} value           bond energy in eV..
       */
      setBondEnergy: function(bondDescription, value) {
        bondEnergy[bondDescription] = value;
      },

      /**
       * Sets valence electrons count of the given element.
       * @param {number} element
       * @param {number} value
       */
      setValenceElectrons: function(element, value) {
        valenceElectrons[element] = value;
        // Cleanup all bonds.
        destroyBonds(true);
        validateSharedElectronsCount();
      }
    };

    return api;
  };

});

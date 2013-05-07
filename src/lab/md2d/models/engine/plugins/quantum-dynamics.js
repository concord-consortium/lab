/*global define */

/**
  This plugin adds quantum dynamics functionality to the MD2D engine.

  Datatable changes:

    atoms:
      excitation: an int representing the current level of excitation of an atom, from
        floor (0) to an arbitrary level. In this model each atom is assumed to have one
        single electron that can be excited to any of a finite number of levels. The
        actual energy of each level is defined by the atom's element

  New serialized properties:

    elementEnergyLevels: A 2-dimensional array defining energy levels for each element

*/


define(function () {

  return function QuantumDynamics(props) {

    var arrays               = require('arrays'),
        arrayTypes           = require('common/array-types'),
        api,

        elementEnergyLevels  = props.elementEnergyLevels,
        pRadiationless       = props.radiationlessEmissionProb,

        atoms,
        elements,

        updateAtomsTable = function() {
          var num = atoms.x.length;

          atoms.excitation = arrays.create(num, 0, arrayTypes.int8Type);
        },

        atom1Idx, atom2Idx,     // current pair of atoms during thermal excitation

        u1, u2,                 // temporary velocity-calculation variables
        w1, w2,
        dx, dy,

        // If a pair of atoms are close enough, QD interactions may occur.
        //
        // This is called at the end of every integration loop.
        performInteractionsBetweenCloseAtoms = function(neighborList) {
          var N     = atoms.x.length,
              nlist = neighborList.getList(),
              a1, a2,
              i, len,
              el1, el2,
              energyLevels1, energyLevels2,
              xi, yi, xij, yij, ijsq,
              avrSigma, avrSigmaSq,
              atomWasExcited;

          if (!elementEnergyLevels) return;

          // get all proximal pairs of atoms, using neighborList
          for (a1 = 0; a1 < N; a1++) {

            xi = atoms.x[a1];
            yi = atoms.y[a1];

            for (i = neighborList.getStartIdxFor(a1), len = neighborList.getEndIdxFor(a1); i < len; i++) {
              a2 = nlist[i];

              el1 = atoms.element[a1];
              el2 = atoms.element[a2];
              energyLevels1 = elementEnergyLevels[el1];
              energyLevels2 = elementEnergyLevels[el2];

              // if neither atom is of an element with energy levels, skip
             if (!energyLevels1.length && !energyLevels2.length) {
               continue;
             }

              // if we aren't close (within the avrSigma of two atoms), skip
              xij = xi - atoms.x[a2];
              yij = yi - atoms.y[a2];
              ijsq = xij * xij + yij * yij;
              avrSigma = 0.5 * (elements.sigma[el1] + elements.sigma[el2]);
              avrSigmaSq = avrSigma * avrSigma;

              if (ijsq >= avrSigmaSq) {
                continue;
              }

              // first try to see if we can excite atoms
              atomWasExcited = tryToThermallyExciteAtoms(a1, a2);

              // if we didn't excite, see if this pair wants to de-excite
              if (!atomWasExcited) {
                tryToDeexciteAtoms(a1, a2);
              }
            }
          }
        },

        // If a pair of atoms are close enough, and their relative KE is greater than
        // the energy required to reach a new excitation level of a random member of
        // the pair, increase the excitation level of that atom and adjust the velocity
        // of the pair as required.
        tryToThermallyExciteAtoms = function(a1, a2) {
          var atomWasExcited,
              selection;

          atom1Idx = a1;
          atom2Idx = a2;

          // excite a random atom, or pick the excitable one if only one can be excited
          selection = Math.random() < 0.5 ? atom1Idx : atom2Idx;
          atomWasExcited = tryToExcite(selection);
          if (!atomWasExcited) {
            // if we couldn't excite the first, excite the other one
            atomWasExcited = tryToExcite(atom1Idx+atom2Idx-selection);
          }

          return atomWasExcited;
        },

        // Excites an atom to a new energy level if the relative KE of the pair atom1Idx
        // and atom2Idx is high enough, and updates the velocities of atoms as necessary
        tryToExcite = function(i) {
          var energyLevels   =   elementEnergyLevels[atoms.element[i]],
              currentEnergyLevel,
              currentElectronEnergy,
              relativeKE,
              energyRequired, highest,
              nextEnergyLevel, energyAbsorbed,
              j, jj;

          if (!energyLevels) return;

          precalculateVelocities();

          relativeKE = getRelativeKE();

          currentEnergyLevel = atoms.excitation[i];
          currentElectronEnergy = energyLevels[currentEnergyLevel];

          // get the highest energy level above the current that the relative KE can reach
          for (j = currentEnergyLevel+1, jj = energyLevels.length; j < jj; j++) {
            energyRequired = energyLevels[j] - currentElectronEnergy;
            if (relativeKE < energyRequired) {
              break;
            }
            highest = j;
          }
          if (!highest) {
            // there is no higher energy level we can reach
            return false;
          }

          // assuming that all the energy levels above have the same chance of
          // getting the excited electron, we randomly pick one.
          highest = highest - currentEnergyLevel;
          nextEnergyLevel = Math.ceil(Math.random() * highest) + currentEnergyLevel;

          atoms.excitation[i] = nextEnergyLevel;
          energyAbsorbed = energyLevels[nextEnergyLevel] - currentElectronEnergy;
          updateVelocities(energyAbsorbed);
          return true;
        },

        precalculateVelocities = function() {
          var dx_ = atoms.x[atom2Idx] - atoms.x[atom1Idx],
              dy_ = atoms.y[atom2Idx] - atoms.y[atom1Idx],
              tmp  = 1.0 / Math.sqrt(dx_*dx_ + dy_*dy_);

          dx   = dx_ * tmp;
          dy   = dy_ * tmp;

          u1   = atoms.vx[atom1Idx] * dx + atoms.vy[atom1Idx] * dy;
          u2   = atoms.vx[atom2Idx] * dx + atoms.vy[atom2Idx] * dy;
          w1   = atoms.vy[atom1Idx] * dx - atoms.vx[atom1Idx] * dy;
          w2   = atoms.vy[atom2Idx] * dx - atoms.vx[atom2Idx] * dy;
        },

        getRelativeKE = function() {
          var du   = u2 - u1;

          return 0.5 * du * du * atoms.mass[atom1Idx] * atoms.mass[atom2Idx] / (atoms.mass[atom1Idx] + atoms.mass[atom2Idx]);
        },

        updateVelocities = function(delta) {
          var m1 = atoms.mass[atom1Idx],
              m2 = atoms.mass[atom2Idx],
              j  = m1 * u1 * u1 + m2 * u2 * u2 - delta,
              g  = m1 * u1 + m2 * u2,
              v1 = (g - Math.sqrt(m2 / m1 * (j * (m1 + m2) - g * g))) / (m1 + m2),
              v2 = (g + Math.sqrt(m1 / m2 * (j * (m1 + m2) - g * g))) / (m1 + m2);

          atoms.vx[atom1Idx] = v1 * dx - w1 * dy;
          atoms.vy[atom1Idx] = v1 * dy + w1 * dx;
          atoms.vx[atom2Idx] = v2 * dx - w2 * dy;
          atoms.vy[atom2Idx] = v2 * dy + w2 * dx;
        },

        // If one atom has an electron in a higher energy state (and we didn't
        // just excite this pair) the atom may deexcite during a collision. This
        // will either release a photon (NOT YET IMPLEMENTED) or will increase
        // the relative KE of the atoms (radiationless transition), with the
        // probabilities of each depending on the model settings.
        tryToDeexciteAtoms = function(a1, a2) {
          var selection,
              excitation1 = atoms.excitation[a1],
              excitation2 = atoms.excitation[a2];

          atom1Idx = a1;
          atom2Idx = a2;

          if (!excitation1 && !excitation2) {
            return false;
          }

          // excite a random atom, or pick the excitable one if only one can be excited
          if (!excitation1) {
            selection = atom2Idx;
          } else if (!excitation2) {
            selection = atom1Idx;
          } else {
            selection = Math.random() < 0.5 ? atom1Idx : atom2Idx;
          }
          return deexcite(selection);
        },

        deexcite = function(i) {
          var energyLevels   = elementEnergyLevels[atoms.element[i]],
              currentLevel   = atoms.excitation[i],
              newLevel       = Math.floor(Math.random() * currentLevel),
              energyReleased = energyLevels[newLevel] - energyLevels[currentLevel];

          atoms.excitation[i] = newLevel;

          if (Math.random() < pRadiationless) {
            // new energy goes into increasing atom velocities after collision
            precalculateVelocities();
            updateVelocities(energyReleased);
          } else {
            // emit photon
          }
        };

    // Public API.
    api = {
      initialize: function (dataTables) {
        atoms     = dataTables.atoms;
        elements  = dataTables.elements;
        updateAtomsTable();
      },

      performActionWithinIntegrationLoop: function(args) {
        var neighborList = args.neighborList;

        performInteractionsBetweenCloseAtoms(neighborList);
      }
    };

    return api;
  };

});

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
        cos, sin,

        // If a pair of atoms are close enough, and their relative KE is greater than
        // the energy required to reach a new excitation level of a random member of
        // the pair, increase the excitation level of that atom and adjust the velocity
        // of the pair as required.
        // This is called at the end of every integration loop.
        thermallyExciteAtoms = function(neighborList) {
          var N = atoms.x.length,
              nlist = neighborList.getList(),
              i, len,
              el1, e2,
              selection,
              xi, yi, xij, yij, ijsq;

          if (!elementEnergyLevels) return;

          // get all proximal pairs of atoms, using neighborList
          for (atom1Idx = 0; atom1Idx < N; atom1Idx++) {

            xi = atoms.x[atom1Idx];
            yi = atoms.y[atom1Idx];

            for (i = neighborList.getStartIdxFor(atom1Idx), len = neighborList.getEndIdxFor(atom1Idx); i < len; i++) {
              atom2Idx = nlist[i];

              el1 = atoms.element[atom1Idx];
              el2 = atoms.element[atom2Idx];

              // if neither atom is of an element with energy levels, skip
             if (!elementEnergyLevels[el1].length && !elementEnergyLevels[el2].length) {
               continue;
             }

              // if we aren't close (within the avrSigma of two atoms), skip
              xij = xi - atoms.x[atom2Idx];
              yij = yi - atoms.y[atom2Idx];
              ijsq = xij * xij + yij * yij;
              avrSigma = 0.5 * (elements.sigma[el1] + elements.sigma[el2]);
              avrSigmaSq = avrSigma * avrSigma;

              if (ijsq >= avrSigmaSq) {
                continue;
              }

              // excite a random atom, or pick the excitable one if only one can be excited
              if (!elementEnergyLevels[el1]) {
                tryToExcite(atom2Idx);
              } else if (!elementEnergyLevels[el2]) {
                tryToExcite(atom1Idx);
              } else {
                selection = Math.random() < 0.5 ? atom1Idx : atom2Idx;
                tryToExcite(selection);
              }
            }
          }
        },

        // Excites an atom to a new energy level if the relative KE of the pair atom1Idx
        // and atom2Idx is high enough, and updates the velocities of atoms as necessary
        tryToExcite = function(i) {
          var relativeKE = getRelativeKE(),
              energyLevels = elementEnergyLevels[atoms.element[i]],
              currentEnergyLevel = atoms.excitation[i],
              currentElectronEnergy = energyLevels[currentEnergyLevel],
              energyRequired, highest,
              nextEnergyLevel, energyAbsorbed,
              j, jj;

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
            return;
          }

          // assuming that all the energy levels above have the same chance of
          // getting the excited electron, we randomly pick one.
          highest = highest - currentEnergyLevel;
          nextEnergyLevel = Math.ceil(Math.random() * highest) + currentEnergyLevel;

          atoms.excitation[i] = nextEnergyLevel;
          energyAbsorbed = energyLevels[nextEnergyLevel] - currentElectronEnergy;
          updateVelocities(energyAbsorbed);
        },

        getRelativeKE = function() {
          var cos_ = atoms.x[atom2Idx] - atoms.x[atom1Idx],
              sin_ = atoms.y[atom2Idx] - atoms.y[atom1Idx],
              tmp  = 1.0 / Math.sqrt(cos_*cos_ + sin_*sin_),
              du;

          cos  = cos_ * tmp;
          sin  = sin_ * tmp;

          u1   = atoms.vx[atom1Idx] * cos + atoms.vy[atom1Idx] * sin,
          u2   = atoms.vx[atom2Idx] * cos + atoms.vy[atom2Idx] * sin,
          w1   = atoms.vy[atom1Idx] * cos - atoms.vx[atom1Idx] * sin,
          w2   = atoms.vy[atom2Idx] * cos - atoms.vx[atom2Idx] * sin,

          du   = u2 - u1;

          return 0.5 * du * du * atoms.mass[atom1Idx] * atoms.mass[atom2Idx] / (atoms.mass[atom1Idx] + atoms.mass[atom2Idx]);
        },

        updateVelocities = function(delta) {
          var m1 = atoms.mass[atom1Idx],
              m2 = atoms.mass[atom2Idx],
              j  = m1 * u1 * u1 + m2 * u2 * u2 - delta,
              g  = m1 * u1 + m2 * u2,
              v1 = (g - Math.sqrt(m2 / m1 * (j * (m1 + m2) - g * g))) / (m1 + m2),
              v2 = (g + Math.sqrt(m1 / m2 * (j * (m1 + m2) - g * g))) / (m1 + m2);

          atoms.vx[atom1Idx] = v1 * cos - w1 * sin;
          atoms.vy[atom1Idx] = v1 * sin + w1 * cos;
          atoms.vx[atom2Idx] = v2 * cos - w2 * sin;
          atoms.vy[atom2Idx] = v2 * sin + w2 * cos;
        }

    // Public API.
    api = {
      initialize: function (dataTables) {
        atoms     = dataTables.atoms;
        elements  = dataTables.elements;
        updateAtomsTable();
      },

      performActionWithinIntegrationLoop: function(args) {
        var neighborList = args.neighborList;

        thermallyExciteAtoms(neighborList);
      }
    };

    return api;
  };

});

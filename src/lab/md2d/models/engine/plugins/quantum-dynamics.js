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

  // static variables
  var PLANCK_CONSTANT = 0.2,      // in reality, 6.626E-34 m^2kg/s. Classic MW uses 0.2 by default.
      C = 0.002,                  // speed of light from Classic MW, in nm/fs
      TWO_PI = 2 * Math.PI,

      CloneRestoreWrapper  = require('common/models/engines/clone-restore-wrapper');

  return function QuantumDynamics(engine, _props) {

    var arrays               = require('arrays'),
        arrayTypes           = require('common/array-types'),
        metadata             = require('md2d/models/metadata'),
        validator            = require('common/validator'),

        props                = validator.validateCompleteness(metadata.quantumDynamics, _props),

        api,

        useQuantumDynamics   = props.useQuantumDynamics,

        elementEnergyLevels  = props.elementEnergyLevels,
        pRadiationless       = props.radiationlessEmissionProb,

        dimensions           = engine.getDimensions(),

        atoms,
        elements,
        photons,

        updateAtomsTable = function() {
          var num = atoms.x.length;

          atoms.excitation = arrays.create(num, 0, arrayTypes.int8Type);
        },

        createPhotonsTable = function() {
          if (photons.x) {
            // using an already-existing photon table
            return;
          }

          photons.x      = arrays.create(0, 0, arrayTypes.floatType);
          photons.y      = arrays.create(0, 0, arrayTypes.floatType);
          photons.vx     = arrays.create(0, 0, arrayTypes.floatType);
          photons.vy     = arrays.create(0, 0, arrayTypes.floatType);
          photons.omega  = arrays.create(0, 0, arrayTypes.floatType);

          _props.photons = photons;
        },

        currentlyOperatedPairs = [],  // all pairs being currently operated on

        atom1Idx, atom2Idx,           // current pair of atoms during thermal excitation

        u1, u2,                       // temporary velocity-calculation variables
        w1, w2,
        dx, dy,

        numPhotons = 0,
        firstNullPhoton = 0,          // our photon table can have holes in it. Quick way to access next opening

        // If a pair of atoms are close enough, QD interactions may occur.
        //
        // This is called at the end of every integration loop.
        performInteractionsBetweenCloseAtoms = function(neighborList) {
          var N     = atoms.x.length,
              nlist = neighborList.getList(),
              currentlyClosePairs = [],
              a1, a2,
              i, len,
              el1, el2,
              energyLevels1, energyLevels2,
              xi, yi, xij, yij, ijsq,
              avrSigma, avrSigmaSq,
              atomWasExcited, atomWasDeexcited;

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

              currentlyClosePairs[a1] = a2;   // add this pair to our temporary list of close pairs

              if (currentlyOperatedPairs[a1] === a2) {
                // we have already operated on this pair, and the atoms have not yet
                // left each other's neighborhoods, so we skip so as not to operate
                // on them twice in one collision
                continue;
              }

              // first try to see if we can excite atoms
              atomWasExcited = tryToThermallyExciteAtoms(a1, a2);

              // if we didn't excite, see if this pair wants to de-excite
              if (!atomWasExcited) {
                atomWasDeexcited = tryToDeexciteAtoms(a1, a2);
              }

              if (atomWasExcited || atomWasDeexcited) {
                // add pair to our operation list
                currentlyOperatedPairs[a1] = a2;
                currentlyOperatedPairs[a2] = a1;
              }
            }
          }

          // go through list of currently-operated pairs, and if any of them aren't in
          // our temporary list of close pairs, they have left each other so we can
          // strike them from the list
          for (a1 = 0, len = currentlyOperatedPairs.length; a1 < len; a1++) {
            a2 = currentlyOperatedPairs[a1];
            if (!isNaN(a2)) {
              if (!(currentlyClosePairs[a1] === a2 || currentlyClosePairs[a2] === a1)) {
                delete currentlyOperatedPairs[a1];
                delete currentlyOperatedPairs[a2];
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
          dx = atoms.x[atom2Idx] - atoms.x[atom1Idx];
          dy = atoms.y[atom2Idx] - atoms.y[atom1Idx];

          var normalizationFactor = 1 / Math.sqrt(dx*dx + dy*dy);

          dx *= normalizationFactor;
          dy *= normalizationFactor;

          // Decompose v1 into components u1 (parallel to d) and w1 (orthogonal to d)
          u1 = atoms.vx[atom1Idx] * dx + atoms.vy[atom1Idx] * dy;
          w1 = atoms.vy[atom1Idx] * dx - atoms.vx[atom1Idx] * dy;

          // Decompose v2 similarly
          u2 = atoms.vx[atom2Idx] * dx + atoms.vy[atom2Idx] * dy;
          w2 = atoms.vy[atom2Idx] * dx - atoms.vx[atom2Idx] * dy;
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
          deexcite(selection);
          return true;
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
            emitPhoton(i, energyReleased);
          }
        },

        emitPhoton = function(i, energy) {
          var angularFreq = energy / PLANCK_CONSTANT,
              angle       = Math.random() * TWO_PI,
              cosA        = Math.cos(angle),
              sinA        = Math.sin(angle),

              // set photon location just outside atom's sigma
              sigma       = elements.sigma[atoms.element[i]],
              x           = atoms.x[i] + (sigma * 0.51 * cosA),
              y           = atoms.y[i] + (sigma * 0.51 * sinA),

              vx          = C * cosA,
              vy          = C * sinA,
              length      = photons.x.length,
              p;

          if (firstNullPhoton >= length) {
            // extend photon arrays (this function should be extracted out from here and md2d)
            for (p in photons) {
              if(photons.hasOwnProperty(p)) {
                photons[p] = arrays.extend(photons[p], length+10);
              }
            }
          }

          photons.x[firstNullPhoton]      = x;
          photons.y[firstNullPhoton]      = y;
          photons.vx[firstNullPhoton]     = vx;
          photons.vy[firstNullPhoton]     = vy;
          photons.omega[firstNullPhoton]  = angularFreq;

          if (firstNullPhoton < numPhotons) {
            // search for next empty slot in photons table
            for (i = firstNullPhoton+1; i < numPhotons; i++) {
              if (!photons.vx[i] && !photons.vy[i]) {
                firstNullPhoton = i;
                break;
              }
            }
          } else {
            firstNullPhoton++;
          }

          numPhotons++;
        },

        movePhotons = function(dt) {
          var i, ii,
              x, y;

          for (i = 0, ii = photons.x.length; i < ii; i++) {
            if (!photons.vx[i] && !photons.vy[i]) continue;

            x = photons.x[i] += photons.vx[i] * dt;
            y = photons.y[i] += photons.vy[i] * dt;

            if (x < dimensions[0] || x > dimensions[2] || y < dimensions[1] || y > dimensions[3]) {
              // remove photon
              photons.x[i]  = photons.y[i]  =
              photons.vx[i] = photons.vy[i] =
              photons.omega[i] = 0;

              if (firstNullPhoton === numPhotons) {
                firstNullPhoton--;
              }
              numPhotons--;
            }
          }
        };

    // Public API.
    api = {
      initialize: function(dataTables) {
        atoms     = dataTables.atoms;
        elements  = dataTables.elements;
        photons   = props.photons;
        updateAtomsTable();
        createPhotonsTable();
      },

      performActionWithinIntegrationLoop: function(args) {
        var neighborList = args.neighborList,
            dt = args.dt;

        if (useQuantumDynamics) {
          performInteractionsBetweenCloseAtoms(neighborList);
          // sponaneousEmission()   // TODO
          movePhotons(dt);
        }
      },

      getState: function() {
        return [
          new CloneRestoreWrapper(photons)
        ];
      }
    };

    return api;
  };

});

/*global define */

/**
  This plugin adds quantum dynamics functionality to the MD2D engine.

  Datatable changes`
    atoms:
      excitation: an int representing the current level of excitation of an atom, from
        floor (0) to an arbitrary level. In this model each atom is assumed to have one
        single electron that can be excited to any of a finite number of levels. The
        actual energy of each level is defined by the atom's element

  New serialized properties:

    elementEnergyLevels: A 2-dimensional array defining energy levels for each element

*/


define(function(require) {

  // static variables
  var CloneRestoreWrapper = require('common/models/engines/clone-restore-wrapper'),
      constants           = require('../constants/index'),
      utils               = require('../utils'),

      // in reality, 6.626E-34 m^2kg/s. Classic MW uses 0.2 in its units (eV * fs)
      PLANCK_CONSTANT = constants.convert(0.2, { from: constants.unit.EV, to: constants.unit.MW_ENERGY_UNIT }),

      // Speed of light.
      // in reality, about 300 nm/fs! Classic uses 0.2 in its units (0.1Å/fs), which is 0.002 nm/fs:
      C = 0.002,
      TWO_PI = 2 * Math.PI,

      // expected value of lifetime of excited energy state, in fs
      LIFETIME = 1000,
      EMISSION_PROBABILITY_PER_FS = 1/LIFETIME;

  return function QuantumDynamics(engine, _properties) {

    var arrays               = require('arrays'),
        arrayTypes           = require('common/array-types'),
        metadata             = require('md2d/models/metadata'),
        validator            = require('common/validator'),

        properties           = validator.validateCompleteness(metadata.quantumDynamics, _properties),

        api,

        elementEnergyLevels  = properties.elementEnergyLevels,
        pRadiationless       = properties.radiationlessEmissionProbability,

        dimensions           = engine.getDimensions(),

        atoms,
        elements,
        photons,

        viewPhotons = [],

        updateAtomsTable = function() {
          var length = atoms.x.length;

          atoms.excitation = arrays.create(length, 0, arrayTypes.int8Type);
        },

        createPhotonsTable = function(serializedPhotons) {
          var length = 0;

          if (serializedPhotons.x) {
            length = Math.ceil(serializedPhotons.x.length / 10) * 10;
          }

          photons =  {
            x     : arrays.create(length, 0, arrayTypes.floatType),
            y     : arrays.create(length, 0, arrayTypes.floatType),
            vx    : arrays.create(length, 0, arrayTypes.floatType),
            vy    : arrays.create(length, 0, arrayTypes.floatType),
            angularFrequency : arrays.create(length, 0, arrayTypes.floatType)
          };
        },

        currentlyOperatedPairs = [],  // all pairs being currently operated on

        atom1Idx, atom2Idx,           // current pair of atoms during thermal excitation

        u1, u2,                       // temporary velocity-calculation variables
        w1, w2,
        dx, dy,

        numPhotons = 0,

        copyPhotonData = function(serializedPhotons) {
          if (!serializedPhotons || !serializedPhotons.x) {
            return;
          }
          ['x', 'y', 'vx', 'vy', 'angularFrequency'].forEach(function(key) {
            arrays.copy(serializedPhotons[key], photons[key]);
          });

          for (var i = 0; i < photons.x.length; i++) {
            if (photons.vx[i] || photons.vy[i]) {
              numPhotons++;
            }
          }
        },

        // If a pair of atoms are close enough, QD interactions may occur.
        //
        // This is called at the end of every integration loop.
        performInteractionsBetweenCloseAtoms = function(neighborList) {
          var N     = engine.getNumberOfAtoms(),
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

        addPhoton = function() {
          var length = photons.x.length,
              i;

          numPhotons++;

          if (numPhotons > length) {
            utils.extendArrays(photons, length+10);
            return numPhotons - 1;
          }

          for (i = 0; i < length; i++) {
            if (!photons.vx[i] && !photons.vy[i]) {
              return i;
            }
          }
        },

        removePhoton = function(i) {
          numPhotons--;
          photons.x[i] = photons.y[i] = photons.vx[i] = photons.vy[i] = photons.angularFrequency[i] = 0;
        },

        emitPhoton = function(atomIndex, energy) {
          var angle = Math.random() * TWO_PI,
              cosA  = Math.cos(angle),
              sinA  = Math.sin(angle),
              sigma = elements.sigma[atoms.element[atomIndex]],

              // set photon location just outside atom's sigma
              x           = atoms.x[atomIndex] + (sigma * 0.51 * cosA),
              y           = atoms.y[atomIndex] + (sigma * 0.51 * sinA),
              vx          = C * cosA,
              vy          = C * sinA,
              angularFreq = energy / PLANCK_CONSTANT,

              photonIndex = addPhoton();

          photons.x[photonIndex]  = x;
          photons.y[photonIndex]  = y;
          photons.vx[photonIndex] = vx;
          photons.vy[photonIndex] = vy;
          photons.angularFrequency[photonIndex] = angularFreq;
        },

        movePhotons = function(dt) {
          var i, ii,
              x, y;

          for (i = 0, ii = photons.x.length; i < ii; i++) {
            if (!photons.vx[i] && !photons.vy[i]) continue;

            x = photons.x[i] += photons.vx[i] * dt;
            y = photons.y[i] += photons.vy[i] * dt;

            if (x < dimensions[0] || x > dimensions[2] || y < dimensions[1] || y > dimensions[3]) {
              removePhoton(i);
            }
          }
        },

        spontaneousEmission = function(dt) {
          if (!elementEnergyLevels) { return; }

          for (var i = 0, N = engine.getNumberOfAtoms(); i < N; i++) {
            tryToSpontaneouslyEmit(i, dt);
          }
        },

        tryToSpontaneouslyEmit = function(atomIndex, dt) {

          if (atoms.excitation[atomIndex] === 0) { return; }

          // The probability of an emission in the current timestep is the probability that an
          // exponential random variable T with expected value LIFETIME has value t less than dt.
          // For dt < ~0.1 * LIFETIME, this probability is approximately equal to dt/LIFETIME.

          if (Math.random() > dt * EMISSION_PROBABILITY_PER_FS) { return; }

          // Randomly select an energy level. Reference:
          // https://github.com/concord-consortium/mw/blob/6e2f2d4630323b8e993fcfb531a3e7cb06644fef/src/org/concord/mw2d/models/SpontaneousEmission.java#L48-L70

          var u1 = Math.random(),
              u2 = Math.random(),
              energyLevels,
              excessEnergy,
              i,
              m = atoms.excitation[atomIndex],
              mInverse = 1/m;

          for (i = 0; i < m; i++) {
            if (i*mInverse <= u1 && u1 < (i+1)*mInverse && pRadiationless < u2) {
              energyLevels = elementEnergyLevels[atoms.element[atomIndex]];
              excessEnergy = energyLevels[m] - energyLevels[i];
              atoms.excitation[atomIndex] = i;
              emitPhoton(atomIndex, excessEnergy);
              return;
            }
          }
        };

    // Public API.
    api = {
      initialize: function(dataTables) {
        atoms     = dataTables.atoms;
        elements  = dataTables.elements;
        updateAtomsTable();
        createPhotonsTable(properties.photons);
        copyPhotonData(properties.photons);
      },

      performActionWithinIntegrationLoop: function(neighborList, dt) {
        performInteractionsBetweenCloseAtoms(neighborList);
        spontaneousEmission(dt);
        movePhotons(dt);
      },

      getPhotons: function() {
        return photons;
      },

      getNumPhotons: function() {
        return numPhotons;
      },

      // TODO/FIXME: This is a modeler-level method; it's here until the plugin mechanism is
      // extended to allow plugins to define both engine-level and modeler-level parts.
      // Additionally, this can be split into updateViewPhotons which can happen in the
      // modeler's readModelState method, and a simple getViewPhotons accessor used by the view.
      getViewPhotons: function() {
        var n = 0,
            // avoid using closure variable as this method will be relocated to modeler
            photons = this.getPhotons(),
            viewPhoton,
            i,
            len;

        for (i = 0, len = photons.x.length; i < len; i++) {
          if (photons.vx[i] || photons.vy[i]) {
            if (!viewPhotons[n]) {
              viewPhotons[n] = {
                idx: n
              };
            }

            viewPhoton = viewPhotons[n];

            viewPhoton.x  = photons.x[i];
            viewPhoton.y  = photons.y[i];
            viewPhoton.vx = photons.vx[i];
            viewPhoton.vy = photons.vy[i];
            viewPhoton.angularFrequency = photons.angularFrequency[i];

            n++;
          }
        }

        viewPhotons.length = this.getNumPhotons();

        return viewPhotons;
      },

      getElementEnergyLevels: function() {
        return elementEnergyLevels;
      },

      getRadiationlessEmissionProbability: function() {
        return pRadiationless;
      },

      getState: function() {
        return [
          new CloneRestoreWrapper(photons),
          {
            clone: function() {
              return {
                numPhotons: numPhotons
              };
            },
            restore: function(state) {
              numPhotons = state.numPhotons;
            }
          }
        ];
      }
    };

    return api;
  };

});

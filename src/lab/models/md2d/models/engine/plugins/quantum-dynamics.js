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
      DispatchSupport     = require('common/dispatch-support'),
      constants           = require('../constants/index'),
      utils               = require('../utils'),
      arrays              = require('arrays'),
      arrayTypes          = require('common/array-types'),
      metadata            = require('models/md2d/models/metadata'),
      validator           = require('common/validator'),

      // in reality, 6.626E-34 m^2kg/s. Classic MW uses 0.2 in its units (eV * fs)
      PLANCK_CONSTANT = constants.convert(0.2, { from: constants.unit.EV, to: constants.unit.MW_ENERGY_UNIT }),

      // MW uses a "tolerance band" to decide if a photon's energy matches an energy level gap.
      // Reference: https://github.com/concord-consortium/mw/blob/d3f621ba87825888737257a6cb9ac9e4e4f63f77/src/org/concord/mw2d/models/PhotonicExcitor.java#L28
      ENERGY_GAP_TOLERANCE = constants.convert(0.05, { from: constants.unit.EV, to: constants.unit.MW_ENERGY_UNIT }),

      // Speed of light.
      // in reality, about 300 nm/fs! Classic uses 0.2 in its units (0.1Å/fs), which is 0.002 nm/fs:
      C = 0.002,
      TWO_PI = 2 * Math.PI,

      // expected value of lifetime of excited energy state, in fs
      LIFETIME = 200,
      EMISSION_PROBABILITY_PER_FS = 1/LIFETIME,

      INFRARED = 2.5,
      ULTRAVIOLET = 14.5,

      // dispatch events from handlePhotonAtomCollision
      PHOTON_ABSORBED = 1,
      PHOTON_EMITTED = 2;

  return function QuantumDynamics(engine, _properties) {

    var properties           = validator.validateCompleteness(metadata.quantumDynamics, _properties),

        api,
        dispatch             = new DispatchSupport("photonAbsorbed"),

        elementEnergyLevels  = properties.elementEnergyLevels,
        pRadiationless       = properties.radiationlessEmissionProbability,
        pStimulatedEmission  = 0,

        lightSource          = properties.lightSource,

        dimensions           = engine.getDimensions(),

        excitationTime       = [],

        modelTime,

        atoms,
        elements,
        photons,

        nextPhotonId = 0,

        getRandomFrequency = function() {
          return INFRARED + ((ULTRAVIOLET - INFRARED) * Math.random());
        },

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
            id    : arrays.create(length, 0, arrayTypes.uint16Type),
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
        dxFraction, dyFraction,

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
              photons.id[i] = nextPhotonId++;
            }
          }
        },

        // Iterate over all photon-atom pairs, and allow them to interact if "touching".
        //
        // If a photons and atom are close enough, one of the following may happen:
        //   - the photon is absorbed, exciting the atom's electron to a higher energy level
        //   - (NOT YET IMPLEMENTED) the photon is absorbed, ionizing the atoms' electron
        //   - (NOT YET IMPLEMENTED) the photon triggers stimulated emission of a second photon
        //   - (NOT YET IMPLEMENTED) the photon is scattered
        //   - or no interaction occurs (the photon and atom are unmodified)
        //
        handlePhotonAtomCollisions = function() {
          var numAtoms = engine.getNumberOfAtoms(),
              i, len,
              x, y,
              atomIndex,
              r, rsq,
              dx, dy,
              collisionResult;

          for (i = 0, len = photons.x.length; i < len; i++) {
            if (!photons.vx[i] && !photons.vy[i]) {
              continue;
            }

            x = photons.x[i];
            y = photons.y[i];

            // TODO. Consider using the cell list to narrow down the list of atoms to those in the
            // same cell as the photon.
            for (atomIndex = 0; atomIndex < numAtoms; atomIndex++) {
              dx = atoms.x[atomIndex] - x;
              dy = atoms.y[atomIndex] - y;
              r = atoms.radius[atomIndex];
              // TODO. Cache rsq values?
              rsq = r*r;

              if (dx*dx + dy*dy < rsq) {
                collisionResult = handlePhotonAtomCollision(i, atomIndex);
                if (collisionResult === PHOTON_ABSORBED) {
                  // Break from iteration over atoms, and move on to the next photon.
                  break;
                }
                // TODO. Handle stimulated emission by remembering a list of photons to create
                // after the loop over photons completes.
              }
            }
          }
        },

        handlePhotonAtomCollision = function(photonIndex, atomIndex) {
          var photonFrequency = photons.angularFrequency[photonIndex];
          if (Math.random() < pStimulatedEmission) {
            // TODO. Stimulated emission.
            return PHOTON_EMITTED;
          } else if (tryToAbsorbPhoton(photonIndex, atomIndex)) {
            dispatch.photonAbsorbed(photonFrequency);
            return PHOTON_ABSORBED;
          }
          // TODO. Scatter photon (or not) depending on the model's "scatter probability".
        },

        // If the photon can be absorbed by exciting the atom's electron to a higher energy level,
        // then remove the photon, excite the electron, and return true. Otherwise, return false.
        tryToAbsorbPhoton = function(photonIndex, atomIndex) {
          if (!elementEnergyLevels) return;

          var energyLevels     = elementEnergyLevels[atoms.element[atomIndex]],
              energyLevelIndex = atoms.excitation[atomIndex],
              electronEnergy   = energyLevels[energyLevelIndex],
              photonEnergy     = photons.angularFrequency[photonIndex] * PLANCK_CONSTANT,
              i,
              nLevels;

          for (i = energyLevelIndex + 1, nLevels = energyLevels.length; i < nLevels; i++) {
            if (Math.abs(energyLevels[i] - electronEnergy - photonEnergy) < ENERGY_GAP_TOLERANCE) {
              atoms.excitation[atomIndex] = i;
              excitationTime[atomIndex] = modelTime;
              removePhoton(photonIndex);
              return true;
            }
          }
          return false;
        },

        // If a pair of atoms are close enough, QD interactions may occur.
        //
        // This is called at the end of every integration loop.
        thermallyExciteAndDeexciteAtoms = function(neighborList) {
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
              avrSigma = 0.55 * (elements.sigma[el1] + elements.sigma[el2]);
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
                atomWasDeexcited = tryToThermallyDeexciteAtoms(a1, a2);
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
          atomWasExcited = tryToExciteAtom(selection);
          if (!atomWasExcited) {
            // if we couldn't excite the first, excite the other one
            atomWasExcited = tryToExciteAtom(atom1Idx+atom2Idx-selection);
          }

          return atomWasExcited;
        },

        // Excites an atom to a new energy level if the relative KE of the pair atom1Idx
        // and atom2Idx is high enough, and updates the velocities of atoms as necessary
        tryToExciteAtom = function(i) {
          var energyLevels   =   elementEnergyLevels[atoms.element[i]],
              currentEnergyLevel,
              currentElectronEnergy,
              relativeKE,
              energyRequired, highest,
              nextEnergyLevel, energyAbsorbed,
              j, jj;

          if (!energyLevels) return;

          computeVelocityComponents();

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
          excitationTime[i] = modelTime;
          energyAbsorbed = energyLevels[nextEnergyLevel] - currentElectronEnergy;
          updateVelocities(energyAbsorbed);
          return true;
        },

        computeVelocityComponents = function() {
          var dx = atoms.x[atom2Idx] - atoms.x[atom1Idx],
              dy = atoms.y[atom2Idx] - atoms.y[atom1Idx],
              normalizationFactor = 1 / Math.sqrt(dx*dx + dy*dy);

          dxFraction = dx * normalizationFactor;
          dyFraction = dy * normalizationFactor;

          // Decompose v1 into components u1 (parallel to d) and w1 (orthogonal to d)
          u1 = atoms.vx[atom1Idx] * dxFraction + atoms.vy[atom1Idx] * dyFraction;
          w1 = atoms.vy[atom1Idx] * dxFraction - atoms.vx[atom1Idx] * dyFraction;

          // Decompose v2 similarly
          u2 = atoms.vx[atom2Idx] * dxFraction + atoms.vy[atom2Idx] * dyFraction;
          w2 = atoms.vy[atom2Idx] * dxFraction - atoms.vx[atom2Idx] * dyFraction;
        },

        getRelativeKE = function() {
          var du = u2 - u1,
              m1 = atoms.mass[atom1Idx],
              m2 = atoms.mass[atom2Idx];

          return 0.5 * du * du * m1 * m2 / (m1 + m2);
        },

        updateVelocities = function(energyDelta) {
          var m1 = atoms.mass[atom1Idx],
              m2 = atoms.mass[atom2Idx],
              j  = m1 * u1 * u1 + m2 * u2 * u2 - energyDelta,
              g  = m1 * u1 + m2 * u2,
              v1 = (g - Math.sqrt(m2 / m1 * (j * (m1 + m2) - g * g))) / (m1 + m2),
              v2 = (g + Math.sqrt(m1 / m2 * (j * (m1 + m2) - g * g))) / (m1 + m2);

          atoms.vx[atom1Idx] = v1 * dxFraction - w1 * dyFraction;
          atoms.vy[atom1Idx] = v1 * dyFraction + w1 * dxFraction;
          atoms.vx[atom2Idx] = v2 * dxFraction - w2 * dyFraction;
          atoms.vy[atom2Idx] = v2 * dyFraction + w2 * dxFraction;
        },

        // If one atom has an electron in a higher energy state (and we didn't just excite this
        // pair) the atom may deexcite during a collision. This will either release a photon or will
        // increase the relative KE of the atoms (radiationless transition), with the probabilities
        // of each depending on the model settings.
        tryToThermallyDeexciteAtoms = function(a1, a2) {
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
            if (!readyToThermallyDeexcite(atom2Idx)) return false;
            selection = atom2Idx;
          } else if (!excitation2) {
            if (!readyToThermallyDeexcite(atom1Idx)) return false;
            selection = atom1Idx;
          } else {
            selection = Math.random() < 0.5 ? atom1Idx : atom2Idx;
            if (!readyToThermallyDeexcite(selection)) {
              selection = atom1Idx + atom2Idx - selection;
              if (!readyToThermallyDeexcite(selection)) {
                return false;
              }
            }
          }
          deexciteAtom(selection);
          return true;
        },

        readyToThermallyDeexcite = function(i) {
          if (modelTime > excitationTime[i] + LIFETIME) {
            return true;
          }
        },

        deexciteAtom = function(i) {
          var energyLevels   = elementEnergyLevels[atoms.element[i]],
              currentLevel   = atoms.excitation[i],
              newLevel       = Math.floor(Math.random() * currentLevel),
              energyReleased = energyLevels[newLevel] - energyLevels[currentLevel];

          atoms.excitation[i] = newLevel;

          if (Math.random() < pRadiationless) {
            // new energy goes into increasing atom velocities after collision
            computeVelocityComponents();
            updateVelocities(energyReleased);
          } else {
            emitPhotonFromAtom(i, -energyReleased);
          }
        },

        findEmptyPhotonIndex = function() {
          var length = photons.x.length,
              i;

          if (numPhotons + 1 > length) {
            utils.extendArrays(photons, length+10);
            return length;
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

        emitPhoton = function(x, y, angle, energy) {
          var cosA  = Math.cos(angle),
              sinA  = Math.sin(angle),
              vx          = C * cosA,
              vy          = C * sinA,
              angularFreq = energy / PLANCK_CONSTANT,
              photonIndex = findEmptyPhotonIndex();

          numPhotons++;
          photons.id[photonIndex] = nextPhotonId++;
          photons.x[photonIndex]  = x;
          photons.y[photonIndex]  = y;
          photons.vx[photonIndex] = vx;
          photons.vy[photonIndex] = vy;
          photons.angularFrequency[photonIndex] = angularFreq;
        },

        emitPhotonFromAtom = function(atomIndex, energy) {
          var angle = Math.random() * TWO_PI - Math.PI,
              cosA  = Math.cos(angle),
              sinA  = Math.sin(angle),
              sigma = elements.sigma[atoms.element[atomIndex]],

              // set photon location just outside atom's sigma
              x = atoms.x[atomIndex] + (sigma * 0.51 * cosA),
              y = atoms.y[atomIndex] + (sigma * 0.51 * sinA);

          emitPhoton(x, y, angle, energy);
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

        spontaneouslyEmitPhotons = function(dt) {
          if (!elementEnergyLevels) { return; }

          for (var i = 0, N = engine.getNumberOfAtoms(); i < N; i++) {
            tryToSpontaneouslyEmitPhoton(i, dt);
          }
        },

        tryToSpontaneouslyEmitPhoton = function(atomIndex, dt) {

          if (atoms.excitation[atomIndex] === 0) { return; }

          // The probability of an emission in the current timestep is the probability that an
          // exponential random variable T with expected value LIFETIME has value t less than dt.
          // For dt < ~0.1 * LIFETIME, this probability is approximately equal to dt/LIFETIME.

          if (Math.random() > dt * EMISSION_PROBABILITY_PER_FS) { return; }

          // Randomly select an energy level. Reference:
          // https://github.com/concord-consortium/mw/blob/6e2f2d4630323b8e993fcfb531a3e7cb06644fef/src/org/concord/mw2d/models/SpontaneousEmission.java#L48-L70

          var r1 = Math.random(),
              r2 = Math.random(),
              energyLevels,
              excessEnergy,
              i,
              m = atoms.excitation[atomIndex],
              mInverse = 1/m;

          for (i = 0; i < m; i++) {
            if (i*mInverse <= r1 && r1 < (i+1)*mInverse && pRadiationless < r2) {
              energyLevels = elementEnergyLevels[atoms.element[atomIndex]];
              excessEnergy = energyLevels[m] - energyLevels[i];
              atoms.excitation[atomIndex] = i;
              emitPhotonFromAtom(atomIndex, excessEnergy);
              return;
            }
          }
        },

        normalizeAngle = function(t) {
          t = t % TWO_PI;
          if (t < 0 || t > TWO_PI)
            return Math.abs((TWO_PI) - Math.abs(t));
          return t;
        },

        // Temporary implementation with hard-wired parameters.
        emitLightSourcePhotons = function() {
          var x = dimensions[0],
              y = dimensions[1],
              w = dimensions[2] - x,
              h = dimensions[3] - y,

              angle  = normalizeAngle(lightSource.angleOfIncidence),
              nBeams = lightSource.numberOfBeams,
              spacing,
              s, c, length, dx, dy, m, n, i,

              getEnergy = function () {
                return (lightSource.monochromatic ? lightSource.frequency : getRandomFrequency()) * PLANCK_CONSTANT;
              };

          if (angle == 0) {
            spacing = h / (nBeams + 1);
            for (i = 1; i <= nBeams; i++) {
              emitPhoton(x, y + spacing * i, angle, getEnergy());
            }
          } else if (angle.toFixed(4) == (Math.PI/2).toFixed(4)) {
            spacing = w / (nBeams + 1);
            for (i = 1; i <= nBeams; i++) {
              emitPhoton(x + spacing * i, y, angle, getEnergy());
            }
          } else if (angle.toFixed(4) == (Math.PI).toFixed(4)) {
            spacing = h / (nBeams + 1);
            for (i = 1; i <= nBeams; i++) {
              emitPhoton(x + w, y + spacing * i, angle, getEnergy());
            }
          } else if (angle.toFixed(4) == (Math.PI*3/2).toFixed(4)) {
            spacing = w / (nBeams + 1);
            for (i = 1; i <= nBeams; i++) {
              emitPhoton(x + spacing * i, y + h, angle, getEnergy());
            }
          } else {
            // Lifted from AtomicModel.shootPhotons()
            // https://github.com/concord-consortium/mw/blob/d3f621ba87825888737257a6cb9ac9e4e4f63f77/src/org/concord/mw2d/models/AtomicModel.java#L2534
            s = Math.abs(Math.sin(angle));
            c = Math.abs(Math.cos(angle));
            length = s * h < c * w ? h / c : w / s;
            spacing = length / nBeams;
            dx = spacing / s;
            dy = spacing / c;
            m = Math.floor(w / dx);
            n = Math.floor(h / dy);

            // Lifted from AtomicModel.shootAtAngle()
            // https://github.com/concord-consortium/mw/blob/d3f621ba87825888737257a6cb9ac9e4e4f63f77/src/org/concord/mw2d/models/AtomicModel.java#L2471
            if (angle >= 0 && angle < 0.5 * Math.PI) {
              for (i = 1; i <= m; i++)
                emitPhoton(x + dx * i, y, angle, getEnergy());
              for (i = 0; i <= n; i++)
                emitPhoton(x, y + h - dy * i, angle, getEnergy());
            } else if (angle >= Math.PI*3/2) {
              for (i = 1; i <= m; i++)
                emitPhoton(x + dx * i, y + h, angle, getEnergy());
              for (i = 0; i <= n; i++)
                emitPhoton(x, y + dy * i, angle, getEnergy());
            } else if (angle < Math.PI && angle >= 0.5 * Math.PI) {
              for (i = 0; i <= m; i++)
                emitPhoton(x + w - dx * i, y, angle, getEnergy());
              for (i = 1; i <= n; i++)
                emitPhoton(x + w, y + h - dy * i, angle, getEnergy());
            } else if (angle >= Math.PI && angle < Math.PI*3/2) {
              for (i = 0; i <= m; i++)
                emitPhoton(x + w - dx * i, y + h, angle, getEnergy());
              for (i = 1; i <= n; i++)
                emitPhoton(x + w, y + dy * i, angle, getEnergy());
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

      performActionWithinIntegrationLoop: function(neighborList, dt, time) {
        modelTime = time;
        movePhotons(dt);
        handlePhotonAtomCollisions();
        thermallyExciteAndDeexciteAtoms(neighborList);
        spontaneouslyEmitPhotons(dt);
        // Temporary hard-wired light source, for demo purposes

        if (lightSource.on && time % lightSource.radiationPeriod < dt) {
          emitLightSourcePhotons();
        }
      },

      turnOnLightSource: function() {
        lightSource.on = true;
      },

      turnOffLightSource: function() {
        lightSource.on = false;
      },

      setLightSourceAngle: function(angle) {
        lightSource.angleOfIncidence = angle;
      },

      setLightSourceFrequency: function(freq) {
        lightSource.frequency = freq;
      },

      setLightSourcePeriod: function(period) {
        lightSource.radiationPeriod = period;
      },

      setLightSourceNumber: function(number) {
        lightSource.numberOfBeams = number;
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
      getViewPhotons: (function() {
        var viewPhotons = [],
            viewPhotonsByIndex = [];

        function makeViewPhoton(photons, i) {
          var vx = photons.vx[i],
              vy = photons.vy[i],
              // For convenience, this is in the form required by SVG transform
              angle = -180 * Math.atan2(vy, vx) / Math.PI;

          return {
            id: photons.id[i],
            x:  photons.x[i],
            y:  photons.y[i],
            vx: vx,
            vy: vy,
            angle: angle,
            angularFrequency: photons.angularFrequency[i]
          };
        }

        return function() {
          // avoid using the closure variable 'photons' as this method will be relocated to
          // modeler, and will then have to access photons table via some kind of accessor method
          var photons = this.getPhotons(),
              n = 0,
              i,
              len,
              viewPhoton;

          viewPhotons.length = this.getNumPhotons();
          viewPhotonsByIndex.length = photons.x.length;

          for (i = 0, len = photons.x.length; i < len; i++) {
            if (photons.vx[i] || photons.vy[i]) {
              viewPhoton = viewPhotonsByIndex[i];

              // If we have a viewPhoton for slot i in the photons array, update it instead of
              // allocating a new viewPhoton object; that will tell the view code to update the
              // position of the squiggle instead of generating a new one. Note that we also need to
              // make sure that that slot in the photons array still represents the same photon it
              // did last time we were called.
              if (viewPhoton && viewPhoton.id === photons.id[i]) {
                viewPhoton.x = photons.x[i];
                viewPhoton.y = photons.y[i];
              } else {
                viewPhoton = makeViewPhoton(photons, i);
                viewPhotonsByIndex[i] = viewPhoton;
              }
              viewPhotons[n++] = viewPhoton;
            } else {
              // Release references to the viewPhoton object after we're done with it.
              viewPhotonsByIndex[i] = null;
            }
          }

          return viewPhotons;
        };
      }()),

      getElementEnergyLevels: function() {
        return elementEnergyLevels;
      },

      getRadiationlessEmissionProbability: function() {
        return pRadiationless;
      },

      getLightSource: function() {
        if (!lightSource) return undefined;
        return lightSource;
      },

      getState: function() {
        return [
          new CloneRestoreWrapper(photons, { padArraysWithZeroes: true }),
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

    dispatch.mixInto(api);

    return api;
  };

});

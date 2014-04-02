/*global define: false, d3: false */

define(function(require) {
  // Dependencies.
  var performance          = require('common/performance'),
      serialize            = require('common/serialize'),
      validator            = require('common/validator'),
      LabModelerMixin      = require('common/lab-modeler-mixin'),
      OutputSupport        = require('common/output-support'),
      TickHistory          = require('common/models/tick-history'),
      md2d                 = require('models/md2d/models/engine/md2d'),
      metadata             = require('models/md2d/models/metadata'),
      units                = require('models/md2d/models/engine/constants/units'),
      unitDefinitions      = require('models/md2d/models/unit-definitions/index'),
      UnitsTranslation     = require('models/md2d/models/units-translation'),
      Solvent              = require('cs!models/md2d/models/solvent'),
      aminoacids           = require('models/md2d/models/aminoacids-props'),
      aminoacidsHelper     = require('cs!models/md2d/models/aminoacids-helper'),
      GeneticEngine        = require('models/md2d/models/engine/genetic-engine'),
      PerformanceOptimizer = require('models/md2d/models/performance-optimizer'),
      AtomTransition       = require('models/md2d/models/atom-transition'),
      _ = require('underscore'),

      // plugins
      QuantumDynamics      = require('models/md2d/models/engine/plugins/quantum-dynamics'),
      ChemicalReactions    = require('models/md2d/models/engine/plugins/chemical-reactions'),

      md2dModelCount = 0;

  return function Model(initialProperties, initializationOptions) {

    // all models created with this constructor will be of type: "md2d"
    this.constructor.type = "md2d";

    initializationOptions = initializationOptions || {};

    var model = {},
        namespace = "md2dModel" + (++md2dModelCount),

        customSetters = {
          targetTemperature: function (value) {
            engine.setTargetTemperature(value);
          },

          temperatureControl: function(value) {
            engine.useThermostat(value);
          },

          lennardJonesForces: function(value) {
            engine.useLennardJonesInteraction(value);
          },

          coulombForces: function(value) {
            engine.useCoulombInteraction(value);
          },

          solventForceType: function(value) {
            engine.setSolventForceType(value);
          },

          DNAState: function(value) {
            engine.setDNAState(value);
          },

          solventForceFactor: function(value) {
            engine.setSolventForceFactor(value);
          },

          additionalSolventForceMult: function(value) {
            engine.setAdditionalSolventForceMult(value);
          },

          additionalSolventForceThreshold: function(value) {
            engine.setAdditionalSolventForceThreshold(value);
          },

          dielectricConstant: function(value) {
            engine.setDielectricConstant(value);
          },

          realisticDielectricEffect: function(value) {
            engine.setRealisticDielectricEffect(value);
          },

          VDWLinesCutoff: function(value) {
            var ratio = VDWLinesCutoffMap[value];
            if (ratio) {
              engine.setVDWLinesRatio(ratio);
            }
          },

          gravitationalField: function(value) {
            engine.setGravitationalField(value);
          },

          modelSampleRate: function() {
            if (!model.isStopped()) model.restart();
          },

          viscosity: function(value) {
            engine.setViscosity(value);
          },

          polarAAEpsilon: function (value) {
            var polarAAs, element1, element2,
                i, j, len;

            // Set custom pairwise LJ properties for polar amino acids.
            // They should attract stronger to better mimic nature.
            polarAAs = aminoacidsHelper.getPolarAminoAcids();
            for (i = 0, len = polarAAs.length; i < len; i++) {
              element1 = polarAAs[i];
              for (j = i + 1; j < len; j++) {
                element2 = polarAAs[j];
                // Set custom pairwise LJ epsilon (default one for AA is -0.1).
                engine.pairwiseLJProperties.set(element1, element2, {epsilon: value});
              }
            }
          },

          electricFieldDensity: function (value) {
            electricField.length = 0; // reuse existing array!
            if (!value) return;
            var minX = 0,
                minY = 0,
                maxX = model.properties.width,
                maxY = model.properties.height,
                diff = model.properties.width / value,
                yOffset = ((maxY / diff) % 1) * diff,
                y = minY + 0.5 * (yOffset + (diff <= maxY ? diff : 0)),
                x;
            while(y < maxY) {
              x = minX + 0.5 * diff;
              while(x < maxX) {
                electricField.push({x: x, y: y});
                x += diff;
              }
              y += diff;
            }
          }
        },

        // The set of units currently in effect. (Determined by the 'unitsScheme' property of the
        // model; default value is 'md2d')
        unitsDefinition = unitDefinitions.get(initialProperties.unitsScheme || 'md2d'),

        // Object that translates between 'native' md2d units and the units defined
        // by unitsDefinition.
        unitsTranslation = (function() {
          var scheme = initialProperties.unitsScheme || 'md2d';
          // If we're not using MD2D units, we need a translation (which, for each unit type, allows some
          // number of "native" MD2D units to stand for 1 translated unit, e.g., 1 nm represents 1m, with
          // the relationships between these ratios set up so that the calculations reamin physically
          // consistent.
          if (scheme !== 'md2d') {
            return new UnitsTranslation(unitsDefinition);
          }
          return undefined;
        }()),

        labModelerMixin = new LabModelerMixin({
          metadata: metadata,
          setters: customSetters,
          unitsDefinition: unitsDefinition,
          unitsTranslation: unitsTranslation,
          initialProperties: initialProperties
        }),

        dispatch = (function() {
          var d = labModelerMixin.dispatchSupport;
          d.addEventTypes("tick",
                          "addAtom", "removeAtom", "addRadialBond", "removeRadialBond",
                          "addElectricField", "removeElectricField", "changeElectricField",
                          "removeAngularBond", "textBoxesChanged", "imagesChanged");
          return d;
        }()),

        propertySupport = labModelerMixin.propertySupport,

        outputSupport,

        VDWLinesCutoffMap = {
          "short": 1.33,
          "medium": 1.67,
          "long": 2.0
        },
        defaultMaxTickHistory = 1000,
        newStep = false,
        lastSampleTime,
        sampleTimes = [],

        // FIXME: do we need global reference?
        modelState = window.state = {},
        tickHistory,

        // Transitions list.
        transitions = [],

        // Molecular Dynamics engine.
        engine = (function() {
          var e = md2d.createEngine();
          // Register invalidating change hooks.
          // pairwiseLJProperties object allows to change state which defines state of the whole simulation.
          e.pairwiseLJProperties.registerChangeHooks(propertySupport.invalidatingChangePreHook, propertySupport.invalidatingChangePostHook);
          return e;
        }()),

        // Genetic engine.
        geneticEngine,

        // An array of elements object.
        editableElements,

        // ######################### Main Data Structures #####################
        // They are initialized at the end of this function. These data strucutres
        // are mainly managed by the engine.

        // A hash of arrays consisting of arrays of element property values
        elements,

        // A hash of arrays consisting of arrays of obstacle property values
        obstacles,

        // A hash of arrays consisting of arrays of shape property values
        shapes,

        // A hash of arrays consisting of arrays of line property values
        lines,

        // A hash of arrays consisting of arrays of electric field property values
        electricFields,

        // A hash of arrays consisting of arrays of radial bond property values
        radialBonds,

        // A hash of arrays consisting of arrays of angular bond property values
        angularBonds,

        // A hash of arrays consisting of arrays of restraint property values
        // (currently atom-only)
        restraints,

        // ####################################################################

        // An array of objects consisting of atom index numbers and atom property values, for easy
        // consumption by the view. It is updated conservatively from the "unrolled" form used for
        // speedy computation by the engine.
        viewAtoms = [],

        // An array of objects consisting of radial bond index numbers and radial bond property
        // values, for easy consumption by the view.
        viewRadialBonds = [],

        // An array of objects consisting of photon index numbers and property values, for easy
        // consumption by the view. Only defined if the quantum dynamics plugin is used.
        viewPhotons,

        // An array of objects consisting of point coordinates and electric field force at that point
        // (e.g. [{ x: 1, y: 2, fx: 0.1, fy: 0.3 }, ...]).
        electricField = [],

        // The index of the "spring force" used to implement dragging of atoms in a running model
        liveDragSpringForceIndex = null,

        // Cached value of the 'friction' property of the atom being dragged in a running model
        liveDragSavedFriction,

        // Properties hashes for use by plugins
        pluginProperties;

    function processTransitions(timeDiff) {
      var i, len;
      model.startBatch();
      for (i = 0, len = transitions.length; i < len; i++) {
        transitions[i].process(timeDiff);
      }
      // Cleanup finished transitions.
      i = 0;
      while(i < transitions.length) {
        if (transitions[i].isFinished) {
          transitions.splice(i, 1);
        } else {
          i++;
        }
      }
      model.endBatch();
    }

    // Returns a copy of 'obj' with value replaced by fn(key, value) for every (key, value) pair.
    // (Underscore doesn't do this: https://github.com/documentcloud/underscore/issues/220)
    function mapValues(obj, fn) {
      obj = _.extend({}, obj);
      for (var k in obj) {
        if (obj.hasOwnProperty(k)) obj[k] = fn(k, obj[k]);
      }
      return obj;
    }

    // Modifies a properties hash which has translated units to have MD2D units. Leaves properties
    // without a unitType (or with an unrecognized unitType) unmodified.
    // Returns 'properties' unmodified (not a copy) if there is no units translation in effect.
    function translateToMD2DUnits(properties, metadata) {
      if (!unitsTranslation) return properties;
      return mapValues(properties, function(key, value) {
        return unitsTranslation.translateToModelUnits(value, metadata[key] && metadata[key].unitType);
      });
    }

    // Modifies a properties hash which has MD2D units to have translated units. Leaves properties
    // without a unitType (or with an unrecognized unitType) unmodified.
    // Returns 'properties' unmodified (not a copy) if there is no units translation in effect.
    function translateFromMD2DUnits(properties, metadata) {
      if (!unitsTranslation) return properties;
      return mapValues(properties, function(key, value) {
        return unitsTranslation.translateFromModelUnits(value, metadata[key] && metadata[key].unitType);
      });
    }

    /**
      Executes the closure 'extract' which extracts from the tick history, then dispatches
      addAtom/removeAtom, etc, events as needed.

      This prevents unneessary creation and removal of atoms.
    */
    var runAndDispatchObjectNumberChanges = (function() {
      var objects = [{
        getNum: 'getNumberOfAtoms',
        addEvent: 'addAtom',
        removeEvent: 'removeAtom'
      }, {
        getNum: 'getNumberOfRadialBonds',
        addEvent: 'addRadialBond',
        removeEvent: 'removeRadialBond'
      }];

      return function (extract) {
        var i, o, newNum;
        for (i = 0; i < objects.length; i++) {
          o = objects[i];
          o.num = engine[o.getNum]();
        }

        extract();

        for (i = 0; i < objects.length; i++) {
          o = objects[i];
          newNum = engine[o.getNum]();
          if (newNum > o.num) {
            dispatch[o.addEvent]();
          } else if (newNum < o.num) {
            dispatch[o.removeEvent]();
          }
        }
      };
    })();

    /**
      This method is called to refresh the viewAtoms array and macrostate variables (KE, PE,
      temperature) whenever an engine integration occurs or the model state is otherwise changed.

      Normally, you should call the methods updateOutputPropertiesAfterChange or
      updateAllOutputProperties rather than calling this method. Calling this method directly does
      not cause output-property listeners to be notified, and calling it prematurely will confuse
      the detection of changed properties.
    */
    function readModelState() {
      engine.updateParticlesAccelerations();
      engine.computeOutputState(modelState);
      // remember that getViewPhotons will eventually be a modeler-layer method that ingests a raw
      // representation provided by modelState.photons
      viewPhotons = engine.callPluginAccessor('getViewPhotons');
      updateViewAtoms(modelState.atoms);
      updateViewRadialBonds(modelState.radialBonds, modelState.atoms);
      updateViewElectricField();
    }

    // Transpose 'atoms' object into 'viewAtoms' for consumption by view code
    function updateViewAtoms(atoms) {
      var n = engine.getNumberOfAtoms(),
          i,
          prop,
          amino,
          viewAtom;

      // TODO: refactor whole approach to creation of objects from flat arrays.
      // Think about more general way of detecting and representing amino acids.
      // However it would be reasonable to perform such refactoring later, when all requirements
      // related to proteins engine are clearer.

      viewAtoms.length = n;

      for (i = 0, n; i < n; i++) {
        if (!viewAtoms[i]) {
          viewAtoms[i] = {
            idx: i
          };
        }
        viewAtom = viewAtoms[i];

        for (prop in atoms) {
          if (atoms.hasOwnProperty(prop)) {
            viewAtom[prop] = atoms[prop][i];
          }
        }

        viewAtom.aminoAcid = aminoacidsHelper.isAminoAcid(atoms.element[i]);
        if (viewAtom.aminoAcid) {
          amino = aminoacidsHelper.getAminoAcidByElement(atoms.element[i]);
          viewAtom.symbol = amino.symbol;
          viewAtom.label  = amino.abbreviation;
        }
      }
    }

    function updateViewRadialBonds(radialBonds, atoms) {
      var n = engine.getNumberOfRadialBonds(),
          viewBond, prop, i;

      viewRadialBonds.length = n;

      for (i = 0; i < n; i++) {
        if (!viewRadialBonds[i]) {
          viewRadialBonds[i] = {
            idx: i
          };
        }
        viewBond = viewRadialBonds[i];

        for (prop in radialBonds) {
          viewBond[prop] = radialBonds[prop][i];
        }

        // Additionally calculate x1, y1, x2, y2 properties that are useful for view.
        viewBond.x1 = atoms.x[viewBond.atom1];
        viewBond.y1 = atoms.y[viewBond.atom1];
        viewBond.x2 = atoms.x[viewBond.atom2];
        viewBond.y2 = atoms.y[viewBond.atom2];
      }
    }

    function updateViewElectricField() {
      // It may seem strange that model reads "viewOption"
      // ("showElectricField"), but this is definitely reasonable
      // optimization.
      if (!electricField.length || !model.properties.showElectricField) return;
      var i, len, p;
      for (i = 0, len = electricField.length; i < len; i++) {
        p = electricField[i];
        engine.getCoulombForceAt(p.x, p.y, p);
      }
    }

    /**
      return a random element index ... which is *not* an amino acid element
    */
    function randomElement() {
      var len = engine.getNumberOfElements(),
          el = Math.floor( Math.random() * len );
      while(aminoacidsHelper.isAminoAcid(el)) {
        el = Math.floor( Math.random() * len );
      }
      return el;
    }

    /**
      Create set of amino acids elements. Use descriptions
      provided in 'aminoacids' array.
    */
    function createAminoAcids() {
      var sigmaIn01Angstroms,
          sigmaInNm,
          i, len;

      // Note that amino acids ALWAYS have IDs from
      // AMINO_ELEMENT_FIRST_IDX (= 5) to AMINO_ELEMENT_LAST_IDX (= 24).
      // This is enforced by backward compatibility with Classic MW.

      // At the beginning, ensure that elements from 0 to 24 exists.
      for (i = engine.getNumberOfElements(); i <= aminoacidsHelper.lastElementID; i++) {
        model.addElement({
          id: i
        });
      }

      // Set amino acids properties using elements from 5 to 24.
      for (i = 0, len = aminoacids.length; i < len; i++) {
        // Note that sigma is calculated using Classic MW approach.
        // See: org.concord.mw2d.models.AminoAcidAdapter
        // Basic length unit in Classic MW is 0.1 Angstrom.
        sigmaIn01Angstroms = 18 * Math.pow(aminoacids[i].volume / aminoacids[0].volume, 0.3333333333333);
        sigmaInNm = units.convert(sigmaIn01Angstroms / 10, { from: units.unit.ANGSTROM, to: units.unit.NANOMETER });
        // Use engine's method instead of modeler's method to avoid validation.
        // Modeler's wrapper ensures that amino acid is immutable, so it won't allow
        // to set properties of amino acid.
        engine.setElementProperties(aminoacidsHelper.firstElementID + i, {
          mass: aminoacids[i].molWeight,
          sigma: sigmaInNm
          // Don't provide epsilon, as default value should be used.
          // Classic MW uses epsilon 0.1 for all amino acids, which is default one.
          // See: org.concord.mw2d.models.AtomicModel.resetElements()
        });
      }
    }

    // ------------------------------------------------------------
    //
    // Public functions
    //
    // ------------------------------------------------------------

    /**
      Current seek position
    */
    model.stepCounter = function() {
      return tickHistory.get("counter");
    };

    /**
      Current position of first value in tick history, normally this will be 0.
      This will be greater than 0 if maximum size of tick history has been exceeded.
    */
    model.stepStartCounter = function() {
      return tickHistory.get("startCounter");
    };

    /** Total number of ticks that have been run & are stored, regardless of seek
        position
    */
    model.steps = function() {
      return tickHistory.get("length");
    };

    model.isNewStep = function() {
      return newStep;
    };

    model.seek = function(location) {
      if (!arguments.length) { location = 0; }
      if (!model.isStopped()) {
        model.stop();
      }
      newStep = false;
      runAndDispatchObjectNumberChanges(function() {
        tickHistory.seekExtract(location);
        readModelState();
        model.updateAllOutputProperties();
        dispatch.seek();
      });
      return tickHistory.get("counter");
    };

    model.stepBack = function(num) {
      if (!arguments.length) { num = 1; }
      if (!model.isStopped()) {
        model.stop();
      }
      newStep = false;
      runAndDispatchObjectNumberChanges(function() {
        var i, index;
        i = -1; while(++i < num) {
          index = tickHistory.get("index");
          if (index > 0) {
            tickHistory.decrementExtract();
            readModelState();
            model.updateAllOutputProperties();
            dispatch.stepBack();
          }
        }
      });
      return tickHistory.get("counter");
    };

    model.stepForward = function(num) {
      if (!arguments.length) { num = 1; }
      if (!model.isStopped()) {
        model.stop();
      }
      runAndDispatchObjectNumberChanges(function() {
        var i, index, size;
        i=-1; while(++i < num) {
          index = tickHistory.get("index");
          size = tickHistory.get("length");
          if (index < size-1) {
            tickHistory.incrementExtract();
            readModelState();
            model.updateAllOutputProperties();
            dispatch.stepForward();
          } else {
            model.tick();
          }
        }
      });
      return tickHistory.get("counter");
    };

    /**
      Initialize minX, minYm, maxX, maxY from width and height
      when these options are undefined.
    */
    function initializeDimensions(properties) {
      var minX = properties.minX,
          minY = properties.minY,
          maxX = properties.maxX,
          maxY = properties.maxY;

      properties.minX = minX != null ? minX : 0;
      properties.maxX = maxX != null ? maxX : properties.width;
      properties.minY = minY != null ? minY : 0;
      properties.maxY = maxY != null ? maxY : properties.height;
    }

    /**
      Creates a new md2d engine and leaves it in 'engine'.
    */
    function initializeEngine(properties, pluginProperties) {
      engine.setDimensions([properties.minX, properties.minY, properties.maxX, properties.maxY]);

      if (pluginProperties.quantumDynamics) {
        properties.useQuantumDynamics = true;
        engine.addPlugin(new QuantumDynamics(engine, pluginProperties.quantumDynamics));
      } else {
        properties.useQuantumDynamics = false;
      }

      if (pluginProperties.chemicalReactions) {
        properties.useChemicalReactions = true;
        engine.addPlugin(new ChemicalReactions(engine, pluginProperties.chemicalReactions));
      } else {
        properties.useChemicalReactions = false;
      }

      // Copy reference to basic properties.
      // FIXME. This should go away. https://www.pivotaltracker.com/story/show/50086079
      elements          = engine.elements;
      radialBonds       = engine.radialBonds;
      angularBonds      = engine.angularBonds;
      restraints        = engine.restraints;
      obstacles         = engine.obstacles;
      shapes            = engine.shapes;
      lines             = engine.lines;
      electricFields = engine.electricFields;
    }

    model.createElements = function(_elements) {
      var i, num, prop, elementProps;

      // Start batch process
      model.startBatch();

      if (_elements === undefined) {
        // Special case when elements are not defined.
        // Empty object will be filled with default values.
        model.addElement({id: 0});
        model.endBatch();
        return;
      }

      // _elements is hash of arrays (as specified in JSON model).
      // So, for each index, create object containing properties of
      // element 'i'. Later, use these properties to add element
      // using basic addElement method.
      for (i = 0, num = _elements.mass.length; i < num; i++) {
        elementProps = {};
        for (prop in _elements) {
          if (_elements.hasOwnProperty(prop)) {
            elementProps[prop] = _elements[prop][i];
          }
        }
        model.addElement(elementProps);
      }

      // End batch process
      model.endBatch();

      return model;
    };

    /**
      Creates a new set of atoms.

      config: a hash specifying the x,y,vx,vy properties of the atoms
    */
    model.createAtoms = function(config) {
          // Options for addAtom method.
      var options = {
            // Do not check the position of atom, assume that it's valid.
            suppressCheck: true
          },
          i, num, prop, atomProps;

      dispatch.willReset();

      // Start batch process
      model.startBatch();

      num = config.x.length;

      // config is hash of arrays (as specified in JSON model). So, for each index, create object
      // containing properties of atom 'i'. Later, use these properties to add atom using basic
      // addAtom method.
      for (i = 0; i < num; i++) {
        atomProps = {};
        for (prop in config) {
          if (config.hasOwnProperty(prop)) {
            atomProps[prop] = config[prop][i];
          }
        }
        model.addAtom(atomProps, options);
      }

      // End batch process
      model.endBatch();

      // Listeners should consider resetting the atoms a 'reset' event
      dispatch.reset();
    };

    model.createRadialBonds = function(_radialBonds) {
      var num = _radialBonds.strength.length,
          i, prop, radialBondProps;

      // Start batch process
      model.startBatch();

      // _radialBonds is hash of arrays (as specified in JSON model).
      // So, for each index, create object containing properties of
      // radial bond 'i'. Later, use these properties to add radial bond
      // using basic addRadialBond method.
      for (i = 0; i < num; i++) {
        radialBondProps = {};
        for (prop in _radialBonds) {
          if (_radialBonds.hasOwnProperty(prop)) {
            radialBondProps[prop] = _radialBonds[prop][i];
          }
        }
        model.addRadialBond(radialBondProps);
      }

      // End batch process
      model.endBatch();

      return model;
    };

    model.createAngularBonds = function(_angularBonds) {
      var num = _angularBonds.strength.length,
          i, prop, angularBondProps;

      // Start batch process
      model.startBatch();

      // _angularBonds is hash of arrays (as specified in JSON model).
      // So, for each index, create object containing properties of
      // angular bond 'i'. Later, use these properties to add angular bond
      // using basic addAngularBond method.
      for (i = 0; i < num; i++) {
        angularBondProps = {};
        for (prop in _angularBonds) {
          if (_angularBonds.hasOwnProperty(prop)) {
            angularBondProps[prop] = _angularBonds[prop][i];
          }
        }
        model.addAngularBond(angularBondProps);
      }

      // End batch process
      model.endBatch();

      return model;
    };

    model.createRestraints = function(_restraints) {
      var num = _restraints.atomIndex.length,
          i, prop, restraintsProps;

      // _restraints is hash of arrays (as specified in JSON model).
      // So, for each index, create object containing properties of
      // restraint 'i'. Later, use these properties to add restraint
      // using basic addRestraint method.
      for (i = 0; i < num; i++) {
        restraintsProps = {};
        for (prop in _restraints) {
          if (_restraints.hasOwnProperty(prop)) {
            restraintsProps[prop] = _restraints[prop][i];
          }
        }
        model.addRestraint(restraintsProps);
      }

      return model;
    };

    model.createObstacles = function(_obstacles) {
      var numObstacles = _obstacles.x.length,
          i, prop, obstacleProps;

      // _obstacles is hash of arrays (as specified in JSON model).
      // So, for each index, create object containing properties of
      // obstacle 'i'. Later, use these properties to add obstacle
      // using basic addObstacle method.
      for (i = 0; i < numObstacles; i++) {
        obstacleProps = {};
        for (prop in _obstacles) {
          if (_obstacles.hasOwnProperty(prop)) {
            obstacleProps[prop] = _obstacles[prop][i];
          }
        }
        model.addObstacle(obstacleProps);
      }

      return model;
    };

    model.createShapes = function(_shapes) {
      var numShapes = _shapes.x.length,
          i, prop, shapeProps;

      // See function above
      for (i = 0; i < numShapes; i++) {
        shapeProps = {};
        for (prop in _shapes) {
          if (_shapes.hasOwnProperty(prop)) {
            shapeProps[prop] = _shapes[prop][i];
          }
        }
        model.addShape(shapeProps);
      }

      return model;
    };

    model.createLines = function(_lines) {
      var numLines = _lines.x1.length,
          i, prop, lineProps;

      // See function above
      for (i = 0; i < numLines; i++) {
        lineProps = {};
        for (prop in _lines) {
          if (_lines.hasOwnProperty(prop)) {
            lineProps[prop] = _lines[prop][i];
          }
        }
        model.addLine(lineProps);
      }

      return model;
    };

    model.createElectricFields = function(_eFields) {
      model.batch(function () {
        var count = _eFields.intensity.length,
                i, prop, eFieldProps;

        for (i = 0; i < count; i++) {
          eFieldProps = {};
          for (prop in _eFields) {
            if (_eFields.hasOwnProperty(prop)) {
              eFieldProps[prop] = _eFields[prop][i];
            }
          }
          model.addElectricField(eFieldProps);
        }
      });
      return model;
    };

    // Beware. The "reset" button in Lab interactives do not call this method. Instead they "reload"
    // the model, discarding this model object and creating a new one from the model JSON.
    model.reset = function() {
      dispatch.willReset();
      propertySupport.invalidatingChangePreHook();
      engine.setTime(0);
      tickHistory.restoreInitialState();
      propertySupport.invalidatingChangePostHook();
      model.resetAllOutputProperties();
      dispatch.reset();
    };

    model.getTotalMass = function() {
      return engine.getTotalMass();
    };

    model.getAtomKineticEnergy = function(i) {
      return engine.getAtomKineticEnergy(i);
    };

    /**
      Attempts to add an 0-velocity atom to a random location. Returns false if after 10 tries it
      can't find a location. (Intended to be exposed as a script API method.)

      Optionally allows specifying the element (default is to randomly select from all editableElements) and
      charge (default is neutral).
    */
    model.addRandomAtom = function(el, charge) {
      if (el == null) el = randomElement();
      if (charge == null) charge = 0;

      var width = model.get('width'),
          height = model.get('height'),
          minX = model.get('minX'),
          minY = model.get('minY'),
          radius = engine.getRadiusOfElement(el),
          x,
          y,
          loc,
          numTries = 0,
          // try at most ten times.
          maxTries = 10;

      do {
        x = minX + Math.random() * width - 2*radius;
        y = minY + Math.random() * height - 2*radius;

        // findMinimimuPELocation will return false if minimization doesn't converge, in which case
        // try again from a different x, y
        loc = engine.findMinimumPELocation(el, x, y, 0, 0, charge);
        if (loc && model.addAtom({ element: el, x: loc[0], y: loc[1], charge: charge })) return true;
      } while (++numTries < maxTries);

      return false;
    };

    /**
      Adds a new atom defined by properties.
      Intended to be exposed as a script API method also.

      Adjusts (x,y) if needed so that the whole atom is within the walls of the container.

      Returns false and does not add the atom if the potential energy change of adding an *uncharged*
      atom of the specified element to the specified location would be positive (i.e, if the atom
      intrudes into the repulsive region of another atom), or if atom is placed inside an obstacle

      Otherwise, returns true.

      silent = true disables this check.
    */
    model.addAtom = function(props, options) {
      var minX = model.get('minX'),
          minY = model.get('minY'),
          maxX = model.get('maxX'),
          maxY = model.get('maxY'),
          radius;

      options = options || {};

      // Validate properties, provide default values.
      props = validator.validateCompleteness(metadata.atom, props);

      // As a convenience to script authors, bump the atom within bounds
      radius = engine.getRadiusOfElement(props.element);
      if (props.x < (minX + radius)) props.x = minX + radius;
      if (props.x > (maxX - radius)) props.x = maxX - radius;
      if (props.y < (minY + radius)) props.y = minY + radius;
      if (props.y > (maxY - radius)) props.y = maxY - radius;

      // check the potential energy change caused by adding an *uncharged* atom at (x,y)
      if (!options.suppressCheck && !engine.canPlaceAtom(props.element, props.x, props.y)) {
        // return false on failure
        return false;
      }

      propertySupport.invalidatingChangePreHook();

      engine.addAtom(props);

      propertySupport.invalidatingChangePostHook();

      dispatch.addAtom();

      return true;
    };

    model.removeAtom = function(i) {
      var prevRadBondsCount = engine.getNumberOfRadialBonds(),
          prevAngBondsCount = engine.getNumberOfAngularBonds();

      propertySupport.invalidatingChangePreHook();
      engine.removeAtom(i);
      // Enforce modeler to recalculate viewAtoms array.
      viewAtoms.length = 0;
      propertySupport.invalidatingChangePostHook();

      // Notify listeners that atoms is removed.
      dispatch.removeAtom();

      // Removing of an atom can also cause removing of
      // the connected radial bond. Detect it and notify listeners.
      if (engine.getNumberOfRadialBonds() !== prevRadBondsCount) {
        dispatch.removeRadialBond();
      }
      if (engine.getNumberOfAngularBonds() !== prevAngBondsCount) {
        dispatch.removeAngularBond();
      }
    };

    model.addElement = function(props) {
      // Validate properties, use default values if there is such need.
      props = validator.validateCompleteness(metadata.element, props);
      // Finally, add radial bond.
      engine.addElement(props);
    };

    model.addObstacle = function(props) {
      var validatedProps;
      // Validate properties, use default values if there is such need.
      validatedProps = validator.validateCompleteness(metadata.obstacle, props);
      // Finally, add obstacle.
      propertySupport.invalidatingChangePreHook();
      engine.addObstacle(validatedProps);
      propertySupport.invalidatingChangePostHook();
    };

    model.removeObstacle = function (idx) {
      propertySupport.invalidatingChangePreHook();
      engine.removeObstacle(idx);
      propertySupport.invalidatingChangePostHook();
    };

    model.addShape = function(props) {
      var validatedProps;
      // Validate properties, use default values if there is such need.
      validatedProps = validator.validateCompleteness(metadata.shape, props);
      // Finally, add shape.
      propertySupport.invalidatingChangePreHook();
      engine.addShape(validatedProps);
      propertySupport.invalidatingChangePostHook();
    };

    model.removeShape = function (idx) {
      var prevElFieldsCount = engine.getNumberOfElectricFields();

      propertySupport.invalidatingChangePreHook();
      engine.removeShape(idx);
      propertySupport.invalidatingChangePostHook();

      if (engine.getNumberOfElectricFields() !== prevElFieldsCount) {
        dispatch.removeElectricField();
      }
      //TODO FIXME: also .removeShape() event should be dispatched.
    };

    model.addLine = function(props) {
      var validatedProps;
      // Validate properties, use default values if there is such need.
      validatedProps = validator.validateCompleteness(metadata.line, props);
      // Finally, add line.
      propertySupport.invalidatingChangePreHook();
      engine.addLine(validatedProps);
      propertySupport.invalidatingChangePostHook();
    };

    model.removeLine = function (idx) {
      //var prevElFieldsCount = engine.getNumberOfElectricFields();

      propertySupport.invalidatingChangePreHook();
      engine.removeLine(idx);
      propertySupport.invalidatingChangePostHook();
      //TODO FIXME: also .removeLine() event should be dispatched.
    };

    model.addElectricField = function(props) {
      var validatedProps;
      // Validate properties, use default values if there is such need.
      validatedProps = validator.validateCompleteness(metadata.electricField, props);
      // Finally, add shape.
      propertySupport.invalidatingChangePreHook();
      engine.addElectricField(validatedProps);
      propertySupport.invalidatingChangePostHook();
      dispatch.addElectricField();
    };

    model.removeElectricField = function (idx) {
      propertySupport.invalidatingChangePreHook();
      engine.removeElectricField(idx);
      propertySupport.invalidatingChangePostHook();
      dispatch.removeElectricField();
    };

    model.addRadialBond = function(props) {
      props = validator.validateCompleteness(metadata.radialBond, props);
      propertySupport.invalidatingChangePreHook();
      engine.addRadialBond(props);
      propertySupport.invalidatingChangePostHook();
      dispatch.addRadialBond();
    };

    model.removeRadialBond = function(idx) {
      propertySupport.invalidatingChangePreHook();
      engine.removeRadialBond(idx);
      propertySupport.invalidatingChangePostHook();
      dispatch.removeRadialBond();
    };

    model.addAngularBond = function(props) {
      props = validator.validateCompleteness(metadata.angularBond, props);
      propertySupport.invalidatingChangePreHook();
      engine.addAngularBond(props);
      propertySupport.invalidatingChangePostHook();
    };

    model.removeAngularBond = function(idx) {
      propertySupport.invalidatingChangePreHook();
      engine.removeAngularBond(idx);
      propertySupport.invalidatingChangePostHook();
      dispatch.removeAngularBond();
    };

    model.addRestraint = function(props) {
      // Validate properties, use default values if there is such need.
      props = validator.validateCompleteness(metadata.restraint, props);
      // Finally, add restraint.
      propertySupport.invalidatingChangePreHook();
      engine.addRestraint(props);
      propertySupport.invalidatingChangePostHook();
    };

    /** Return the bounding box of the molecule containing atom 'atomIndex', with atomic radii taken
        into account.

       @returns an object with properties 'left', 'right', 'top', and 'bottom'. These are translated
       relative to the center of atom 'atomIndex', so that 'left' represents (-) the distance in nm
       between the leftmost edge and the center of atom 'atomIndex'.
    */
    model.getMoleculeBoundingBox = function(atomIndex) {

      var atoms = modelState.atoms,
          moleculeAtoms,
          i,
          x,
          y,
          r,
          top = -Infinity,
          left = Infinity,
          bottom = Infinity,
          right = -Infinity,
          cx,
          cy;

      moleculeAtoms = engine.getMoleculeAtoms(atomIndex);
      moleculeAtoms.push(atomIndex);

      for (i = 0; i < moleculeAtoms.length; i++) {
        x = atoms.x[moleculeAtoms[i]];
        y = atoms.y[moleculeAtoms[i]];
        r = atoms.radius[moleculeAtoms[i]];

        if (x-r < left  ) left   = x-r;
        if (x+r > right ) right  = x+r;
        if (y-r < bottom) bottom = y-r;
        if (y+r > top   ) top    = y+r;
      }

      cx = atoms.x[atomIndex];
      cy = atoms.y[atomIndex];

      return { top: top-cy, left: left-cx, bottom: bottom-cy, right: right-cx };
    };

    model.setTemperatureOfAtoms = function(atomIndices, T) {
      propertySupport.invalidatingChangePreHook();
      engine.setTemperatureOfAtoms(atomIndices, T);
      propertySupport.invalidatingChangePostHook();
    };

    model.addKEToAtoms = function(energy, atomIndices) {
      propertySupport.invalidatingChangePreHook();

      if (atomIndices == null) {
        engine.addKEToAtoms(energy);
      } else {
        // This function inside engine has a slightly different API.
        engine.addKEToAtoms.apply(engine, [energy].concat(atomIndices));
      }

      propertySupport.invalidatingChangePostHook();
    };

    model.getTemperatureOfAtoms = function(atomIndices) {
      return engine.getTemperatureOfAtoms(atomIndices);
    };

    /**
        A generic method to set properties on a single existing atom.

        Example: setAtomProperties(3, {x: 5, y: 8, px: 0.5, charge: -1})

        This can optionally check the new location of the atom to see if it would
        overlap with another another atom (i.e. if it would increase the PE).

        This can also optionally apply the same dx, dy to any atoms in the same
        molecule (if x and y are being changed), and check the location of all
        the bonded atoms together.
      */
    model.setAtomProperties = function(i, props, checkLocation, moveMolecule) {
      var atoms = modelState.atoms,
          moleculeAtoms,
          dx, dy,
          new_x, new_y,
          j, jj;

      // Validate properties.
      props = validator.validate(metadata.atom, props);

      if (moveMolecule) {
        moleculeAtoms = engine.getMoleculeAtoms(i);
        if (moleculeAtoms.length > 0) {
          dx = typeof props.x === "number" ? props.x - atoms.x[i] : 0;
          dy = typeof props.y === "number" ? props.y - atoms.y[i] : 0;
          for (j = 0, jj=moleculeAtoms.length; j<jj; j++) {
            new_x = atoms.x[moleculeAtoms[j]] + dx;
            new_y = atoms.y[moleculeAtoms[j]] + dy;
            if (!model.setAtomProperties(moleculeAtoms[j], {x: new_x, y: new_y}, checkLocation, false)) {
              return false;
            }
          }
        }
      }

      if (checkLocation) {
        var x  = typeof props.x === "number" ? props.x : atoms.x[i],
            y  = typeof props.y === "number" ? props.y : atoms.y[i],
            el = typeof props.element === "number" ? props.y : atoms.element[i];

        if (!engine.canPlaceAtom(el, x, y, i)) {
          return false;
        }
      }

      propertySupport.invalidatingChangePreHook();
      engine.setAtomProperties(i, translateToMD2DUnits(props, metadata.atom));
      propertySupport.invalidatingChangePostHook();
      return true;
    };

    model.getAtomProperties = function(i) {
      var atoms = modelState.atoms,
          atomMetaData = metadata.atom,
          props = {},
          propName;

      for (propName in atomMetaData) {
        if (atomMetaData.hasOwnProperty(propName) && atoms[propName]) {
          props[propName] = atoms[propName][i];
        }
      }
      return translateFromMD2DUnits(props, atomMetaData);
    };

    model.getRadialBondsForAtom = function(i) {
      return engine.getRadialBondsForAtom(i);
    };

    model.getBondedAtoms = function(i) {
      return engine.getBondedAtoms(i);
    };

    model.getAngularBondsForAtom = function(i) {
      return engine.getAngularBondsForAtom(i);
    };

    model.getMoleculeAtoms = function(i) {
      return engine.getMoleculeAtoms(i);
    };

    model.setElementProperties = function(i, props) {
      // Validate properties.
      props = validator.validate(metadata.element, props);
      if (aminoacidsHelper.isAminoAcid(i)) {
        throw new Error("Elements: elements with ID " + i + " cannot be edited, as they define amino acids.");
      }
      propertySupport.invalidatingChangePreHook();
      engine.setElementProperties(i, translateToMD2DUnits(props, metadata.element));
      propertySupport.invalidatingChangePostHook();
    };

    model.getElementProperties = function(i) {
      var elementMetaData = metadata.element,
          props = {},
          propName;
      for (propName in elementMetaData) {
        if (elementMetaData.hasOwnProperty(propName)) {
          props[propName] = elements[propName][i];
        }
      }
      return translateFromMD2DUnits(props, elementMetaData);
    };

    model.setObstacleProperties = function(i, props) {
      // Validate properties.
      props = validator.validate(metadata.obstacle, props);
      propertySupport.invalidatingChangePreHook();
      engine.setObstacleProperties(i, translateToMD2DUnits(props, metadata.obstacle));
      propertySupport.invalidatingChangePostHook();
    };

    model.getObstacleProperties = function(i) {
      var obstacleMetaData = metadata.obstacle,
          props = {},
          propName;
      for (propName in obstacleMetaData) {
        if (obstacleMetaData.hasOwnProperty(propName)) {
          props[propName] = obstacles[propName][i];
        }
      }
      return translateFromMD2DUnits(props, obstacleMetaData);
    };

    model.setShapeProperties = function(i, props) {
      // Validate properties.
      props = validator.validate(metadata.shape, props);
      propertySupport.invalidatingChangePreHook();
      engine.setShapeProperties(i, translateToMD2DUnits(props, metadata.shape));
      propertySupport.invalidatingChangePostHook();
    };

    model.getShapeProperties = function(i) {
      var shapeMetaData = metadata.shape,
          props = {},
          propName;
      for (propName in shapeMetaData) {
        if (shapeMetaData.hasOwnProperty(propName)) {
          props[propName] = shapes[propName][i];
        }
      }
      return translateFromMD2DUnits(props, shapeMetaData);
    };

    model.setLineProperties = function(i, props) {
      // Validate properties.
      props = validator.validate(metadata.line, props);
      propertySupport.invalidatingChangePreHook();
      engine.setLineProperties(i, translateToMD2DUnits(props, metadata.line));
      propertySupport.invalidatingChangePostHook();
    };

    model.getLineProperties = function(i) {
      var lineMetaData = metadata.line,
          props = {},
          propName;
      for (propName in lineMetaData) {
        if (lineMetaData.hasOwnProperty(propName)) {
          props[propName] = lines[propName][i];
        }
      }
      return translateFromMD2DUnits(props, lineMetaData);
    };

    model.setElectricFieldProperties = function(i, props) {
      // Validate properties.
      props = validator.validate(metadata.electricField, props);
      propertySupport.invalidatingChangePreHook();
      engine.setElectricFieldProperties(i, translateToMD2DUnits(props, metadata.electricField));
      propertySupport.invalidatingChangePostHook();
      dispatch.changeElectricField();
    };

    model.getElectricFieldProperties = function(i) {
      var elFieldMetaData = metadata.electricField,
          props = {},
          propName;
      for (propName in elFieldMetaData) {
        if (elFieldMetaData.hasOwnProperty(propName)) {
          props[propName] = electricFields[propName][i];
        }
      }
      return translateFromMD2DUnits(props, elFieldMetaData);
    };

    model.setRadialBondProperties = function(i, props) {
      // Validate properties.
      props = validator.validate(metadata.radialBond, props);
      propertySupport.invalidatingChangePreHook();
      engine.setRadialBondProperties(i, translateToMD2DUnits(props, metadata.radialBond));
      propertySupport.invalidatingChangePostHook();
    };

    model.getRadialBondProperties = function(i) {
      var radialBondMetaData = metadata.radialBond,
          props = {},
          propName;
      for (propName in radialBondMetaData) {
        if (radialBondMetaData.hasOwnProperty(propName)) {
          props[propName] = radialBonds[propName][i];
        }
      }
      return translateFromMD2DUnits(props, radialBondMetaData);
    };

    model.setRestraintProperties = function(i, props) {
      // Validate properties.
      props = validator.validate(metadata.restraint, props);
      propertySupport.invalidatingChangePreHook();
      engine.setRestraintProperties(i, translateToMD2DUnits(props, metadata.restraint));
      propertySupport.invalidatingChangePostHook();
    };

    model.getRestraintProperties = function(i) {
      var restraintMetaData = metadata.restraint,
          props = {},
          propName;
      for (propName in restraintMetaData) {
        if (restraintMetaData.hasOwnProperty(propName)) {
          props[propName] = restraints[propName][i];
        }
      }
      return translateFromMD2DUnits(props, restraintMetaData);
    };

    model.setAngularBondProperties = function(i, props) {
      // Validate properties.
      props = validator.validate(metadata.angularBond, props);
      propertySupport.invalidatingChangePreHook();
      engine.setAngularBondProperties(i, translateToMD2DUnits(props, metadata.angularBond));
      propertySupport.invalidatingChangePostHook();
    };

    model.getAngularBondProperties = function(i) {
      var angularBondMetaData = metadata.angularBond,
          props = {},
          propName;
      for (propName in angularBondMetaData) {
        if (angularBondMetaData.hasOwnProperty(propName)) {
          props[propName] = angularBonds[propName][i];
        }
      }
      return translateFromMD2DUnits(props, angularBondMetaData);
    };

    model.setSolvent = function (solventName) {
      var solvent = new Solvent(solventName),
          props = {
            solventForceType: solvent.forceType,
            dielectricConstant: solvent.dielectricConstant,
            backgroundColor: solvent.color
          };
      model.set(props);
    };

    /** A "spring force" is used to pull atom `atomIndex` towards (x, y). We expect this to be used
       to drag atoms interactively using the mouse cursor (in which case (x,y) is the mouse cursor
       location.) In these cases, use the liveDragStart, liveDrag, and liveDragEnd methods instead
       of this one.

       The optional springConstant parameter (measured in eV/nm^2) is used to adjust the strength
       of the "spring" pulling the atom toward (x, y)

       @returns ID (index) of the spring force among all spring forces
    */
    model.addSpringForce = function(atomIndex, x, y, springConstant) {
      if (springConstant == null) springConstant = 500;

      if (unitsTranslation) {
        springConstant = unitsTranslation.translateToModelUnits(springConstant, 'stiffness');
      }
      return engine.addSpringForce(atomIndex, x, y, springConstant);
    };

    /**
      Update the (x, y) position of a spring force.
    */
    model.updateSpringForce = function(springForceIndex, x, y) {
      engine.updateSpringForce(springForceIndex, x, y);
    };

    /**
      Remove a spring force.
    */
    model.removeSpringForce = function(springForceIndex) {
      engine.removeSpringForce(springForceIndex);
    };

    model.addTextBox = function(props) {
      props = validator.validateCompleteness(metadata.textBox, props);
      model.get('textBoxes').push(props);
      dispatch.textBoxesChanged();
    };

    model.removeTextBox = function(i) {
      var text = model.get('textBoxes');
      if (i >=0 && i < text.length) {
        model.set('textBoxes', text.slice(0,i).concat(text.slice(i+1)));
        dispatch.textBoxesChanged();
      } else {
        throw new Error("Text box \"" + i + "\" does not exist, so it cannot be removed.");
      }
    };

    model.setTextBoxProperties = function(i, props) {
      var textBox = model.get('textBoxes')[i],
          prop;

      if (textBox) {
        props = validator.validate(metadata.textBox, props);
        for (prop in props) {
          if (props.hasOwnProperty(prop)) {
            textBox[prop] = props[prop];
          }
        }
        dispatch.textBoxesChanged();
      } else {
        throw new Error("Text box \"" + i + "\" does not exist, so it cannot have properties set.");
      }
    };

    model.setImageProperties = function(i, props) {
      var image = model.get('images')[i],
          prop;

      if (image) {
        props = validator.validate(metadata.image, props);
        for (prop in props) {
          if (props.hasOwnProperty(prop)) {
            image[prop] = props[prop];
          }
        }
        dispatch.imagesChanged();
      } else {
        throw new Error("Image \"" + i + "\" does not exist, so it cannot have properties set.");
      }
    };

    model.getTextBoxProperties = function(i) {
      return model.get('textBoxes')[i];
    };

    model.getImageProperties = function(i) {
      return model.get('images')[i];
    };

    /**
      Implements dragging of an atom in a running model, by creating a spring force that pulls the
      atom towards the mouse cursor position (x, y) and damping the resulting motion by temporarily
      adjusting the friction of the dragged atom.
    */
    model.liveDragStart = function(atomIndex, x, y) {
      if (liveDragSpringForceIndex != null) return;    // don't add a second liveDrag force

      if (x == null) x = modelState.atoms.x[atomIndex];
      if (y == null) y = modelState.atoms.y[atomIndex];

      liveDragSavedFriction = model.getAtomProperties(atomIndex).friction;

      // Use setAtomProperties so that we handle things correctly if a web worker is integrating
      // the model. (Here we follow the rule that we must assume that an integration might change
      // any property of an atom, and therefore cause changes to atom properties in the main thread
      // to be be lost. This is true even though common sense tells us that the friction property
      // won't change during an integration.)

      model.setAtomProperties(atomIndex, { friction: model.LIVE_DRAG_FRICTION });

      liveDragSpringForceIndex = model.addSpringForce(atomIndex, x, y, 500);
    };

    /**
      Updates the drag location after liveDragStart
    */
    model.liveDrag = function(x, y) {
      model.updateSpringForce(liveDragSpringForceIndex, x, y);
    };

    /**
      Cancels a live drag by removing the spring force that is pulling the atom, and restoring its
      original friction property.
    */
    model.liveDragEnd = function() {
      var atomIndex = engine.springForceAtomIndex(liveDragSpringForceIndex);

      model.setAtomProperties(atomIndex, { friction: liveDragSavedFriction });
      model.removeSpringForce(liveDragSpringForceIndex);
      liveDragSpringForceIndex = null;
    };

    /**
     * Returns number of frames per second.
     * @return {number} frames per second.
     */
    model.getFPS = function() {
      var s = 0,
          n = sampleTimes.length,
          i = -1;

      while (++i < n) {
        s += sampleTimes[i];
      }
      s /= n;
      return (s ? 1 / s * 1000 : 0);
    };

    /**
     * Returns "simulation progress rate".
     * It indicates how much of simulation time is calculated for
     * one second of real time.
     * @return {number} simulation progress rate.
     */
    model.getSimulationProgressRate = function() {
      return model.getFPS() * model.get('timeStep') * model.get('timeStepsPerTick');
    };

    model.get_elements = function() {
      return elements;
    };

    model.getAtoms = function() {
      return viewAtoms;
    };

    model.getRadialBonds = function() {
      return viewRadialBonds;
    };

    model.getElectricField = function() {
      return electricField;
    };

    model.getPhotons = function() {
      return viewPhotons;
    };

    // *really* need a way for the QD plugin to add these methods to modeler-layer
    model.turnOnLightSource = function() {
      // Note the current, very temporary, implementation ignores index and isn't an
      // accessor. But this is for prototyping.
      engine.callPluginAccessor('turnOnLightSource');
    };

    model.turnOffLightSource = function() {
      engine.callPluginAccessor('turnOffLightSource');
    };

    model.setLightSourceAngle = function(angle) {
      engine.callPluginAccessor('setLightSourceAngle', [angle]);
    };

    model.setLightSourceFrequency = function(freq) {
      engine.callPluginAccessor('setLightSourceFrequency', [freq]);
    };

    model.setLightSourcePeriod = function(period) {
      engine.callPluginAccessor('setLightSourcePeriod', [period]);
    };

    model.setLightSourceNumber = function(number) {
      engine.callPluginAccessor('setLightSourceNumber', [number]);
    };

    model.setBondEnergy = function(bondDescription, value) {
      engine.callPluginAccessor('setBondEnergy', [bondDescription, value]);
    };

    model.setValenceElectrons = function(element, value) {
      engine.callPluginAccessor('setValenceElectrons', [element, value]);
    };

    /**
      Returns the total number of atoms, or else the number of atoms matching some criterion.

      If the argument 'f' is present, it is called once for each atom, passing the atom as the
      argument to f. The number of atoms for which f evaluates to true is returned.

      Example

        model.getNumberOfAtoms(function(atom) { return atom.mass < 50; })

      returns the number of atoms having mass < 50
    */
    model.getNumberOfAtoms = function(f) {
      if (!f) {
        return viewAtoms.length;
      }
      return viewAtoms.reduce(function(total, atom) {
        return f(atom) ? total + 1 : total;
      }, 0);
    };

    model.get_obstacles = function() {
      return obstacles;
    };

    model.get_shapes = function() {
      return shapes;
    };

    model.get_lines = function() {
      return lines;
    };

    // FIXME. Should be an output property.
    model.getNumberOfElements = function () {
      return engine.getNumberOfElements();
    };

    // FIXME. Should be an output property.
    model.getNumberOfObstacles = function () {
      return engine.getNumberOfObstacles();
    };

    model.getNumberOfShapes = function () {
      return engine.getNumberOfShapes();
    };

    model.getNumberOfLines = function () {
      return engine.getNumberOfLines();
    };

    // FIXME. Should be an output property.
    model.getNumberOfRadialBonds = function () {
      return engine.getNumberOfRadialBonds();
    };

    // FIXME. Should be an output property.
    model.getNumberOfAngularBonds = function () {
      return engine.getNumberOfAngularBonds();
    };

    // FIXME. Should be an output property.
    model.getNumberOfSpringForces = function () {
      return engine.getNumberOfSpringForces();
    };

    // FIXME. Should be an output property.
    model.getNumberOfElectricFields = function () {
      return engine.getNumberOfElectricFields();
    };

    model.getNumberOfTextBoxes = function () {
      return  model.get('textBoxes').length;
    };

    model.get_restraints = function() {
      return restraints;
    };

    model.getPairwiseLJProperties = function() {
      return engine.pairwiseLJProperties;
    };

    model.geneticEngine = function() {
      return geneticEngine;
    };

    model.get_vdw_pairs = function() {
      return engine.getVdwPairsArray();
    };

    model.tickInPlace = function() {
      dispatch.tick();
      return model;
    };

    model.tick = function() {
      var timeStep = model.get('timeStep'),
          t, sampleTime;

      if (unitsTranslation) {
        timeStep = unitsTranslation.translateToModelUnits(timeStep, 'time');
      }

      if (!model.isStopped()) {
        t = performance.now();
        if (lastSampleTime) {
          sampleTime = t - lastSampleTime;
          lastSampleTime = t;
          sampleTimes.push(sampleTime);
          sampleTimes.splice(0, sampleTimes.length - 64);

          // Process all transitions which are in progress
          // and remove finished.
          processTransitions(sampleTime);
        } else {
          lastSampleTime = t;
        }
      }

      performance.enterScope("engine");
      // timeStepsPerTick is defined in Classic MW as the number of timesteps per view update.
      // However, in MD2D we prefer the more physical notion of integrating for a particular
      // length of time.
      engine.integrate(model.get('timeStepsPerTick') * timeStep, timeStep);
      performance.leaveScope("engine");

      readModelState();
      model.updateAllOutputProperties();
      tickHistory.push();

      newStep = true;

      // TODO: we should just dispatch "radialBondsChanged" event, as there is no code interested
      // whether we really added or removed radial bond.
      if (engine.radialBondsChanged) dispatch.addRadialBond();

      dispatch.tick();
    };

    model.minimizeEnergy = function () {
      propertySupport.invalidatingChangePreHook();
      engine.minimizeEnergy();
      propertySupport.invalidatingChangePostHook();
      // Positions of atoms could change, so
      // dispatch tick event.
      dispatch.tick();
      return model;
    };

    model.dimensions = function() {
      return engine.getDimensions();
    };

    model.format = function(property, opts) {
      opts = opts || {};

      var desc = model.getPropertyDescription(property);
      if (desc) {
        return desc.format(model.get(property), opts);
      }
      return d3.format(opts.format || 'g')(model.get(property));
    };

    /**
      Return a unitDefinition in the current unitScheme for a quantity
      such as 'length', 'mass', etc.
    */
    model.getUnitDefinition = function(name) {
      return unitsDefinition.units[name];
    };

    /**
     * Returns atom transition object. It can be used to smoothly change
     * atom properties over specified time. It's similar to D3 transitions.
     *
     * Atom transition object provides following methods:
     *  id(id)          - sets ID of the atom (required!).
     *  duration(d)     - sets duration in ms (required!).
     *  prop(name, val) - sets property name and its final value (required!).
     *  delay(d)        - sets delay in ms (default is 0).
     *  ease(name)      - sets easing function (default is "cubic-in-out").
     *                    Please see:
     *                    https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_ease
     *
     * e.g.
     *  atomTransition().id(0).duration(1000).ease("linear").prop("x", 10);
     *
     * This will change "x" property of the atom with ID=0
     * to value 10 over 1000ms using linear easing function.
     *
     * @return {AtomTransition} AtomTransition instance.
     */
    model.atomTransition = function () {
      var t = new AtomTransition(model);
      transitions.push(t);
      return t;
    };

    /**
     * Cancels all transitions which are currently in progress.
     */
    model.cancelTransitions = function () {
      transitions.length = 0;
    };

    /**
      Call before running a function that would otherwise trigger a number
      of invalidatingChangePre/PostHooks, which would slow down the model when
      each change causes a recalculation. This can be used whenever you can
      safely assume that all actions executed between startBatch and endBatch
      will not depend on triggered property changes.

      endBatch() *must* be called after the actions are complete, or output
      properties will no longer be updated.
      */
    model.startBatch = function() {
      propertySupport.startBatch();
      // Suppress events dispatching. They will be dispatched during
      // .endBatch() execution.
      dispatch.startBatch();
    };

    model.endBatch = function() {
      propertySupport.endBatch();
      // All events will be dispatched now (but just once per event type).
      dispatch.endBatch();
    };

    /**
     * Executes function between .startBatch() and .endBatch() calls.
     * @param  {Function} action function that should be executed.
     */
    model.batch = function(action) {
      model.startBatch();
      action();
      model.endBatch();
    };

    // Convert array of hashes to a hash of arrays
    // TODO. Move to a new utils module, share with mml parser
    function unroll(array) {
      var ret = {};

      if (array.length === 0) {
        return {};
      }

      Object.keys(array[0]).forEach(function(key) {
        ret[key] = [];
      });

      array.forEach(function(object) {
        Object.keys(object).forEach(function(key) {
          ret[key].push(object[key]);
        });
      });
      return ret;
    }

    function serializeQuantumDynamics() {
      var photons = model.getPhotons(),
          data = {
            photons: serialize(metadata.photon, unroll(photons), photons.length),
            elementEnergyLevels: engine.callPluginAccessor('getElementEnergyLevels'),
            radiationlessEmissionProbability: engine.callPluginAccessor('getRadiationlessEmissionProbability'),
            lightSource: engine.callPluginAccessor('getLightSource')
          };

      if (!data.lightSource) delete data.lightSource;

      return data;
    }

    function serializeChemicalReactions() {
      return {};
    }

    model.serialize = function() {
      var propCopy = {},
          ljProps, i, len,
          rawProperties = propertySupport.rawValues,

          removeAtomsArrayIfDefault = function(name, defaultVal) {
            if (propCopy.atoms[name].every(function(i) {
              return i === defaultVal;
            })) {
              delete propCopy.atoms[name];
            }
          };

      propCopy = serialize(metadata.mainProperties, rawProperties);
      propCopy.viewOptions = serialize(metadata.viewOptions, rawProperties);
      propCopy.atoms = serialize(metadata.atom, modelState.atoms, engine.getNumberOfAtoms());

      if (engine.getNumberOfRadialBonds()) {
        propCopy.radialBonds = serialize(metadata.radialBond, radialBonds, engine.getNumberOfRadialBonds());
      }
      if (engine.getNumberOfAngularBonds()) {
        propCopy.angularBonds = serialize(metadata.angularBond, angularBonds, engine.getNumberOfAngularBonds());
      }
      if (engine.getNumberOfObstacles()) {
        propCopy.obstacles = serialize(metadata.obstacle, obstacles, engine.getNumberOfObstacles());
        for (i = 0, len = propCopy.obstacles.x.length; i < len; i++) {
          // Silly, but allows to pass current serialization tests.
          // FIXME: try to create more flexible tests for serialization.
          propCopy.obstacles.westProbe[i] = Boolean(propCopy.obstacles.westProbe[i]);
          propCopy.obstacles.northProbe[i] = Boolean(propCopy.obstacles.northProbe[i]);
          propCopy.obstacles.eastProbe[i] = Boolean(propCopy.obstacles.eastProbe[i]);
          propCopy.obstacles.southProbe[i] = Boolean(propCopy.obstacles.southProbe[i]);
        }
      }
      if (engine.getNumberOfShapes()) {
        propCopy.shapes = serialize(metadata.shape, shapes, engine.getNumberOfShapes());
      }
      if (engine.getNumberOfLines()) {
        propCopy.lines = serialize(metadata.line, lines, engine.getNumberOfLines());
      }
      if (engine.getNumberOfElectricFields()) {
        propCopy.electricFields = serialize(metadata.electricField, electricFields, engine.getNumberOfElectricFields());
      }
      if (engine.getNumberOfRestraints()) {
        propCopy.restraints = serialize(metadata.restraint, restraints, engine.getNumberOfRestraints());
      }

      // FIXME: for now Amino Acid elements are *not* editable and should not be serialized
      // -- only copy first five elements
      propCopy.elements = serialize(metadata.element, elements, 5);

      // The same situation for Custom LJ Properties. Do not serialize properties for amino acids.
      propCopy.pairwiseLJProperties = [];
      ljProps = engine.pairwiseLJProperties.serialize();
      for (i = 0, len = ljProps.length; i < len; i++) {
        if (ljProps[i].element1 <= 5 && ljProps[i].element2 <= 5) {
          propCopy.pairwiseLJProperties.push(ljProps[i]);
        }
      }

      // Do the weird post processing of the JSON, which is also done by MML parser.
      // Remove targetTemperature when heat-bath is disabled.
      if (propCopy.temperatureControl === false) {
        delete propCopy.targetTemperature;
      }
      // Remove atomTraceId when atom tracing is disabled.
      if (propCopy.viewOptions.showAtomTrace === false) {
        delete propCopy.viewOptions.atomTraceId;
      }
      if (propCopy.modelSampleRate === "default") {
        delete propCopy.modelSampleRate;
      }

      // TODO. Should be able to ask plugins to serialize their data.
      if (model.properties.useQuantumDynamics) {
        propCopy.quantumDynamics = serializeQuantumDynamics();
      }

      if (model.properties.useChemicalReactions) {
        propCopy.chemicalReactions = serializeChemicalReactions();
      } else {
        delete propCopy.atoms.radical;
      }

      ['marked', 'visible', 'draggable', 'draggableWhenStopped'].forEach(function(prop) {
        removeAtomsArrayIfDefault(prop, metadata.atom[prop].defaultValue);
      });

      return propCopy;
    };

    // ------------------------------
    // finish setting up the model
    // ------------------------------

    // Friction parameter temporarily applied to the live-dragged atom.
    model.LIVE_DRAG_FRICTION = 10;

    // ------------------------------
    // Process initialProperties before setting properties on the model
    // ------------------------------

    // Ensure that model, which includes DNA (=> so DNA animation too) has
    // correct, constant dimensions. This is very significant, as if model
    // dimensions are too big or too small, DNA elements can be unreadable. It
    // also ensures that aspect ratio of the model is reasonable for
    // animation.
    // TODO: move this to better place.
    if (initialProperties.DNA) {
      // Overwrite width and height options.
      initialProperties.width = 200;
      initialProperties.height = 5;
      // View options are optional, make sure that they are defined.
      initialProperties.viewOptions = initialProperties.viewOptions || {};
      initialProperties.viewOptions.viewPortX = 0;
      initialProperties.viewOptions.viewPortY = 0;
      initialProperties.viewOptions.viewPortWidth = 5;
      initialProperties.viewOptions.viewPortHeight = 3;
    }

    (function () {
      if (!initialProperties.viewOptions) {
        return;
      }

      // Temporal workaround to provide text boxes and images validation.
      // Note that text boxes and images are handled completely different from other objects
      // like atoms or obstacles. There is much of inconsistency and probably
      // it should be refactored anyway.
      var textBoxes = initialProperties.viewOptions.textBoxes || [],
          images = initialProperties.viewOptions.images || [],
          i, len;

      for (i = 0, len = textBoxes.length; i < len; i++) {
        textBoxes[i] = validator.validateCompleteness(metadata.textBox, textBoxes[i]);
      }
      for (i = 0, len = images.length; i < len; i++) {
        images[i] = validator.validateCompleteness(metadata.image, images[i]);
      }
    }());

    // TODO. Implement a pattern whereby the pluginController lets each plugins examine the initial
    // properties and extract the relevant plugin properties. *However*, don't do it in a way that
    // requires changing the model JSON schema when functionality is moved out of the main engine
    // and into a plugin, or vice-versa.
    pluginProperties = {
      quantumDynamics: initialProperties.quantumDynamics,
      chemicalReactions: initialProperties.chemicalReactions
    };

    // TODO: Elements are stored and treated different from other objects. This was enforced by
    // createNewAtoms() method which has been removed. Change also editableElements handling.
    editableElements = initialProperties.elements;
    // Create editable elements.
    model.createElements(editableElements);
    // Create elements which specify amino acids also.
    createAminoAcids();

    // This will extend model API to support standard Lab model features. We
    // have to do it know, as this will also set initial properties, so the
    // engine has to be already defined (see custom setters).
    labModelerMixin.mixInto(model);

    // Initialize minX, minY, maxX, maxY from model width and height if they are undefined.
    initializeDimensions(model.properties);

    model.on("stop.last-sample-time-reset", function() {
      // This has to be done, as otherwise if user stops and then starts the
      // model, there will be an incorrect sample time reported (equal to time
      // period between starting and stopping the model).
      lastSampleTime = null;
    });
    propertySupport.on("afterInvalidatingChange.read-model-state", readModelState);
    propertySupport.on("afterInvalidatingChangeSequence.tick-history", function () {
      if (tickHistory) tickHistory.invalidateFollowingState();
      dispatch.invalidation();
    });

    // Setup MD2D engine object.
    initializeEngine(model.properties, pluginProperties);

    // Setup genetic engine.
    geneticEngine = new GeneticEngine(model);

    // Finally, if provided, set up the model objects (elements, atoms, bonds, obstacles and the rest).
    // However if these are not provided, client code can create atoms, etc piecemeal.

    // Trigger setter of polarAAEpsilon again when engine is initialized and
    // amino acids crated.
    // TODO: initialize engine before set_properties calls, so properties
    // will be injected to engine automatically.
    model.set({polarAAEpsilon: model.get('polarAAEpsilon')});

    if (initialProperties.atoms)          model.createAtoms(initialProperties.atoms);
    if (initialProperties.radialBonds)    model.createRadialBonds(initialProperties.radialBonds);
    if (initialProperties.angularBonds)   model.createAngularBonds(initialProperties.angularBonds);
    if (initialProperties.restraints)     model.createRestraints(initialProperties.restraints);
    if (initialProperties.obstacles)      model.createObstacles(initialProperties.obstacles);
    if (initialProperties.shapes)         model.createShapes(initialProperties.shapes);
    if (initialProperties.lines)          model.createLines(initialProperties.lines);
    if (initialProperties.electricFields) model.createElectricFields(initialProperties.electricFields);
    // Basically, this #deserialize method is more or less similar to other #create... methods used
    // above. However, this is the first step to delegate some functionality from modeler to smaller classes.
    if (initialProperties.pairwiseLJProperties)
      engine.pairwiseLJProperties.deserialize(initialProperties.pairwiseLJProperties);

    // Initialize tick history.
    tickHistory = new TickHistory({
      getProperties: function() {
        return propertySupport.historyStateRawValues;
      },
      restoreProperties: propertySupport.setRawValues,
      state: engine.getState()
    }, model, defaultMaxTickHistory);

    // Since we can't provide tickHistory to the mixed-in methods at the time we create
    // labModelerMixin (see below comment), provide it now.
    labModelerMixin.tickHistory = tickHistory;

    // FIXME: ugly workaround - mixin OutputSupport again, this time providing
    // tickHistory, so filtered outputs will use it. We couldn't pass
    // tickHistory directly to LabModelerMixin, as tickHistory depends on
    // propertySupport ...returned by LabModelrMixin. It has to be cleaned up.
    outputSupport = new OutputSupport({
      propertySupport: propertySupport,
      unitsDefinition: unitsDefinition,
      tickHistory: tickHistory
    });
    outputSupport.mixInto(model);

    newStep = true;

    // Define some default output properties.
    model.defineOutput('time', {
      label: "Time",
      unitType: 'time',
      format: 'f'
    }, function() {
      // Output getters are expected to return values in translated units, since authored outputs
      // can only read values already in translated units to start with.
      var value = modelState.time;
      if (unitsTranslation) {
        value = unitsTranslation.translateFromModelUnits(value, 'time');
      }
      return value;
    });

    model.defineOutput('timePerTick', {
      label: "Model time per tick",
      unitType: 'time',
      format: 'f'
    }, function() {
      return model.get('timeStep') * model.get('timeStepsPerTick');
    });

    (function() {
      var displayTimeUnits;

      // Allow units definition to declare a "Display time"; specifically, let MD2D units definition
      // define a "displayValue" section in the time unit that returns ps instead of fs.

      if (unitsDefinition.units.time.displayValue) {
        displayTimeUnits = unitsDefinition.units.time.displayValue;
      } else {
        displayTimeUnits = _.extend({}, unitsDefinition.units.time);
        displayTimeUnits.unitsPerBaseUnit = 1;
      }

      model.defineOutput('displayTime', {
        label: "Time",
        unitName:         displayTimeUnits.name,
        unitPluralName:   displayTimeUnits.pluralName,
        unitAbbreviation: displayTimeUnits.symbol,
        format: '.1f'
      }, function() {
        return model.get('time') * displayTimeUnits.unitsPerBaseUnit;
      });

      model.defineOutput('displayTimePerTick', {
        label: "Model time per tick",
        unitName:         displayTimeUnits.name,
        unitPluralName:   displayTimeUnits.pluralName,
        unitAbbreviation: displayTimeUnits.symbol,
        format: '.3f'
      }, function() {
        return model.get('timePerTick') * displayTimeUnits.unitsPerBaseUnit;
      });
    }());

    model.defineOutput('tickCounter', {
      label: "Tick Counter",
      unitType: '',
      format: '4g'
    }, function() {
      return tickHistory.get('counter');
    });

    model.defineOutput('newStep', {
      label: "New Step",
      unitType: '',
      format: ''
    }, function() {
      return newStep;
    });

    model.defineOutput('kineticEnergy', {
      label: "Kinetic Energy",
      unitType: 'energy',
      format: '.4g'
    }, function() {
      var value = modelState.KE;
      if (unitsTranslation) {
        value = unitsTranslation.translateFromModelUnits(value, 'energy');
      }
      return value;
    });

    model.defineOutput('potentialEnergy', {
      label: "Potential Energy",
      unitType: 'energy',
      format: '.4g'
    }, function() {
      var value = modelState.PE;
      if (unitsTranslation) {
        value = unitsTranslation.translateFromModelUnits(value, 'energy');
      }
      return value;
    });

    model.defineOutput('totalEnergy', {
      label: "Total Energy",
      unitType: 'energy',
      format: '.4g'
    }, function() {
      var value = modelState.KE + modelState.PE;
      if (unitsTranslation) {
        value = unitsTranslation.translateFromModelUnits(value, 'energy');
      }
      return value;
    });

    model.defineOutput('temperature', {
      label: "Temperature",
      unitType: 'temperature',
      format: 'f'
    }, function() {
      var value = modelState.temperature;
      if (unitsTranslation) {
        value = unitsTranslation.translateFromModelUnits(value, 'temperature');
      }
      return value;
    });

    // FIXME. More yuck: We still need a pattern for recompute model properties which don't depend
    // on physics (and which therefore can be recomputed without invalidating and recomputing all
    // the physics based properties) while still making them (1) observable and (2) read-only.

    // used to triggers recomputation of isPlayable property based on isStopped and isReady:
    model.on('play.model', recomputeProperties);
    model.on('stop.model', recomputeProperties);

    function recomputeProperties() {
      propertySupport.invalidatingChangePreHook();
      propertySupport.invalidatingChangePostHook();
    }

    model.defineOutput('isPlayable', {
      label: "Playable"
    }, function() {
      // FIXME: isStopped predates the use of ES5 getters, therefore it must be invoked
      return model.isReady && model.isStopped();
    });

    model.defineOutput('hasPlayed', {
      label: "has Played"
    }, function() {
      return model.hasPlayed;
    });

    model.defineOutput('isStopped', {
      label: "Stopped?"
    }, function() {
      return model.isStopped();
    });

    readModelState();
    model.updateAllOutputProperties();

    if (!initializationOptions.waitForSetup) {
      model.ready();
    }

    model.performanceOptimizer = new PerformanceOptimizer(model);

    model.namespace = namespace;

    return model;
  };
});

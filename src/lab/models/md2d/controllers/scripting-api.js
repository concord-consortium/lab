/*global define */

define(function (require) {

  var DNAEditDialog = require('models/md2d/views/dna-edit-dialog');

  /**
    Define the model-specific MD2D scripting API used by 'action' scripts on interactive elements.

    The universal Interactive scripting API is extended with the properties of the
    object below which will be exposed to the interactive's 'action' scripts as if
    they were local vars. All other names (including all globals, but excluding
    Javascript builtins) will be unavailable in the script context; and scripts
    are run in strict mode so they don't accidentally expose or read globals.

    @param: api
  */
  return function MD2DScriptingAPI (api, model) {

    var dnaEditDialog = new DNAEditDialog(model),
        // whether we are currently processing a batch command, suppresses repaint
        batchDepth = 0;

    var setProperty = function () {
      var setter = arguments[0],
          i      = arguments[1],
          args;

      if (Array.isArray(i)) {
        args = Array.prototype.slice.call(arguments, 2, arguments.length);
        api.batch( function() {
          for (var j = 0, jj = i[0]; j < i.length; jj = i[++j]) {
            setter.apply(null,Array.prototype.concat(jj, args));
          }
        });
      } else {
        args = Array.prototype.slice.call(arguments, 1, arguments.length);
        setter.apply(null,args);
      }
      api.repaintIfReady();
    };

    return {

      getCurrentComputerTime: function() {
        return Date.now();
      },

      /* Returns number of atoms in the system. */
      getNumberOfAtoms: function getNumberOfAtoms(f) {
        return model.getNumberOfAtoms(f);
      },

      /* Returns number of obstacles in the system. */
      getNumberOfObstacles: function getNumberOfObstacles() {
        return model.getNumberOfObstacles();
      },

      /* Returns number of elements in the system. */
      getNumberOfElements: function getNumberOfElements() {
        return model.getNumberOfElements();
      },

      /* Returns number of radial bonds in the system. */
      getNumberOfRadialBonds: function getNumberOfRadialBonds() {
        return model.getNumberOfRadialBonds();
      },

      /* Returns number of angular bonds in the system. */
      getNumberOfAngularBonds: function getNumberOfAngularBonds() {
        return model.getNumberOfAngularBonds();
      },

      addAtom: function addAtom(props) {
        return model.addAtom(props);
      },

      /*
        Removes atom 'i'.
      */
      removeAtom: function removeAtom(i, options) {
        try {
          model.removeAtom(i, options);
        } catch (e) {
          if (!options || !options.silent)
            throw e;
        }
      },

      /*
        Removes radial bond 'i'.
      */
      removeRadialBond: function removeRadialBond(i, options) {
        try {
          model.removeRadialBond(i);
        } catch (e) {
          if (!options || !options.silent)
            throw e;
        }

        api.repaintIfReady();
      },

      /*
        Removes angular bond 'i'.
      */
      removeAngularBond: function removeAngularBond(i, options) {
        try {
          model.removeAngularBond(i);
        } catch (e) {
          if (!options || !options.silent)
            throw e;
        }

        api.repaintIfReady();
      },

      addRandomAtom: function addRandomAtom() {
        return model.addRandomAtom.apply(model, arguments);
      },

      adjustTemperature: function adjustTemperature(fraction) {
        model.set({targetTemperature: fraction * model.get('targetTemperature')});
      },

      /**
       Scales the velocity of a group of atoms to the desired temperature T
       */
      setTemperatureOfAtoms: function setTemperatureOfAtoms(atomIndices, T) {
        model.setTemperatureOfAtoms(atomIndices,T);
      },

      getTemperatureOfAtoms: function getTemperatureOfAtoms(atomIndices) {
        return model.getTemperatureOfAtoms(atomIndices);
      },

      limitHighTemperature: function limitHighTemperature(t) {
        if (model.get('targetTemperature') > t) model.set({targetTemperature: t});
      },

      /** returns a list of integers corresponding to atoms in the system */
      randomAtoms: function randomAtoms(n) {
        var numAtoms = model.getNumberOfAtoms();

        if (n === null) n = 1 + api.randomInteger(numAtoms-1);

        if (!api.isInteger(n)) throw new Error("randomAtoms: number of atoms requested, " + n + ", is not an integer.");
        if (n < 0) throw new Error("randomAtoms: number of atoms requested, " + n + ", was less be greater than zero.");

        if (n > numAtoms) n = numAtoms;
        return api.choose(n, numAtoms);
      },

      /**
        Quantum Dynamics
      */

      /** Turn on quantum dynamics light source. */
      turnOnLightSource: function turnOnLightSource() {
        model.turnOnLightSource();
      },

      turnOffLightSource: function turnOffLightSource() {
        model.turnOffLightSource();
      },

      setLightSourceAngle: function setLightSourceAngle(angle) {
        model.setLightSourceAngle(angle);
      },

      setLightSourceFrequency: function setLightSourceFrequency(freq) {
        model.setLightSourceFrequency(freq);
      },

      setLightSourcePeriod: function setLightSourcePeriod(period) {
        model.setLightSourcePeriod(period);
      },

      setLightSourceNumber: function setLightSourceNumber(number) {
        model.setLightSourceNumber(number);
      },

      /**
       * Returns array of atom indices within circular area,
       * optionally specifying an element of interest.
       * e.g. atomsWithinCircle(1, 1, 0.5) returns all atoms within 0.5 nm of position (1nm, 1nm).
       * @param  {number} x       X coordinate of the circle center.
       * @param  {number} y       Y coordinate of the circle center.
       * @param  {number} w       Radius of the circle.
       * @param  {number} element Optional ID of the desired element type.
       * @return {Array}          Array of atoms indices within a given area.
       */
      atomsWithinCircle: function(x, y, r, element) {
        var result = [],
            props, dist, i, len;

        for (i = 0, len = model.getNumberOfAtoms(); i < len; i++) {
          props = model.getAtomProperties(i);
          if (typeof element !== 'undefined' && props.element !== element) continue;
          dist = Math.sqrt(Math.pow(x - props.x, 2) + Math.pow(y - props.y, 2));
          if (dist <= r) {
            result.push(i);
          }
        }
        return result;
      },

      /**
       * Returns array of atom indices within rectangular area,
       * optionally specifying an element of interest.
       * e.g. atomsWithinRect(1, 1, 0.2, 0.3) returns all atoms within a rectangle of width 0.2nm
       * by height 0.3nm, with the bottom-left corner specified by the postion (1nm, 1nm).
       * @param  {number} x       X coordinate of the bottom-left rectangle corner.
       * @param  {number} y       Y coordinate of the bottom-left rectangle corner.
       * @param  {number} w       Width of the rectangle.
       * @param  {number} h       Height of the rectangle.
       * @param  {number} element Optional ID of the desired element type.
       * @return {Array}          Array of atoms indices within a given area.
       */
      atomsWithinRect: function(x, y, w, h, element) {
        var result = [],
            props, dist, inX, inY, i, len;

        for (i = 0, len = model.getNumberOfAtoms(); i < len; i++) {
          props = model.getAtomProperties(i);
          if (typeof element !== 'undefined' && props.element !== element) continue;
          if (typeof h === 'undefined') {
            dist = Math.sqrt(Math.pow(x - props.x, 2) + Math.pow(y - props.y, 2));
            if (dist <= w) {
              result.push(i);
            }
          } else {
            inX = ((props.x >= x) && (props.x <= (x + w)));
            inY = ((props.y >= y) && (props.y <= (y + h)));
            if (inX && inY) {
              result.push(i);
            }
          }
        }
        return result;
      },

      /**
       * Returns an array of atom indices within triangular area,
       * optionally specifying an element ID of interest.
       *
       * @param  {number} ax      X coordinate of 1st triangle vertex.
       * @param  {number} ay      Y coordinate of 1st triangle vertex.
       * @param  {number} bx      X coordinate of 2nd triangle vertex.
       * @param  {number} by      Y coordinate of 2nd triangle vertex.
       * @param  {number} cx      X coordinate of 3rd triangle vertex.
       * @param  {number} cy      Y coordinate of 3rd triangle vertex.
       * @param  {number} element Optional ID of the desired element type.
       * @return {Array}          Array of atoms indices within a given area.
       */
      atomsWithinTriangle: function(ax, ay, bx, by, cx, cy, element) {
        var result = [],
            props, i, len;

        function isInTriangle(px, py) {
          // See: http://www.blackpawn.com/texts/pointinpoly/default.html
          var v0 = [cx - ax, cy - ay],
              v1 = [bx - ax, by - ay],
              v2 = [px - ax, py - ay],

              dot00 = (v0[0] * v0[0]) + (v0[1] * v0[1]),
              dot01 = (v0[0] * v1[0]) + (v0[1] * v1[1]),
              dot02 = (v0[0] * v2[0]) + (v0[1] * v2[1]),
              dot11 = (v1[0] * v1[0]) + (v1[1] * v1[1]),
              dot12 = (v1[0] * v2[0]) + (v1[1] * v2[1]),

              invDenom = 1 / (dot00 * dot11 - dot01 * dot01),

              u = (dot11 * dot02 - dot01 * dot12) * invDenom,
              v = (dot00 * dot12 - dot01 * dot02) * invDenom;

          return ((u >= 0) && (v >= 0) && (u + v < 1));
        }

        for (i = 0, len = model.getNumberOfAtoms(); i < len; i++) {
          props = model.getAtomProperties(i);
          if (typeof element !== 'undefined' && props.element !== element) continue;
          if (isInTriangle(props.x, props.y)) {
            result.push(i);
          }
        }
        return result;
      },

      /**
        Accepts atom indices as arguments, or an array containing atom indices.
        Unmarks all atoms, then marks the requested atom indices.
        Repaints the screen to make the marks visible.
      */
      markAtoms: function markAtoms(indices) {
        var i,
            len;

        if (arguments.length === 0) return;

        // allow passing a list of arguments instead of an array of atom indices
        if (!api.isArray(arguments[0])) {
          indices = arguments;
        }

        api.unmarkAllAtoms();

        // mark the requested atoms
        for (i = 0, len = indices.length; i < len; i++) {
          model.setAtomProperties(indices[i], {marked: 1});
        }

        api.repaintIfReady();
      },

      unmarkAllAtoms: function unmarkAllAtoms() {
        for (var i = 0, len = model.getNumberOfAtoms(); i < len; i++) {
          model.setAtomProperties(i, {marked: 0});
        }
        api.repaintIfReady();
      },

      traceAtom: function traceAtom(i) {
        if (i === null) return;

        model.set({atomTraceId: i});
        model.set({showAtomTrace: true});
      },

      untraceAtom: function untraceAtom() {
        model.set({showAtomTrace: false});
      },

      /**
        Sets individual atom properties using human-readable hash.
        e.g. setAtomProperties(5, {x: 1, y: 0.5, charge: 1})
      */
      setAtomProperties: function setAtomProperties(i, props, checkLocation, moveMolecule) {
        setProperty(model.setAtomProperties, i, props, checkLocation, moveMolecule);
      },

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
      atomTransition: function atomTransition() {
        return model.atomTransition();
      },

      /**
        Returns atom properties as a human-readable hash.
        e.g. getAtomProperties(5) --> {x: 1, y: 0.5, charge: 1, ... }
      */
      getAtomProperties: function getAtomProperties(i) {
        return model.getAtomProperties(i);
      },

      /**
        Returns an array consisting of radial bonds indices for the atom
        e.g. getRadialBondsForAtom(5) --> [2]
      */
      getRadialBondsForAtom: function getRadialBondsForAtom(i) {
        return model.getRadialBondsForAtom(i);
      },

      /**
        Returns an array consisting of the angular bonds indices for the atom
        e.g. getAngularBondsForAtom(5) --> [6, 8]
      */
      getAngularBondsForAtom: function getAngularBondsForAtom(i) {
        return model.getAngularBondsForAtom(i);
      },

      /**
        Returns all atoms in the same molecule as atom i
        (not including i itself)
      */
      getMoleculeAtoms: function getMoleculeAtoms(i) {
        return model.getMoleculeAtoms(i);
      },

      setElementProperties: function setElementProperties(i, props) {
        setProperty(model.setElementProperties, i, props);
      },

      /**
        Sets custom pairwise LJ properties (epsilon or sigma), which will
        be used instead of the mean values of appropriate element properties.
        i, j - IDs of the elements which should have custom pairwise LJ properties.
        props - object containing sigma, epsilon or both.
        e.g. setPairwiseLJProperties(0, 1, {epsilon: -0.2})
      */
      setPairwiseLJProperties: function setPairwiseLJProperties(i, j, props) {
        model.getPairwiseLJProperties().set(i, j, props);
      },

      getElementProperties: function getElementProperties(i) {
        return model.getElementProperties(i);
      },

      /**
        Adds an obstacle using human-readable hash of properties.
        e.g. addObstacle({x: 1, y: 0.5, width: 1, height: 1})
      */
      addObstacle: function addObstacle(props, options) {
        try {
          model.addObstacle(props);
        } catch (e) {
          if (!options || !options.silent)
            throw e;
        }
        api.repaintIfReady();
      },

      /**
        Sets individual obstacle properties using human-readable hash.
        e.g. setObstacleProperties(0, {x: 1, y: 0.5, externalAx: 0.00001})
      */
      setObstacleProperties: function setObstacleProperties(i, props) {
        setProperty(model.setObstacleProperties, i, props);
      },

      /**
        Returns obstacle properties as a human-readable hash.
        e.g. getObstacleProperties(0) --> {x: 1, y: 0.5, externalAx: 0.00001, ... }
      */
      getObstacleProperties: function getObstacleProperties(i) {
        return model.getObstacleProperties(i);
      },

      /**
        Removes obstacle 'i'.
      */
      removeObstacle: function removeObstacle(i, options) {
        try {
          model.removeObstacle(i);
        } catch (e) {
          if (!options || !options.silent)
            throw e;
        }

        api.repaintIfReady();
      },

      setShapeProperties: function setShapeProperties(i, props) {
        setProperty( model.setShapeProperties, i, props );
      },

      getShapeProperties: function getShapeProperties(i) {
        return model.getShapeProperties(i);
      },

      setLineProperties: function setLineProperties(i, props) {
        setProperty(model.setLineProperties, i, props);
      },

      getLineProperties: function getLineProperties(i) {
        return model.getLineProperties(i);
      },

      addElectricField: function addElectricField(props, options) {
        try {
          model.addElectricField(props);
        } catch (e) {
          if (!options || !options.silent)
            throw e;
        }
      },

      removeElectricField: function removeElectricField(i, options) {
        try {
          model.removeElectricField(i);
        } catch (e) {
          if (!options || !options.silent)
            throw e;
        }
      },

      setElectricFieldProperties: function setElectricFieldProperties(i, props) {
        model.setElectricFieldProperties(i, props);
      },

      getElectricFieldProperties: function getElectricFieldProperties(i) {
        return model.getElectricFieldProperties(i);
      },

      getAtomsWithinShape: function getAtomsInsideShape(i) {
        var props=model.getShapeProperties(i);
        return this.atomsWithinRect(props.x, props.y, props.width, props.height);
      },

      removeShape: function removeShape(i, options) {
        try {
          model.removeShape(i);
        } catch (e) {
          if (!options || !options.silent)
            throw e;
        }
        api.repaintIfReady();
      },

      removeLine: function removeLine(i, options) {
        try {
          model.removeLine(i);
        } catch (e) {
          if (!options || !options.silent)
            throw e;
        }
        api.repaintIfReady();
      },

      setRadialBondProperties: function setRadialBondProperties(i, props) {
        model.setRadialBondProperties(i, props);
        api.repaintIfReady();
      },

      getRadialBondProperties: function getRadialBondProperties(i) {
        return model.getRadialBondProperties(i);
      },

      setAngularBondProperties: function setAngularBondProperties(i, props) {
        model.setAngularBondProperties(i, props);
        api.repaintIfReady();
      },

      getAngularBondProperties: function getAngularBondProperties(i) {
        return model.getAngularBondProperties(i);
      },

      /**
        Opens DNA properties dialog, which allows to set DNA code.
      */
      openDNADialog: function showDNADialog() {
        dnaEditDialog.open();
      },

      /**
       * Jumps to the next DNA state.
       *
       * Note that jumping between translation states is not supported!
       * Please use animateToNextDNAState if you need to change state
       * from translation:x to translation:x+1.
       */
      jumpToNextDNAState: function jumpToNextDNAState() {
        model.geneticEngine().jumpToNextState();
      },

      /**
       * Jumps to the next DNA state.
       *
       * Note that jumping between translation states is not supported!
       * When current state is translation:x, where x > 0, this functions
       * will cause jump to translation:0 state.
       */
      jumpToPrevDNAState: function jumpToPrevDNAState() {
        model.geneticEngine().jumpToPrevState();
      },

      /**
       * Tests whether *current* DNA state is before state
       * passed as an argument.
       * @param {String} state DNA state name, e.g. "translation:5".
       * @return {boolean}     true if current state is before 'state',
       *                       false otherwise.
       */
      DNAStateBefore: function DNAStateBefore(state) {
        return model.geneticEngine().stateBefore(state);
      },

      /**
       * Tests whether *current* DNA state is after state
       * passed as an argument.
       * @param {String} state DNA state name, e.g. "translation:5".
       * @return {boolean}     true if current state is after 'state',
       *                       false otherwise.
       */
      DNAStateAfter: function DNAStateAfter(state) {
        return model.geneticEngine().stateAfter(state);
      },

      /**
       * Triggers animation to the next DNA state.
       *
       * Note that this is the only possible way to change state
       * from translation:x to translation:x+1. Jumping between
       * translation states is not supported!
       */
      animateToNextDNAState: function animateToNextDNAState() {
        model.geneticEngine().transitionToNextState();
      },

      /**
       * Triggers animation to the given DNA state.
       * If current DNA state is after the desired state,
       * nothing happens.
       * e.g.
       * get('DNAState'); // transcription:0
       * animateToDNAState("transcription-end") // triggers animation
       * However:
       * get('DNAState'); // translation-end
       * animateToDNAState("transcription-end") // nothing happens
       *
       * @param  {string} stateName name of the state.
       */
      animateToDNAState: function animateToDNAState(stateName) {
        model.geneticEngine().transitionTo(stateName);
      },

      /**
       * Stops current DNA animation.
       */
      stopDNAAnimation: function stopDNAAnimation() {
        // Jumping to previous state will cancel current animation
        // and cleanup transitions queue.
        model.geneticEngine().stopTransition();
      },

      /**
       * Triggers only one step of DNA transcription.
       * This method also accepts optional parameter - expected nucleotide.
       * When it's available, transcription step will be performed only
       * when passed nucleotide code matches nucleotide, which should
       * be actually joined to mRNA in this transcription step. When
       * expected nucleotide code is wrong, this method does nothing.
       *
       * e.g.
       * transcribeDNAStep("A") will perform transcription step only
       * if "A" nucleotide should be added to mRNA in this step.
       *
       * @param {string} expectedNucleotide code of the expected nucleotide ("U", "C", "A" or "G").
       */
      transcribeDNAStep: function transcribeDNAStep(expectedNucleotide) {
        var ge = model.geneticEngine();
        if (ge.stateBefore("dna") || ge.stateAfter("transcription-end")) {
          // Jump to beginning of DNA transcription if current state is before
          // or after transcrption process (so, state is different from:
          // "dna", "transcription:0", ..., "transcription-end").
          model.set("DNAState", "dna");
          ge.transitionTo("transcription:0");
          ge.transcribeStep(expectedNucleotide);
        } else if (model.get("DNAState") !== "transcription-end") {
          // Proceed to the next step.
          ge.transcribeStep(expectedNucleotide);
        }
      },

      /**
       * Triggers only one step of DNA translation.
       */
      translateDNAStep: function translateDNAStep() {
        var ge = model.geneticEngine();
        if (ge.stateBefore("translation:0") || ge.stateAfter("translation-end")) {
          // Animate directly to the translation:0, merge a few shorter
          // animations.
          model.set("DNAState", "translation:0");
          ge.transitionTo("translation:1");
        } else if (model.get("DNAState") !== "translation-end") {
          // Proceed to the next step.
          ge.transitionToNextState();
        }
      },

     /**
      * Generates a random protein. It removes all existing atoms before.
      *
      * @param  {[type]} expectedLength controls the maximum (and expected) number of amino acids of
      *                                 the resulting protein. When expected length is too big
      *                                 (due to limited area of the model), protein will be truncated
      *                                 and warning shown.
      */
      generateRandomProtein: function (expectedLength) {
        var realLength = model.geneticEngine().generateProtein(undefined, expectedLength);

        if (realLength !== expectedLength) {
          throw new Error("Generated protein was truncated due to limited area of the model. Only" +
            realLength + " amino acids were generated.");
        }
      },

      /**
        Sets solvent. You can use three predefined solvents: "water", "oil" or "vacuum".
        This is only a convenience method. The same effect can be achieved by manual setting
        of 'solventForceFactor', 'dielectricConstant' and 'backgroundColor' properties.
      */
      setSolvent: function setSolvent(type) {
        model.setSolvent(type);
      },

      pe: function pe() {
        return model.get('potentialEnergy');
      },

      ke: function ke() {
        return model.get('kineticEnergy');
      },

      atomsKe: function atomsKe(atomsList) {
        var sum = 0, i;
        for (i = 0; i < atomsList.length; i++) {
          sum += model.getAtomKineticEnergy(atomsList[i]);
        }
        return sum;
      },

      minimizeEnergy: function minimizeEnergy() {
        model.minimizeEnergy();
        api.repaintIfReady();
      },

      addTextBox: function(props) {
        model.addTextBox(props);
      },

      removeTextBox: function(i) {
        model.removeTextBox(i);
      },

      setTextBoxProperties: function(i, props) {
        setProperty(model.setTextBoxProperties, i, props);
      },

      getTextBoxProperties: function(i) {
        return model.getTextBoxProperties(i);
      },

      getNumberOfTextBoxes: function() {
        return model.getNumberOfTextBoxes();
      },

      getNumberOfLines: function() {
        return model.getNumberOfLines();
      },

      getImageProperties: function(i) {
        return model.getImageProperties(i);
      },

      setImageProperties: function(i, props) {
        setProperty(model.setImageProperties, i, props);
      },

      repaintIfReady: function() {
        if (batchDepth === 0) {
          api.repaint();
        }
      },

      batch: function(func) {
        ++batchDepth;

        model.startBatch();
        func();
        model.endBatch();

        --batchDepth;

        // call repaint manually
        api.repaintIfReady();
      }

    };

  };
});

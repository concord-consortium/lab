/*global define */

import $__models_md_d_views_dna_edit_dialog from 'models/md2d/views/dna-edit-dialog';

var DNAEditDialog = $__models_md_d_views_dna_edit_dialog;

/**
  Define the model-specific MD2D scripting API used by 'action' scripts on interactive elements.

  The universal Interactive scripting API is extended with the properties of the
  object below which will be exposed to the interactive's 'action' scripts as if
  they were local vars. All other names (including all globals, but excluding
  Javascript builtins) will be unavailable in the script context; and scripts
  are run in strict mode so they don't accidentally expose or read globals.

  @param: parent Scripting API
*/
export default function MD2DScriptingAPI(parent) {

  var dnaEditDialog = null,
    // whether we are currently processing a batch command, suppresses repaint
    batchDepth = 0;

  var setProperty = function() {
    var setter = arguments[0],
      i = arguments[1],
      args;

    if (Array.isArray(i)) {
      args = Array.prototype.slice.call(arguments, 2, arguments.length);
      parent.api.batch(function() {
        for (var j = 0, jj = i[0]; j < i.length; jj = i[++j]) {
          setter.apply(null, Array.prototype.concat(jj, args));
        }
      });
    } else {
      args = Array.prototype.slice.call(arguments, 1, arguments.length);
      setter.apply(null, args);
    }
    parent.api.repaintIfReady();
  };

  function createModelAdder(methodName) {
    return function modelAdder(props, options) {
      try {
        parent.model[methodName].call(parent.model, props);
      } catch (e) {
        if (!options || !options.silent)
          throw e;
      }
      parent.api.repaintIfReady();
    };
  }

  return {

    getCurrentComputerTime: function() {
      return Date.now();
    },

    /* Returns number of atoms in the system. */
    getNumberOfAtoms: function getNumberOfAtoms(f) {
      return parent.model.getNumberOfAtoms(f);
    },

    /* Returns number of obstacles in the system. */
    getNumberOfObstacles: function getNumberOfObstacles() {
      return parent.model.getNumberOfObstacles();
    },

    /* Returns number of elements in the system. */
    getNumberOfElements: function getNumberOfElements() {
      return parent.model.getNumberOfElements();
    },

    /* Returns number of radial bonds in the system. */
    getNumberOfRadialBonds: function getNumberOfRadialBonds() {
      return parent.model.getNumberOfRadialBonds();
    },

    /* Returns number of angular bonds in the system. */
    getNumberOfAngularBonds: function getNumberOfAngularBonds() {
      return parent.model.getNumberOfAngularBonds();
    },

    addAtom: function addAtom(props) {
      return parent.model.addAtom(props);
    },

    /*
      Removes atom 'i'.
    */
    removeAtom: function removeAtom(i, options) {
      try {
        parent.model.removeAtom(i, options);
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
        parent.model.removeRadialBond(i);
      } catch (e) {
        if (!options || !options.silent)
          throw e;
      }

      parent.api.repaintIfReady();
    },

    /*
      Removes angular bond 'i'.
    */
    removeAngularBond: function removeAngularBond(i, options) {
      try {
        parent.model.removeAngularBond(i);
      } catch (e) {
        if (!options || !options.silent)
          throw e;
      }

      parent.api.repaintIfReady();
    },

    /*
      Adds radial bond with properties 'props'.
    */
    addRadialBond: function addRadialBond(props) {
      parent.model.addRadialBond(props);

      parent.api.repaintIfReady();
    },

    addRestraint: function addRestraint(props) {
      parent.model.addRestraint(props);
      parent.api.repaintIfReady();
    },

    setRestraintProperties: function setRestraintProperties(i, props) {
      parent.model.setRestraintProperties(i, props);
      parent.api.repaintIfReady();
    },

    /*
      Adds angular bond with properties 'props'.
    */
    addAngularBond: function addAngularBond(props) {
      parent.model.addAngularBond(props);

      parent.api.repaintIfReady();
    },

    addRandomAtom: function addRandomAtom() {
      return parent.model.addRandomAtom.apply(parent.model, arguments);
    },

    adjustTemperature: function adjustTemperature(fraction) {
      parent.model.set({
        targetTemperature: fraction * parent.model.get('targetTemperature')
      });
    },

    /**
     * Scales the velocity of all atoms to the desired temperature T.
     * @param {number} T           defined in K
     */
    setTemperatureOfAllAtoms: function setTemperatureOfAllAtoms(T) {
      var atomIndices = [];
      for (var i = 0; i < parent.model.getNumberOfAtoms(); i++) {
        atomIndices.push(i);
      }
      parent.model.setTemperatureOfAtoms(atomIndices, T);
    },

    /**
     * Scales the velocity of a group of atoms to the desired temperature T.
     * @param {array}  atomIndices
     * @param {number} T           defined in K
     */
    setTemperatureOfAtoms: function setTemperatureOfAtoms(atomIndices, T) {
      parent.model.setTemperatureOfAtoms(atomIndices, T);
    },

    /**
     * Adds energy defined in eV to a group of atoms.
     * @param {number} energy      defined in eV
     * @param {array}  atomIndices optional, if undefined, KE will be added to all atoms
     */
    addKEToAtoms: function addKEToAtoms(energy, atomIndices) {
      parent.model.addKEToAtoms(energy, atomIndices);
    },

    getTemperatureOfAllAtoms: function getTemperatureOfAllAtoms() {
      var atomIndices = [];
      for (var i = 0; i < parent.model.getNumberOfAtoms(); i++) {
        atomIndices.push(i);
      }
      return parent.model.getTemperatureOfAtoms(atomIndices);
    },

    getTemperatureOfAtoms: function getTemperatureOfAtoms(atomIndices) {
      return parent.model.getTemperatureOfAtoms(atomIndices);
    },

    limitHighTemperature: function limitHighTemperature(t) {
      if (parent.model.get('targetTemperature') > t) parent.model.set({
        targetTemperature: t
      });
    },

    /** returns a list of integers corresponding to atoms in the system */
    randomAtoms: function randomAtoms(n) {
      var numAtoms = parent.model.getNumberOfAtoms();

      if (n === null) n = 1 + parent.api.randomInteger(numAtoms - 1);

      if (!parent.api.isInteger(n)) throw new Error("randomAtoms: number of atoms requested, " + n + ", is not an integer.");
      if (n < 0) throw new Error("randomAtoms: number of atoms requested, " + n + ", was less be greater than zero.");

      if (n > numAtoms) n = numAtoms;
      return parent.api.choose(n, numAtoms);
    },

    /**
      Quantum Dynamics
    */

    /** Turn on quantum dynamics light source. */
    turnOnLightSource: function turnOnLightSource() {
      parent.model.turnOnLightSource();
    },

    turnOffLightSource: function turnOffLightSource() {
      parent.model.turnOffLightSource();
    },

    setLightSourceAngle: function setLightSourceAngle(angle) {
      parent.model.setLightSourceAngle(angle);
    },

    setLightSourceFrequency: function setLightSourceFrequency(freq) {
      parent.model.setLightSourceFrequency(freq);
    },

    setLightSourcePeriod: function setLightSourcePeriod(period) {
      parent.model.setLightSourcePeriod(period);
    },

    setLightSourceNumber: function setLightSourceNumber(number) {
      parent.model.setLightSourceNumber(number);
    },

    /**
     * Chemical Reactions
     */

    /**
     * Sets bond energy (dissociation energy) of a bond.
     * @param {string} bondDescription e.g. "1-1" means single bond between element 1 and 1,
     *                                 "1=2" means double bond between element 1 and 2 etc.
     * @param {number} value           bond energy in eV
     */
    setBondEnergy: function setBondEnergy(bondDescription, value) {
      parent.model.setBondEnergy(bondDescription, value);
    },

    /**
     * Sets valence electrons count of the given element.
     * @param {number} element
     * @param {number} value
     */
    setValenceElectrons: function setVelenceElectrons(element, value) {
      parent.model.setValenceElectrons(element, value);
      parent.api.repaintIfReady();
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

      for (i = 0, len = parent.model.getNumberOfAtoms(); i < len; i++) {
        props = parent.model.getAtomProperties(i);
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

      for (i = 0, len = parent.model.getNumberOfAtoms(); i < len; i++) {
        props = parent.model.getAtomProperties(i);
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

      for (i = 0, len = parent.model.getNumberOfAtoms(); i < len; i++) {
        props = parent.model.getAtomProperties(i);
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
      if (!parent.api.isArray(arguments[0])) {
        indices = arguments;
      }

      parent.api.unmarkAllAtoms();

      // mark the requested atoms
      for (i = 0, len = indices.length; i < len; i++) {
        parent.model.setAtomProperties(indices[i], {
          marked: 1
        });
      }
      parent.api.repaintIfReady();
    },

    unmarkAllAtoms: function unmarkAllAtoms() {
      for (var i = 0, len = parent.model.getNumberOfAtoms(); i < len; i++) {
        parent.model.setAtomProperties(i, {
          marked: 0
        });
      }
      parent.api.repaintIfReady();
    },

    traceAtom: function traceAtom(i) {
      if (i === null) return;

      parent.model.set({
        atomTraceId: i
      });
      parent.model.set({
        showAtomTrace: true
      });
    },

    untraceAtom: function untraceAtom() {
      parent.model.set({
        showAtomTrace: false
      });
    },

    /**
      Sets individual atom properties using human-readable hash.
      e.g. setAtomProperties(5, {x: 1, y: 0.5, charge: 1})
    */
    setAtomProperties: function setAtomProperties(i, props, checkLocation, moveMolecule) {
      setProperty(parent.model.setAtomProperties, i, props, checkLocation, moveMolecule);
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
      return parent.model.atomTransition();
    },

    /**
      Returns atom properties as a human-readable hash.
      e.g. getAtomProperties(5) --> {x: 1, y: 0.5, charge: 1, ... }
    */
    getAtomProperties: function getAtomProperties(i) {
      return parent.model.getAtomProperties(i);
    },

    /**
      Returns an array consisting of radial bonds indices for the atom
      e.g. getRadialBondsForAtom(5) --> [2]
    */
    getRadialBondsForAtom: function getRadialBondsForAtom(i) {
      return parent.model.getRadialBondsForAtom(i);
    },

    /**
      Returns an array consisting of the angular bonds indices for the atom
      e.g. getAngularBondsForAtom(5) --> [6, 8]
    */
    getAngularBondsForAtom: function getAngularBondsForAtom(i) {
      return parent.model.getAngularBondsForAtom(i);
    },

    /**
      Returns all atoms in the same molecule as atom i
      (not including i itself)
    */
    getMoleculeAtoms: function getMoleculeAtoms(i) {
      return parent.model.getMoleculeAtoms(i);
    },

    setElementProperties: function setElementProperties(i, props) {
      setProperty(parent.model.setElementProperties, i, props);
    },

    /**
      Sets custom pairwise LJ properties (epsilon or sigma), which will
      be used instead of the mean values of appropriate element properties.
      i, j - IDs of the elements which should have custom pairwise LJ properties.
      props - object containing sigma, epsilon or both.
      e.g. setPairwiseLJProperties(0, 1, {epsilon: -0.2})
    */
    setPairwiseLJProperties: function setPairwiseLJProperties(i, j, props) {
      parent.model.getPairwiseLJProperties().set(i, j, props);
    },

    /**
      Removes custom pairwise LJ properties, reverting it to the default calculation.
    */
    removePairwiseLJProperties: function removePairwiseLJProperties(i, j) {
      parent.model.getPairwiseLJProperties().remove(i, j);
    },

    getElementProperties: function getElementProperties(i) {
      return parent.model.getElementProperties(i);
    },

    getAminoAcid: function getAminoAcidByElement(i) {
      return parent.model.getAminoAcidByElement(i);
    },

    /**
      Adds an obstacle/shape/line using human-readable hash of properties.
      e.g. addObstacle({x: 1, y: 0.5, width: 1, height: 1})
    */
    addObstacle: createModelAdder("addObstacle"),
    addShape: createModelAdder("addShape"),
    addLine: createModelAdder("addLine"),

    /**
      Sets individual obstacle properties using human-readable hash.
      e.g. setObstacleProperties(0, {x: 1, y: 0.5, externalAx: 0.00001})
    */
    setObstacleProperties: function setObstacleProperties(i, props) {
      setProperty(parent.model.setObstacleProperties, i, props);
    },

    /**
      Returns obstacle properties as a human-readable hash.
      e.g. getObstacleProperties(0) --> {x: 1, y: 0.5, externalAx: 0.00001, ... }
    */
    getObstacleProperties: function getObstacleProperties(i) {
      return parent.model.getObstacleProperties(i);
    },

    /**
      Removes obstacle 'i'.
    */
    removeObstacle: function removeObstacle(i, options) {
      try {
        parent.model.removeObstacle(i);
      } catch (e) {
        if (!options || !options.silent)
          throw e;
      }

      parent.api.repaintIfReady();
    },

    setShapeProperties: function setShapeProperties(i, props) {
      setProperty(parent.model.setShapeProperties, i, props);
    },

    getShapeProperties: function getShapeProperties(i) {
      return parent.model.getShapeProperties(i);
    },

    setLineProperties: function setLineProperties(i, props) {
      setProperty(parent.model.setLineProperties, i, props);
    },

    getLineProperties: function getLineProperties(i) {
      return parent.model.getLineProperties(i);
    },

    addElectricField: function addElectricField(props, options) {
      try {
        parent.model.addElectricField(props);
      } catch (e) {
        if (!options || !options.silent)
          throw e;
      }
    },

    removeElectricField: function removeElectricField(i, options) {
      try {
        parent.model.removeElectricField(i);
      } catch (e) {
        if (!options || !options.silent)
          throw e;
      }
    },

    setElectricFieldProperties: function setElectricFieldProperties(i, props) {
      parent.model.setElectricFieldProperties(i, props);
    },

    getElectricFieldProperties: function getElectricFieldProperties(i) {
      return parent.model.getElectricFieldProperties(i);
    },

    getAtomsWithinShape: function getAtomsInsideShape(i) {
      var props = parent.model.getShapeProperties(i);
      return this.atomsWithinRect(props.x, props.y, props.width, props.height);
    },

    removeShape: function removeShape(i, options) {
      try {
        parent.model.removeShape(i);
      } catch (e) {
        if (!options || !options.silent)
          throw e;
      }
      parent.api.repaintIfReady();
    },

    removeLine: function removeLine(i, options) {
      try {
        parent.model.removeLine(i);
      } catch (e) {
        if (!options || !options.silent)
          throw e;
      }
      parent.api.repaintIfReady();
    },

    setRadialBondProperties: function setRadialBondProperties(i, props) {
      parent.model.setRadialBondProperties(i, props);
      parent.api.repaintIfReady();
    },

    getRadialBondProperties: function getRadialBondProperties(i) {
      return parent.model.getRadialBondProperties(i);
    },

    setAngularBondProperties: function setAngularBondProperties(i, props) {
      parent.model.setAngularBondProperties(i, props);
      parent.api.repaintIfReady();
    },

    getAngularBondProperties: function getAngularBondProperties(i) {
      return parent.model.getAngularBondProperties(i);
    },

    /**
      Opens DNA properties dialog, which allows to set DNA code.
    */
    openDNADialog: function openDNADialog() {
      if (dnaEditDialog == null) {
        dnaEditDialog = new DNAEditDialog(parent.model);
      }
      dnaEditDialog.bindModel(parent.model);
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
      parent.model.geneticEngine().jumpToNextState();
    },

    /**
     * Jumps to the next DNA state.
     *
     * Note that jumping between translation states is not supported!
     * When current state is translation:x, where x > 0, this functions
     * will cause jump to translation:0 state.
     */
    jumpToPrevDNAState: function jumpToPrevDNAState() {
      parent.model.geneticEngine().jumpToPrevState();
    },

    /**
     * Tests whether *current* DNA state is before state
     * passed as an argument.
     * @param {String} state DNA state name, e.g. "translation:5".
     * @return {boolean}     true if current state is before 'state',
     *                       false otherwise.
     */
    DNAStateBefore: function DNAStateBefore(state) {
      return parent.model.geneticEngine().stateBefore(state);
    },

    /**
     * Tests whether *current* DNA state is after state
     * passed as an argument.
     * @param {String} state DNA state name, e.g. "translation:5".
     * @return {boolean}     true if current state is after 'state',
     *                       false otherwise.
     */
    DNAStateAfter: function DNAStateAfter(state) {
      return parent.model.geneticEngine().stateAfter(state);
    },

    /**
     * Triggers animation to the next DNA state.
     *
     * Note that this is the only possible way to change state
     * from translation:x to translation:x+1. Jumping between
     * translation states is not supported!
     */
    animateToNextDNAState: function animateToNextDNAState() {
      parent.model.geneticEngine().transitionToNextState();
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
      parent.model.geneticEngine().transitionTo(stateName);
    },

    /**
     * Stops current DNA animation.
     */
    stopDNAAnimation: function stopDNAAnimation() {
      // Jumping to previous state will cancel current animation
      // and cleanup transitions queue.
      parent.model.geneticEngine().stopTransition();
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
      var ge = parent.model.geneticEngine();
      if (ge.stateBefore("dna") || ge.stateAfter("transcription-end")) {
        // Jump to beginning of DNA transcription if current state is before
        // or after transcrption process (so, state is different from:
        // "dna", "transcription:0", ..., "transcription-end").
        parent.model.set("DNAState", "dna");
        ge.transitionTo("transcription:0");
        ge.transcribeStep(expectedNucleotide);
      } else if (parent.model.get("DNAState") !== "transcription-end") {
        // Proceed to the next step.
        ge.transcribeStep(expectedNucleotide);
      }
    },

    /**
     * Triggers only one step of DNA translation.
     */
    translateDNAStep: function translateDNAStep() {
      var ge = parent.model.geneticEngine();
      if (ge.stateBefore("translation:0") || ge.stateAfter("translation-end")) {
        // Animate directly to the translation:0, merge a few shorter
        // animations.
        parent.model.set("DNAState", "translation:0");
        ge.transitionTo("translation:1");
      } else if (parent.model.get("DNAState") !== "translation-end") {
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
    generateRandomProtein: function(expectedLength) {
      var realLength = parent.model.geneticEngine().generateProtein(undefined, expectedLength);

      if (realLength !== expectedLength) {
        throw new Error("Generated protein was truncated due to limited area of the parent.model. Only" +
          realLength + " amino acids were generated.");
      }
    },

    /**
      Sets solvent. You can use three predefined solvents: "water", "oil" or "vacuum".
      This is only a convenience method. The same effect can be achieved by manual setting
      of 'solventForceFactor', 'dielectricConstant' and 'backgroundColor' properties.
    */
    setSolvent: function setSolvent(type) {
      parent.model.setSolvent(type);
    },

    pe: function pe() {
      return parent.model.get('potentialEnergy');
    },

    ke: function ke() {
      return parent.model.get('kineticEnergy');
    },

    atomsKe: function atomsKe(atomsList) {
      var sum = 0,
        i;
      for (i = 0; i < atomsList.length; i++) {
        sum += parent.model.getAtomKineticEnergy(atomsList[i]);
      }
      return sum;
    },

    minimizeEnergy: function minimizeEnergy() {
      parent.model.minimizeEnergy();
      parent.api.repaintIfReady();
    },

    addTextBox: function(props) {
      parent.model.addTextBox(props);
    },

    removeTextBox: function(i) {
      parent.model.removeTextBox(i);
    },

    setTextBoxProperties: function(i, props) {
      parent.model.setTextBoxProperties(i, props);
    },

    getTextBoxProperties: function(i) {
      return parent.model.getTextBoxProperties(i);
    },

    getNumberOfTextBoxes: function() {
      return parent.model.getNumberOfTextBoxes();
    },

    getNumberOfLines: function() {
      return parent.model.getNumberOfLines();
    },

    getNumberOfShapes: function() {
      return parent.model.getNumberOfShapes();
    },

    addImage: function(props) {
      parent.model.addImage(props);
    },

    removeImage: function(i) {
      parent.model.removeImage(i);
    },

    getImageProperties: function(i) {
      return parent.model.getImageProperties(i);
    },

    setImageProperties: function(i, props) {
      setProperty(parent.model.setImageProperties, i, props);
    },

    repaintIfReady: function() {
      if (batchDepth === 0) {
        parent.api.repaint();
      }
    },

    batch: function(func) {
      ++batchDepth;

      parent.model.startBatch();
      func();
      parent.model.endBatch();

      --batchDepth;

      // call repaint manually
      parent.api.repaintIfReady();
    }

  };

};

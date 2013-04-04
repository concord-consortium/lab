/*global define, model */

define(function (require) {

  var DNAEditDialog = require('md2d/views/dna-edit-dialog');

  /**
    Define the model-specific MD2D scripting API used by 'action' scripts on interactive elements.

    The universal Interactive scripting API is extended with the properties of the
    object below which will be exposed to the interactive's 'action' scripts as if
    they were local vars. All other names (including all globals, but excluding
    Javascript builtins) will be unavailable in the script context; and scripts
    are run in strict mode so they don't accidentally expose or read globals.

    @param: api
  */
  return function MD2DScriptingAPI (api) {

    var dnaEditDialog = new DNAEditDialog(),
        // whether we are currently processing a batch command, suppresses repaint
        inBatch = false;

    return {
      /* Returns number of atoms in the system. */
      getNumberOfAtoms: function getNumberOfAtoms(f) {
        return model.get_num_atoms(f);
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

      /* Send a track page context event to Google Analytics */
      trackPageContext: function trackPageContext(category, action, label) {
        var pageContext,
            googleAnalytics = _gaq;

        if (typeof googleAnalytics === 'undefined'){
          console.error("Google Analytics not defined, Can not send the Track Page Context event");
          return;
        }
        if (!category) {
          category = "Interactive";
        }
        if (!action) {
          action = "Page Context";
        }
        if (!label) {
          label = JSON.stringify({ pageContext: document.referrer, interactive: document.location.href });
        }
        console.log("Sending a track page context event to Google Analytics");
        googleAnalytics.push(['_trackEvent', category, action, label]);
      },

      /* Send a tracking event to Google Analytics */
      trackEvent: function trackEvent(category, action, label) {
        var googleAnalytics = _gaq;

        if (typeof googleAnalytics === 'undefined'){
          console.error("Google Analytics not defined, Can not send trackEvent");
          return;
        }
        if (!category) {
          category = "Interactive";
        }
        console.log("Sending a track page event Google Analytics (category:action:label):");
        console.log("(" + category + ":"  + action + ":" + label + ")");
        googleAnalytics.push(['_trackEvent', category, action, label]);
      },

      addAtom: function addAtom(props, options) {
        if (options && options.suppressRepaint) {
          // Translate suppressRepaint option to
          // option understable by modeler.
          // supresRepaint is a conveniance option for
          // Scripting API users.
          options.suppressEvent = true;
        }
        return model.addAtom(props, options);
      },

      /*
        Removes atom 'i'.
      */
      removeAtom: function removeAtom(i, options) {
        if (options && options.suppressRepaint) {
          // Translate suppressRepaint option to
          // option understable by modeler.
          // supresRepaint is a conveniance option for
          // Scripting API users.
          options.suppressEvent = true;
          delete options.suppressRepaint;
        }
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

      limitHighTemperature: function limitHighTemperature(t) {
        if (model.get('targetTemperature') > t) model.set({targetTemperature: t});
      },

      /** returns a list of integers corresponding to atoms in the system */
      randomAtoms: function randomAtoms(n) {
        var numAtoms = model.get_num_atoms();

        if (n === null) n = 1 + api.randomInteger(numAtoms-1);

        if (!api.isInteger(n)) throw new Error("randomAtoms: number of atoms requested, " + n + ", is not an integer.");
        if (n < 0) throw new Error("randomAtoms: number of atoms requested, " + n + ", was less be greater than zero.");

        if (n > numAtoms) n = numAtoms;
        return api.choose(n, numAtoms);
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

        for (i = 0, len = model.get_num_atoms(); i < len; i++) {
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

        for (i = 0, len = model.get_num_atoms(); i < len; i++) {
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

        for (i = 0, len = model.get_num_atoms(); i < len; i++) {
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
        for (var i = 0, len = model.get_num_atoms(); i < len; i++) {
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
      setAtomProperties: function setAtomProperties(i, props, checkLocation, moveMolecule, options) {
        model.setAtomProperties(i, props, checkLocation, moveMolecule);
        api.repaintIfReady(options);
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
        model.setElementProperties(i, props);
        api.repaintIfReady();
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
        model.setObstacleProperties(i, props);
        api.repaintIfReady();
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
        Sets genetic properties using human-readable hash.
        e.g. setGeneticProperties({ DNA: "ATCG" })
      */
      setGeneticProperties: function setGeneticProperties(props) {
        model.getGeneticProperties().set(props);
      },

      /**
        Returns genetic properties as a human-readable hash.
        e.g. getGeneticProperties() --> {DNA: "ATCG", DNAComplement: "TAGC", x: 0.01, y: 0.01, height: 0.12}
      */
      getGeneticProperties: function getGeneticProperties() {
        return model.getGeneticProperties().get();
      },

      /**
        Opens DNA properties dialog, which allows to set DNA code.
      */
      openDNADialog: function showDNADialog() {
        dnaEditDialog.open();
      },

      /**
        Triggers transcription of mRNA from DNA.
        Result should be rendered. It is also stored in genetic properties.

        e.g. getGeneticProperties() --> {DNA: "ATCG", DNAComplement: "TAGC", mRNA: "AUCG", ...}
      */
      transcribe: function transcribeDNA() {
        model.getGeneticProperties().transcribeDNA();
      },

      /**
        Triggers translation of mRNA to protein.
      */
      translate: function translate() {
        var aaSequence = model.getGeneticProperties().translate();
        model.generateProtein(aaSequence);
      },

      translateStepByStep: function translateStepByStep() {
        model.translateStepByStep();
      },

      animateTranslation: function animateTranslation() {
        model.animateTranslation();
      },

      /**
        Generates a random protein.

        'expectedLength' parameter controls the maximum (and expected) number of amino
        acids of the resulting protein. When expected length is too big (due to limited
        area of the model), protein will be truncated and warning shown.
      */
      generateRandomProtein: function (expectedLength) {
        var realLength = model.generateProtein(undefined, expectedLength);

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
        model.setTextBoxProperties(i, props);
      },

      repaintIfReady: function(options) {
        if (!(inBatch || options && options.suppressRepaint)) {
          api.repaint();
        }
      },

      batch: function(func) {
        inBatch = true;

        model.startBatch();
        func();
        model.endBatch();

        inBatch = false;

        // call repaint manually
        api.repaintIfReady();
      }

    };

  };
});

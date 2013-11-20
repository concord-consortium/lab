/*global define */

define(function () {

  /**
    Define the model-specific SolarSystem scripting API used by 'action' scripts on interactive elements.

    The universal Interactive scripting API is extended with the properties of the
    object below which will be exposed to the interactive's 'action' scripts as if
    they were local vars. All other names (including all globals, but excluding
    Javascript builtins) will be unavailable in the script context; and scripts
    are run in strict mode so they don't accidentally expose or read globals.

    @param: parent Scripting API
  */
  return function SolarSystemScriptingAPI (parent) {

    return {
      /* Returns number of bodies in the system. */
      getNumberOfBodies: function getNumberOfBodies() {
        return parent.model.get_num_bodies();
      },

      addBody: function addBody(props, options) {
        if (options && options.supressRepaint) {
          // Translate supressRepaint option to
          // option understable by modeler.
          // supresRepaint is a conveniance option for
          // Scripting API users.
          options.supressEvent = true;
        }
        return parent.model.addBody(props, options);
      },

      /*
        Removes planet 'i'.
      */
      removeBody: function removeBody(i, options) {
        if (options && options.supressRepaint) {
          // Translate supressRepaint option to
          // option understable by modeler.
          // supresRepaint is a conveniance option for
          // Scripting API users.
          options.supressEvent = true;
          delete options.supressRepaint;
        }
        try {
          parent.model.removeBody(i, options);
        } catch (e) {
          if (!options || !options.silent)
            throw e;
        }
      },

      addRandomBody: function addRandomBody() {
        return parent.model.addRandomBody.apply(parent.model, arguments);
      },

      /** returns a list of integers corresponding to bodies in the system */
      randomBodies: function randomBodies(n) {
        var numBodies = parent.model.get_num_bodies();

        if (n === null) n = 1 + parent.api.randomInteger(numBodies-1);

        if (!parent.api.isInteger(n)) throw new Error("randomBodies: number of bodies requested, " + n + ", is not an integer.");
        if (n < 0) throw new Error("randomBodies: number of bodies requested, " + n + ", was less be greater than zero.");

        if (n > numBodies) n = numBodies;
        return parent.api.choose(n, numBodies);
      },

      /**
        Accepts planet indices as arguments, or an array containing planet indices.
        Unmarks all bodies, then marks the requested planet indices.
        Repaints the screen to make the marks visible.
      */
      markBodies: function markBodies() {
        var i,
            len;

        if (arguments.length === 0) return;

        // allow passing an array instead of a list of planet indices
        if (parent.api.isArray(arguments[0])) {
          return markBodies.apply(null, arguments[0]);
        }

        parent.api.unmarkAllBodies();

        // mark the requested bodies
        for (i = 0, len = arguments.length; i < len; i++) {
          parent.model.setBodyProperties(arguments[i], {marked: 1});
        }
        parent.api.repaint();
      },

      unmarkAllBodies: function unmarkAllBodies() {
        for (var i = 0, len = parent.model.get_num_bodies(); i < len; i++) {
          parent.model.setBodyProperties(i, {marked: 0});
        }
        parent.api.repaint();
      },

      traceBody: function traceBody(i) {
        if (i === null) return;

        parent.model.set({bodyTraceId: i});
        parent.model.set({showBodyTrace: true});
      },

      untraceBody: function untraceBody() {
        parent.model.set({showBodyTrace: false});
      },

      /**
        Sets individual planet properties using human-readable hash.
        e.g. setBodyProperties(5, {x: 1, y: 0.5, charge: 1})
      */
      setBodyProperties: function setBodyProperties(i, props, checkLocation, moveBody, options) {
        parent.model.setBodyProperties(i, props, checkLocation, moveBody);
        if (!(options && options.supressRepaint)) {
          parent.api.repaint();
        }
      },

      /**
        Returns planet properties as a human-readable hash.
        e.g. getBodyProperties(5) --> {x: 1, y: 0.5, charge: 1, ... }
      */
      getBodyProperties: function getBodyProperties(i) {
        return parent.model.getBodyProperties(i);
      },

      addTextBox: function(props) {
        parent.model.addTextBox(props);
      },

      removeTextBox: function(i) {
        parent.model.removeTextBox(i);
      },

      setTextBoxProperties: function(i, props) {
        parent.model.setTextBoxProperties(i, props);
      }

    };

  };
});

/*global define model */

define(function (require) {

  /**
    Define the model-specific PTA scripting API used by 'action' scripts on interactive elements.

    The universal Interactive scripting API is extended with the properties of the
    object below which will be exposed to the interactive's 'action' scripts as if
    they were local vars. All other names (including all globals, but excluding
    Javascript builtins) will be unavailable in the script context; and scripts
    are run in strict mode so they don't accidentally expose or read globals.

    @param: api
  */

  return function PTAScriptingAPI (api) {

    return {
      /* Returns number of turtles in the system. */
      getNumberOfTurtles: function getNumberOfTurtles() {
        return model.get_num_turtles();
      },

      addTurtle: function addTurtle(props, options) {
        if (options && options.supressRepaint) {
          // Translate supressRepaint option to
          // option understable by modeler.
          // supresRepaint is a conveniance option for
          // Scripting API users.
          options.supressEvent = true;
        }
        return model.addTurtle(props, options);
      },

      /*
        Removes turtle 'i'.
      */
      removeTurtle: function removeTurtle(i, options) {
        if (options && options.supressRepaint) {
          // Translate supressRepaint option to
          // option understable by modeler.
          // supresRepaint is a conveniance option for
          // Scripting API users.
          options.supressEvent = true;
          delete options.supressRepaint;
        }
        try {
          model.removeTurtle(i, options);
        } catch (e) {
          if (!options || !options.silent)
            throw e;
        }
      },

      addRandomTurtle: function addRandomTurtle() {
        return model.addRandomTurtle.apply(model, arguments);
      },

      /** returns a list of integers corresponding to turtles in the system */
      randomTurtles: function randomTurtles(n) {
        var numTurtles = model.get_num_turtles();

        if (n === null) n = 1 + api.randomInteger(numTurtles-1);

        if (!api.isInteger(n)) throw new Error("randomTurtles: number of turtles requested, " + n + ", is not an integer.");
        if (n < 0) throw new Error("randomTurtles: number of turtles requested, " + n + ", was less be greater than zero.");

        if (n > numTurtles) n = numTurtles;
        return api.choose(n, numTurtles);
      },

      /**
        Accepts turtle indices as arguments, or an array containing turtle indices.
        Unmarks all turtles, then marks the requested turtle indices.
        Repaints the screen to make the marks visible.
      */
      markTurtles: function markTurtles() {
        var i,
            len;

        if (arguments.length === 0) return;

        // allow passing an array instead of a list of turtle indices
        if (api.isArray(arguments[0])) {
          return markTurtles.apply(null, arguments[0]);
        }

        api.unmarkAllTurtles();

        // mark the requested turtles
        for (i = 0, len = arguments.length; i < len; i++) {
          model.setTurtleProperties(arguments[i], {marked: 1});
        }
        api.repaint();
      },

      unmarkAllTurtles: function unmarkAllTurtles() {
        for (var i = 0, len = model.get_num_turtles(); i < len; i++) {
          model.setTurtleProperties(i, {marked: 0});
        }
        api.repaint();
      },

      /**
        Sets individual turtle properties using human-readable hash.
        e.g. setTurtleProperties(5, {x: 1, y: 0.5, charge: 1})
      */
      setTurtleProperties: function setTurtleProperties(i, props, checkLocation, moveMolecule, options) {
        model.setTurtleProperties(i, props, checkLocation, moveMolecule);
        if (!(options && options.supressRepaint)) {
          api.repaint();
        }
      },

      /**
        Returns turtle properties as a human-readable hash.
        e.g. getTurtleProperties(5) --> {x: 1, y: 0.5, charge: 1, ... }
      */
      getTurtleProperties: function getTurtleProperties(i) {
        return model.getTurtleProperties(i);
      },

      addTextBox: function(props) {
        model.addTextBox(props);
      },

      removeTextBox: function(i) {
        model.removeTextBox(i);
      },

      setTextBoxProperties: function(i, props) {
        model.setTextBoxProperties(i, props);
      }

    };

  };
});

/*global define model */

define(function (require) {

  /**
    Define the model-specific SolarSystem scripting API used by 'action' scripts on interactive elements.

    The universal Interactive scripting API is extended with the properties of the
    object below which will be exposed to the interactive's 'action' scripts as if
    they were local vars. All other names (including all globals, but excluding
    Javascript builtins) will be unavailable in the script context; and scripts
    are run in strict mode so they don't accidentally expose or read globals.

    @param: api
  */

  return function SolarSystemScriptingAPI (api) {

    return {
      /* Returns number of planets in the system. */
      getNumberOfPlanets: function getNumberOfPlanets() {
        return model.get_num_planets();
      },

      addPlanet: function addPlanet(props, options) {
        if (options && options.supressRepaint) {
          // Translate supressRepaint option to
          // option understable by modeler.
          // supresRepaint is a conveniance option for
          // Scripting API users.
          options.supressEvent = true;
        }
        return model.addPlanet(props, options);
      },

      /*
        Removes planet 'i'.
      */
      removePlanet: function removePlanet(i, options) {
        if (options && options.supressRepaint) {
          // Translate supressRepaint option to
          // option understable by modeler.
          // supresRepaint is a conveniance option for
          // Scripting API users.
          options.supressEvent = true;
          delete options.supressRepaint;
        }
        try {
          model.removePlanet(i, options);
        } catch (e) {
          if (!options || !options.silent)
            throw e;
        }
      },

      addRandomPlanet: function addRandomPlanet() {
        return model.addRandomPlanet.apply(model, arguments);
      },

      /** returns a list of integers corresponding to planets in the system */
      randomPlanets: function randomPlanets(n) {
        var numPlanets = model.get_num_planets();

        if (n === null) n = 1 + api.randomInteger(numPlanets-1);

        if (!api.isInteger(n)) throw new Error("randomPlanets: number of planets requested, " + n + ", is not an integer.");
        if (n < 0) throw new Error("randomPlanets: number of planets requested, " + n + ", was less be greater than zero.");

        if (n > numPlanets) n = numPlanets;
        return api.choose(n, numPlanets);
      },

      /**
        Accepts planet indices as arguments, or an array containing planet indices.
        Unmarks all planets, then marks the requested planet indices.
        Repaints the screen to make the marks visible.
      */
      markPlanets: function markPlanets() {
        var i,
            len;

        if (arguments.length === 0) return;

        // allow passing an array instead of a list of planet indices
        if (api.isArray(arguments[0])) {
          return markPlanets.apply(null, arguments[0]);
        }

        api.unmarkAllPlanets();

        // mark the requested planets
        for (i = 0, len = arguments.length; i < len; i++) {
          model.setPlanetProperties(arguments[i], {marked: 1});
        }
        api.repaint();
      },

      unmarkAllPlanets: function unmarkAllPlanets() {
        for (var i = 0, len = model.get_num_planets(); i < len; i++) {
          model.setPlanetProperties(i, {marked: 0});
        }
        api.repaint();
      },

      /**
        Sets individual planet properties using human-readable hash.
        e.g. setPlanetProperties(5, {x: 1, y: 0.5, charge: 1})
      */
      setPlanetProperties: function setPlanetProperties(i, props, checkLocation, moveMolecule, options) {
        model.setPlanetProperties(i, props, checkLocation, moveMolecule);
        if (!(options && options.supressRepaint)) {
          api.repaint();
        }
      },

      /**
        Returns planet properties as a human-readable hash.
        e.g. getPlanetProperties(5) --> {x: 1, y: 0.5, charge: 1, ... }
      */
      getPlanetProperties: function getPlanetProperties(i) {
        return model.getPlanetProperties(i);
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

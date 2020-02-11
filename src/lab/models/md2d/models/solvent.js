/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(function(require) {

  let Solvent;
  const TYPES = {
    vacuum: {
      forceType: 0,
      dielectricConstant: 1,
      color: "#eee"
    },
    oil: {
      forceType: -1,
      dielectricConstant: 10,
      color: "#f5f1dd"
    },
    water: {
      forceType: 1,
      dielectricConstant: 80,
      color: "#B8EBF0"
    }
  };

  /*
  Simple class representing a solvent.
  */
  return Solvent = class Solvent {

    /*
    Constructs a new Solvent.
    @type is expected to be 'oil', 'water' or 'vacuum' string.
    */
    constructor(type) {
      this.type = type;
      const propsHash = TYPES[this.type];
      if ((propsHash == null)) {
        throw new Error("Solvent: unknown type. Use 'vacuum', 'oil' or 'water'.");
      }

      // Copy solvent properties.
      for (let property in propsHash) {
        const value = propsHash[property];
        this[property] = value;
      }
    }
  };
});

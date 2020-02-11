/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
/*
Custom pairwise Lennard Jones properties.
*/
define(function(require) {

  let PairwiseLJProperties;
  const metadata  = require('models/md2d/models/metadata');
  const validator = require("common/validator");

  return PairwiseLJProperties = class PairwiseLJProperties {

    constructor(engine) {
      this._engine = engine;
      this._data = {};
    }

    registerChangeHooks(changePreHook, changePostHook) {
      this._changePreHook = changePreHook;
      return this._changePostHook = changePostHook;
    }

    set(i, j, props) {
      props = validator.validate(metadata.pairwiseLJProperties, props);

      this._changePreHook();

      if ((this._data[i] == null)) { this._data[i] = {}; }
      if ((this._data[j] == null)) { this._data[j] = {}; }
      if ((this._data[i][j] == null)) { this._data[i][j] = (this._data[j][i] = {}); }

      for (let key of Object.keys(props || {})) {
        this._data[i][j][key] = props[key];
      }

      this._engine.setPairwiseLJProperties(i, j);

      return this._changePostHook();
    }

    remove(i, j) {
      this._changePreHook();

      delete this._data[i][j];
      delete this._data[j][i];

      this._engine.setPairwiseLJProperties(i, j);

      return this._changePostHook();
    }

    get(i, j) {
      if (this._data[i] && this._data[i][j]) { return this._data[i][j]; } else { return undefined; }
    }

    deserialize(array) {
      for (let props of array) {
        props = validator.validateCompleteness(metadata.pairwiseLJProperties, props);
        // Save element indices and delete them from properties object. It makes no
        // sense to store this information, as it's redundant.
        const el1 = props.element1;
        const el2 = props.element2;
        delete props.element1;
        delete props.element2;
        this.set(el1, el2, props);
      }

      // Avoid an unwanted comprehension.
    }

    serialize() {
      const result = [];
      for (let key1 of Object.keys(this._data || {})) {
        const innerObj = this._data[key1];
        for (let key2 of Object.keys(innerObj || {})) {
          if (key1 < key2) {
            const props = this.get(key1, key2);
            props.element1 = Number(key1);
            props.element2 = Number(key2);
            result.push(props);
          }
        }
      }

      return result;
    }

    /*
    Clone-Restore Interface.
    */
    clone() {
      // Use jQuery extend and return a copy.
      return $.extend(true, {}, this._data);
    }

    restore(state) {
      // Just overwrite @_data variable.
      this._data = state;

      // Enforce update of engine properties.
      for (let key1 of Object.keys(this._data || {})) {
        const innerObj = this._data[key1];
        for (let key2 of Object.keys(innerObj || {})) {
          if (key1 < key2) { this._engine.setPairwiseLJProperties(key1, key2); }
        }
      }

      // Avoid an unwanted comprehension.
    }
  };
});

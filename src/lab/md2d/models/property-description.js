/*global define d3 */
/*jshint eqnull:true boss:true */

define(function(require) {

  var _ = require('underscore');

  function isUndefined(val) {
    return typeof val === 'undefined';
  }

  function PropertyDescription(unitDefinition, descriptionHash) {
    var u;

    this._descriptionHash = descriptionHash;
    this._label = descriptionHash.label || "";

    if (descriptionHash.unitType) {
      if ( !(u = unitDefinition.units[descriptionHash.unitType]) ) {
        throw new Error("PropertyDescription: couldn't find unitType " + descriptionHash.unitType + " in the supplied units definition.");
      }
      this._unitType         = descriptionHash.unitType;
      this._unitName         = u.name;
      this._unitPluralName   = u.pluralName;
      this._unitAbbreviation = u.abbreviation;
    }

    // allow overriding the unit properties, or specifying custom ones for which there is no
    // current unit definition.
    if (descriptionHash.unitName) this._unitName = descriptionHash.unitName;
    if (descriptionHash.unitPluralName) this._unitPluralName = descriptionHash.unitPluralName;
    if (descriptionHash.unitAbbreviation) this._unitAbbreviation = descriptionHash.unitAbbreviation;

    this.setFormat(descriptionHash.format || 'g');
  }

  PropertyDescription.prototype.getHash = function() {
    return _.extend(
      _.reject({
          unitName:         this.getUnitName(),
          unitPluralName:   this.getUnitPluralName(),
          unitAbbreviation: this.getUnitAbbreviation()
        }, isUndefined),
      this._descriptionHash);
  };

  PropertyDescription.prototype.getLabel = function() {
    return this._label;
  };

  PropertyDescription.prototype.getUnitType = function() {
    return this._unitType;
  };

  PropertyDescription.prototype.getUnitName = function() {
    return this._unitName;
  };

  PropertyDescription.prototype.getUnitPluralName = function() {
    return this._unitPluralName;
  };

  PropertyDescription.prototype.getUnitAbbreviation = function() {
    return this._unitAbbreviation;
  };

  PropertyDescription.prototype.setFormat = function(s) {
    this._formatter = d3.format(s);
  };

  PropertyDescription.prototype.format = function(val, opts) {
    opts = opts || {};

    var formatter,
        formattedVal,
        plural,
        abbreviated = true;

    if (opts.format) {
      if (opts.format === this._lastFormat) {
        formatter = this._lastFormatter;
      } else {
        formatter = d3.format(opts.format);
        this._lastFormat = opts.format;
        this._lastFormatter = formatter;
      }
    } else {
      formatter = this._formatter;
    }

    formattedVal = formatter(val);

    if (opts && opts.abbreviated != null) abbreviated = opts.abbreviated;

    if (abbreviated) {
      return formattedVal + " " + this._unitAbbreviation;
    }

    plural = parseFloat(formattedVal) !== 1;
    return formattedVal + " " + (plural ? this._unitPluralName : this._unitName);
  };

  return PropertyDescription;
});

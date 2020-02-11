/*global define */

import $__common_inherit from "common/inherit";
import $__common_models_property_transition from "common/models/property-transition";

var inherit = $__common_inherit,
  PropertyTransition = $__common_models_property_transition;

function AtomTransition(model) {
  // Call super constructor.
  PropertyTransition.call(this);
  this._model = model;
}
inherit(AtomTransition, PropertyTransition);


AtomTransition.prototype.setObjectProperties = function(id, props) {
  this._model.setAtomProperties(id, props);
};

AtomTransition.prototype.getObjectProperties = function(id) {
  return this._model.getAtomProperties(id);
};

export default AtomTransition;

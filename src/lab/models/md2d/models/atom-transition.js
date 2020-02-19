
import inherit from "common/inherit";
import PropertyTransition from "common/models/property-transition";


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

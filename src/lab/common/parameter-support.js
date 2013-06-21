/*global define: false */

define(function (require) {

  var PropertyDescription  = require('common/property-description');

  return function ParameterSupport(args) {
    var propertySupport = args.propertySupport,
        unitsDefinition = args.unitsDefinition || {};

    return {
      mixInto: function(target) {

        /**
          Define a property of the model to be treated as a custom parameter. Custom parameters are
          (generally, user-defined) read/write properties that trigger a setter action when set, and
          whose values are automatically persisted in the tick history.

          Because custom parameters are not intended to be interpreted by the engine, but instead simply
          *represent* states of the model that are otherwise fully specified by the engine state and
          other properties of the model, and because the setter function might not limit itself to a
          purely functional mapping from parameter value to model properties, but might perform any
          arbitrary stateful change, (stopping the model, etc.), the setter is NOT called when custom
          parameters are updated by the tick history.
        */
        target.defineParameter = function(key, descriptionHash, setter) {
          var descriptor = {
                type: 'parameter',
                includeInHistoryState: true,
                invokeSetterAfterBulkRestore: false,
                description: new PropertyDescription(unitsDefinition, descriptionHash),
                beforeSetCallback: propertySupport.invalidatingChangePreHook,
                afterSetCallback: propertySupport.invalidatingChangePostHook
              };

          // In practice, some parameters are meant only to be observed, and have no setter
          if (setter) {
            descriptor.set = function(value) {
              setter.call(target, value);
            };
          }
          propertySupport.defineProperty(key, descriptor);
        };
      }
    };
  };
});

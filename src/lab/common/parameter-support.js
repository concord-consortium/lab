/*global define: false */

define(function (require) {

  var PropertyDescription  = require('common/property-description');

  return function ParameterSupport(propertySupport, unitsDefinition) {
    unitsDefinition = unitsDefinition || {};

    return {
      mixInto: function(target) {

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

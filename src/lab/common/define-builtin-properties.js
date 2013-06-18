/*global define: false */

define(function (require) {

  var validator            = require('common/validator'),
      PropertyDescription  = require('common/property-description');

  return function defineBuiltinProperties(propertySupport, unitsDefinition, metadata, customSetters) {
    customSetters = customSetters || {}; // optional

    function defineBuiltinProperty(key, type, setter) {
      var metadataForType,
          descriptor,
          propertyChangeInvalidates,
          unitType;

      if (type === 'mainProperty') {
        metadataForType = metadata.mainProperties;
      } else if (type === 'viewOption') {
        metadataForType = metadata.viewOptions;
      } else {
        throw new Error(type + " is not a supported built-in property type");
      }

      propertyChangeInvalidates = validator.propertyChangeInvalidates(metadataForType[key]);

      descriptor = {
        type: type,
        writable: validator.propertyIsWritable(metadataForType[key]),
        set: setter,
        includeInHistoryState: !!metadataForType[key].storeInTickHistory,
        validate: function(value) {
          return validator.validateSingleProperty(metadataForType[key], key, value, false);
        },
        beforeSetCallback: propertyChangeInvalidates ? propertySupport.invalidatingChangePreHook : undefined,
        afterSetCallback: propertyChangeInvalidates ? propertySupport.invalidatingChangePostHook : undefined
      };

      unitType = metadataForType[key].unitType;
      if (unitType) {
        descriptor.description = new PropertyDescription(unitsDefinition, { unitType: unitType });
      }

      propertySupport.defineProperty(key, descriptor);
    }

    // Define built-in properties using provided metadata.
    Object.keys(metadata.mainProperties).forEach(function (key) {
      defineBuiltinProperty(key, 'mainProperty', customSetters[key]);
    });
    Object.keys(metadata.viewOptions).forEach(function (key) {
      defineBuiltinProperty(key, 'viewOption', customSetters[key]);
    });
  };
});

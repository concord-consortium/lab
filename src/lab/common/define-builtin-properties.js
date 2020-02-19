
import validator from 'common/validator';
import PropertyDescription from 'common/property-description';


export default function defineBuiltinProperties(args) {
  var propertySupport = args.propertySupport,
    metadata = args.metadata,
    // Optional:
    unitsDefinition = args.unitsDefinition || {},
    unitsTranslation = args.unitsTranslation || null,
    setters = args.setters || {},
    initialProperties = args.initialProperties || null;

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
    descriptor.description = new PropertyDescription(unitsDefinition, {
      unitType: unitType,
      label: metadataForType[key].label || key
    });

    if (unitType && unitsTranslation) {
      descriptor.beforeSetTransform = function(value) {
        return unitsTranslation.translateToModelUnits(value, unitType);
      };
      descriptor.afterGetTransform = function(value) {
        return unitsTranslation.translateFromModelUnits(value, unitType);
      };
    }

    propertySupport.defineProperty(key, descriptor);
  }

  (function() {
    var mainProperties,
      viewOptions;

    // Define built-in properties using provided metadata.
    Object.keys(metadata.mainProperties).forEach(function(key) {
      defineBuiltinProperty(key, 'mainProperty', setters[key]);
    });
    Object.keys(metadata.viewOptions).forEach(function(key) {
      defineBuiltinProperty(key, 'viewOption', setters[key]);
    });

    if (initialProperties) {
      mainProperties = validator.validateCompleteness(metadata.mainProperties, initialProperties);
      propertySupport.setRawValues(mainProperties);

      viewOptions = validator.validateCompleteness(metadata.viewOptions, initialProperties.viewOptions || {});
      propertySupport.setRawValues(viewOptions);
    }
  }());
};

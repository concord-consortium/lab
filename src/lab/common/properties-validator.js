/*global define: false */

// TODO: prepare extensive unit tests of this toolkit!

// For now, only defaultValue and readOnly properties of meta description
// are supported.
define(function() {

  return function PropertiesValidator(metaModel) {
    return {

      // Basic validation.
      // Check if provided 'input' hash doesn't try
      // to overwrite properties which are marked as
      // read-only.
      // Don't take into account 'defaultValue' as
      // 'input' hash is allowed to be incomplete.
      // It should be used *only* for update of an object.
      // While creating new object, use validateCompleteness() instead!
      validate: function (type, input) {
        var typeMetaData = metaModel[type],
            result = {},
            prop, propMetaData;

        for (prop in input) {
          if (input.hasOwnProperty(prop)) {
            // Try to get meta-data for this property.
            propMetaData = typeMetaData[prop];
            // Continue only if the property is listed in meta-data.
            if (propMetaData !== undefined) {
              // Check if this is readOnly property.
              if (propMetaData.readOnly === true) {
                throw new Error("Definition of " + type + " tries to overwrite read-only property " + prop);
              }
              result[prop] = input[prop];
            }
          }
        }
        return result;
      },

      // Complete validation.
      // Assume that provided 'input' hash is used for creation of new
      // object. Start with checking if all required values are provided,
      // and using default values if they are provided.
      // Later perform basic validation.
      validateCompleteness: function (type, input) {
        var typeMetaData = metaModel[type],
            result = {},
            prop, propMetaData;

        for (prop in typeMetaData) {
          if (typeMetaData.hasOwnProperty(prop)) {
            propMetaData = typeMetaData[prop];

            if (input[prop] === undefined) {
              // Value is not declared in the input data.
              if (propMetaData.defaultValue !== undefined) {
                // Use defaultValue if defined.
                result[prop] = propMetaData.defaultValue;
              } else {
                throw new Error("Definition of " + type + " is missing required property " + prop);
              }
            } else {
              result[prop] = input[prop];
            }
          }
        }

        // Perform standard check like for hash meant to update object.
        return this.validateUpdateHash(type, result);
      }
    };
  };
});

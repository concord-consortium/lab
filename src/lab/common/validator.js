/*global define: false */

// For now, only defaultValue, readOnly and immutable
// meta-properties are supported.
define(function() {

  return {

    // Basic validation.
    // Check if provided 'input' hash doesn't try to overwrite properties
    // which are marked as read-only or immutable. Don't take into account
    // 'defaultValue' as the 'input' hash is allowed to be incomplete.
    // It should be used *only* for update of an object.
    // While creating new object, use validateCompleteness() instead!
    validate: function (metadata, input, ignoreImmutable) {
      var result = {},
          prop, propMetadata;

      if (arguments.length < 2) {
        throw new Error("Incorrect usage. Provide metadata and hash which should be validated.");
      }

      for (prop in input) {
        if (input.hasOwnProperty(prop)) {
          // Try to get meta-data for this property.
          propMetadata = metadata[prop];
          // Continue only if the property is listed in meta-data.
          if (propMetadata !== undefined) {
            // Check if this is readOnly property.
            if (propMetadata.readOnly === true) {
              throw new Error("Properties set tries to overwrite read-only property " + prop);
            }
            if (!ignoreImmutable && propMetadata.immutable === true) {
              throw new Error("Properties set tries to overwrite immutable property " + prop);
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
    validateCompleteness: function (metadata, input) {
      var result = {},
          prop, propMetadata;

      if (arguments.length < 2) {
        throw new Error("Incorrect usage. Provide metadata and hash which should be validated.");
      }

      for (prop in metadata) {
        if (metadata.hasOwnProperty(prop)) {
          propMetadata = metadata[prop];

          if (input[prop] === undefined || input[prop] === null) {
            // Value is not declared in the input data.
            if (propMetadata.required === true) {
              throw new Error("Properties set is missing required property " + prop);
            }
            else if (propMetadata.defaultValue !== undefined) {
              // Use defaultValue if defined.
              result[prop] = propMetadata.defaultValue;
            }
          } else {
            result[prop] = input[prop];
          }
        }
      }

      // Perform standard check like for hash meant to update object.
      // However, ignore immutable check, as these properties are supposed
      // to create a new object.
      return this.validate(metadata, result, true);
    }
  };
});

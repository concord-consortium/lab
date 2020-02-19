
// For now, only defaultValue, readOnly and immutable
// meta-properties are supported.
import arrays from 'arrays';


// Create a new object, that prototypically inherits from the Error constructor.
// It provides a direct information which property of the input caused an error.
function ValidationError(prop, message) {
  this.prop = prop;
  this.message = message;
}
ValidationError.prototype = new Error();
ValidationError.prototype.constructor = ValidationError;

function isObject(prop) {
  // Note that typeof null is also equal to "object", so we have to check it.
  return prop !== null && typeof prop === "object";
}

function checkConflicts(input, propName, conflictingProps) {
  var i, len;
  for (i = 0, len = conflictingProps.length; i < len; i++) {
    if (input.hasOwnProperty(conflictingProps[i])) {
      throw new ValidationError(propName, "Properties set contains conflicting properties: " +
        conflictingProps[i] + " and " + propName);
    }
  }
}

function validateSingleProperty(propertyMetadata, prop, value, ignoreImmutable) {
  if (propertyMetadata.readOnly) {
    throw new ValidationError(prop, "Properties set tries to overwrite read-only property " + prop);
  }
  if (!ignoreImmutable && propertyMetadata.immutable) {
    throw new ValidationError(prop, "Properties set tries to overwrite immutable property " + prop);
  }
  // Use custom validate function defined in metadata if provided.
  return propertyMetadata.validate ? propertyMetadata.validate(value) : value;
}

export default {

  // Basic validation.
  // Check if provided 'input' hash doesn't try to overwrite properties
  // which are marked as read-only or immutable. Don't take into account
  // 'defaultValue' as the 'input' hash is allowed to be incomplete.
  // It should be used *only* for update of an object.
  // While creating new object, use validateCompleteness() instead!
  validate: function(metadata, input, ignoreImmutable) {
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
        if (typeof propMetadata !== "undefined") {
          input[prop] = validateSingleProperty(propMetadata, prop, input[prop], ignoreImmutable);
          if (propMetadata.conflictsWith) {
            checkConflicts(input, prop, propMetadata.conflictsWith);
          }
          result[prop] = input[prop];
        }
      }
    }
    return result;
  },

  validateSingleProperty: validateSingleProperty,

  propertyIsWritable: function(propertyMetadata) {
    // Note that immutable properties are writable, they just have to be
    return !propertyMetadata.readOnly;
  },

  propertyChangeInvalidates: function(propertyMetadata) {
    // Default to true for safety.
    if (typeof propertyMetadata.propertyChangeInvalidates === "undefined") {
      return true;
    }
    return !!propertyMetadata.propertyChangeInvalidates;
  },

  // Complete validation.
  // Assume that provided 'input' hash is used for creation of new
  // object. Start with checking if all required values are provided,
  // and using default values if they are provided.
  // Later perform basic validation.
  validateCompleteness: function(metadata, input, opts) {
    var result = {},
      includeOnlySerializedProperties = opts && opts.includeOnlySerializedProperties,
      prop, propMetadata, defVal;

    if (arguments.length < 2) {
      throw new Error("Incorrect usage. Provide metadata and hash which should be validated.");
    }

    for (prop in metadata) {
      if (metadata.hasOwnProperty(prop)) {
        propMetadata = metadata[prop];
        // require explicit check for serialize === false, because the default value is true.
        if (includeOnlySerializedProperties && propMetadata.serialize === false) {
          continue;
        }

        defVal = propMetadata.defaultValue;

        if (typeof input[prop] === "undefined") {
          // Value is not declared in the input data.
          if (propMetadata.required === true) {
            throw new ValidationError(prop, "Properties set is missing required property " + prop);
          } else if (arrays.isArray(defVal)) {
            // Copy an array defined as a default value.
            // Do not use instance defined in metadata.
            result[prop] = arrays.copy(defVal, []);
          } else if (isObject(defVal)) {
            // Copy an object defined as a default value. Do not use instance defined in metadata.
            result[prop] = $.extend(true, {}, defVal);
          } else if (typeof defVal !== "undefined") {
            // If it's basic type, just set value.
            result[prop] = defVal;
          }
        } else if (!arrays.isArray(input[prop]) && isObject(input[prop]) && isObject(defVal)) {
          // Note that typeof [] is also "object" - that is the reason of the isArray() check.
          result[prop] = $.extend(true, {}, defVal, input[prop]);
        } else if (arrays.isArray(input[prop])) {
          // Deep copy of an array.
          result[prop] = $.extend(true, [], input[prop]);
        } else {
          // Basic type like number, so '=' is enough.
          result[prop] = input[prop];
        }
      }
    }

    // Perform standard check like for hash meant to update object.
    // However, ignore immutable check, as these properties are supposed
    // to create a new object.
    return this.validate(metadata, result, true);
  },

  // Expose ValidationError. It can be useful for the custom validation routines.
  ValidationError: ValidationError
};

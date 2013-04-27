/*global define: false */

define(function() {

  function validateIsType(type, propertyKey, value) {
    // This is sufficient for functions and strings, which is all we test for.
    if (typeof value !== type) {
      throw new TypeError(propertyKey + " must be a " + type + ".");
    }
  }

  function copy(a) {
    var ret = [];
    a.forEach(function(item) {
      ret.push(item);
    });
    return ret;
  }

  var descriptorProperties = {
    get: {
      defaultValue: undefined,
      type: 'function'
    },

    set: {
      defaultValue: undefined,
      type: 'function'
    },

    validate: {
      defaultValue: undefined,
      type: 'function'
    },

    afterGetTransform: {
      defaultValue: undefined,
      type: 'function'
    },

    beforeSetTransform: {
      defaultValue: undefined,
      type: 'function'
    },

    writable: {
      defaultValue: true,
      type: 'boolean'
    },

    includeInHistoryState: {
      defaultValue: false,
      type: 'boolean'
    },

    invokeSetterAfterBulkRestore: {
      defaultValue: true,
      type: 'boolean'
    },

    type: {
      defaultValue: undefined,
      type: 'propertyType'
    },

    description: {
      defaultValue: undefined
    }
  };

  return function PropertySupport(args) {

    var propertyTypes = args && args.types && copy(args.types) || [],
        propertyInformation = {},
        cachedPropertiesObjects = {
          all: undefined,
          byType: {}
        },
        cachingIsEnabled = true,
        changedPropertyKeys = [],
        notificationsAreBatched = false;

    function computedPropertyKeys() {
      return Object.keys(propertyInformation).filter(function(key) {
        return propertyInformation[key].descriptor.get !== undefined;
      });
    }

    function observedComputedPropertyKeys() {
      return computedPropertyKeys().filter(function(key) {
        return propertyInformation[key].observers.length > 0;
      });
    }

    function historyStatePropertyKeys() {
      return Object.keys(propertyInformation).filter(function(key) {
        return propertyInformation[key].descriptor.includeInHistoryState;
      });
    }

    function validateIsPropertyType(value) {
      if (propertyTypes.indexOf(value) < 0) {
        throw new TypeError(value + " is not a recognized property type.");
      }
    }

    // Copy the properties described in descriptorProperties from 'descriptor' to return value;
    // validate each value of descriptor according to descriptorProperties[key].type and,
    // if no value is supplied for a given key in 'descriptor' use the default value specified
    // in descriptorProperties[key].default
    function validateDescriptor(descriptor) {
      var ret = {};

      Object.keys(descriptorProperties).forEach(function(key) {
        var descriptorProperty = descriptorProperties[key];

        if (descriptor[key] !== undefined) {
          ret[key] = descriptor[key];
          switch (descriptorProperty.type) {
            case 'boolean':
              ret[key] = !!ret[key];
              break;
            case 'function':
              validateIsType('function', key, descriptor[key]);
              break;
            case 'string':
              validateIsType('string', key, descriptor[key]);
              break;
            case 'propertyType':
              validateIsPropertyType(descriptor[key]);
              break;
          }
        } else {
          ret[key] = descriptorProperty.defaultValue;
        }
      });

      return ret;
    }

    function notifyCallbacksOnce(callbacks) {
      var called = [];
      callbacks.forEach(function(callback) {
        // TODO: explore ES6 Map/WeakMap shim that would allow this check to happen in O(1)
        if (called.indexOf(callback) < 0) {
          callback();
          called.push(callback);
        }
      });
    }

    function withBatchedNotifications(closure) {
      var callbacks = [];

      notificationsAreBatched = true;
      closure();
      notificationsAreBatched = false;

      changedPropertyKeys.forEach(function(key) {
        propertyInformation[key].observers.forEach(function(callback) {
          callbacks.push(callback);
        });
      });
      changedPropertyKeys = [];
      notifyCallbacksOnce(callbacks);
    }

    function notify(key) {
      if (notificationsAreBatched) {
        changedPropertyKeys.push(key);
      } else {
        notifyCallbacksOnce(propertyInformation[key].observers);
      }
    }

    function get(key) {
      var info = propertyInformation[key];

      if (!info.descriptor.get) {
        return info.cachedValue;
      }

      if (cachingIsEnabled) {
        if (!info.hasCachedValue) {
          info.hasCachedValue = true;
          info.cachedValue = info.descriptor.get();
        }
        return info.cachedValue;
      }
      return info.descriptor.get();
    }

    function set(key, value) {
      var info = propertyInformation[key];

      if (!info.descriptor.writable) {
        throw new Error("Attempt to set read-only property " + key);
      }

      if (info.descriptor.get && !cachingIsEnabled) {
        info.hasCachedValue = false;
      } else {
        info.hasCachedValue = true;
        info.cachedValue = value;
      }
    }

    function invalidateCachedPropertiesObjects(type) {
      cachedPropertiesObjects.all = undefined;
      if (type) {
        cachedPropertiesObjects.byType[type] = undefined;
      }
    }

    function constructProperty(object, key) {
      var info = propertyInformation[key];

      Object.defineProperty(object, key, {
        enumerable:   true,
        configurable: false,
        get: function() {
          var value = get(key);
          if (info.descriptor.afterGetTransform) {
            value = info.descriptor.afterGetTransform(value);
          }
          return value;
        },
        set: function(value) {
          if (info.descriptor.beforeSetTransform) {
            value = info.descriptor.beforeSetTransform(value);
          }
          if (info.descriptor.validate) {
            info.descriptor.validate(value);
          }
          set(key, value);
          notify(key);

          if (info.descriptor.set) {
            info.descriptor.set(value);
          }
        }
      });
    }

    function getPropertiesObject(type) {
      var object = type ? cachedPropertiesObjects.byType[type] : cachedPropertiesObjects.all;

      if (!object) {
        object = {};
        Object.keys(propertyInformation).forEach(function(key) {
          if (!type || type === propertyInformation[key].descriptor.type) {
            constructProperty(object, key);
          }
        });
        Object.freeze(object);

        if (type) {
          cachedPropertiesObjects.byType[type] = object;
        } else {
          cachedPropertiesObjects.all = object;
        }
      }
      return object;
    }

    return {
      mixInto: function(target) {

        Object.defineProperty(target, 'properties', {
          configurable: false,
          enumerable: true,
          get: function() {
            return getPropertiesObject();
          }
        });

        target.propertiesOfType = function(type) {
          return getPropertiesObject(type);
        };

        target.set = function(key, value) {
          var hash;
          if (typeof key === 'string') {
            target.properties[key] = value;
          } else {
            hash = key;
            withBatchedNotifications(function() {
              Object.keys(hash).forEach(function(key) {
                target.properties[key] = hash[key];
              });
            });
          }
        };

        target.get = function(key) {
          return target.properties[key];
        };

        target.addObserver = function(key, callback) {
          var observers = propertyInformation[key].observers;
          if (observers.indexOf(callback) < 0) {
            observers.push(callback);
          }
        };

        target.removeObserver = function(key, callback) {
          var observers = propertyInformation[key].observers,
              index = observers.indexOf(callback);

          if (index > 0) {
            observers.splice(index, 1);
          }
        };

        target.getPropertyDescription = function(key) {
          return propertyInformation[key].descriptor.description;
        };

        target.getPropertyType = function(key) {
          return propertyInformation[key].descriptor.type;
        };
      },

      defineProperty: function(key, descriptor) {
        descriptor = validateDescriptor(descriptor);

        propertyInformation[key] = {
          descriptor: descriptor,
          observers: [],
          hasCachedValue: false,
          cachedValue: undefined,
          previousValue: undefined
        };

        invalidateCachedPropertiesObjects(descriptor.type);
      },

      deleteComputedPropertyCachedValues: function() {
        computedPropertyKeys().forEach(function(key) {
          propertyInformation[key].hasCachedValue = false;
          propertyInformation[key].cachedValue = undefined;
        });
      },

      storeComputedProperties: function() {
        observedComputedPropertyKeys().forEach(function(key) {
          propertyInformation[key].previousValue = get(key);
        });
      },

      notifyAllChangedComputedProperties: function() {
        withBatchedNotifications(function() {
          observedComputedPropertyKeys().forEach(function(key) {
            if (get(key) !== propertyInformation[key].previousValue) {
              notify(key);
            }
            propertyInformation[key].previousValue = undefined;
          });
        });
      },

      notifyAllComputedProperties: function() {
        withBatchedNotifications(function() {
          observedComputedPropertyKeys().forEach(function(key) {
            notify(key);
          });
        });
      },

      get properties() {
        return getPropertiesObject();
      },

      propertiesHavingType: function(type) {
        return getPropertiesObject(type);
      },

      get enableCaching() {
        return cachingIsEnabled;
      },

      set enableCaching(value) {
        cachingIsEnabled = !!value;
      },

      get historyStateRawValues() {
        var ret = {};
        historyStatePropertyKeys().forEach(function(key) {
          ret[key] = get(key);
        });
        return ret;
      },

      get rawValues() {
        var ret = {};
        Object.keys(propertyInformation).forEach(function(key) {
          ret[key] = get(key);
        });
        return ret;
      },

      setRawValues: function(values) {
        withBatchedNotifications(function() {
          Object.keys(values).forEach(function(key) {
            var info = propertyInformation[key];
            if (!info) {
              return;
            }
            // During bulk state restoration, only actually changed values should trigger observers!
            if (get(key) !== values[key]) {
              notify(key);
            }
            set(key, values[key]);
            if (info.invokeSetterAfterBulkRestore && info.descriptor.set) {
              info.descriptor.set(get(key));
            }
          });
        });
      }
    };
  };
});

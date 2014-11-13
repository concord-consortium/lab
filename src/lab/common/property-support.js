/*global define: false, d3: false */
/**

  This module provides support which Lab model types can use to implement observable properties that
  have custom getters, setters, and validation. It is specialized for the needs of interactive,
  computationally intensive simulations which want to enable UI bindings to simulation-state
  variables that evolve in time and change at potentially every clock tick.

  For example, if the model object using PropertySupport is 'model':

    > model.addObserver('kineticEnergy', function() { console.log(model.properties.kineticEnergy); })
    > model.start()
    3.10225948103683
    3.102259509874652
    3.1022595094558194
    ...
    > model.addObserver('property', function() { console.log('property changed!'); })
    > model.properties.property = 1
    property changed!
    > model.properties.property
    1

  Or, using the "legacy" interface:

    > model.addObserver('kineticEnergy', function() { console.log(model.get('kineticEnergy'); })
    > model.start()
    3.10225948103683
    3.102259509874652
    3.1022595094558194
    ...
    > model.addObserver('property', function() { console.log('property changed!'); })
    > model.set('property', 1)
    property changed!
    > model.get('property')
    1

  The design of this module differs in several ways than the property support implemented by general
  web MVC frameworks such as Backbone, Ember, and Angular.

  First, we assume that the properties module is used to enable UI binding and state saving for a
  simulation engine which has its own internal data structures and which executes many iterations of
  its inner loop between each screen refresh. As a result, we must assume that any computed property
  can change between "clock ticks" and that most computed properties are not simple functions of
  the value of other properties. Therefore we provide mechanisms that must be explicitly invoked by
  the model to synchronize the engine's internal state to the exposed property values when the
  engine considers it appropriate to do so.

  Second, we assume that the most properties are numbers that represent physical quantities that
  either parameterize the simulation or are computed by it.

  Third, we assume that, the simulation may need to save and restore the values of a subset of
  properties outside the usual setter/getter cycle. Specifically, we allow the simulation to define
  two subsets of properties: one that represents the entire set of properties required to restore
  the state of the model, for use when saving the model to storage; and a smaller subset of
  properties that represent the time-varying state of the model, for use when rewinding or fast-
  forwarding the model while it retains the remainder of its state in memory.

*/
define(function() {

  // If at all possible, avoid adding dependencies to this module.

  // These are the properties that can be passed as the 'descriptor' argument to defineProperty.
  var descriptorProperties = {

    /**
      A getter function that will be executed whenever the value of this property is read.

      Use this, for example, to make a property reflect internal state of the simulation.

      The property will be considered a "computed property" if and only if it has a getter. The
      return value of the getter is considered the "raw" property value and will be passed through
      the afterGetTransform, if one is defined, to generate the final value of the property.

      The (untransformed) raw getter value will be cached unless the enableCaching property of the
      propertySupport object is false. The cache can be cleared by calling the
      deleteComputedPropertyCachedValues method of the propertySupport object. The caching normally
      occurs lazily, but paired calls to the storeComputedProperties and
      notifyChangedComputedProperties methods of the propertySupport object cause all properties
      with getters to be computed and then recomputed, triggering notification of the observers of
      properties whose value changed between the calls.

      Optional.
    */
    get: {
      defaultValue: undefined,
      type: 'function'
    },

    /**
      A setter function that will be executed when the value of this property is assigned.

      Use this, for example, to modify simulation state when the property is changed.

      Note that this function is not required to store the value in any way; a corresponding getter
      does not need to be defined, although one could be. This setter is normally executed just to
      make sure the correct side effects occur when a property assignment is made.

      The value received by this function is a "raw" value. That is, if the value of this property
      is set "normally", then the value is first passed through the beforeSetTransform, if one is
      defined, and the transformed value is passed to this function. (If that sounds backwards,
      consider "raw" values to be of the type operated on by the simulation engine; transformed
      values are what are visible in the user interface.)

      The set function is called whenever a normal assignment is made to the property, but it may or
      may not be called when the property value is set "behind the scenes" by the setRawValues
      method. It will be called if and onlyh if this property key is present in the hash sent to
      setRawValues *and* the invokeSetterAfterBulkRestore descriptor value for this property is
      true.

      This is useful for distinguishing between properties whose setters must manipulate private
      state variables when they are called, and properties whose setter action operates entirely
      by setting publicly visible
    */
    set: {
      defaultValue: undefined,
      type: 'function'
    },

    /**
      A function that will be called with the new, "raw" value of this property whenever the
      property is assigned to.

      This function *must* return input value if it is correct. If the value is invalid,
      the validate function should throw an exception. Note that custom validate function
      can be used to autmatically "fix" the value (e.g. change lower case to upper case or
      do any other transformation related to notation of the value).

      The validate function is *not* called when the property value is set via setRawValues.
    */
    validate: {
      defaultValue: undefined,
      type: 'function'
    },

    /**
      A callback that is called before assignment to the property. (Exception: it is not called
      when the value is set via the setRawValues method of propertySupport.)

      Use this to detect changes which may cause other property values to need to be updated.

      For convenience, the property key is passed to the callback. The callback's return value is
      discarded.
    */
    beforeSetCallback: {
      defaultValue: undefined,
      type: 'function'
    },

    /**
      A callback that is called after assignment to the property. (Exception: it is not called
      when the value is set via the setRawValues method of propertySupport.)

      Use this to detect changes which may cause other property values to need to be updated.

      For convenience, the property key is passed to the callback. The callback's return value is
      discarded.
    */
    afterSetCallback: {
      defaultValue: undefined,
      type: 'function'
    },

    /**
      A function that is called with the return value of the get method whenever this property value
      is read. The value returned by this function is returned as the value of the property.

      If the transform is not defined, no transform is applied and the value of the property is
      simply the value returned by the get method.

      The expected use of this transform (and the associated beforeSetTransform) is to allow the
      same simulation engine to appear to operate at different length scales. Currently, the MD2D
      engine uses afterGetTransforms to convert values that are nominally in microscopic units (nm,
      for example) to values in a macroscopic unit system (m).
    */
    afterGetTransform: {
      defaultValue: undefined,
      type: 'function'
    },

    /**
      A function that is called to transform the property value to a "raw" value which is passed to
      the set function whenever this property is assigned to.

      If the transform is not defined, no transform is applied and the value that is assigned to the
      property is the value that is passed to the set method.
    */
    beforeSetTransform: {
      defaultValue: undefined,
      type: 'function'
    },

    /**
      If true, the property is considered read-only (and, practically speaking, must have a getter).

      Attempts to assign to the property will throw an error whether the property is directly
      assigned to or a value for the property is passed to the setRawValues method of the
      propertySupport object.

      Note that the native 'writable' property of ES5 Object descriptors does not apply to accessor
      properties (those with setters and getters, such as we construct in this module).
    */
    writable: {
      defaultValue: true,
      type: 'boolean'
    },

    /**
      If true, then the raw value of this property will be included in historyStateRawValues hash.
    */
    includeInHistoryState: {
      defaultValue: false,
      type: 'boolean'
    },

    /**
      If true, and this property's descriptor also includes a set function, then the set function
      will be called when the value of this property is updated via the setRawValues method of the
      PropertySupport object.

      If false, setRawValues will update the property without calling the set method.

      It is useful to set this to false for properties whose setter action operates entirely by
      directly or indirectly manipulating other properties. When setRawValues is used to restore the
      value of those properties during navigation of simulation history, it would be undesirable to
      repeat the setter action as it is entirely accounted for by the value of the other properties.
    */
    invokeSetterAfterBulkRestore: {
      defaultValue: true,
      type: 'boolean'
    },

    /**
      A string that represents the user-defined categorization of this property.

      When the propertySupport object is initialized, it can be passed a list of strings
      containing the different property types the engine wishes to use to categorize its properties.

      PRopertySupport mixes into its target object a method called propertiesOfType which can be
      used to filter the set of properties by category

      (For example, MD2D defines "mainProperties", "viewOptions", "parameters", and "outputs")
    */
    type: {
      defaultValue: undefined,
      type: 'propertyType'
    },

    /**
      An arbitrary object that will be returned when this property's key is passed to the
      getPropertyDescription method of the target object.

      Use this (possibly combined with enumeration and categorization of properties) to expose the
      list of properties to client code for use by e.g,. a UI builder or live scripting help.
    */
    description: {
      defaultValue: undefined
    }
  };

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

  // Constructs a propertySupport object for use by client code. Client code (e.g., models) can maintain a
  // private reference to the propertySupport objectg and delegate property handling to it, and they
  // can optionally call the mixInto method of the propertySupport method to mix in a useful set of
  // public-facing methods and properties.

  // Accepts an args object with an optional 'types' arg, which should be a list of strings that
  // represent user-defined categories of properties.
  return function PropertySupport(args) {

    var propertyTypes = args && args.types && copy(args.types) || [],
        propertyInformation = {},
        cachedPropertiesObjects = {
          all: undefined,
          byType: {}
        },
        cachingIsEnabled = true,
        notificationsAreBatched = false,

        dispatch = d3.dispatch("beforeInvalidatingChange",
                               "afterInvalidatingChange",
                               "afterInvalidatingChangeSequence"),

        invalidatingChangeNestingLevel = 0,
        invalidatingChangeOccurredDuringBatch,
        suppressInvalidationForBatch = false,

        // all properties that were notified while notifications were batched
        changedPropertyKeys = [],

        // all properties with a getter
        computedPropertyKeys = [],

        // all properties for which includeInHistoryState is true
        historyStatePropertyKeys = [],

        // public API
        api;


    // observed properties with a getter
    function observedComputedPropertyKeys() {
      return computedPropertyKeys.filter(function(key) {
        return propertyInformation[key].observers.length > 0;
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

    // Given a list of callbacks, invoke each one in order, but skip repeats.
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

    // Execute closure after setting a flag which causes the notify function to queue a list of
    // notified properties, rather than notifying their observers immediately. After the closure
    // finishes, notify the observers, making sure to call each callback at most once.
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

    // Notify observers of the passed-in property immediately if notifications are not batched
    // (see withBatchedNotifications), or else queue the passed-in property key for later
    // notification
    function notify(key) {
      if (notificationsAreBatched) {
        changedPropertyKeys.push(key);
      } else {
        notifyCallbacksOnce(propertyInformation[key].observers);
      }
    }

    // Note this does not respect batched notifications, as property descriptions are not expected
    // to be updated en masse during an engine tick as are property values.
    function notifyPropertyDescriptionObservers(key) {
      notifyCallbacksOnce(propertyInformation[key].propertyDescriptionObservers);
    }

    // Private implementation of the getter for the property specified by 'key'. Handles caching
    // concerns, but not afterGetTransform, etc.
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

    // Private implementation of the setter for the property specified by 'key'. Handles caching
    // and the writable check (which, remember, is always applied) but does not handle observer
    // notification, validation, the beforeSetTransform, or beforeSet/afterSet callbacks.
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

    function setPropertyDescription(key, description) {
      var info = propertyInformation[key];

      info.descriptor.description = description;
      notifyPropertyDescriptionObservers(key);
    }

    function invalidateCachedPropertiesObjects(type) {
      cachedPropertiesObjects.all = undefined;
      if (type) {
        cachedPropertiesObjects.byType[type] = undefined;
      }
    }

    // This is the meat. Adds an enumerable property to the properties object returned by the
    // propertySupport object, with custom getters and setters that implement the behavior supported
    // by this module.
    function constructProperty(object, key) {
      var info = propertyInformation[key];

      Object.defineProperty(object, key, {
        enumerable:   true,
        configurable: false,

        // This is the publicly-accessible getter for the property. This is invoked whenever the
        // property is read via code such as `var value = model.properties[key]`, or when the `get`
        // method mixed into the target is called (this might look like `model.get(key)`). It is
        // not invoked when a 'raw values' hash is constructed by the historyStateRawValues or
        // rawValues property accessors.
        get: function() {
          var value = get(key);
          if (info.descriptor.afterGetTransform) {
            value = info.descriptor.afterGetTransform(value);
          }
          return value;
        },

        // This is the publicly-accessible setter for the property. It is invoked whenever the
        // property is assigned to via code such as `model.properties[key] = value;`, or when the
        // `set` method mixed into the target is called (this might look like `model.set(key,
        // value)`). It is never invoked when the setRawValues method of the propertySupport object
        // is called.
        //
        // If beforeSetCallback or afterSetCallback properties have been defined on propertySupport,
        // then they will be called, respectively, before and after the body of this function
        // executes. Note again that setRawValues bypasses these callbacks.
        set: function(value) {
          if (info.descriptor.beforeSetCallback) {
            info.descriptor.beforeSetCallback();
          }

          if (info.descriptor.beforeSetTransform) {
            value = info.descriptor.beforeSetTransform(value);
          }
          if (info.descriptor.validate) {
            value = info.descriptor.validate(value);
          }

          set(key, value);

          if (info.descriptor.set) {
            info.descriptor.set(value);
          }

          if (info.descriptor.afterSetCallback) {
            info.descriptor.afterSetCallback();
          }

          notify(key);
        }
      });
    }

    // Private support for the `properties` and `propertiesOfType` accessor and method of the
    // propertySupport object. Returns the cached properties object if one exists, or constructs a
    // new one. Note that adding a property to the list of properties invalidates the cached object,
    // forcing construction of a new one when it is requested.
    function getPropertiesObject(type) {
      var object = type ? cachedPropertiesObjects.byType[type] : cachedPropertiesObjects.all;

      if (!object) {
        object = {};
        Object.keys(propertyInformation).forEach(function(key) {
          if (!type || type === propertyInformation[key].descriptor.type) {
            constructProperty(object, key);
          }
        });

        if (Object.seal) {
          Object.seal(object);
        }

        if (type) {
          cachedPropertiesObjects.byType[type] = object;
        } else {
          cachedPropertiesObjects.all = object;
        }
      }
      return object;
    }

    // The public methods and properties of the propertySupport object
    api = {

      /**
        Mixes a useful set of methods and properties into the target object. Lab models are expected
        to provide themselves as the target, i.e., mix these methods/properties into themselves.
      */
      mixInto: function(target) {

        /**
          The 'properties' property mixed into 'target' is a sealed Object whose enumerable
          properties are all the properties defined by calls to the defineProperty method of the
          propertySupport object. Creating this object is the main feature of the PropertySupport
          module.

          Reading the value of a computed property of the 'properties' object causes that value to
          be cached, unless the `enableCaching` property of the propertySupport object is false. The
          cached value is returned on subsequent reads, unless `enableCaching` is set to false,
          or `deleteComputedPropertyCachedValues` is called.

          Assigning to a property of the 'properties' object always triggers the observers of that
          property, if any.

          Because the 'properties' object is sealed, if `defineProperty` is subsequently called, the
          value of the 'properties' property will be updated to a new object containing the updated
          set of properties.
        */
        Object.defineProperty(target, 'properties', {
          configurable: false,
          enumerable: true,
          get: getPropertiesObject
        });

        /**
          The 'propertiesOfType' method mixed in to 'target' returns a sealed Object whose
          enumerable properties are all the properties defined by calls to the defineProperty
          method with the value 'type' as the type descriptor option.

          These properties behave the same as properties of the 'properties' object.
        */
        target.propertiesOfType = function(type) {
          return getPropertiesObject(type);
        };

        /**
          The 'set' method mixed into 'target' sets the value of one or more properties.

          Calling `target.set(key, value)` is equivalent to `target.properties[key] = value`

          However, if the first argument is a hash of properties, then the hash is treated as a
          set of key-value pairs to be assigned. In that case, observer notification is delayed
          until after all property values in the hash have been assigned.
        */
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

        /**
          The 'get' method mixed into target reads the value of one property.

          Calling `target.get(key)` is equivalent to accessing `target.properties[key]`
        */
        target.get = function(key) {
          return target.properties[key];
        };

        // This is the publicly-accessible setter for 'freezing' the property.
        target.freeze = function(key) {
          var description = target.getPropertyDescription(key);
          description.setFrozen(true);
          setPropertyDescription(key, description);
        };

        // This is the publicly-accessible setter for 'un-freezing' the property.
        target.unfreeze = function(key) {
          var description = target.getPropertyDescription(key);
          description.setFrozen(false);
          setPropertyDescription(key, description);
        };

        /**
          The 'addObserver' method mixed into 'target' adds 'callback' to the end of the list of
          property observers of the property specified by 'key'. Note that adding a callback more
          than once to the observer list for a given property has no effect.

          Whenever the property 'key' is assigned to, the callback will be called. As noted above,
          sometimes property assignment is batched (e.g., by passing a hash to`target.set`). When
          this is the case, 'callback' is guaranteed to be called only once after the batched
          assignment, regardless of how many keys it is registered for. (Of course, if one of those
          observers then assigns to a property observed by 'callback', a second call will occur.)

          If 'key' represents a computed property, then observer notification is supported but
          happends according to a different cycle. Specifically, notification of the observer will
          happen if the value of the property changes between paired calls to
          `storeComputedProperties` and `notifyChangedComputedProperties`, or whenever
          `notifyAllComputedProperties` is called (regardless of the current or previous value of
          the property). As with batched property assignment, each callback is guaranteed to be
          called directly by `notifyAllComputedProperties` or `notifyChangedComputedProperties`
          at most once per invocation.

          Notification is never triggered by simply accessing the property, regardless of whether or
          not the access causes the property to be recalcuated

          Note that there are only 2 arguments accepted by addObserver; it does not support
          'this'-binding to a target object.
        */
        target.addObserver = function(key, callback) {
          if (!propertyInformation[key]) {
            return;
          }
          var observers = propertyInformation[key].observers;
          if (observers.indexOf(callback) < 0) {
            observers.push(callback);
          }
        };

        /**
          The 'removeObserver' method mixed into 'target' removes 'callback' from the list of
          callbacks registered for the propery specified by key.
        */
        target.removeObserver = function(key, callback) {
          var observers = propertyInformation[key].observers,
              index = observers.indexOf(callback);

          if (index >= 0) {
            observers.splice(index, 1);
          }
        };

        /**
          The 'addPropertyDescriptionObserver' method mixed into 'target' adds 'callback' to the end
          of the list of property-description observers of the property specified by key. Note that
          adding a callback more than once to the property-description observer list for a given
          property has no effect.

          Property-description observers are called immediately when the observed property's
          description object is reassigned. Note that observing of mutation of the description
          object is not supported; to change a property's description after the property is created,
          always pass a property description object to propertySupport.setPropertyDescription.
        */
        target.addPropertyDescriptionObserver = function(key, callback) {
          if (!propertyInformation[key]) {
            return;
          }
          var observers = propertyInformation[key].propertyDescriptionObservers;
          if (observers.indexOf(callback) < 0) {
            observers.push(callback);
          }
        };

        target.removePropertyDescriptionObserver = function(key, callback) {
          var observers = propertyInformation[key].propertyDescriptionObservers,
              index = observers.indexOf(callback);

          if (index >= 0) {
            observers.splice(index, 1);
          }
        };

        /**
          The 'isPropertyWritable' method mixed into 'target' returns information whether
          the property named 'key' is writable.
         */
        target.hasProperty = function(key) {
          return propertyInformation[key] != null;
        };

        /**
          The 'isPropertyWritable' method mixed into 'target' returns information whether
          the property named 'key' is writable.
         */
        target.isPropertyWritable = function(key) {
          return !!propertyInformation[key] && propertyInformation[key].descriptor.writable;
        };

        /**
          The 'getPropertyDescription' method mixed into 'target' simply returns the object passed
          in as the 'description' property of the descriptor passed to `defineProperty` when the
          property named 'key' was defined.
        */
        target.getPropertyDescription = function(key) {
          return propertyInformation[key].descriptor.description;
        };

        /**
          The 'getPropertyType' method mixed into 'target' simply returns the 'type' value passed
          in as the 'type' property of the descriptor passed to 'defineProperty'when the property
          named 'key' was defined.
        */
        target.getPropertyType = function(key) {
          return propertyInformation[key].descriptor.type;
        };

        /**
          The 'getPropertyValidateFunc' method mixed into 'target' simply returns the 'validate' function
          passed in as the 'validate' property of the descriptor passed to 'defineProperty' when the
          property named 'key' was defined.
        */
        target.getPropertyValidateFunc = function(key) {
          return propertyInformation[key].descriptor.validate;
        };

        /**
          The 'makeInvalidatingChange' method mixed into 'target' lets client code perform an action
          that will invalidate all computed properties.
         */
        target.makeInvalidatingChange = function(closure) {
          api.invalidatingChangePreHook();
          if (closure) {
            closure();
          }
          api.invalidatingChangePostHook();
        };

        // TODO: probably it's unnecessary, addObserver can support multiple
        // properties instead.
        target.addPropertiesListener = function(properties, callback) {
          if (typeof properties === 'string') {
            target.addObserver(properties, callback);
          } else {
            properties.forEach(function(property) {
              target.addObserver(property, callback);
            });
          }
        };
      },

      /**
        The defineProperty method allows the client object to define a new property named 'key'. The
        'descriptor' property should be a hash containing property descriptors; see the comments on
        the descriptorProperties constant, above.
      */

      defineProperty: function(key, descriptor) {
        descriptor = validateDescriptor(descriptor || {});

        propertyInformation[key] = {
          descriptor: descriptor,
          observers: [],
          propertyDescriptionObservers: [],
          hasCachedValue: false,
          cachedValue: undefined,
          previousValue: undefined
        };

        if (descriptor.get) {
          computedPropertyKeys.push(key);
        }
        if (descriptor.includeInHistoryState) {
          historyStatePropertyKeys.push(key);
        }

        invalidateCachedPropertiesObjects(descriptor.type);
      },

      /**
        Set the PropertyDescription associated with 'key' to 'description' and notify any
        property-description observers (added via target.addPropertyDescriptionObserver())
      */
      setPropertyDescription: function(key, description) {
        setPropertyDescription(key, description);
      },

      /**
        The 'deleteComputedPropertyCachedValues' method removes the cached value of all computed
        properties (i.e., all properties with getters.)

        The next access of the property (either caused directly by code that explicitly accesses the
        property, or indirectly by `notifyChangedComputedProperties`, which retrieves the current
        value of all observed computed properties) will cause a recomputation of the property.
      */
      deleteComputedPropertyCachedValues: function() {
        computedPropertyKeys.forEach(function(key) {
          propertyInformation[key].hasCachedValue = false;
          propertyInformation[key].cachedValue = undefined;
        });
      },

      /**
        The 'storeComputedProperties' method retrieves the current value of all computed properties,
        respecting any previously-cached value, and stores it in a secondary cache for subsequent
        comparison to an updated value, by `notifyChangedComputedProperties`.

        Normally, one would call this method prior to updating the simulation clock, and then call
        `deleteComputedPropertyCachedValues` and notifyChangedComputedProperties` after updating
        the simulation clock.
      */
      storeComputedProperties: function() {
        observedComputedPropertyKeys().forEach(function(key) {
          propertyInformation[key].previousValue = get(key);
        });
      },

      /**
        Retrieves the current value of all computed properties, respecting any cached value it
        finds, and compares them to the previous values of the properties stored by
        `storeComputedProperties`

        Notifies the observers of any properties whose values differ from the previous value. Note
        that observers are called strictly after all computed property values are calculated, and
        each observer callback is guaranteed to be called directly by this method only once per
        invocation.

        (However, it would be possible for any given callback to be called again as a side effect of
        previous observers.)

        Note that, because this method observes the cache, you probably want to call
        `deleteComputedPropertyCachedValues` after calling `storeComputedProperties`,
      */
      notifyChangedComputedProperties: function() {
        withBatchedNotifications(function() {
          observedComputedPropertyKeys().forEach(function(key) {
            if (get(key) !== propertyInformation[key].previousValue) {
              notify(key);
            }
            propertyInformation[key].previousValue = undefined;
          });
        });
      },

      /**
        Blanket-notifies the observers of all computed properties. As described above, each observer
        callback will only be called directly by this method only once per invocation, but the side
        effects of some observer callbacks may result in subsequent calls to any given observer
        callback.
      */
      notifyAllComputedProperties: function() {
        withBatchedNotifications(function() {
          observedComputedPropertyKeys().forEach(function(key) {
            notify(key);
          });
        });
      },

      /**
        The 'properties' object is the main object containing the properties defined using this
        module. This is the same object that is mixed into the mixin target, and it is described
        above in detail.
      */
      get properties() {
        return getPropertiesObject();
      },

      /**
        The 'propertiesOfType' method behaves the same as the `propertiesOfType` method mixed into
        the mixin target, and it is describd above.
      */
      propertiesOfType: function(type) {
        return getPropertiesObject(type);
      },

      /**
        The enableCaching property indicates whether computed property values should be cached.
        When multiple cycles of property changes are triggered by a single change to the simulation
        state, you may want to turn off property caching until all cycles complete.
      */

      get enableCaching() {
        return cachingIsEnabled;
      },

      set enableCaching(value) {
        cachingIsEnabled = !!value;
      },

      /**
        The 'historyStateRawValues' property is a hash of key-value pairs of those properties which
        have the `includeInHistoryState` descriptor property set to true.

        The underlying values are 'raw' values, i.e., those which have been passed through the
        beforeSetTransform.
      */
      get historyStateRawValues() {
        var ret = {};
        historyStatePropertyKeys.forEach(function(key) {
          ret[key] = get(key);
        });
        return ret;
      },

      /**
        The 'rawValues' property is a hash of key-value pairs of all properties.

        The underlying values are 'raw' values, i.e., those which have been passed through the
        beforeSetTransform.
      */
      get rawValues() {
        var ret = {};
        Object.keys(propertyInformation).forEach(function(key) {
          ret[key] = get(key);
        });
        return ret;
      },

      /**
        The 'setRawValues' method accepts a hash of key-value pairs of some properties.

        Unlike the argument accepted by the 'set' method mixed into the mixin target, the values are
        expected to be 'raw' values, i.e., those which have already passed through the
        beforeSetTransform.

        Furthermore, notification of observers is only triggered for those properties whose value
        changed. This is because setRawValues is expected to be used as a system interface for
        restoring past states of the simulation, e.g., rewinding a simulation, and it would be
        undesirable to notify every observer, every time a history state was revisited.

        Additionally, for each property in the passed-in hash, the 'internal' setter is called if
        and only if that property has its `invokeSetterAfterBulkRestore` descriptor property set
        to true.
      */
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
            if (info.descriptor.invokeSetterAfterBulkRestore && info.descriptor.set) {
              info.descriptor.set(get(key));
            }
          });
        });
      },

      invalidatingChangePreHook: function() {

        // Only the first invalidating change during a batch runs the "pre hook".
        if (suppressInvalidationForBatch && invalidatingChangeOccurredDuringBatch) {
          return;
        }

        invalidatingChangeOccurredDuringBatch = true;

        if (invalidatingChangeNestingLevel === 0) {
          api.storeComputedProperties();
          api.deleteComputedPropertyCachedValues();
          api.enableCaching = false;
        }
        invalidatingChangeNestingLevel++;

        dispatch.beforeInvalidatingChange();
      },

      invalidatingChangePostHook: function() {
        if (suppressInvalidationForBatch) return;

        invalidatingChangeNestingLevel--;

        dispatch.afterInvalidatingChange();

        if (invalidatingChangeNestingLevel === 0) {
          api.enableCaching = true;
          api.notifyChangedComputedProperties();

          dispatch.afterInvalidatingChangeSequence();
        }
      },

      // N.B. We don't currently handle nested batches. This may be a problem.
      startBatch: function() {
        invalidatingChangeOccurredDuringBatch = false;
        suppressInvalidationForBatch = true;
      },

      endBatch: function() {
        suppressInvalidationForBatch = false;
        if (invalidatingChangeOccurredDuringBatch) {
          api.invalidatingChangePostHook();
        }
      },

      on: function (type, listener) {
        dispatch.on(type, listener);
      }
    };

    return api;
  };
});

/*global define: false */

define(function (require) {

  var _               = require('underscore'),
      arrays          = require('arrays'),
      arrayTypes      = require('common/array-types'),
      DispatchSupport = require('common/dispatch-support'),
      validator       = require('common/validator'),
      serialize       = require('common/serialize'),
      utils           = require('common/models/utils');

  function mapValues(obj, fn) {
    obj = _.extend({}, obj);
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) obj[k] = fn(k, obj[k]);
    }
    return obj;
  }

  function getArrType(name) {
    name = (name || "any") + "Type";
    return name === "anyType" ? "regular" : arrayTypes[name];
  }

  return function ObjectsCollection(metadata, descriptor) {
    metadata = _.extend({}, metadata);
    descriptor = descriptor || {};

    var api,

        propNames = Object.keys(metadata),

        unitsTranslation     = descriptor.unitsTranslation,
        beforeAddCallback    = descriptor.beforeAddCallback,
        afterAddCallback     = descriptor.afterAddCallback,
        beforeSetCallback    = descriptor.beforeSetCallback,
        afterSetCallback     = descriptor.afterSetCallback,
        beforeRemoveCallback = descriptor.beforeRemoveCallback,
        afterRemoveCallback  = descriptor.afterRemoveCallback,

        capacity = 0,
        count = 0,
        data = (function () {
          var res = {};
          propNames.forEach(function (name) {
            res[name] = arrays.create(capacity, 0, getArrType(metadata[name].type));
          });
          return res;
        }()),
        objects = [],
        rawObjects = [],

        dispatch = new DispatchSupport("beforeChange", "change",
                                       "beforeAdd", "add",
                                       "beforeRemove", "remove",
                                       "beforeSet", "set",
                                       "referencesUpdate");

    // Objects with translated units.
    function ObjectWrapper(idx) {
      var self = this;
      this.idx = idx;
      propNames.forEach(function (name) {
        defineObjectProperty(self, name);
      });
    }
    function defineObjectProperty(target, name) {
      var unitType = metadata[name].unitType,
          objCache = {};
      Object.defineProperty(target, name, {
        enumerable: true,
        configurable: false,
        get: function () {
          if (unitsTranslation) {
            return unitsTranslation.translateFromModelUnits(data[name][this.idx], unitType);
          }
          return data[name][this.idx];
        },
        set: function (v) {
          objCache[name] = v;
          api.set(this.idx, objCache);
        }
      });
    }

    // Object with raw values.
    function RawObjectWrapper(idx) {
      var self = this;
      this.idx = idx;
      propNames.forEach(function (name) {
        defineRawObjectProperty(self, name);
      });
    }
    function defineRawObjectProperty(target, name) {
      var objCache = {};
      Object.defineProperty(target, name, {
        enumerable: true,
        configurable: false,
        get: function () {
          return data[name][this.idx];
        },
        set: function (v) {
          objCache[name] = v;
          api.setRaw(this.idx, objCache);
        }
      });
    }

    api = {
      get count() {
        return count;
      },

      get data() {
        return data;
      },

      get objects() {
        return objects;
      },

      get rawObjects() {
        return rawObjects;
      },

      get objectPrototype() {
        // It can be used to extend functionality of the object wrapper.
        return ObjectWrapper.prototype;
      },

      get rawObjectPrototype() {
        // It can be used to extend functionality of the object wrapper.
        return RawObjectWrapper.prototype;
      },

      addRaw: function (props, options) {
        props = validator.validateCompleteness(metadata, props);
        if (count + 1 > capacity) {
          capacity = capacity * 2 || 1;
          utils.extendArrays(data, capacity);
          dispatch.referencesUpdate();
        }

        if (beforeAddCallback) {
          beforeAddCallback(count, props, options);
        }

        api.setRaw(count, props, options);
        count++;

        if (afterAddCallback) {
          afterAddCallback(count - 1, props, options);
        }

        api.syncObjects();
        dispatch.add();
      },

      add: function (props, options) {
        if (unitsTranslation) {
          props = mapValues(props, function (k, v) {
            return unitsTranslation.translateToModelUnits(v, metadata[k].unitType);
          });
        }
        api.addRaw(props, options);
      },

      remove: function (i) {
        if (i >= count) {
          throw new Error("Object with index " + i +
            " doesn't exist, so it can't be removed.");
        }
        dispatch.beforeChange();

        if (beforeRemoveCallback) {
          beforeRemoveCallback(i, data);
        }

        count--;
        propNames.forEach(function (key) {
          for (var j = i; j < count; ++j) {
            data[key][j] = data[key][j + 1];
          }
        });
        propNames.forEach(function (key) {
          data[key][count] = 0;
        });

        if (afterRemoveCallback) {
          afterRemoveCallback(i, data);
        }

        api.syncObjects();
        dispatch.change();
        dispatch.remove();
      },

      setRaw: function (i, props, options) {
        props = validator.validate(metadata, props);

        dispatch.beforeChange();

        if (beforeSetCallback) {
          beforeSetCallback(i, props, options);
        }

        Object.keys(props).forEach(function (key) {
          data[key][i] = props[key];
        });

        if (afterSetCallback) {
          afterSetCallback(i, props, options);
        }

        dispatch.change();
        dispatch.set();
      },

      set: function (i, props, options) {
        if (unitsTranslation) {
          props = mapValues(props, function (k, v) {
            return unitsTranslation.translateToModelUnits(v, metadata[k].unitType);
          });
        }
        api.setRaw(i, props, options);
      },

      getRaw: function (i) {
        var props = {};
        propNames.forEach(function (key) {
          props[key] = data[key][i];
        });
        return props;
      },

      get: function (i) {
        if (unitsTranslation) {
          return mapValues(api.getRaw(i), function (k, v) {
            return unitsTranslation.translateFromModelUnits(v, metadata[k].unitType);
          });
        }
        return api.getRaw(i);
      },

      syncObjects: function () {
        var objectsCount = objects.length;
        while (objectsCount < count) {
          objects.push(new ObjectWrapper(objectsCount));
          rawObjects.push(new RawObjectWrapper(objectsCount));
          ++objectsCount;
        }
        if (objectsCount > count) {
          objects.length = count;
          rawObjects.length = count;
        }
      },

      defineNewProperty: function(name, propertyMetadata) {
        propNames.push(name);
        metadata[name] = propertyMetadata;
        data[name] = arrays.create(capacity, 0, getArrType(propertyMetadata.type));
        // Update existing object wrappers.
        objects.forEach(function (obj) {
          defineObjectProperty(obj, name);
        });
        rawObjects.forEach(function (rawObj) {
          defineRawObjectProperty(rawObj, name);
        });
      },

      defineHelperArray: function (name, type) {
        data[name] = arrays.create(capacity, 0, getArrType(type));
      },

      // Clone-restore interface:
      clone: function () {
        var state = {
          __count__: count
        };
        propNames.forEach(function (key) {
          state[key] = arrays.clone(data[key]);
        });
        return state;
      },

      restore: function (state) {
        count = state.__count__;
        propNames.forEach(function (key) {
          arrays.copy(state[key], data[key]);
        });
        api.syncObjects();
      },

      // Serialization
      serialize: function () {
        return serialize(metadata, data, count);
      }
    };
    dispatch.mixInto(api);
    return api;
  };
});

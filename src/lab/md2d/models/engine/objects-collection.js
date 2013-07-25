/*global define: false */

define(function (require) {

  var _               = require('underscore'),
      arrays          = require('arrays'),
      arrayTypes      = require('common/array-types'),
      DispatchSupport = require('common/dispatch-support'),
      validator       = require('common/validator'),
      utils           = require('md2d/models/engine/utils');

  function mapValues(obj, fn) {
    obj = _.extend({}, obj);
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) obj[k] = fn(k, obj[k]);
    }
    return obj;
  }

  return function ObjectsCollection(metadata, unitsTranslation) {
    var api,

        propNames = Object.keys(metadata),

        capacity = 0,
        count = 0,
        data = (function () {
          var res = {},
              type;
          propNames.forEach(function (name) {
            type = (metadata[name].type || "any") + "Type";
            type = type === "anyType" ? "regular" : arrayTypes[type];
            res[name] = arrays.create(capacity, 0, type);
          });
          return res;
        }()),
        objects = [],
        rawObjects = [],

        dispatch = new DispatchSupport("beforeAdd", "add",
                                       "beforeRemove", "remove",
                                       "beforeSet", "set",
                                       "referencesUpdate");

    // Objects with translated units.
    function ObjectWrapper(idx) {
      this.idx = idx;
      Object.freeze(this);
    }

    propNames.forEach(function (name) {
      var unitType = metadata[name].unitType;
      Object.defineProperty(ObjectWrapper.prototype, name, {
        enumerable: true,
        configurable: false,
        get: function () {
          if (unitsTranslation) {
            return unitsTranslation.translateFromModelUnits(data[name][this.idx], unitType);
          }
          return data[name][this.idx];
        },
        set: function (v) {
          if (unitsTranslation) {
            v = unitsTranslation.translateToModelUnits(v, unitType);
          }
          data[name][this.idx] = v;
        }
      });
    });

    // Object with raw values.
    function RawObjectWrapper(idx) {
      this.idx = idx;
      Object.freeze(this);
    }

    propNames.forEach(function (name) {
      Object.defineProperty(RawObjectWrapper.prototype, name, {
        enumerable: true,
        configurable: false,
        get: function () {
          return data[name][this.idx];
        },
        set: function (v) {
          data[name][this.idx] = v;
        }
      });
    });

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

      addRaw: function (props) {
        dispatch.beforeAdd();
        props = validator.validateCompleteness(metadata, props);
        if (count + 1 > capacity) {
          capacity = capacity * 2 || 1;
          utils.extendArrays(data, capacity);
          dispatch.referencesUpdate();
        }
        count++;
        api.setRaw(count - 1, props);
        api.syncObjects();
        dispatch.add();
      },

      add: function (props) {
        if (unitsTranslation) {
          props = mapValues(props, function (k, v) {
            return unitsTranslation.translateToModelUnits(v, metadata[k].unitType);
          });
        }
        api.addRaw(props);
      },

      remove: function (i) {
        if (i >= count) {
          throw new Error("Object with index " + i +
            " doesn't exist, so it can't be removed.");
        }
        dispatch.beforeRemove();
        var prop;
        count--;
        for (; i < count; i++) {
          for (prop in data) {
            if (data.hasOwnProperty(prop)) {
              data[prop][i] = data[prop][i + 1];
            }
          }
        }
        api.syncObjects();
        dispatch.remove();
      },

      setRaw: function (i, props) {
        if (i >= count) {
          throw new Error("Object with index " + i +
            " doesn't exist, so its properties can't be set.");
        }
        dispatch.beforeSet();
        props = validator.validate(metadata, props);
        Object.keys(props).forEach(function (key) {
          data[key][i] = props[key];
        });
        dispatch.set();
      },

      set: function (i, props) {
        if (unitsTranslation) {
          props = mapValues(props, function (k, v) {
            return unitsTranslation.translateToModelUnits(v, metadata[k].unitType);
          });
        }
        api.setRaw(i, props);
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
      }
    };

    dispatch.mixInto(api);

    return api;
  };
});

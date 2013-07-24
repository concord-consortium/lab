/*global define: false */

define(function (require) {

  var arrays          = require('arrays'),
      arrayTypes      = require('common/array-types'),
      DispatchSupport = require('common/dispatch-support'),
      validator       = require('common/validator'),
      utils           = require('md2d/models/engine/utils');

  return function ObjectsCollection(metadata) {
    var api,

        propNames = Object.keys(metadata),

        capacity = 0,
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
        count = 0,

        dispatch = new DispatchSupport("add", "remove", "set");

    api = {
      get data() {
        return data;
      },

      get count() {
        return count;
      },

      add: function (props) {
        props = validator.validateCompleteness(metadata, props);
        if (count + 1 > capacity) {
          capacity = capacity * 2 || 1;
          utils.extendArrays(data, capacity);
        }
        count++;
        api.set(count - 1, props);
        dispatch.add();
      },

      remove: function (i) {
        if (i >= count) {
          throw new Error("Object with index " + i +
            " doesn't exist, so it can't be removed.");
        }
        var prop;
        count--;
        // Shift properties.
        for (; i < count; i++) {
          for (prop in data) {
            if (data.hasOwnProperty(prop)) {
              data[prop][i] = data[prop][i + 1];
            }
          }
        }
        dispatch.remove();
      },

      set: function (i, props) {
        props = validator.validate(metadata, props);
        if (i >= count) {
          throw new Error("Object with index " + i +
            " doesn't exist, so its properties can't be set.");
        }
        var key;
        // Set properties from props hash.
        for (key in props) {
          if (props.hasOwnProperty(key)) {
            data[key][i] = props[key];
          }
        }
        dispatch.set();
      },

      get: function (i) {
        var props = {},
            propName;
        for (propName in metadata) {
          if (metadata.hasOwnProperty(propName)) {
            props[propName] = data[propName][i];
          }
        }
        return props;
      }
    };

    dispatch.mixInto(api);

    return api;
  };
});
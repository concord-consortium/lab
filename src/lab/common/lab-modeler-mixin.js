/*global define: false */

define(function (require) {

  var PropertySupport         = require('common/property-support'),
      ParameterSupport        = require('common/parameter-support'),
      OutputSupport           = require('common/output-support'),
      defineBuiltinProperties = require('common/define-builtin-properties');

  return function LabModelerMixin(args) {

    var api,

        metadata        = args.metadata || null,
        setters         = args.setters || {},
        unitsDefinition = args.unitsDefinition || {},

        propertySupport = new PropertySupport({
          types: ["output", "parameter", "mainProperty", "viewOption"]
        }),
        parameterSupport = new ParameterSupport(propertySupport, unitsDefinition),
        outputSupport = new OutputSupport(propertySupport, unitsDefinition);

    if (metadata) {
      defineBuiltinProperties(propertySupport, unitsDefinition, metadata, setters);
    }

    api = {
      mixInto: function(target) {
        propertySupport.mixInto(target);
        parameterSupport.mixInto(target);
        outputSupport.mixInto(target);
      },

      get propertySupport() {
        return propertySupport;
      },

      get parameterSupport() {
        return parameterSupport;
      },

      get outputSupport() {
        return outputSupport;
      }
    };

    return api;
  };
});

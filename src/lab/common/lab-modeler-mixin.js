/*global define: false */

define(function (require) {

  var PropertySupport         = require('common/property-support'),
      ParameterSupport        = require('common/parameter-support'),
      OutputSupport           = require('common/output-support'),
      DispatchSupport         = require('common/dispatch-support'),
      PlaybackSupport         = require('common/playback-support'),
      defineBuiltinProperties = require('common/define-builtin-properties');

  return function LabModelerMixin(args) {

    var api,

        /**
         * Accepted arguments:
         */
        metadata          = args.metadata,
        setters           = args.setters,
        unitsDefinition   = args.unitsDefinition,
        unitsTranslation  = args.unitsTranslation,
        initialProperties = args.initialProperties,
        tickHistory       = args.tickHistory,

        propertySupport = new PropertySupport({
          types: ["output", "parameter", "mainProperty", "viewOption"]
        }),
        parameterSupport = new ParameterSupport({
          propertySupport: propertySupport,
          unitsDefinition: unitsDefinition
        }),
        outputSupport = new OutputSupport({
          propertySupport: propertySupport,
          unitsDefinition: unitsDefinition,
          tickHistory: tickHistory
        }),
        dispatchSupport = new DispatchSupport(),
        playbackSupport = new PlaybackSupport({
          dispatch: dispatchSupport,
          properties: propertySupport.properties
        });

    // FIXME: These events have to be available as some other modules try to
    // add listeners. Probably they aren't necessary, trace it and fix.
    dispatchSupport.addEventTypes("reset", "stepForward", "stepBack", "seek", "invalidation");

    api = {
      mixInto: function(target) {
        propertySupport.mixInto(target);
        parameterSupport.mixInto(target);
        outputSupport.mixInto(target);
        dispatchSupport.mixInto(target);
        playbackSupport.mixInto(target);

        if (metadata) {
          defineBuiltinProperties({
            propertySupport: propertySupport,
            metadata: metadata,

            unitsDefinition: unitsDefinition,
            unitsTranslation: unitsTranslation,
            setters: setters,
            initialProperties: initialProperties
          });
        }
      },

      get propertySupport() {
        return propertySupport;
      },

      get parameterSupport() {
        return parameterSupport;
      },

      get outputSupport() {
        return outputSupport;
      },

      get dispatchSupport() {
        return dispatchSupport;
      },

      get playbackSupport() {
        return playbackSupport;
      }
    };

    return api;
  };
});

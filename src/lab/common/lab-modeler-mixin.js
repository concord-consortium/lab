/*global define: false */

define(function (require) {

  var PropertySupport         = require('common/property-support'),
      ParameterSupport        = require('common/parameter-support'),
      OutputSupport           = require('common/output-support'),
      DispatchSupport         = require('common/dispatch-support'),
      PlaybackSupport         = require('common/playback-support'),
      defineBuiltinProperties = require('common/define-builtin-properties'),
      // it's somewhat unfortunate to have an "upwards" dependency on the controller layer
      ExportController    = require('common/controllers/export-controller');

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

        // defaults to true:
        usePlaybackSupport = args.usePlaybackSupport === undefined || !!args.usePlaybackSupport,

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
        playbackSupport;

        // Make these functions available to any model that chooses to implement duration
        // related properties. PlaybackSupport mixes the duration-related property definitions
        // into models that use it, but other model types, such as sensor models, have to use
        // alternate definitions. The functions below implement some of the logic the different
        // implementations have in common.
        function computeActualDuration() {
          // changing requestedDuration will have an effect iff actualUseDuration == true
          var actualUseDuration = propertySupport.properties.actualUseDuration;
          var requestedDuration = propertySupport.properties.requestedDuration;
          var durationOptions;

          if ( ! actualUseDuration ) {
            return Infinity;
          }

          if (requestedDuration != null) {
            return requestedDuration;
          }

          // need to use a default
          durationOptions = propertySupport.properties.durationOptions;

          if (durationOptions.length > 0) {
            return durationOptions[Math.floor(durationOptions.length / 2)];
          } else {
            // No good default; punt. Leave actualUseDuration = true, but don't actually stop.
            return Infinity;
          }
        }

        function computeActualUseDuration() {
          var useDuration = propertySupport.properties.useDuration;
          return useDuration === true || useDuration === 'codap' && ExportController.canExportData();
        }

        if (usePlaybackSupport) {
          playbackSupport = new PlaybackSupport({
            dispatch: dispatchSupport,
            propertySupport: propertySupport,
            unitsDefinition: unitsDefinition,
            computeActualDuration: computeActualDuration,
            computeActualUseDuration: computeActualUseDuration
          });
        }

    // Is the model setup complete, so the model is ready to be played and record to tick history?
    // "Naked" models are ready upon instantation, but in an interactive, a model shouldn't record
    // history or play until external code has finished setting up parameters, running onload
    // scripts; in the latter case, we wait for a call to model.ready()
    var isReady = false;

    // FIXME: These events have to be available as some other modules try to
    // add listeners. Probably they aren't necessary, trace it and fix.
    dispatchSupport.addEventTypes("reset", "stepForward", "stepBack", "seek", "invalidation", "willReset", "ready", "log");

    api = {
      mixInto: function(target) {
        propertySupport.mixInto(target);
        parameterSupport.mixInto(target);
        outputSupport.mixInto(target);
        dispatchSupport.mixInto(target);

        if (playbackSupport) {
          playbackSupport.mixInto(target);
        }

        // This allows external code (such as the model controller) to trigger the model's
        // willReset event. This allows observers such as the export controller to observe model
        // state before it gets blown away.
        target.willReset = function() {
          dispatchSupport.willReset();
        };

        /**
          Indicate that the model is ready, causing it to save its current state as the initial state,
          to push the current state as the first state of the regular tick history, and to emit the
          ready event.

          This is a public method because we may have to wait for
          external code to indicate that setup is complete (e.g., code that defines parameters and sets
          their initial values, or manipulates the model in some other way)

          This method is called upon model instantiation if initializationOptions.waitForSetup is false
          Otherwise, it must be called by external code. It is an error to call it twice.
        */
        target.ready = function() {
          if (isReady) {
            throw new Error("ready() called on an already-ready model.");
          }

          if (api.tickHistory) {
            api.tickHistory.saveInitialState();
            api.tickHistory.push();
          }

          propertySupport.invalidatingChangePreHook();
          isReady = true;
          propertySupport.invalidatingChangePostHook();

          dispatchSupport.ready();
        };

        Object.defineProperty(target, 'isReady', {
          enumerable: true,
          get: function() {
            return isReady;
          }
        });

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
      },

      get computeActualDuration() {
        return computeActualDuration;
      },

      get computeActualUseDuration() {
        return computeActualUseDuration;
      }
    };

    return api;
  };
});

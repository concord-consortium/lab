/*global define: false d3: false*/

define(function(require) {

  var PropertySupport = require('common/property-support');

  return function Model(initialProperties) {
    var propertySupport = new PropertySupport(),

        isStopped = true,
        dispatch = d3.dispatch('play', 'stop', 'tick', 'reset', 'stepForward', 'stepBack', 'seek', 'invalidation'),
        interval,
        intervalLength = 16, // ms
        time = 0,
        stepCounter = 0,
        invalidatingChangeNestingLevel = 0,
        model;

        function invalidatingChangePreHook() {
          invalidatingChangeNestingLevel++;
          if (invalidatingChangeNestingLevel === 1) {
            propertySupport.storeComputedProperties();
            propertySupport.deleteComputedPropertyCachedValues();
            propertySupport.enableCaching = false;
          }
        }

        function invalidatingChangePostHook() {
          invalidatingChangeNestingLevel--;
          if (invalidatingChangeNestingLevel === 0) {
            propertySupport.enableCaching = true;
            propertySupport.notifyAllChangedComputedProperties();
          }
        }

        function makeInvalidatingChange(closure) {
          invalidatingChangePreHook();
          closure();
          invalidatingChangePostHook();
        }

        function tick() {
          stepCounter++;
          time += (0.001 * intervalLength * model.properties.timeScale);
          propertySupport.deleteComputedPropertyCachedValues();
          propertySupport.notifyAllComputedProperties();
          dispatch.tick();
        }

    model = {
      resetTime: function() {
        makeInvalidatingChange(function() {
          time = 0;
        });
      },

      on: function(type, listener) {
        dispatch.on(type, listener);
      },

      start: function() {
        isStopped = false;
        interval = setInterval(tick, intervalLength);
        dispatch.play();
      },

      stop: function() {
        isStopped = true;
        clearInterval(interval);
        dispatch.stop();
      },

      is_stopped: function() {
        return isStopped;
      },

      stepCounter: function() {
        return stepCounter;
      },

      // COPIED from MD2D modeler
      addPropertiesListener: function(properties, callback) {
        if (typeof properties === 'string') {
          model.addObserver(properties, callback);
        } else {
          properties.forEach(function(property) {
            model.addObserver(property, callback);
          });
        }
      }
    };

    propertySupport.mixInto(model);

    propertySupport.defineProperty('controlButtons');
    propertySupport.defineProperty('showClock');

    // Settable, but have no dependencies
    propertySupport.defineProperty('frequency');
    propertySupport.defineProperty('timeScale');

    propertySupport.defineProperty('signalValue', {
      writable: false,
      get: function() {
        return Math.cos(2 * Math.PI * model.properties.frequency * model.properties.time);
      }
    });

    propertySupport.defineProperty('time', {
      writable: false,
      get: function() { return time; }
    });

    propertySupport.defineProperty('displayTime', {
      get: function() {
        return model.properties.time;
      },
      description: {
        getUnitAbbreviation: function() { return "s"; }
      }
    });

    propertySupport.setRawValues({
      controlButtons: initialProperties.viewOptions.controlButtons,
      showClock: initialProperties.viewOptions.showClock,
      timeScale: 1,
      frequency: 1
    });

    return model;
  };
});

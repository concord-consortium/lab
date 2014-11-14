/*global define: false, d3: false */

define(function (require) {
  var console     = require('common/console'),
      performance = require('common/performance'),
      PropertyDescription = require('common/property-description');

  return function PlaybackSupport(args) {
        // DispatchSupport instance or compatible module.
    var dispatch = args && args.dispatch || null,
        // Properties object - it can be used to define 'modelSampleRate'.
        // Instance of PropertiesSupport class is expected.
        propertySupport = args && args.propertySupport || null,
        unitsDefinition = args && args.unitsDefinition || null,
        computeActualUseDuration = args.computeActualUseDuration,
        computeActualDuration    = args.computeActualDuration,

        eventsSupported = (function() {
          // Events support is optional. It should be provided by the
          // DispatchSupport (common/dispatch-support) or another compatible
          // module.
          if (dispatch) {
            if (dispatch.on && dispatch.addEventTypes) {
              dispatch.addEventTypes("play", "stop", "tickStart", "tickEnd");
              return true;
            } else {
              throw new Error("[PlaybackSupport] Provided Dispatch object doesn't implement required interface!");
            }
          } else {
            return false;
          }
        }()),

        stopped = true,
        stopRequest = false,
        restartRequest = false,
        hasPlayed = false;

    /**
      Repeatedly calls `f` at an interval defined by the modelSampleRate property, until f returns
      true. (This is the same signature as d3.timer.)

      If modelSampleRate === 'default', try to run at the "requestAnimationFrame rate"
      (i.e., using d3.timer(), after running f, also request to run f at the next animation frame)

      If modelSampleRate !== 'default', instead uses setInterval to schedule regular calls of f with
      period (1000 / sampleRate) ms, corresponding to sampleRate calls/s
    */
    function timer(f) {
      var intervalID,
          // When target support properties and it defines
          // 'modelSampleRate', it will be used.
          sampleRate = propertySupport && propertySupport.properties.modelSampleRate || 'default';

      if (sampleRate === 'default') {
        // use requestAnimationFrame via d3.timer
        d3.timer(f);
      } else {
        // set an interval to run the model more slowly.
        intervalID = window.setInterval(function() {
          if (f()) {
            window.clearInterval(intervalID);
          }
        }, 1000/sampleRate);
      }
    }

    return {
      mixInto: function(target) {
        var timePropertyDescription;

        if (propertySupport && target.defineOutput) {

          // Define duration-related properties, indicating the time, if any, past which
          // the model should not play.

          // values to show, e.g., as a menu of reasonable choices for requestedDuration
          target.defineOutput('durationOptions', {}, function() {
            // Result is an array of times (in "user-facing" units, such as s in mks models or fs
            // in md2d models), derived from a number of ticks.
            // For mks models having 1/60 seconds per tick, this is 0.5s, 1s, 2s, 5s, 10s, 30s, 60s:
            var TICKS = [30, 60, 120, 300, 600, 1800, 3600];
            var timePerTick = propertySupport.properties.timePerTick;

            if (timePerTick != null) {
              return TICKS.map(function (ticks) { return ticks * timePerTick; });
            }
            return [];
          });

          target.defineOutput('actualUseDuration', {}, computeActualUseDuration);

          target.defineOutput('actualDuration', {
            label: "Experiment duration",
            unitType: 'time',
            format: 'f'
          }, computeActualDuration);
        }

        // All playable (time-based) models should have a method to return time values formatted
        // user consumption. Specific models can override this method; for example md2d internally
        // uses time values in fs but we want to display them as ps.

        if ( ! target.formatTime && unitsDefinition ) {
          timePropertyDescription = new PropertyDescription(unitsDefinition, {
            unitType: 'time',
            // might want to provide a way for models to override this default format without
            // having to override the formatTime method?
            format: '.1f'
          });

          target.formatTime = function(time) {
            return timePropertyDescription.format(time);
          };
        }

        if (typeof target.tick !== "function") {
          target.tick = function () {
            console.warn("[PlaybackSupport] .tick() method should be overwritten by target!");
          };
        }

        target.start = function() {
          // Cleanup stop and restart requests.
          stopRequest = false;
          restartRequest = false;

          if (!stopped) {
            // Do nothing, model is running.
            return target;
          }

          stopped = false;

          timer(function timerTick(elapsedTime) {
            if (eventsSupported) dispatch.tickStart();
            performance.leaveScope("gap");
            // Cancel the timer and refuse to to step the model, if the model is stopped.
            // This is necessary because there is no direct way to cancel a d3 timer.
            // See: https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_timer)
            if (stopRequest) {
              stopped = true;
              return true;
            }

            if (restartRequest) {
              setTimeout(target.start, 0);
              stopped = true;
              return true;
            }

            if (propertySupport && propertySupport.properties.time >= propertySupport.properties.actualDuration) {
              target.stop();
              return false;
            }

            performance.enterScope("tick");
            target.tick(elapsedTime);
            performance.leaveScope("tick");

            performance.enterScope("gap");
            return false;
          });

          if (eventsSupported) dispatch.play();

          performance.enterScope("gap");
          return target;
        };

        target.restart = function() {
          restartRequest = true;
          return target;
        };

        target.stop = function() {
          stopRequest = true;
          if (eventsSupported) dispatch.stop();
          return target;
        };

        target.isStopped = function () {
          return stopped || stopRequest;
        };

        target.on('play.playback-support', function() {
          hasPlayed = true;
        });

        target.on('reset.playback-support', function() {
          hasPlayed = false;
        });

        Object.defineProperty(target, 'hasPlayed', {
          enumerable: true,
          get: function() {
            return hasPlayed;
          }
        });
      }
    };
  };
});

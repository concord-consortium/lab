/*global define: false */

define(function(require) {

  var LabModelerMixin         = require('common/lab-modeler-mixin'),
      validator               = require('common/validator'),
      metadata                = require('iframe-model/metadata'),

      unitsDefinition = {
        units: {
          time: {
            name: "second",
            pluralName: "seconds",
            symbol: "s"
          }
        }
      };

  return function Model(initialProperties) {
    var labModelerMixin = new LabModelerMixin({
          metadata: metadata,
          unitsDefinition: unitsDefinition,
          initialProperties: initialProperties
        }),
        dispatch = labModelerMixin.dispatchSupport,
        time = 0,
        stepCounter = 0,
        model;

    model = {

      tick: function () {
        stepCounter++;
        time += 0.001;

        model.updateAllOutputProperties();

        dispatch.tick();
      },

      stepCounter: function() {
        return stepCounter;
      }
    };

    labModelerMixin.mixInto(model);
    dispatch.addEventTypes("tick");

    model.defineOutput('time', {
      label: "Time",
      unitType: 'time',
      format: '.2f'
    }, function() {
      return time;
    });

    model.defineOutput('displayTime', {
      label: "Time",
      unitType: 'time',
      format: '.2f'
    }, function() {
      return time;
    });

    return model;
  };
});

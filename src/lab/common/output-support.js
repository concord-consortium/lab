/*global define: false */

define(function (require) {

  var PropertyDescription  = require('common/property-description'),
      RunningAverageFilter = require('cs!common/filters/running-average-filter'),
      SimplePeriodFilter   = require('cs!common/filters/simple-period-filter');

  return function OutputSupport(args) {
    var propertySupport = args.propertySupport,
        unitsDefinition = args.unitsDefinition || {},
        tickHistory     = args.tickHistory || null,

        filteredOutputs = [];

    function updateFilteredOutputs() {
      filteredOutputs.forEach(function(output) {
        output.addSample();
      });
    }

    function resetFilteredOutputs() {
      filteredOutputs.forEach(function(output) {
        output.reset();
      });
    }

    // TODO: is it necessary? It follows the old solution.
    // In theory filtered outputs could be updated only on time change
    // or on filtered property value change. Check it!
    propertySupport.on("afterInvalidatingChange.output-support", updateFilteredOutputs);

    return {
      mixInto: function(target) {

        /**
          Add an "output" property to the model. Output properties are expected to change at every
          model tick, and may also be changed indirectly, outside of a model tick, by a change to model
          properties or the atom, element, etc. properties.

          `key` should be the name of the output. The property value will be accessed by
          `model.get(<key>);`

          `description` should be a hash of metadata about the property.

          `getter` should be a no-arg function which calculates the property value. These values are not
          translated after getter returns because we expect that most output getters are authored
          scripts, which operate entirely with already-translated units. Therefore, getters defined
          internally in modeler.js needs to make sure to translate any "model units" values out of the
          model-unit domain.
        */
        target.defineOutput = function(key, descriptionHash, getter) {
          propertySupport.defineProperty(key, {
            type: 'output',
            writable: false,
            get: getter,
            includeInHistoryState: false,
            description: new PropertyDescription(unitsDefinition, descriptionHash)
          });
        };


        /**
          Add an "filtered output" property to the model. This is special kind of output property, which
          is filtered by one of the built-in filters based on time (like running average). Note that filtered
          outputs do not specify calculate function - instead, they specify property which should filtered.
          It can be another output, model parameter or custom parameter.

          Filtered output properties are extension of typical output properties. They share all features of
          output properties, so they are expected to change at every model tick, and may also be changed indirectly,
          outside of a model tick, by a change to the model parameters or to the configuration of atoms and other
          objects in the model.

          `key` should be the name of the parameter. The property value will be accessed by
          `target.get(<key>);`

          `description` should be a hash of metadata about the property. Right now, these metadata are not
          used. However, example metadata include the label and units name to be used when graphing
          this property.

          `filteredPropertyKey` should be name of the basic property which should be filtered.

          `type` should be type of filter, defined as string. For now only "RunningAverage" and "SimplePeriod"
          are supported.

          `period` should be number defining length of time period used for calculating filtered value. It should
          be specified in femtoseconds.

        */
        target.defineFilteredOutput = function(key, description, filteredPropertyKey, type, period) {
          var filter, initialValue;

          if (type === "RunningAverage") {
            filter = new RunningAverageFilter(period);
          } else if (type === "SimplePeriod") {
            filter = new SimplePeriodFilter();
          } else {
            throw new Error("FilteredOutput: unknown filter type " + type + ".");
          }

          // Add initial sample
          initialValue = target.properties[filteredPropertyKey];
          if (initialValue === undefined || isNaN(Number(initialValue))) {
            throw new Error("FilteredOutput: property is not a valid numeric value or it is undefined.");
          }
          filter.addSample(target.properties.time, initialValue);

          if (tickHistory) {
            // Create simple adapter implementing TickHistoryCompatible Interface
            // and register it in tick history.
            tickHistory.registerExternalObject({
              push: function () {
                // Filtered outputs are updated only at the end of tick() operation,
                // during tickHistory.push() call. So they are *not* updated
                // immediately after property change, e.g. using model.set("prop", 5).
                // Filtered ouput bound to "prop" property will reflect this change
                // in the next tick.
                filter.addSample(target.properties.time, target.properties[filteredPropertyKey]);
              },
              extract: function (idx) {
                filter.setCurrentStep(idx);
              },
              invalidate: function (idx) {
                filter.invalidate(idx);
              },
              setHistoryLength: function (length) {
                filter.setMaxBufferLength(length);
              },
              reset: function() {
                filter.reset();
              }
            });
          } else {
            filteredOutputs.push({
              addSample: function() {
                filter.addSample(target.properties.time, target.properties[filteredPropertyKey]);
              }
            });
          }

          // Extend description to contain information about filter
          description.property = filteredPropertyKey;
          description.type = type;
          description.period = period;

          target.defineOutput(key, description, function () {
            return filter.calculate();
          });
        };

        /**
          Call this method after moving to a different model time (e.g., after stepping the model
          forward or back, seeking to a different time, or on model initialization) to update all output
          properties and notify their listeners. This method is more efficient for that case than
          updateOutputPropertiesAfterChange because it can assume that all output properties are
          invalidated by the model step. It therefore does not need to calculate any output property
          values; it allows them to be evaluated lazily instead. Property values are calculated when and
          if listeners request them. This method also guarantees that all properties have their updated
          value when they are requested by any listener.

          Technically, this method first updates the 'viewAtoms' array and macrostate variables, then
          invalidates any  cached output-property values, and finally notifies all output-property
          listeners.

          Note that this method and updateOutputPropertiesAfterChange are the only methods which can
          flush the cached value of an output property. Therefore, be sure to not to make changes
          which would invalidate a cached value without also calling one of these two methods.
        */
        target.updateAllOutputProperties = function () {
          propertySupport.deleteComputedPropertyCachedValues();
          propertySupport.notifyAllComputedProperties();
          updateFilteredOutputs();
        };

        target.resetAllOutputProperties = function () {
          resetFilteredOutputs();
        };
      }
    };
  };
});

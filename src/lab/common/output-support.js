/*global define: false */

define(function (require) {

  var PropertyDescription  = require('common/property-description'),
      RunningAverageFilter = require('cs!common/running-average-filter');

  return function OutputSupport(args) {
    var propertySupport = args.propertySupport,
        unitsDefinition = args.unitsDefinition || {},

        filteredOutputs = [];

    function updateFilteredOutputs() {
      filteredOutputs.forEach(function(output) {
        output.addSample();
      });
    }

    // TODO: is it necessary? It follows the old solution.
    // In theory filtered outputs could be updated only on time change
    // or on filtered property value change. Check it!
    propertySupport.on("afterInvalidatingChange", updateFilteredOutputs);

    return {
      mixInto: function(target) {

        target.defineOutput = function(key, descriptionHash, getter) {
          propertySupport.defineProperty(key, {
            type: 'output',
            writable: false,
            get: getter,
            includeInHistoryState: false,
            description: new PropertyDescription(unitsDefinition, descriptionHash)
          });
        };

        target.defineFilteredOutput = function(key, description, filteredPropertyKey, type, period) {
          var filter, initialValue;

          if (type === "RunningAverage") {
            filter = new RunningAverageFilter(period);
          } else {
            throw new Error("FilteredOutput: unknown filter type " + type + ".");
          }

          // Add initial sample
          initialValue = target.properties[filteredPropertyKey];
          if (initialValue === undefined || isNaN(Number(initialValue))) {
            throw new Error("FilteredOutput: property is not a valid numeric value or it is undefined.");
          }
          filter.addSample(target.properties.time, initialValue);

          filteredOutputs.push({
            addSample: function() {
              filter.addSample(target.properties.time, target.properties[filteredPropertyKey]);
            }
          });

          // Extend description to contain information about filter
          description.property = filteredPropertyKey;
          description.type = type;
          description.period = period;

          target.defineOutput(key, description, function () {
            return filter.calculate();
          });
        };

        target.updateAllOutputProperties = function () {
          propertySupport.deleteComputedPropertyCachedValues();
          propertySupport.notifyAllComputedProperties();
          updateFilteredOutputs();
        };
      }
    };
  };
});

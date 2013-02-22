/*global define*/

define(function(require) {
  return {
    // RequireJS has to see the full strings below, so we can't get away with iterating over a list
    // of unit types.
    md2d: require('md2d/models/unit-definitions/md2d'),
    mks: require('md2d/models/unit-definitions/mks')
  };
});

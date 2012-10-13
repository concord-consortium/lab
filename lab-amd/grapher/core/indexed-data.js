/*globals define */

define(function (require) {
  return function indexedData(array, initial_index) {
    var i = 0,
        start_index = initial_index || 0,
        n = array.length,
        points = [];
    for (i = 0; i < n;  i++) {
      points.push( { x: i+start_index, y: array[i] } );
    }
    return points;
  };
});

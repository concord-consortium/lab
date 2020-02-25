import arrays from 'arrays';


/**
  Extend all arrays in arrayContainer to `newLength`. Here, arrayContainer is expected to be `atoms`
  `elements`, `radialBonds`, etc. arrayContainer might be an array or an object.
  TODO: this is just interim solution, in the future only objects will be expected.
*/
export default {
  extendArrays: function(arrayContainer, newLength) {
    var i, len;
    if (Array.isArray(arrayContainer)) {
      // Array of arrays.
      for (i = 0, len = arrayContainer.length; i < len; i++) {
        if (arrays.isArray(arrayContainer[i]))
          arrayContainer[i] = arrays.extend(arrayContainer[i], newLength);
      }
    } else {
      // Object with arrays defined as properties.
      for (i in arrayContainer) {
        if (arrayContainer.hasOwnProperty(i)) {
          if (arrays.isArray(arrayContainer[i]))
            arrayContainer[i] = arrays.extend(arrayContainer[i], newLength);
        }
      }
    }
  }
};

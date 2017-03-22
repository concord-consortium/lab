require("../../../env");

var vows = require("vows"),
    assert = require("assert"),

    arrays = require("../../../../src/modules/arrays");

var suite = vows.describe("arrays");

suite.addBatch({
  "create": {
    topic: function() {
      return arrays.create;
    },
    "creates array of zeros": function(create) {
      assert.deepEqual(create(4, 0, "regular"), [0, 0, 0, 0]);
    },
    "creates array of ones": function(create) {
      assert.deepEqual(create(4, 1, "regular"), [1, 1, 1, 1]);
    },
    "creates Float32Array of zeros": function(create) {
      var float_32_array = create(2, 0,"Float32Array");
      assert.equal(float_32_array.length, 2);
      assert.equal(float_32_array[0], 0);
      assert.equal(float_32_array[1], 0);
    },
    "creates Float32Array of ones": function(create) {
      var float_32_array = create(2, 1,"Float32Array");
      assert.equal(float_32_array.length, 2);
      assert.equal(float_32_array[0], 1);
      assert.equal(float_32_array[1], 1);
    },
    "creates Uint8Array of zeros": function(create) {
      var uint_8_array = create(2, 0,"Uint8Array");
      assert.equal(uint_8_array.length, 2);
      assert.equal(uint_8_array[0], 0);
      assert.equal(uint_8_array[1], 0);
    },
    "creates Uint8Array of ones": function(create) {
      var uint_8_array = create(2, 1,"Uint8Array");
      assert.equal(uint_8_array.length, 2);
      assert.equal(uint_8_array[0], 1);
      assert.equal(uint_8_array[1], 1);
    }
  }
});

suite.addBatch({
  "copy": {
    topic: function() {
      return arrays.copy;
    },
    "copies array of zeros": function(copy) {
      var src  = [0, 0, 0, 0];
      var dest = [];
      copy(src, dest);
      assert.deepEqual(src, dest);
    },
    "copies array of ones": function(copy) {
      var src = [1, 1, 1, 1];
      var dest = [];
      copy(src, dest);
      assert.deepEqual(src, dest);
    }
  }
});

suite.addBatch({
  "clone": {
    topic: function() {
      return arrays.clone;
    },
    "clones array of zeros": function(clone) {
      var src  = [0, 0, 0, 0];
      var dest = clone(src);
      assert.deepEqual(src, dest);
    },
    "clones array of ones": function(clone) {
      var src = [1, 1, 1, 1];
      var dest = clone(src);
      assert.deepEqual(src, dest);
    }
  }
});

suite.addBatch({
  "extend": {
    topic: function() {
      return arrays.extend;
    },

    "extends a typed array to an array of the same type": function(extend) {
      var src = arrays.create(2, 0, "Float32Array"),
          dest;

      src[0] = 1;
      src[1] = 2;
      dest = extend(src, 2);
      assert.equal(arrays.constructor_function(dest), Float32Array);
    },

    "extends a non-typed array to a non-typed array": function(extend) {
      var src = arrays.create(2, 0, "regular"),
          dest;

      src[0] = 1;
      src[1] = 2;
      dest = extend(src, 2);
      assert.equal(arrays.constructor_function(dest), Array);
    },

    "extends a typed array to a longer length": function(extend) {
      var src = arrays.create(2, 0, "Float32Array"),
          dest;

      src[0] = 1;
      src[1] = 2;
      dest = extend(src, 3);

      assert.equal(dest.length, 3);
      assert.equal(dest[0], 1);
      assert.equal(dest[1], 2);
    },

    "\"extends\" a typed array to a shorter length": function(extend) {
      var src = arrays.create(2, 0, "Float32Array"),
          dest;

      src[0] = 1;
      src[1] = 2;
      dest = extend(src, 1);

      assert.equal(dest.length, 1);
      assert.equal(dest[0], 1);
    },


    "extends a non-typed array to a longer length": function(extend) {
      var src = arrays.create(2, 0, "regular"),
          dest;

      src[0] = 1;
      src[1] = 2;
      dest = extend(src, 3);

      assert.equal(dest.length, 3);
      assert.equal(dest[0], 1);
      assert.equal(dest[1], 2);
    },

    "\"extends\" a non-typed array to a shorter length": function(extend) {
      var src = arrays.create(2, 0, "regular"),
          dest;

      src[0] = 1;
      src[1] = 2;
      dest = extend(src, 1);

      assert.deepEqual(dest, [1]);
    }
  }
});

suite.addBatch({
  "between": {
    topic: function() {
      return arrays.between;
    },
    "3 is between 2 and 4": function(between) {
      assert.isTrue(between(2, 4, 3));
    },
    "1 is not between 2 and 4": function(between) {
      assert.isFalse(between(2, 4, 1));
    },
    "2 is not between 2 and 4": function(between) {
      assert.isFalse(between(2, 4, 2));
    },
    "4 is not between 2 and 4": function(between) {
      assert.isFalse(between(2, 4, 4));
    },
    "5 is not between 2 and 4": function(between) {
      assert.isFalse(between(2, 4, 5));
    }
  }
});

suite.addBatch({
  "max": {
    topic: function() {
      return arrays.max;
    },
    "find max in simple array": function(max) {
      assert.equal(max([0, 1, 2, 3]), 3);
    },
    "find max in array with duplicate max values": function(max) {
      assert.equal(max([3, 0, 1, 2, 3]), 3);
    },
    "find max in array with negative and positive numbers": function(max) {
      assert.equal(max([3, -1, 0, 1, 2, 3]), 3);
    },
    "find max in array of all negative numbers": function(max) {
      assert.equal(max([-8, -7, -4, -3]), -3);
    }
  }
});

suite.addBatch({
  "min": {
    topic: function() {
      return arrays.min;
    },
    "find min in simple array": function(min) {
      assert.equal(min([0, 1, 2, 3]), 0);
    },
    "find min in array with duplicate min values": function(min) {
      assert.equal(min([3, 0, 1, 2, 0]), 0);
    },
    "find min in array with negative and positive numbers": function(min) {
      assert.equal(min([3, -1, 0, 1, 2, 3]), -1);
    },
    "find min in array of all negative numbers": function(min) {
      assert.equal(min([-8, -7, -4, -3]), -8);
    }
  }
});

suite.addBatch({
  "mmaxAnyArrayax": {
    topic: function() {
      return arrays.maxAnyArray;
    },
    "find max in any array type in simple array": function(maxAnyArray) {
      assert.equal(maxAnyArray([0, 1, 2, 3]), 3);
    },
    "find max in any array type with duplicate max values": function(maxAnyArray) {
      assert.equal(maxAnyArray([3, 0, 1, 2, 3]), 3);
    },
    "find max in any array type with negative and positive numbers": function(maxAnyArray) {
      assert.equal(maxAnyArray([3, -1, 0, 1, 2, 3]), 3);
    },
    "find max in any array type of all negative numbers": function(maxAnyArray) {
      assert.equal(maxAnyArray([-8, -7, -4, -3]), -3);
    }
  }
});

suite.addBatch({
  "minAnyArray": {
    topic: function() {
      return arrays.minAnyArray;
    },
    "find min in any array type in simple array": function(minAnyArray) {
      assert.equal(minAnyArray([0, 1, 2, 3]), 0);
    },
    "find min in any array type with duplicate min values": function(minAnyArray) {
      assert.equal(minAnyArray([3, 0, 1, 2, 0]), 0);
    },
    "find min in any array type with negative and positive numbers": function(minAnyArray) {
      assert.equal(minAnyArray([3, -1, 0, 1, 2, 3]), -1);
    },
    "find min in any array type of all negative numbers": function(minAnyArray) {
      assert.equal(minAnyArray([-8, -7, -4, -3]), -8);
    }
  }
});

suite.addBatch({
  "average": {
    topic: function() {
      return arrays.average;
    },
    "find average in in simple array": function(average) {
      assert.equal(average([0, 1, 2, 3]), 1.5);
    },
    "find average in any array type with duplicate min values": function(average) {
      assert.equal(average([3, 0, 1, 2, 0]), 1.2);
    }
  }
});

suite.addBatch({
  "remove": {
    topic: function() {
      return arrays.remove;
    },
    "remove element from simple array": function(remove) {
      assert.deepEqual(remove([0, 1, 2, 3], 0), [1, 2, 3]);
      assert.deepEqual(remove([0, 1, 2, 3], 1), [0, 2, 3]);
      assert.deepEqual(remove([0, 1, 2, 3], 2), [0, 1, 3]);
      assert.deepEqual(remove([0, 1, 2, 3], 3), [0, 1, 2]);
    }
  }
});

suite.export(module);

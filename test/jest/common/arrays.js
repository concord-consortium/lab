const assert = require("assert");
import arrays from "arrays";

describe("arrays", () => {
  describe("create", () => {
    const create = arrays.create;
    it("creates array of zeros", () => {
      assert.deepEqual(create(4, 0, "regular"), [0, 0, 0, 0]);
    });
    it("creates array of ones", () => {
      assert.deepEqual(create(4, 1, "regular"), [1, 1, 1, 1]);
    });
    it("creates Float32Array of zeros", () => {
      var float_32_array = create(2, 0, "Float32Array");
      assert.equal(float_32_array.length, 2);
      assert.equal(float_32_array[0], 0);
      assert.equal(float_32_array[1], 0);
    });
    it("creates Float32Array of ones", () => {
      var float_32_array = create(2, 1, "Float32Array");
      assert.equal(float_32_array.length, 2);
      assert.equal(float_32_array[0], 1);
      assert.equal(float_32_array[1], 1);
    });
    it("creates Uint8Array of zeros", () => {
      var uint_8_array = create(2, 0, "Uint8Array");
      assert.equal(uint_8_array.length, 2);
      assert.equal(uint_8_array[0], 0);
      assert.equal(uint_8_array[1], 0);
    });
    it("creates Uint8Array of ones", () => {
      var uint_8_array = create(2, 1, "Uint8Array");
      assert.equal(uint_8_array.length, 2);
      assert.equal(uint_8_array[0], 1);
      assert.equal(uint_8_array[1], 1);
    });
  });

  describe("copy", () => {
    const copy = arrays.copy;
    it("copies array of zeros", () => {
      var src = [0, 0, 0, 0];
      var dest = [];
      copy(src, dest);
      assert.deepEqual(src, dest);
    });
    it("copies array of ones", () => {
      var src = [1, 1, 1, 1];
      var dest = [];
      copy(src, dest);
      assert.deepEqual(src, dest);
    });
  });

  describe("clone", () => {
    const clone = arrays.clone;
    it("clones array of zeros", () => {
      var src = [0, 0, 0, 0];
      var dest = clone(src);
      assert.deepEqual(src, dest);
    });
    it("clones array of ones", () => {
      var src = [1, 1, 1, 1];
      var dest = clone(src);
      assert.deepEqual(src, dest);
    });
  });

  describe("extend", () => {
    const extend = arrays.extend;
    it("extends a typed array to an array of the same type", () => {
      var src = arrays.create(2, 0, "Float32Array"),
        dest;

      src[0] = 1;
      src[1] = 2;
      dest = extend(src, 2);
      assert.equal(arrays.constructor_function(dest), Float32Array);
    });

    it("extends a non-typed array to a non-typed array", () => {
      var src = arrays.create(2, 0, "regular"),
        dest;

      src[0] = 1;
      src[1] = 2;
      dest = extend(src, 2);
      assert.equal(arrays.constructor_function(dest), Array);
    });

    it("extends a typed array to a longer length", () => {
      var src = arrays.create(2, 0, "Float32Array"),
        dest;

      src[0] = 1;
      src[1] = 2;
      dest = extend(src, 3);

      assert.equal(dest.length, 3);
      assert.equal(dest[0], 1);
      assert.equal(dest[1], 2);
    });

    it("\"extends\" a typed array to a shorter length", () => {
      var src = arrays.create(2, 0, "Float32Array"),
        dest;

      src[0] = 1;
      src[1] = 2;
      dest = extend(src, 1);

      assert.equal(dest.length, 1);
      assert.equal(dest[0], 1);
    });


    it("extends a non-typed array to a longer length", () => {
      var src = arrays.create(2, 0, "regular"),
        dest;

      src[0] = 1;
      src[1] = 2;
      dest = extend(src, 3);

      assert.equal(dest.length, 3);
      assert.equal(dest[0], 1);
      assert.equal(dest[1], 2);
    });

    it("\"extends\" a non-typed array to a shorter length", () => {
      var src = arrays.create(2, 0, "regular"),
        dest;

      src[0] = 1;
      src[1] = 2;
      dest = extend(src, 1);

      assert.deepEqual(dest, [1]);
    });
  });

  describe("between", () => {
    const between = arrays.between;
    it("3 is between 2 and 4", () => {
      assert.isTrue(between(2, 4, 3));
    });
    it("1 is not between 2 and 4", () => {
      assert.isFalse(between(2, 4, 1));
    });
    it("2 is not between 2 and 4", () => {
      assert.isFalse(between(2, 4, 2));
    });
    it("4 is not between 2 and 4", () => {
      assert.isFalse(between(2, 4, 4));
    });
    it("5 is not between 2 and 4", () => {
      assert.isFalse(between(2, 4, 5));
    });
  });

  describe("max", () => {
    const max = arrays.max;
    it("find max in simple array", () => {
      assert.equal(max([0, 1, 2, 3]), 3);
    });
    it("find max in array with duplicate max values", () => {
      assert.equal(max([3, 0, 1, 2, 3]), 3);
    });
    it("find max in array with negative and positive numbers", () => {
      assert.equal(max([3, -1, 0, 1, 2, 3]), 3);
    });
    it("find max in array of all negative numbers", () => {
      assert.equal(max([-8, -7, -4, -3]), -3);
    });
  });

  describe("min", () => {
    const min = arrays.min;
    it("find min in simple array", () => {
      assert.equal(min([0, 1, 2, 3]), 0);
    });
    it("find min in array with duplicate min values", () => {
      assert.equal(min([3, 0, 1, 2, 0]), 0);
    });
    it("find min in array with negative and positive numbers", () => {
      assert.equal(min([3, -1, 0, 1, 2, 3]), -1);
    });
    it("find min in array of all negative numbers", () => {
      assert.equal(min([-8, -7, -4, -3]), -8);
    });
  });

  describe("maxAnyArray", () => {
    const maxAnyArray = arrays.maxAnyArray;
    it("find max in any array type in simple array", () => {
      assert.equal(maxAnyArray([0, 1, 2, 3]), 3);
    });
    it("find max in any array type with duplicate max values", () => {
      assert.equal(maxAnyArray([3, 0, 1, 2, 3]), 3);
    });
    it("find max in any array type with negative and positive numbers", () => {
      assert.equal(maxAnyArray([3, -1, 0, 1, 2, 3]), 3);
    });
    it("find max in any array type of all negative numbers", () => {
      assert.equal(maxAnyArray([-8, -7, -4, -3]), -3);
    });
  });

  describe("minAnyArray", () => {
    const minAnyArray = arrays.minAnyArray;
    it("find min in any array type in simple array", () => {
      assert.equal(minAnyArray([0, 1, 2, 3]), 0);
    });
    it("find min in any array type with duplicate min values", () => {
      assert.equal(minAnyArray([3, 0, 1, 2, 0]), 0);
    });
    it("find min in any array type with negative and positive numbers", () => {
      assert.equal(minAnyArray([3, -1, 0, 1, 2, 3]), -1);
    });
    it("find min in any array type of all negative numbers", () => {
      assert.equal(minAnyArray([-8, -7, -4, -3]), -8);
    });
  });

  describe("average", () => {
    const average = arrays.average;
    it("find average in in simple array", () => {
      assert.equal(average([0, 1, 2, 3]), 1.5);
    });
    it("find average in any array type with duplicate min values", () => {
      assert.equal(average([3, 0, 1, 2, 0]), 1.2);
    });
  });

  describe("remove", () => {
    const remove = arrays.remove;
    it("remove element from simple array", () => {
      assert.deepEqual(remove([0, 1, 2, 3], 0), [1, 2, 3]);
      assert.deepEqual(remove([0, 1, 2, 3], 1), [0, 2, 3]);
      assert.deepEqual(remove([0, 1, 2, 3], 2), [0, 1, 3]);
      assert.deepEqual(remove([0, 1, 2, 3], 3), [0, 1, 2]);
    });
  });
});

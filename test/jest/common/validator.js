import validator from "common/validator";

describe("validator module", function () {
  var metadata;

  beforeEach(function () {
    metadata = {
      requiredProp: {
        required: true
      },
      optionalProp: {
        defaultValue: -1,
        conflictsWith: ["conflictingProp"]
      },
      readOnlyProp: {
        readOnly: true
      },
      immutableProp: {
        immutable: true
      },
      conflictingProp: {
        conflictsWith: ["optionalProp"]
      }
    };
  });

  describe(".validate()", function () {
    it("should fail when an incorrect arguments are provided", function () {
      // The input is incorrect.
      var input = {
        optionalProp: 1
      };
      (function () {
        validator.validate();
      }).should.throwError();
      (function () {
        validator.validate(input);
      }).should.throwError();
      (function () {
        validator.validate(metadata);
      }).should.throwError();
    });

    it("should return validated object for correct input", function () {
      var input, result;

      // Case 1.
      input = {
        optionalProp: 1
      };
      result = validator.validate(metadata, input);

      result.optionalProp.should.equal(1);
      // Why? This is validate() method supposed to be used during
      // objct properties update. For 'required' meta-property check,
      // use validateCompleteness()!
      result.should.not.have.property("requiredProp");
      result.should.not.have.property("readOnlyProp");

      // Case 2.
      input = {
        requiredProp: 1,
        optionalProp: 2
      };
      result = validator.validate(metadata, input);

      result.requiredProp.should.equal(1);
      result.optionalProp.should.equal(2);
      result.should.not.have.property("readOnlyProp");
    });

    it("should filter out properties not present in meta model", function () {
      var input = {
          optionalProp: 1,
          someOtherProp: 2
        },
        result = validator.validate(metadata, input);

      result.optionalProp.should.equal(1);
      result.should.not.have.property("someOtherProp");
    });

    it("should fail when input contains read-only properties", function () {
      var input = {
        readOnlyProp: 1
      };

      (function () {
        validator.validate(metadata, input);
      }).should.throwError();
    });

    it("should fail when input contains immutable properties", function () {
      var input = {
        immutableProp: 1
      };

      (function () {
        validator.validate(metadata, input);
      }).should.throwError();
    });

    it("should detect conflicting properties", function () {
      var input = {
        optionalProp: 1,
        conflictingProp: 2
      };

      (function () {
        validator.validate(metadata, input);
      }).should.throwError();
    });
  });


  describe(".validateCompleteness()", function () {
    it("should fail when an incorrect arguments are provided", function () {
      // The input is correct.
      var input = {
        requiredProp: 1
      };
      (function () {
        validator.validateCompleteness();
      }).should.throwError();
      (function () {
        validator.validateCompleteness(input);
      }).should.throwError();
      (function () {
        validator.validateCompleteness(metadata);
      }).should.throwError();
    });

    it("should return a deep copy of an input object", function () {
      var input = {
          requiredProp: {
            a: 1
          },
          optionalProp: [
            {b: 2},
            {c: 3}
          ]
        },
        result = validator.validateCompleteness(metadata, input);

      // Of course objects should be indentical.
      result.should.eql(input);
      // However, object returned by validator should be a deep copy of input.
      // So, strict equality should fail.
      result.should.not.equal(input);
      // The same applies to objects in arrays.
      result.optionalProp[0].should.not.equal(input.optionalProp[0]);
      result.optionalProp[1].should.not.equal(input.optionalProp[1]);
    });

    describe("when a default value is available", function () {
      describe("and it is basic type like number", function () {
        it("validation should use it if the input property is undefined", function () {
          var input = {
              requiredProp: 1
            },
            result = validator.validateCompleteness(metadata, input);

          result.requiredProp.should.equal(1);
          // Default value -1 should be used.
          result.optionalProp.should.equal(-1);
          // This property is not required, but it also doesn't define default value.
          result.should.not.have.property("readOnlyProp");
        });

        it("validation should not use it if the input property is null", function () {
          var input = {
              requiredProp: 1,
              optionalProp: null
            },
            result = validator.validateCompleteness(metadata, input);

          result.requiredProp.should.equal(1);
          // Default value -1 shouldn't be used, null is a legal value for a property.
          should.equal(result.optionalProp, null);
          // This property is not required, but it also doesn't define default value.
          result.should.not.have.property("readOnlyProp");
        });

        it("validation should not use it if the input property is already defined", function () {
          var input = {
              requiredProp: 1,
              optionalProp: 2
            },
            result = validator.validateCompleteness(metadata, input);

          result.requiredProp.should.equal(1);
          // Default value -1 should be used.
          result.optionalProp.should.equal(2);
          // This property is not required, but it also doesn't define default value.
          result.should.not.have.property("readOnlyProp");
        });
      });

      describe("and it is an array", function () {

        beforeEach(function () {
          metadata.optionalProp = {
            defaultValue: [1, 2, 3]
          };
        });

        it("validation should use it if the input property is undefined", function () {
          var input = {
              requiredProp: 1
            },
            result = validator.validateCompleteness(metadata, input);

          result.requiredProp.should.equal(1);
          // Default value should be used.
          result.optionalProp.should.eql(metadata.optionalProp.defaultValue);
          // But new array should be created, copying reference is not enough!
          result.optionalProp.should.not.equal(metadata.optionalProp.defaultValue);
        });

        it("validation should not use it if the input property is already defined", function () {
          var input = {
              requiredProp: 1,
              optionalProp: [1, 2]
            },
            result = validator.validateCompleteness(metadata, input);

          result.requiredProp.should.equal(1);
          // Default value -1 should be used.
          result.optionalProp.should.eql([1, 2]);
        });

        // Note that arrays are treated more or less like basic types. We are not
        // extending arrays, filling them with missing values etc. Array specified
        // as a default value will be used in case when property is undefined.
        // No nested merging like for objects.
      });

      describe("and it is an object", function () {

        beforeEach(function () {
          metadata.optionalProp = {
            defaultValue: {
              a: 1,
              b: 2,
              c: 3
            }
          };
        });

        it("validation should use it if the input property is undefined", function () {
          var input = {
              requiredProp: 1
            },
            result = validator.validateCompleteness(metadata, input);

          result.requiredProp.should.equal(1);
          // Default value should be used.
          result.optionalProp.should.eql(metadata.optionalProp.defaultValue);
          // But new object should be created, copying of reference is not enough!
          result.optionalProp.should.not.equal(metadata.optionalProp.defaultValue);
          // This property is not required, but it also doesn't define default value.
          result.should.not.have.property("readOnlyProp");
        });

        it("validation should not use it if the input property is null", function () {
          var input = {
              requiredProp: 1,
              optionalProp: null
            },
            result = validator.validateCompleteness(metadata, input);

          result.requiredProp.should.equal(1);
          should.equal(result.optionalProp, null);
          // This property is not required, but it also doesn't define default value.
          result.should.not.have.property("readOnlyProp");
        });

        it("validation should not use it if the input property is already defined as basic type", function () {
          var input = {
              requiredProp: 1,
              optionalProp: 2
            },
            result = validator.validateCompleteness(metadata, input);

          result.requiredProp.should.equal(1);
          result.optionalProp.should.equal(2);
          // This property is not required, but it also doesn't define default value.
          result.should.not.have.property("readOnlyProp");
        });

        it("validation should use it if the input property is empty object", function () {
          var input = {
              requiredProp: 1,
              optionalProp: {}
            },
            result = validator.validateCompleteness(metadata, input);

          result.requiredProp.should.equal(1);
          // Default value should be used.
          result.optionalProp.should.eql(metadata.optionalProp.defaultValue);
          // But new object should be created, copying of reference is not enough!
          result.optionalProp.should.not.equal(metadata.optionalProp.defaultValue);
          // This property is not required, but it also doesn't define default value.
          result.should.not.have.property("readOnlyProp");
        });

        it("validation should use it if the input property is an incomplete object", function () {
          var input = {
              requiredProp: 1,
              optionalProp: {
                b: 15
              }
            },
            result = validator.validateCompleteness(metadata, input);

          result.requiredProp.should.equal(1);
          // Default value should be used.
          result.optionalProp.should.eql({a: 1, b: 15, c: 3});
          // And value should be different from defaultValue object.
          result.optionalProp.should.not.eql(metadata.optionalProp.defaultValue);
          // This property is not required, but it also doesn't define default value.
          result.should.not.have.property("readOnlyProp");
        });
      });
    });

    describe("when there is a required property", function () {
      it("validation should fail if the required property is undefined", function () {
        var input = {};

        (function () {
          validator.validateCompleteness(metadata, input);
        }).should.throwError();
      });

      it("validation should not fail when the required property is null", function () {
        var input = {
            requiredProp: null
          },
          result = validator.validateCompleteness(metadata, input);

        should.equal(result.requiredProp, null);
      });
    });

    describe("when there is an immutable property in the input", function () {
      it("it should be accepted", function () {
        // note the difference between validate()!
        var input = {
            requiredProp: 1,
            immutableProp: 2
          },
          result = validator.validateCompleteness(metadata, input);

        result.immutableProp.should.equal(2);
      });
    });
  });
});

/*global describe it beforeEach */

requirejs([
  'common/validator'
], function (validator) {

  var metadata = {
      requiredProp: {
        required: true
      },
      optionalProp: {
        defaultValue: -1
      },
      readOnlyProp: {
        readOnly: true
      },
      immutableProp: {
        immutable: true
      }
    };

  describe('validator module', function() {

    describe('.validate()', function() {
      it('should fail when an incorrect arguments are provided', function () {
        // The input is correct.
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

      it('should return validated object for correct input', function() {
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
        result.should.not.have.property('requiredProp');
        result.should.not.have.property('readOnlyProp');

        // Case 2.
        input = {
          requiredProp: 1,
          optionalProp: 2
        };
        result = validator.validate(metadata, input);

        result.requiredProp.should.equal(1);
        result.optionalProp.should.equal(2);
        result.should.not.have.property('readOnlyProp');
      });

      it('should filter out properties not present in meta model', function () {
        var input = {
              optionalProp: 1,
              someOtherProp: 2
            },
            result = validator.validate(metadata, input);

        result.optionalProp.should.equal(1);
        result.should.not.have.property('someOtherProp');
      });

      it('should fail when input contains read-only properties', function() {
        var input = {
          readOnlyProp: 1
        };

        (function () {
          validator.validate(metadata, input);
        }).should.throwError();
      });

      it('should fail when input contains immutable properties', function() {
        var input = {
          immutableProp: 1
        };

        (function () {
          validator.validate(metadata, input);
        }).should.throwError();
      });
    });


    describe('.validateCompleteness()', function() {
      it('should fail when an incorrect arguments are provided', function () {
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

      describe('when a default value is available', function () {
        it('validation should use it if the input property is undefined', function () {
          var input = {
                requiredProp: 1
              },
              result = validator.validateCompleteness(metadata, input);

          result.requiredProp.should.equal(1);
          // Default value -1 should be used.
          result.optionalProp.should.equal(-1);
          // This property is not required, but it also doesn't define default value.
          result.should.not.have.property('readOnlyProp');
        });

        it('validation should use it if the input property is null', function () {
          var input = {
                requiredProp: 1,
                optionalProp: null
              },
              result = validator.validateCompleteness(metadata, input);

          result.requiredProp.should.equal(1);
          // Default value -1 should be used.
          result.optionalProp.should.equal(-1);
          // This property is not required, but it also doesn't define default value.
          result.should.not.have.property('readOnlyProp');
        });

        it('validation should not use it if the input property is already defined', function () {
          var input = {
                requiredProp: 1,
                optionalProp: 2
              },
              result = validator.validateCompleteness(metadata, input);

          result.requiredProp.should.equal(1);
          // Default value -1 should be used.
          result.optionalProp.should.equal(2);
          // This property is not required, but it also doesn't define default value.
          result.should.not.have.property('readOnlyProp');
        });
      });

      describe('when there is a required property', function () {
        it('validation should fail if the required property is undefined', function () {
          var input = {};

          (function () {
            validator.validateCompleteness(metadata, input);
          }).should.throwError();
        });

        it('validation should fail when the required property is null', function () {
          var input = {
            requiredProp: null
          };

          (function () {
            validator.validateCompleteness(metadata, input);
          }).should.throwError();
        });
      });

      describe('when there is an immutable property in the input', function () {
        it('it should be accepted', function () {
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
});

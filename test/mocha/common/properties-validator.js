/*global describe it beforeEach */

requirejs([
  'common/properties-validator'
], function (PropertiesValidator) {

  var metaModel = {
    someType: {
      requiredProp: {
        required: true
      },
      optionalProp: {
        defaultValue: -1
      },
      readOnlyProp: {
        readOnly: true
      }
    }
  },
  validator = PropertiesValidator(metaModel);

  describe('PropertiesValidator', function() {

    describe('.validate()', function() {
      it('should fail when an unknown type is provided', function () {
        // The input is correct.
        var input = {
          optionalProp: 1
        };
        (function () {
          // But type is unknown.
          validator.validate('someUnknownType', input);
        }).should.throwError();
      });

      it('should return validated object for correct input', function() {
        var input, result;

        // Case 1.
        input = {
          optionalProp: 1
        };
        result = validator.validate('someType', input);

        result.optionalProp.should.equal(1);
        // Why? This is only validate!
        // For 'required' check, use validateCompleteness!
        result.should.not.have.property('requiredProp');
        result.should.not.have.property('readOnlyProp');

        // Case 2.
        input = {
          requiredProp: 1,
          optionalProp: 2
        };
        result = validator.validate('someType', input);

        result.requiredProp.should.equal(1);
        result.optionalProp.should.equal(2);
        result.should.not.have.property('readOnlyProp');
      });

      it('should filter out properties not present in meta model', function () {
        var input = {
              optionalProp: 1,
              someOtherProp: 2
            },
            result = validator.validate('someType', input);

        result.optionalProp.should.equal(1);
        result.should.not.have.property('someOtherProp');
      });

      it('should fail when input contains read-only properties', function() {
        var input = {
          readOnlyProp: 1
        };

        (function () {
          validator.validate('someType', input);
        }).should.throwError();
      });
    });


    describe('.validateCompleteness()', function() {
      it('should fail when an unknown type is provided', function () {
        // The input is correct.
        var input = {
          requiredProp: 1
        };
        (function () {
          // But the type is unknown.
          validator.validateCompleteness('someUnknownType', input);
        }).should.throwError();
      });

      describe('when a default value is available', function () {
        it('validation should use it if the input property is undefined', function () {
          var input = {
                requiredProp: 1
              },
              result = validator.validateCompleteness('someType', input);

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
              result = validator.validateCompleteness('someType', input);

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
              result = validator.validateCompleteness('someType', input);

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
            validator.validateCompleteness('someType', input);
          }).should.throwError();
        });

        it('validation should fail when the required property is null', function () {
          var input = {
            requiredProp: null
          };

          (function () {
            validator.validateCompleteness('someType', input);
          }).should.throwError();
        });
      });
    });
  });
});

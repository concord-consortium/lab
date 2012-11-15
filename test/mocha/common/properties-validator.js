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
      it('should use default values when some properties are not defined in input', function () {
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

      it('should fail when input does not contain required properties', function () {
        var input = {
          optionalProp: 1
        };

        (function () {
          validator.validateCompleteness('someType', input);
        }).should.throwError();
      });
    });
  });
});

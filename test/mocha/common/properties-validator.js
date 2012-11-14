/*global describe it beforeEach */

var should    = require('should'),
    requirejs = require('requirejs'),
    config    = require('../../requirejs-config');

// Use Lab RequireJS configuration.
requirejs.config(config.labConfig);

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
          optionalProp: 234
        };
        result = validator.validate('someType', input);

        result.optionalProp.should.equal(234);
        // Why? This is only validate!
        // For 'required' check, use validateCompleteness!
        result.should.not.have.property('requiredProp');
        result.should.not.have.property('readOnlyProp');

        // Case 2.
        input = {
          requiredProp: 123,
          optionalProp: 234
        };
        result = validator.validate('someType', input);

        result.requiredProp.should.equal(123);
        result.optionalProp.should.equal(234);
        result.should.not.have.property('readOnlyProp');
      });

      it('should fail while input contains read-only properties', function() {
        var input = {
          readOnlyProp: 123
        };

        (function () {
          validator.validate('someType', input);
        }).should.throwError();
      });
    });

  });

});

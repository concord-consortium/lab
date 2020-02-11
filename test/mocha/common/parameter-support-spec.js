/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();

const PropertySupport  = requirejs('common/property-support');
const ParameterSupport = requirejs('common/parameter-support');

describe("Lab parameters mixin", function() {
  let model = null;
  let setter = null;
  let gravitationalField = 0;

  beforeEach(function() {
    model = {};

    const propertySupport = new PropertySupport({
      types: ["parameter"]});
    const parameterSupport = new ParameterSupport({
      propertySupport});

    propertySupport.mixInto(model);
    parameterSupport.mixInto(model);

    gravitationalField = 0;
    setter = sinon.spy(value => gravitationalField = 10 * value);
    return model.defineParameter('testParameter', {
      property1: 'value'
    }, setter);
  });

  return describe("custom parameters as read/write model properties", function() {

    it("should be possible to set the parameter's value using Model#set and retrieve it using Model#get", function() {
      model.set({testParameter: 1});
      return model.get('testParameter').should.equal(1);
    });

    it("should be possible to retrieve the parameter's property description using Model#getPropertyDescription", () => model.getPropertyDescription('testParameter').getHash().should.eql({ property1: 'value' }));

    return describe("when the parameter's value is set using Model#set", function() {
      let observer = null;

      beforeEach(function() {
        observer = sinon.spy(() => gravitationalField);
        model.addPropertiesListener('testParameter', observer);
        model.set({testParameter: 1});
        return model.get('testParameter').should.equal(1);
      });

      it("should be possible to retrieve the parameter's property description using Model#getPropertyDescription", () => model.getPropertyDescription('testParameter').getHash().should.eql({ property1: 'value' }));

      it("should pass the new parameter value to the setter", () => setter.args[0].should.eql([1]));

      it("should set 'this' inside the setter to be the model object itself", () => setter.thisValues[0].should.equal(model));

      it("should correctly update the other model properties according to the setter definition", () => gravitationalField.should.equal(10));

      it("should notify observers of the parameter property", () => observer.callCount.should.equal(1));

      return describe("the observer", () => it("should be called strictly after the setter acts", () => observer.returnValues[0].should.equal(10)));
    });
  });
});

      // ... I don't think there's any reason to care that observers of properties set by the
      // parameter setter get called before the parameter observer gets called.

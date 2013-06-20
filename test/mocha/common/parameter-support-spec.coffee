helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

PropertySupport  = requirejs 'common/property-support'
ParameterSupport = requirejs 'common/parameter-support'

describe "Lab parameters mixin", ->
  model = null
  setter = null
  gravitationalField = 0

  beforeEach ->
    model = {}

    propertySupport = new PropertySupport
      types: ["parameter"]
    parameterSupport = new ParameterSupport
      propertySupport: propertySupport

    propertySupport.mixInto model
    parameterSupport.mixInto model

    gravitationalField = 0
    setter = sinon.spy (value) ->
      gravitationalField = 10 * value
    model.defineParameter 'testParameter', {
      property1: 'value'
    }, setter

  describe "custom parameters as read/write model properties", ->

    it "should be possible to set the parameter's value using Model#set and retrieve it using Model#get", ->
      model.set testParameter: 1
      model.get('testParameter').should.equal 1

    it "should be possible to retrieve the parameter's property description using Model#getPropertyDescription", ->
      model.getPropertyDescription('testParameter').getHash().should.eql { property1: 'value' }

    describe "when the parameter's value is set using Model#set", ->
      observer = null

      beforeEach ->
        observer = sinon.spy ->
          gravitationalField
        model.addPropertiesListener 'testParameter', observer
        model.set testParameter: 1
        model.get('testParameter').should.equal 1

      it "should be possible to retrieve the parameter's property description using Model#getPropertyDescription", ->
        model.getPropertyDescription('testParameter').getHash().should.eql { property1: 'value' }

      it "should pass the new parameter value to the setter", ->
        setter.args[0].should.eql [1]

      it "should set 'this' inside the setter to be the model object itself", ->
        setter.thisValues[0].should.equal model

      it "should correctly update the other model properties according to the setter definition", ->
        gravitationalField.should.equal 10

      it "should notify observers of the parameter property", ->
        observer.callCount.should.equal 1

      describe "the observer", ->
        it "should be called strictly after the setter acts", ->
          observer.returnValues[0].should.equal 10

      # ... I don't think there's any reason to care that observers of properties set by the
      # parameter setter get called before the parameter observer gets called.

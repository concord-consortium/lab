/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();

const PropertySupport  = requirejs('common/property-support');
const OutputSupport = requirejs('common/output-support');

describe("Lab outputs mixin", function() {
  let model = null;
  return describe("an output property defined using Model#defineOutput", function() {
    before(function() {
      model = {};

      const propertySupport = new PropertySupport({
        types: ["output"]});
      const outputSupport = new OutputSupport({
        propertySupport});

      propertySupport.mixInto(model);
      outputSupport.mixInto(model);

      return model.defineOutput('testProperty', {
        property1: 'value'
      }, () => 10);
    });

    it("can be accessed using Model#get", () => model.get('testProperty').should.equal(10));

    it("cannot be overwritten using Model#set", function() {
      ((() => model.set({testProperty: 0}))).should.throw();
      return model.get('testProperty').should.equal(10);
    });

    it("can have its description retrieved by Model#getPropertyDescription", () => model.getPropertyDescription('testProperty').getHash().should.eql({ property1: 'value' }));

    return it("can be observed", function() {
      const observer = sinon.spy();
      model.addPropertiesListener('testProperty', observer);
      observer.called.should.not.be.true;
      model.updateAllOutputProperties();
      return observer.called.should.be.true;
    });
  });
});

describe("property caching", function() {
  let model = null;
  const forceRecomputation = () => model.set({gravitationalField: 1});
  let calculator = null;

  beforeEach(function() {
    model = {};

    const propertySupport = new PropertySupport({
      types: ["output"]});
    const outputSupport = new OutputSupport({
      propertySupport});

    propertySupport.mixInto(model);
    outputSupport.mixInto(model);

    // Define property which invalidates computed properties.
    propertySupport.defineProperty("gravitationalField", {
      beforeSetCallback: propertySupport.invalidatingChangePreHook,
      afterSetCallback: propertySupport.invalidatingChangePostHook
    }
    );

    calculator = sinon.spy();
    return model.defineOutput('testProperty', {}, calculator);
  });

  describe("the first time a property is looked up", function() {
    beforeEach(function() {
      calculator.callCount.should.equal(0);
      return model.get('testProperty');
    });

    it("should be recomputed", () => calculator.callCount.should.equal(1));

    describe("the second time the property is looked up", function() {
      beforeEach(function() {
        calculator.reset();
        return model.get('testProperty');
      });

      return it("should not be recomputed", () => calculator.callCount.should.equal(0));
    });

    describe("after all outputs are told to be updated", function() {
      beforeEach(() => model.updateAllOutputProperties());

      return describe("and the property is looked up", function() {
        beforeEach(function() {
          calculator.reset();
          return model.get('testProperty');
        });

        return it("should be recomputed", () => calculator.callCount.should.equal(1));
      });
    });

    return describe("after a change forces recomputation of output properties", function() {
      beforeEach(() => forceRecomputation());

      return describe("and the output property is looked up", function() {
        beforeEach(function() {
          calculator.reset();
          return model.get('testProperty');
        });

        return it("should be recomputed", () => calculator.callCount.should.equal(1));
      });
    });
  });

  return describe("in the presence of property observers", function() {
    describe("a cached property that has no observers", function() {
      let nonObservedCalculator = null;
      beforeEach(function() {
        nonObservedCalculator = sinon.stub().returns(1);
        model.defineOutput('nonObservedProperty', {}, nonObservedCalculator);
        model.get('nonObservedProperty').should.equal(1);
        return nonObservedCalculator.reset();
      });

      describe("and that is not depended on by an observed property", () => describe("when a change forces recomputation of output properties", function() {
        beforeEach(() => forceRecomputation());

        return it("should not be recomputed", () => nonObservedCalculator.callCount.should.equal(0));
      }));

      return describe("but that is depended on by an observed property", function() {
        beforeEach(function() {
          model.defineOutput('observedProperty', {}, () => model.get('nonObservedProperty') + 1);
          return model.addPropertiesListener('observedProperty', function() {});
        });

        describe("when a change forces recomputation of output properties", function() {
          beforeEach(() => forceRecomputation());

          it("should be recomputed", () => nonObservedCalculator.callCount.should.equal(1));

          return describe("when accessed again", function() {
            beforeEach(function() {
              nonObservedCalculator.reset();
              return model.get('nonObservedProperty').should.equal(1);
            });

            return it("should not be recomputed", () => nonObservedCalculator.callCount.should.equal(0));
          });
        });

        return describe("and that is additionally depended on by a second observed property", function() {
          beforeEach(function() {
            model.defineOutput('observedProperty2', {}, () => model.get('nonObservedProperty') + 2);
            model.addPropertiesListener('observedProperty2', function() {});
            return nonObservedCalculator.reset();
          });

          return describe("when a change forces recomputation of output properties", function() {
            beforeEach(() => forceRecomputation());

            return it("should be recomputed only once", () => nonObservedCalculator.callCount.should.equal(1));
          });
        });
      });
    });

    return describe("a cached property that has observers", function() {
      let observedCalculator = null;
      beforeEach(function() {
        observedCalculator = sinon.stub().returns(2);
        model.defineOutput('observedProperty', {}, observedCalculator);
        model.addPropertiesListener('observedProperty', function() {});
        model.get('observedProperty').should.equal(2);
        return observedCalculator.reset();
      });

      return describe("when a change forces recomputation of output properties", function() {
        beforeEach(() => forceRecomputation());

        it("is recomputed", () => observedCalculator.callCount.should.equal(1));

        return describe("when accessed again", function() {
          beforeEach(function() {
            observedCalculator.reset();
            return model.get('observedProperty').should.equal(2);
          });

          return it("should not be recomputed", () => observedCalculator.callCount.should.equal(0));
        });
      });
    });
  });
});


describe("property observing", function() {
  let peObserver, timeObserver;
  let model = (peObserver = (timeObserver = null));
  const time = 0;
  const potentialEnergy = 1;

  beforeEach(function() {
    model = {};

    const propertySupport = new PropertySupport({
      types: ["output"]});
    const outputSupport = new OutputSupport({
      propertySupport});

    propertySupport.mixInto(model);
    outputSupport.mixInto(model);

    // Define property which invalidates computed properties.
    propertySupport.defineProperty('gravitationalField', {
      beforeSetCallback: propertySupport.invalidatingChangePreHook,
      afterSetCallback: propertySupport.invalidatingChangePostHook
    }
    );

    model.set("gravitationalField", 1);

    model.defineOutput('potentialEnergy', {
      property1: 'value'
    }, () => potentialEnergy * model.get('gravitationalField'));

    model.defineOutput('time', {
      property1: 'value'
    }, () => time);

    peObserver = sinon.spy();
    model.addPropertiesListener('potentialEnergy', peObserver);
    timeObserver = sinon.spy();
    return model.addPropertiesListener('time', timeObserver);
  });

  describe("mass notification of properties after a Model#updateAllOutputProperties call", function() {
    let initialPE = null;

    beforeEach(function() {
      initialPE = model.get('potentialEnergy');
      return model.updateAllOutputProperties();
    });

    return describe("an observer of a property that did not change in value", () => it("should still be called", function() {
      model.get('potentialEnergy').should.equal(initialPE);
      return peObserver.callCount.should.equal(1);
    }));
  });

  return describe("selective notification of properties after an invalidating change", () => describe("when a model property is changed (invalidating output properties)", function() {
    let initialTime;
    let initialPE = (initialTime = null);

    beforeEach(function() {
      initialPE = model.get('potentialEnergy');
      initialTime = model.get('time');
      return model.set({gravitationalField: 2});
    });

    describe("an observer of a property that changed in value", () => it("should be called", function() {
      model.get('potentialEnergy').should.not.equal(initialPE);
      return peObserver.callCount.should.equal(1);
    }));

    return describe("an observer of a property that did not change in value", () => it("should not be called", function() {
      model.get('time').should.equal(initialTime);
      return timeObserver.callCount.should.equal(0);
    }));
  }));
});

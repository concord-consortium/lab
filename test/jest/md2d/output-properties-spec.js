const helpers = require("../../helpers");
const simpleModel = helpers.getModel("simple-model.json");
import Model from "../../../src/lab/models/md2d/models/modeler";

let model = null;

describe("MD2D output properties", function () {
  describe("default properties and their initial values", function () {
    beforeAll(() => model = new Model(simpleModel));

    describe("time", () => {
      it("should be 0", () => {
        model.get("time").should.equal(0);
      });
    });

    describe("kineticEnergy", () => {
      it("should be a non-negative number", function () {
        model.get("kineticEnergy").should.be.a.Number;
        model.get("kineticEnergy").should.not.be.below(0);
      });
    });

    describe("potentialEnergy", () => {
      it("should be a number", () => {
        model.get("potentialEnergy").should.be.a.Number;
      });
    });
  });

  describe("temperature", () => {
    it("should be a non-negative number", function () {
      model.get("temperature").should.be.a.Number;
      model.get("temperature").should.not.be.below(0);
    });
  });
});

describe("custom properties", () => {
  describe("an output property defined using Model#defineOutput", function () {
    beforeAll(function () {
      model = new Model(simpleModel);
      model.defineOutput("testProperty", {
        property1: "value"
      }, () => model.get("time") + 10);
    });

    it("can be accessed using Model#get", () => {
      model.get("testProperty").should.equal(10);
    });

    it("cannot be overwritten using Model#set", function () {
      ((() => model.set({testProperty: 0}))).should.throw();
      model.get("testProperty").should.equal(10);
    });

    it("can have its description retrieved by Model#getPropertyDescription", () => {
      model.getPropertyDescription("testProperty").getHash().should.eql({property1: "value"});
    });

    it("can be observed", function () {
      const observer = sinon.spy();
      model.addPropertiesListener("testProperty", observer);
      observer.called.should.not.be.true;
      model.tick();
      observer.called.should.be.true;
    });
  });
});

describe("property caching", function () {
  const forceRecomputation = () => model.set({gravitationalField: 1});
  let calculator = null;
  beforeEach(function () {
    model = new Model(simpleModel);
    calculator = sinon.spy();
    model.defineOutput("testProperty", {}, calculator);
  });

  describe("the first time a property is looked up", function () {
    beforeEach(function () {
      calculator.callCount.should.equal(0);
      model.get("testProperty");
    });

    it("should be recomputed", () => {
      calculator.callCount.should.equal(1);
    });

    describe("the second time the property is looked up", function () {
      beforeEach(function () {
        calculator.reset();
        model.get("testProperty");
      });

      it("should not be recomputed", () => {
        calculator.callCount.should.equal(0);
      });
    });

    describe("after the model is stepped forward", function () {
      beforeEach(() => model.tick());

      describe("and the property is looked up", function () {
        beforeEach(function () {
          calculator.reset();
          model.get("testProperty");
        });

        it("should be recomputed", () => {
          calculator.callCount.should.equal(1);
        });
      });
    });

    describe("after a change forces recomputation of output properties", function () {
      beforeEach(() => forceRecomputation());

      describe("and the output property is looked up", function () {
        beforeEach(function () {
          calculator.reset();
          return model.get("testProperty");
        });

        it("should be recomputed", () => {
          calculator.callCount.should.equal(1);
        });
      });
    });
  });

  describe("in the presence of property observers", function () {
    describe("a cached property that has no observers", function () {
      let nonObservedCalculator = null;
      beforeEach(function () {
        nonObservedCalculator = sinon.stub().returns(1);
        model.defineOutput("nonObservedProperty", {}, nonObservedCalculator);
        model.get("nonObservedProperty").should.equal(1);
        nonObservedCalculator.reset();
      });

      describe("and that is not depended on by an observed property", () => {
        describe("when a change forces recomputation of output properties", function () {
          beforeEach(() => forceRecomputation());

          it("should not be recomputed", () => {
            nonObservedCalculator.callCount.should.equal(0);
          });
        });
      });

      describe("but that is depended on by an observed property", function () {
        beforeEach(function () {
          model.defineOutput("observedProperty", {}, () => model.get("nonObservedProperty") + 1);
          model.addPropertiesListener("observedProperty", function () {
          });
        });

        describe("when a change forces recomputation of output properties", function () {
          beforeEach(() => forceRecomputation());

          it("should be recomputed", () => {
            nonObservedCalculator.callCount.should.equal(1);
          });

          describe("when accessed again", function () {
            beforeEach(function () {
              nonObservedCalculator.reset();
              model.get("nonObservedProperty").should.equal(1);
            });

            it("should not be recomputed", () => {
              nonObservedCalculator.callCount.should.equal(0);
            });
          });
        });

        describe("and that is additionally depended on by a second observed property", function () {
          beforeEach(function () {
            model.defineOutput("observedProperty2", {}, () => model.get("nonObservedProperty") + 2);
            model.addPropertiesListener("observedProperty2", function () {
            });
            nonObservedCalculator.reset();
          });

          describe("when a change forces recomputation of output properties", function () {
            beforeEach(() => forceRecomputation());

            it("should be recomputed only once", () => {
              nonObservedCalculator.callCount.should.equal(1);
            });
          });
        });
      });
    });

    describe("a cached property that has observers", function () {
      let observedCalculator = null;
      beforeEach(function () {
        observedCalculator = sinon.stub().returns(2);
        model.defineOutput("observedProperty", {}, observedCalculator);
        model.addPropertiesListener("observedProperty", function () {
        });
        model.get("observedProperty").should.equal(2);
        observedCalculator.reset();
      });

      describe("when a change forces recomputation of output properties", function () {
        beforeEach(() => forceRecomputation());

        it("is recomputed", () => {
          observedCalculator.callCount.should.equal(1);
        });

        describe("when accessed again", function () {
          beforeEach(function () {
            observedCalculator.reset();
            model.get("observedProperty").should.equal(2);
          });

          it("should not be recomputed", () => {
            observedCalculator.callCount.should.equal(0);
          });
        });
      });
    });
  });
});


describe("property observing", function () {
  let timeObserver;
  let peObserver = (timeObserver = null);

  beforeEach(function () {
    model = new Model(simpleModel);
    // forces potential energy to be 0 (until gravitation is turned on)
    model.set({lennardJonesForces: false});
    peObserver = sinon.spy();
    model.addPropertiesListener("potentialEnergy", peObserver);
    timeObserver = sinon.spy();
    model.addPropertiesListener("time", timeObserver);
  });

  describe("mass notification of properties after a model step", () => {
    describe("when the model is stepped forward", function () {
      let initialPE = null;

      beforeEach(function () {
        initialPE = model.get("potentialEnergy");
        model.tick();
      });

      describe("an observer of a property that did not change in value", () => {
        it("should still be called", function () {
          model.get("potentialEnergy").should.equal(initialPE);
          peObserver.callCount.should.equal(1);
        });
      });
    });
  });

  describe("selective notification of properties after an invalidating change", () => {
    describe("when a model property is changed (invalidating output properties)", function () {
      let initialTime;
      let initialPE = (initialTime = null);

      beforeEach(function () {
        initialPE = model.get("potentialEnergy");
        initialTime = model.get("time");
        model.set({gravitationalField: 1});
      });

      describe("an observer of a property that changed in value", () => {
        it("should be called", function () {
          model.get("potentialEnergy").should.not.equal(initialPE);
          peObserver.callCount.should.equal(1);
        });
      });

      describe("an observer of a property that did not change in value", () => {
        it("should not be called", function () {
          model.get("time").should.equal(initialTime);
          timeObserver.callCount.should.equal(0);
        });
      });
    });
  });
});

/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const assert  = require('assert');
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();
// simple-model is useful because it has properties that are guaranteed to change every tick
const simpleModel = helpers.getModel('simple-model.json');

helpers.withIsolatedRequireJS(function(requirejs) {
  // mock the Graph, which depends on Canvas and SVG internals that don't work in jsdom
  const mock = {
    Graph() {
      return {
        addPoints:       sinon.spy(),
        addPointListener: sinon.spy(),
        resetPoints:     sinon.spy(),
        updateOrRescale: sinon.spy(),
        reset:           sinon.spy(),
        repaint:         sinon.spy(),
        xLabel:          sinon.spy(),
        yLabel:          sinon.spy()
      };
    }
  };

  requirejs.define('lab-grapher', [], () => // Just a function that calls through to mock.Graph, while allowing mock.Graph to
  // be replaced with a stub or spy at any time.
  (function() { return mock.Graph(...arguments); }));

  const GraphController = requirejs('common/controllers/graph-controller');
  const Model           = requirejs('models/md2d/models/modeler');
  const DataSet         = requirejs('common/controllers/data-set');

  class MockInteractivesController {
    constructor() {
      this.modelResetCallbacks = [];
      this.modelLoadedCallbacks = [];
    }

    on(event, callback) {
      if (event === 'modelReset') { this.modelResetCallbacks.push(callback); }
      if (event === 'modelLoaded') { return this.modelLoadedCallbacks.push(callback); }
    }

    loadModel() {
      this.model = loadModel();
      return this.modelLoadedCallbacks.forEach(cb => cb('initialLoad'));
    }

    getModel() {
      return this.model;
    }

    getScriptingAPI() {
      return this.scriptingAPI;
    }

    getNextTabIndex() {}

    reloadModel(opts) {
      this.model.willReset();
      this.model = loadModel();
      return this.modelLoadedCallbacks.forEach(cb => cb('reload'));
    }

    resetModel(opts) {
      if (!opts) { opts = { cause: 'reset' }; }
      this.model.willReset();
      this.model.reset();
      return this.modelResetCallbacks.forEach(cb => cb(opts.cause));
    }

    addDataSet(ds, priv) {}
  }

  var loadModel = function() {
    let model;
    return model = new Model(simpleModel);
  };

  const getComponentSpec = () => ({
    id: 'graphContainerId',
    type: 'graph',
    properties: ['potentialEnergy', 'kineticEnergy']
  });

  // actual tests
  return describe("GraphController", function() {
    const graphController = null;
    let interactivesController = null;
    let model = null;

    beforeEach(function() {
      interactivesController = new MockInteractivesController();
      interactivesController.loadModel();
      return model = interactivesController.model;
    });

    it("should exist", () => should.exist(GraphController));

    it("should act as a constructor that accepts the component spec as its argument", function() {
      const controller = new GraphController(getComponentSpec(), interactivesController);
      return should.exist(controller);
    });

    describe("A GraphController instance", function() {
      let controller = null;

      beforeEach(() => controller = new GraphController(getComponentSpec(), interactivesController));

      it("should have a getViewContainer method", () => controller.should.have.property('getViewContainer'));

      describe("getViewContainer", function() {
        it("should return a jQuery selection when getViewContainer is called", function() {
          const $container = controller.getViewContainer();
          return $container.should.be.instanceof($().constructor);
        });

        return describe("the returned view container", function() {
          let $container = null;
          beforeEach(() => $container = controller.getViewContainer());

          it("should contain a single element", () => $container.should.have.length(1));

          return describe("the element", function() {
            it("should have the id specified in the component spec", () => $container.attr('id').should.equal(getComponentSpec().id));

            return it("should have class .graph", () => $container.hasClass('graph').should.be.true);
          });
        });
      });

      it("should have a getView method", () => controller.should.have.property('getView'));

      it("should have a modelLoadedCallback method", () => controller.should.have.property('modelLoadedCallback'));

      describe("modelLoadedCallback", function() {
        beforeEach(() => sinon.spy(mock, 'Graph'));
        afterEach(() => mock.Graph.restore());

        it("should call the Graph constructor", function() {
          controller.modelLoadedCallback();
          return mock.Graph.callCount.should.equal(1);
        });

        it("should pass the DIV DOM element to the Graph constructor", function() {
          controller.modelLoadedCallback();
          mock.Graph.getCall(0).args[0].tagName.should.eql("DIV");
          return mock.Graph.getCall(0).args[0].id.should.eql(getComponentSpec().id);
        });

        it("should create a Graph instance which is returned by #getView", function() {
          should.not.exist(controller.getView());
          controller.modelLoadedCallback();
          return controller.getView().should.equal(mock.Graph.returnValues[0]);
      });

        return it("should call grapher.reset when called a second time", function() {
          controller.modelLoadedCallback();
          const grapher = mock.Graph.returnValues[0];
          controller.modelLoadedCallback();
          return grapher.reset.callCount.should.equal(1);
        });
      });

      return describe("interaction with model", function() {
        let grapher = null;
        beforeEach(function() {
          sinon.spy(mock, 'Graph');
          // In normal environment dataSet.modelLoadedCallback is called by interactives controller.
          controller.getDataSet().modelLoadedCallback();
          controller.modelLoadedCallback();
          return grapher = mock.Graph.returnValues[0];});
        afterEach(() => mock.Graph.restore());

        describe("when the grapher is initialized", function() {
          it("should call grapher.resetPoints", () => grapher.resetPoints.callCount.should.equal(1));

          it("should pass an array of length 2 to resetPoints", function() {
            const newData = grapher.resetPoints.getCall(0).args[0];
            return newData.should.have.length(2);
          });

          return describe("the array passed to resetPoints", () => it("should contain 2 arrays, each with the initial value of one of component.properties", function() {
            const newData = grapher.resetPoints.getCall(0).args[0];
            return newData.should.eql([ [ [0, model.get('potentialEnergy')] ], [[0, model.get('kineticEnergy')] ] ]);
        }));
      });

        describe("after 1 model tick", function() {
          beforeEach(function() {
            grapher.addPoints.reset();
            grapher.resetPoints.reset();
            return model.tick();
          });

          it("should not call grapher.resetPoints", () => grapher.resetPoints.callCount.should.equal(0));

          it("should call grapher.addPoints", () => grapher.addPoints.callCount.should.equal(1));

          return describe("the argument to addPoints", () => it("should be an array with the new value of each of component.properties", function() {
            const dataPoint = grapher.addPoints.getCall(0).args[0];
            const pePoint = [model.get('displayTime'), model.get('potentialEnergy')];
            const kePoint = [model.get('displayTime'), model.get('kineticEnergy')];
            return dataPoint.should.eql([ pePoint , kePoint  ]);
        }));
      });

        describe("after 2 model ticks", function() {
          beforeEach(function() {
            model.tick();
            return model.tick();
          });

          describe("followed by a stepBack", function() {
            beforeEach(function() {
              grapher.updateOrRescale.reset();
              grapher.addPoints.reset();
              return model.stepBack();
            });

            it("should call grapher.updateOrRescale(1)", function() {
              grapher.updateOrRescale.callCount.should.equal(1);
              return grapher.updateOrRescale.getCall(0).args.should.eql([1]);
          });

            it("should not call grapher.resetPoints", () => grapher.addPoints.callCount.should.equal(0));

            return describe("followed by a stepForward", function() {
              beforeEach(function() {
                grapher.updateOrRescale.reset();
                grapher.addPoints.reset();
                return model.stepForward();
              });

              it("should call grapher.updateOrRescale(2)", function() {
                grapher.updateOrRescale.callCount.should.equal(1);
                return grapher.updateOrRescale.getCall(0).args.should.eql([2]);
            });

              return it("should not call grapher.resetPoints", () => grapher.addPoints.callCount.should.equal(0));
            });
          });

          describe("followed by seek(1)", function() {
            beforeEach(function() {
              grapher.updateOrRescale.reset();
              grapher.addPoints.reset();
              return model.seek(1);
            });

            it("should call grapher.updateOrRescale(1)", function() {
              grapher.updateOrRescale.callCount.should.equal(1);
              return grapher.updateOrRescale.getCall(0).args.should.eql([1]);
          });

            return it("should not call grapher.resetPoints", () => grapher.addPoints.callCount.should.equal(0));
          });

          return describe("followed by a model reset", function() {
            beforeEach(function() {
              grapher.reset.reset();
              grapher.addPoints.reset();
              return model.reset();
            });

            it("should call grapher.reset", () => grapher.reset.callCount.should.equal(1));

            it("should pass options to grapher.reset", function() {
              grapher.reset.getCall(0).args.should.have.length(2);
              const options = grapher.reset.getCall(0).args[1];
              return options.should.be.an.Object;
            });

            it("should pass 1 array of length 2 to resetPoints", function() {
              const newData = grapher.resetPoints.getCall(0).args[0];
              return newData.should.have.length(2);
            });

            return describe("the array passed to resetPoints", () => it("should contain 2 arrays, each with the initial value of one of component.properties", function() {
              const newData = grapher.resetPoints.getCall(0).args[0];
              return newData.should.eql([ [ [0, model.get('potentialEnergy')] ], [ [0, model.get('kineticEnergy')] ] ]);
          }));
        });
      });

        return describe("an invalidating property change, after 2 model ticks and a stepBack", function() {
          let expectedData = null;
          beforeEach(function() {
            model.reset();
            expectedData = [[],[]];
            const pePoint0 = [model.get('displayTime'), model.get('potentialEnergy')];
            const kePoint0 = [model.get('displayTime'), model.get('kineticEnergy')];
            expectedData[0].push(pePoint0);
            expectedData[1].push(kePoint0);

            model.tick();

            model.tick();
            model.stepBack();

            grapher.addPoints.reset();
            grapher.resetPoints.reset();
            grapher.reset.reset();

            // This should invalidate the third data point (corresponding to stepCounter == 2)
            // and update second point (corresponding to stepCounter == 1). Gravitation field
            // obviously affects potential and total energy. That's why we collect values here
            // and not right after the first tick.
            model.set({gravitationalField: 1e-5});
            const pePoint1 = [model.get('displayTime'), model.get('potentialEnergy')];
            const kePoint1 = [model.get('displayTime'), model.get('kineticEnergy')];
            expectedData[0].push(pePoint1);
            return expectedData[1].push(kePoint1);
          });

          it("should call grapher.resetPoints", () => grapher.resetPoints.callCount.should.equal(1));

          it("should call grapher.addPoints", () => grapher.addPoints.callCount.should.equal(1));

          describe("the array passed to resetPoints", function() {
            let newData = null;
            beforeEach(() => newData = grapher.resetPoints.getCall(0).args[0]);

            it("should contain 2 arrays", () => newData.should.have.length(2));

            describe("the first element of each array", () => it("should be the original values of each of the properties", function() {
              newData[0][0].should.eql(expectedData[0][0]);
              return newData[1][0].should.eql(expectedData[1][0]);
          }));

            return describe("the second element of each array", () => it("should not exist", function() {
              newData[0].should.have.length(1);
              return newData[1].should.have.length(1);
            }));
          });

          return describe("the array passed to addPoints", function() {
            let newData = null;
            beforeEach(() => newData = grapher.addPoints.getCall(0).args[0]);

            return describe("the element of each array", () => it("should be the post-first-tick values of each of the properties", function() {
              newData[0].should.eql(expectedData[0][1]);
              return newData[1].should.eql(expectedData[1][1]);
          }));
        });
      });
    });
  });


    return describe("handling of graph configuration options in component spec", function() {
      const grapherOptionsForComponentSpec = function(componentSpec) {
        const controller = new GraphController(componentSpec, interactivesController);
        sinon.spy(mock, 'Graph');
        controller.modelLoadedCallback();
        const options = mock.Graph.getCall(0).args[1];
        mock.Graph.restore();
        return options;
      };

      const shouldSendComponentSpecPropertyToGrapherOption = function(cProp, gOption) {
        const componentSpec = getComponentSpec();
        componentSpec[cProp] = 'test value';
        return grapherOptionsForComponentSpec(componentSpec).should.have.property(gOption, 'test value');
      };

      it("should have a default value for 'title'", () => grapherOptionsForComponentSpec(getComponentSpec()).should.have.property('title'));

      it("should respect the component spec property 'title'", () => shouldSendComponentSpecPropertyToGrapherOption('title', 'title'));

      it("should have a default value for 'xlabel'", () => grapherOptionsForComponentSpec(getComponentSpec()).should.have.property('xlabel'));

      it("should respect the component spec property 'xlabel'", () => shouldSendComponentSpecPropertyToGrapherOption('xlabel', 'xlabel'));

      it("should have a default value for 'ylabel'", () => grapherOptionsForComponentSpec(getComponentSpec()).should.have.property('ylabel'));

      it("should respect the component spec property 'ylabel'", () => shouldSendComponentSpecPropertyToGrapherOption('ylabel', 'ylabel'));

      it("should have a default value for 'xmin'", () => grapherOptionsForComponentSpec(getComponentSpec()).should.have.property('xmin'));

      it("should respect the component spec property 'xmin'", () => shouldSendComponentSpecPropertyToGrapherOption('xmin', 'xmin'));

      it("should have a default value for 'xmax'", () => grapherOptionsForComponentSpec(getComponentSpec()).should.have.property('xmax'));

      it("should respect the component spec property 'xmax'", () => shouldSendComponentSpecPropertyToGrapherOption('xmax', 'xmax'));

      it("should have a default value for 'ymin'", () => grapherOptionsForComponentSpec(getComponentSpec()).should.have.property('ymin'));

      it("should respect the component spec property 'ymin'", () => shouldSendComponentSpecPropertyToGrapherOption('ymin', 'ymin'));

      it("should have a default value for 'ymax'", () => grapherOptionsForComponentSpec(getComponentSpec()).should.have.property('ymax'));

      return it("should respect the component spec property 'ymax'", () => shouldSendComponentSpecPropertyToGrapherOption('ymax', 'ymax'));
    });
  });
});

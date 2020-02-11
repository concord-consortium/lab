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
        resetPoints:     sinon.spy(),
        updateOrRescale: sinon.spy(),
        reset:           sinon.spy(),
        repaint:         sinon.spy()
      };
    }
  };

  requirejs.define('lab-grapher', [], () => // Just a function that calls through to mock.Graph, while allowing mock.Graph to
  // be replaced with a stub or spy at any time.
  (function() { return mock.Graph(...arguments); }));

  const TableController = requirejs('common/controllers/table-controller');
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
    "id": "half-life-time-table",
    "type": "table",
    "title": null,
    "clearDataOnReset": true,
    "streamDataFromModel": false,
    "addNewRows": true,
    "visibleRows": 4,
    "indexColumn": false,

    "propertyColumns":[
      "numHalfLives",
      "numElementsParent",
      "numElementsChild",
      {
        "name": "Total Isotopes",
        "format": "r"
      },
      {
        "name": "Parents",
        "units": "%",
        "format": ".2r"
      },
      {
        "name": "Daughters",
        "units": "%",
        "format": ".2r"
      }
    ],

    "width": "100%",
    "height": "12em",
    "tooltip": ""
  });


  // actual tests
  return describe("TableController", function() {
    const tableController = null;
    let interactivesController = null;
    let model = null;

    beforeEach(function() {
      interactivesController = new MockInteractivesController();
      interactivesController.loadModel();
      return model = interactivesController.model;
    });

    it("should exist", () => should.exist(TableController));

    it("should act as a constructor that accepts the component spec as its argument", function() {
      const controller = new TableController(getComponentSpec(), interactivesController);
      return should.exist(controller);
    });

    return describe("A TableController instance", function() {
      let controller = null;

      beforeEach(() => controller = new TableController(getComponentSpec(), interactivesController));

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

            return it("should have class .interactive-table", () => $container.hasClass('interactive-table').should.be.true);
          });
        });
      });

      describe("getView", function() {
        let view = null;
        beforeEach(() => view = controller.getView());

        return it("should return a TableView", () => should.exist(view));
      });


      it("should have a modelLoadedCallback method", () => controller.should.have.property('modelLoadedCallback'));

      return describe("modelLoadedCallback", function() {
        let view = null;
        beforeEach(function() {
          view = controller.getView();
          return sinon.spy(view, 'updateTable');
        });
        afterEach(() => view.updateTable.restore());

        describe("when streaming data from the model", function() {});
          // todo

        return it("should call the views updateTable method with correct columns", function() {
          controller.modelLoadedCallback();
          view.updateTable.callCount.should.equal(1);
          return assert(view.updateTable.calledWithMatch(sinon.match.has('columns')));
        });
      });
    });
  });
});

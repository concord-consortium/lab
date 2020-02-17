/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import TableController from "../../../src/lab/common/controllers/table-controller";
import Model from "../../../src/lab/models/md2d/models/modeler";

jest.mock("lab-grapher");
const assert = require("assert");
const helpers = require("../../helpers");
// simple-model is useful because it has properties that are guaranteed to change every tick
const simpleModel = helpers.getModel("simple-model.json");

class MockInteractivesController {
  constructor() {
    this.modelResetCallbacks = [];
    this.modelLoadedCallbacks = [];
  }

  on(event, callback) {
    if (event === "modelReset") {
      this.modelResetCallbacks.push(callback);
    }
    if (event === "modelLoaded") {
      return this.modelLoadedCallbacks.push(callback);
    }
  }

  loadModel() {
    this.model = new Model(simpleModel);
    return this.modelLoadedCallbacks.forEach(cb => cb("initialLoad"));
  }

  getModel() {
    return this.model;
  }

  getScriptingAPI() {
    return this.scriptingAPI;
  }

  getNextTabIndex() {
  }

  reloadModel(opts) {
    this.model.willReset();
    this.model = new Model(simpleModel);
    return this.modelLoadedCallbacks.forEach(cb => cb("reload"));
  }

  resetModel(opts) {
    if (!opts) {
      opts = {cause: "reset"};
    }
    this.model.willReset();
    this.model.reset();
    return this.modelResetCallbacks.forEach(cb => cb(opts.cause));
  }

  addDataSet(ds, priv) {
  }
}

const getComponentSpec = () => ({
  "id": "half-life-time-table",
  "type": "table",
  "title": null,
  "clearDataOnReset": true,
  "streamDataFromModel": false,
  "addNewRows": true,
  "visibleRows": 4,
  "indexColumn": false,

  "propertyColumns": [
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
describe("TableController", function () {
  let interactivesController = null;
  let model = null;

  beforeEach(function () {
    interactivesController = new MockInteractivesController();
    interactivesController.loadModel();
    model = interactivesController.model;
  });

  it("should exist", () => {
    should.exist(TableController);
  });

  it("should act as a constructor that accepts the component spec as its argument", function () {
    const controller = new TableController(getComponentSpec(), interactivesController);
    should.exist(controller);
  });

  describe("A TableController instance", function () {
    let controller = null;

    beforeEach(() => {
      controller = new TableController(getComponentSpec(), interactivesController);
    });

    it("should have a getViewContainer method", () => {
      controller.should.have.property("getViewContainer");
    });

    describe("getViewContainer", function () {
      it("should return a jQuery selection when getViewContainer is called", function () {
        const $container = controller.getViewContainer();
        $container.should.be.instanceof($().constructor);
      });

      describe("the returned view container", function () {
        let $container = null;
        beforeEach(() => {
          $container = controller.getViewContainer();
        });

        it("should contain a single element", () => {
          $container.should.have.length(1);
        });

        describe("the element", function () {
          it("should have the id specified in the component spec", () => {
            $container.attr("id").should.equal(getComponentSpec().id);
          });

          it("should have class .interactive-table", () => {
            $container.hasClass("interactive-table").should.be.true;
          });
        });
      });
    });

    describe("getView", function () {
      let view = null;
      beforeEach(() => {
        view = controller.getView();
      });

      it("should return a TableView", () => {
        should.exist(view);
      });
    });


    it("should have a modelLoadedCallback method", () => {
      controller.should.have.property("modelLoadedCallback");
    });

    describe("modelLoadedCallback", function () {
      let view = null;
      beforeEach(function () {
        view = controller.getView();
        sinon.spy(view, "updateTable");
      });
      afterEach(() => {
        view.updateTable.restore();
      });

      it("should call the views updateTable method with correct columns", function () {
        controller.modelLoadedCallback();
        view.updateTable.callCount.should.equal(1);
        assert(view.updateTable.calledWithMatch(sinon.match.has("columns")));
      });
    });
  });
});

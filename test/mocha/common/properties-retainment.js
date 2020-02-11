/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();

helpers.withIsolatedRequireJSAndViewsMocked(function(requirejs) {
  const InteractivesController = requirejs('common/controllers/interactives-controller');
  const layoutConfig           = requirejs('common/layout/semantic-layout-config');
  const labConfig              = requirejs('lab.config');

  return describe("Parameters retainment during .reloadModel() and .resetModel()", function() {
    before(function() {
      // This test requires that all view elements are attached to DOM (JSDOM). So, we cannot mock
      // layout and the test tends to be pretty slow. To optimize it, limit number of layout algorithm
      // iterations to 0, because we completely do not care about layout quality.
      layoutConfig.iterationsLimit = 0;
      // Also disable logging in Lab project so as not to obfuscate Mocha reporter.
      return labConfig.logging = false;
    });

    const interactive = {
      "title": "Test Interactive",
      "publicationStatus": "draft",
      "subtitle": "Subtitle",
      "about": "Description",
      "models": [
        {
          "type": "md2d",
          "id": "model1",
          "url": "model1",
          "parameters": [
            {
              "name":  "parameter1",
              "initialValue": 1
            }
          ]
        }
      ],
      "parameters": [
        {
          "name":  "parameter2",
          "initialValue": 2
        }
      ]
    };

    const simpleMD2DModel = {
      "timeStep": 3,
      "targetTemperature": 4
    };

    let controller = null;
    let scriptingAPI = null;

    const setupInteractive = function(propertiesToRetain) {
      interactive.propertiesToRetain = propertiesToRetain || [];
      helpers.withModel(simpleMD2DModel, () => controller = new InteractivesController(interactive, 'body'));
      return scriptingAPI = controller.scriptingAPI.api;
    };

    return describe(".resetModel() and .reloadModel()", function() {
      it("shouldn't retain any properties by default", function() {
        const test = function(action) {
          setupInteractive([]);
          scriptingAPI.set("parameter1", 101);
          scriptingAPI.set("parameter2", 102);
          scriptingAPI.set("timeStep", 103);
          scriptingAPI.set("targetTemperature", 104);
          controller[action]();
          scriptingAPI.get("parameter1").should.eql(1);
          scriptingAPI.get("parameter2").should.eql(2);
          scriptingAPI.get("timeStep").should.eql(3);
          return scriptingAPI.get("targetTemperature").should.eql(4);
        };

        test("reloadModel");
        return test("resetModel");
      });

      it("should retain properties specified in 'propertiesToRetain' list (in interactive JSON)", function() {
        const test = function(action) {
          // The array will be set as interactive JSON .propertiesToRetain property.
          setupInteractive(["parameter1", "timeStep"]);
          scriptingAPI.set("parameter1", 101);
          scriptingAPI.set("parameter2", 102);
          scriptingAPI.set("timeStep", 103);
          scriptingAPI.set("targetTemperature", 104);
          controller[action]();
          scriptingAPI.get("parameter1").should.eql(101);
          scriptingAPI.get("parameter2").should.eql(2);
          scriptingAPI.get("timeStep").should.eql(103);
          return scriptingAPI.get("targetTemperature").should.eql(4);
        };

        test("reloadModel");
        return test("resetModel");
      });

      it("should retain properties listed in option hash", function() {
        const test = function(action) {
          setupInteractive([]);
          scriptingAPI.set("parameter1", 101);
          scriptingAPI.set("parameter2", 102);
          scriptingAPI.set("timeStep", 103);
          scriptingAPI.set("targetTemperature", 104);
          controller[action]({
            propertiesToRetain: ["parameter1", "timeStep"]
          });
          scriptingAPI.get("parameter1").should.eql(101);
          scriptingAPI.get("parameter2").should.eql(2);
          scriptingAPI.get("timeStep").should.eql(103);
          return scriptingAPI.get("targetTemperature").should.eql(4);
        };

        test("reloadModel");
        return test("resetModel");
      });

      return it("should respect values that are defined either in 'propertiesToRetain' list and in options hash", function() {
        const test = function(action) {
          setupInteractive(["parameter1"]);
          scriptingAPI.set("parameter1", 101);
          scriptingAPI.set("parameter2", 102);
          scriptingAPI.set("timeStep", 103);
          scriptingAPI.set("targetTemperature", 104);
          controller[action]({
            propertiesToRetain: ["timeStep"]
          });
          scriptingAPI.get("parameter1").should.eql(101);
          scriptingAPI.get("parameter2").should.eql(2);
          scriptingAPI.get("timeStep").should.eql(103);
          return scriptingAPI.get("targetTemperature").should.eql(4);
        };

        test("reloadModel");
        return test("resetModel");
      });
    });
  });
});

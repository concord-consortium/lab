/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();
const simpleModel = helpers.getModel('simple-model.json');

helpers.withIsolatedRequireJSAndViewsMocked(function(requirejs) {
  const interactivesController = requirejs('common/controllers/interactives-controller');

  return describe("InterativeController", function() {
    let controller = null;
    let interactive = null;
    const model = null;

    beforeEach(() => interactive =
      {
        "title": "Test Interactive",
        "models": []
      });

    return it("initializes with no model defined", () => controller = interactivesController(interactive, 'body'));
  });
});


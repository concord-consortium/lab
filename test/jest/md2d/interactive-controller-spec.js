import interactivesController from "../../../src/lab/common/controllers/interactives-controller";

describe("InterativeController", function () {
  let controller = null;
  let interactive = null;

  beforeEach(() => interactive =
    {
      "title": "Test Interactive",
      "models": []
    });

  it("initializes with no model defined", () => {
    controller = interactivesController(interactive, "body");
  });
});


import sinon from "sinon";

function Graph() {
  return {
    addPoints: sinon.spy(),
    addPointListener: sinon.spy(),
    resetPoints: sinon.spy(),
    updateOrRescale: sinon.spy(),
    reset: sinon.spy(),
    repaint: sinon.spy(),
    xLabel: sinon.spy(),
    yLabel: sinon.spy(),
    xDomain: function() {
      return [0, 10];
    },
    yDomain: function() {
      return [0, 10];
    }
  };
}

export const mock = {
  Graph
};

// Why is this necessary? Take a look at graph-controller-spec. It spies on mock.Graph to check how many times the constructor has been called.
function constr() {
  return mock.Graph.apply(null, arguments);
}

constr.i18n = {};

export default constr;

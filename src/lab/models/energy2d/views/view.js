
import SVGContainer from 'common/views/svg-container';
import Renderer from 'models/energy2d/views/renderer';

export default function(model, modelUrl) {
  return new SVGContainer(model, modelUrl, Renderer, {
    origin: 'top-left'
  });
};

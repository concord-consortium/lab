
import SVGContainer from 'common/views/svg-container';
import Renderer from 'models/md2d/views/renderer';

export default function(model, modelUrl, i18n) {
  return new SVGContainer(model, modelUrl, Renderer, {
    i18n: i18n
  });
};

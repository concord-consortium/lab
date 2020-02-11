/*global define: false */

import $__common_views_svg_container from 'common/views/svg-container';
import $__models_energy_d_views_renderer from 'models/energy2d/views/renderer';
var SVGContainer = $__common_views_svg_container,
  Renderer = $__models_energy_d_views_renderer;

export default function(model, modelUrl) {
  return new SVGContainer(model, modelUrl, Renderer, {
    origin: 'top-left'
  });
};

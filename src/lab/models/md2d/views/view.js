/*global define: false */

import $__common_views_svg_container from 'common/views/svg-container';
import $__models_md_d_views_renderer from 'models/md2d/views/renderer';
var SVGContainer = $__common_views_svg_container,
  Renderer = $__models_md_d_views_renderer;

export default function(model, modelUrl, i18n) {
  return new SVGContainer(model, modelUrl, Renderer, {
    i18n: i18n
  });
};

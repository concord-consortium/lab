/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false, $: false*/

// Main Energy2D visualization container.
//
// It combines different views and arranges them into layers:
// - HeatmapView
// - VelocityView
// - PartsView
// - TimeView
//
// getHTMLElement() method returns JQuery object with DIV that contains these views.
// Constructor sets only necessary style options.
// If you want to resize Energy2D scene view use CSS rule for wrapping DIV.
// Do not resize manually internal views (heatmap, velocity or parts)!

define(function (require) {
  'use strict';
  var
    // Dependencies.
    HeatmapView        = require('energy2d/views/heatmap'),
    HeatmapWebGLView   = require('energy2d/views/heatmap-webgl'),
    VectormapView      = require('energy2d/views/vectormap'),
    VectormapWebGLView = require('energy2d/views/vectormap-webgl'),
    PartsView          = require('energy2d/views/parts'),
    PhotonsView        = require('energy2d/views/photons'),
    TimeView           = require('energy2d/views/time');

  return function VisualizationContainer(html_id, use_WebGL) {
    var
      DEFAULT_ID = 'energy2d-scene-view',
      DEFAULT_CLASS = 'energy2d-scene-view',

      DEFAULT_VISUALIZATION_OPTIONS = {
        "color_palette_type": 0,
        "minimum_temperature": 0.0,
        "maximum_temperature": 40.0
      },

      heatmap_view,
      velocity_view,
      parts_view,
      photons_view,
      time_view,

      $scene_view_div,

      layers_count = 0,

      //
      // Private methods.
      //
      initHTMLelement = function () {
        $scene_view_div = $('<div />');
        $scene_view_div.attr('id', html_id || DEFAULT_ID);
        $scene_view_div.addClass(DEFAULT_CLASS);

        $scene_view_div.css('position', 'relative');

        $scene_view_div.append(heatmap_view.getHTMLElement());
        $scene_view_div.append(velocity_view.getHTMLElement());
        $scene_view_div.append(photons_view.getHTMLElement());
        $scene_view_div.append(parts_view.getHTMLElement());
        $scene_view_div.append(time_view.getHTMLElement());
      },

      setAsNextLayer = function (view) {
        var $layer = view.getHTMLElement();

        $layer.css('width', '100%');
        $layer.css('height', '100%');
        $layer.css('position', 'absolute');
        $layer.css('left', '0');
        $layer.css('top', '0');
        $layer.css('z-index', layers_count);
        layers_count += 1;
      },

      setAsTimeLayer = function (view) {
        var $layer = view.getHTMLElement();

        // Style time view to make it visible and sharp
        // as it is displayed on the heatmap (often dark blue color).
        $layer.css('color', 'white');
        $layer.css('font-weight', 'bold');
        // Keep constant width of time display to avoid
        // oscillation of its position.
        $layer.css('font-family', 'Monospace');
        $layer.css('position', 'absolute');
        $layer.css('right', '0');
        $layer.css('top', '0');
        $layer.css('z-index', layers_count);
        layers_count += 1;
      },

      visualization_container = {
        getHeatmapView: function () {
          return heatmap_view;
        },

        getVelocityView: function () {
          return velocity_view;
        },

        getPartsView: function () {
          return parts_view;
        },

        getPhotonsView: function () {
          return photons_view;
        },

        getTimeView: function () {
          return time_view;
        },

        getHTMLElement: function () {
          return $scene_view_div;
        },

        setVisualizationOptions: function (options) {
          // Configure "subviews".
          heatmap_view.setMinTemperature(options.minimum_temperature);
          heatmap_view.setMaxTemperature(options.maximum_temperature);
          heatmap_view.setColorPalette(options.color_palette_type);
        }
      };

    // One-off initialization.
    if (use_WebGL) {
      heatmap_view = HeatmapWebGLView();
      velocity_view = VectormapWebGLView();

      // Both VectormapWebGL and HeatmapWebGL use common canvas,
      // so it's enough to set it only once as the next layer.
      setAsNextLayer(velocity_view);
    } else {
      heatmap_view = HeatmapView();
      velocity_view = VectormapView();

      setAsNextLayer(heatmap_view);
      setAsNextLayer(velocity_view);
    }

    photons_view = PhotonsView();
    setAsNextLayer(photons_view);

    parts_view = PartsView();
    setAsNextLayer(parts_view);

    time_view = TimeView();
    setAsTimeLayer(time_view);

    // Append all views to the scene view DIV.
    initHTMLelement();

    // Return Public API object.
    return visualization_container;
  };
});

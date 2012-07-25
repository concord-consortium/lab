/*globals energy2d, $ */
/*jslint indent: 2, browser: true */
//
// lab/views/energy2d/heatmap.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Heatmap view.
//
// It uses HTML5 Canvas for rendering.
// getHTMLElement() returns jQuery object with the canvas used for rendering.
// Before use, this view should be bound with a heatmap using bindHeapmap(heatmap, grid_width, grid_height).
// To render the heatmap use renderHeatmap() method. 
// Set size of the heatmap using CSS rules. The view fits canvas dimensions to the real 
// size of the HTML element to avoid low quality CSS scaling *ONLY* when HQ rendering is enabled.
// Otherwise, the canvas has the same dimensions as heatmap grid and fast CSS scaling is used.
energy2d.views.makeHeatmapView = function (html_id) {
  'use strict';
  var
    // Dependencies:
    view_utils = energy2d.views.utils,
    // end.
    DEFAULT_ID = 'energy2d-heatmap-view',

    $heatmap_canvas,
    canvas_ctx,
    backing_scale,
    canvas_width,
    canvas_height,
    hq_rendering,

    red_color_table   = [],
    blue_color_table  = [],
    green_color_table = [],
    max_hue,

    heatmap,
    grid_width,
    grid_height,
    min_temp = 0,
    max_temp = 50,

    // 
    // Private methods.
    //
    initHTMLelement = function () {
      $heatmap_canvas = $('<canvas />');
      $heatmap_canvas.attr('id', html_id || DEFAULT_ID);
      canvas_ctx = $heatmap_canvas[0].getContext('2d');
      // If we are being rendered on a retina display with doubled pixels
      // we need to make the actual canvas half the requested size;
      // Google: window.devicePixelRatio webkitBackingStorePixelRatio
      // See: https://www.khronos.org/webgl/public-mailing-list/archives/1206/msg00193.html
      if (window.devicePixelRatio > 1 &&
          (canvas_ctx.webkitBackingStorePixelRatio > 1 || (typeof canvas_ctx.webkitBackingStorePixelRatio === "undefined"))) {
        backing_scale = window.devicePixelRatio;
      } else {
        backing_scale = 1;
      }
    },

    //
    // Public API.
    //
    heatmap_view = {
      // Render heat map on the canvas.
      renderHeatmap: function () {
        var
          scale, hue,
          image_data, data,
          i, j, iny, pix_index, pix_stride;

        if (!heatmap) {
          throw new Error("Heatmap: bind heatmap before rendering.");
        }

        canvas_ctx.clearRect(0, 0, grid_width, grid_height);
        // TODO: is it really necessary?
        canvas_ctx.fillStyle = "rgb(0,0,0)";

        scale = max_hue / (max_temp - min_temp);
        image_data = canvas_ctx.getImageData(0, 0, grid_width / backing_scale, grid_height / backing_scale);
        data = image_data.data;

        pix_index = 0;
        pix_stride = 4 * grid_width;
        for (i = 0; i < grid_width; i += 1) {
          iny = i * grid_height;
          pix_index = 4 * i;
          for (j = 0; j < grid_height; j += 1) {
            hue =  max_hue - Math.round(scale * (heatmap[iny + j] - min_temp));
            if (hue < 0) {
              hue = 0;
            } else if (hue > max_hue) {
              hue = max_hue;
            }
            data[pix_index]     = red_color_table[hue];
            data[pix_index + 1] = green_color_table[hue];
            data[pix_index + 2] = blue_color_table[hue];
            data[pix_index + 3] = 255;
            pix_index += pix_stride;
          }
        }
        canvas_ctx.putImageData(image_data, 0, 0);
      },

      // Bind heatmap to the view.
      bindHeatmap: function (new_heatmap, new_grid_width, new_grid_height) {
        if (new_grid_width * new_grid_height !== new_heatmap.length) {
          throw new Error("Heatmap: provided heatmap has wrong dimensions.");
        }
        heatmap = new_heatmap;
        grid_width = new_grid_width;
        grid_height = new_grid_height;
        this.setCanvasSize(grid_width, grid_height);
      },

      getHTMLElement: function () {
        return $heatmap_canvas;
      },

      updateCanvasSize: function () {
        canvas_width = $heatmap_canvas.width();
        canvas_height = $heatmap_canvas.height();
        if (hq_rendering) {
          $heatmap_canvas.attr('width', canvas_width);
          $heatmap_canvas.attr('height', canvas_height);
        } else {
          this.setCanvasSize(grid_width, grid_height);
        }
      },

      setCanvasSize: function (w, h) {
        $heatmap_canvas.attr('width',  w / backing_scale);
        $heatmap_canvas.attr('height', h / backing_scale);
      },

      setHQRenderingEnabled: function (v) {
        hq_rendering = v;
        this.updateCanvasSize();
      },

      setMinTemperature: function (v) {
        min_temp = v;
      },
      setMaxTemperature: function (v) {
        max_temp = v;
      }
    };

  // One-off initialization.
  view_utils.setupRGBTemperatureColorTables(red_color_table, green_color_table, blue_color_table);
  max_hue = red_color_table.length - 1;

  initHTMLelement();

  return heatmap_view;
};

/*global define: false, $: false*/

// Heatmap view.
//
// It uses HTML5 Canvas for rendering.
// getHTMLElement() returns jQuery object with the canvas used for rendering.
// Before use, this view should be bound with a heatmap using bindHeapmap(heatmap, grid_width, grid_height).
// To render the heatmap use renderHeatmap() method.
// Set size of the heatmap using CSS rules. The view fits canvas dimensions to the real
// size of the HTML element to avoid low quality CSS scaling *ONLY* when HQ rendering is enabled.
// Otherwise, the canvas has the same dimensions as heatmap grid and fast CSS scaling is used.

define(function (require) {
  'use strict';
  var
    // Dependencies.
    ColorPalette = require('models/energy2d/views/color-palette');

  return function HeatmapView(html_id) {
    var
      DEFAULT_ID = 'energy2d-heatmap-view',

      $heatmap_canvas,
      canvas_ctx,

      rgb_array,
      max_rgb_idx,

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
      },

      //
      // Public API.
      //
      heatmap_view = {
        // Render heat map on the canvas.
        renderHeatmap: function () {
          var
            scale, rgb_idx, val, color1, color2,
            image_data, data,
            i, j, iny, pix_index, pix_stride;

          if (!heatmap) {
            throw new Error("Heatmap: bind heatmap before rendering.");
          }

          canvas_ctx.clearRect(0, 0, grid_width, grid_height);
          // TODO: is it really necessary?
          canvas_ctx.fillStyle = "rgb(0,0,0)";

          scale = max_rgb_idx / Math.max(1, max_temp - min_temp);
          image_data = canvas_ctx.getImageData(0, 0, grid_width, grid_height);
          data = image_data.data;

          pix_index = 0;
          pix_stride = 4 * grid_width;
          for (i = 0; i < grid_width; i += 1) {
            iny = i * grid_height;
            pix_index = 4 * i;
            for (j = 0; j < grid_height; j += 1) {
              val = scale * (heatmap[iny + j] - min_temp);
              rgb_idx = Math.floor(val);
              // Get fractional part of val.
              val -= rgb_idx;
              if (rgb_idx < 0) {
                rgb_idx = 0;
                val = 0;
              } else if (rgb_idx > max_rgb_idx - 1) {
                rgb_idx = max_rgb_idx - 1;
                val = 1;
              }
              color1 = rgb_array[rgb_idx];
              color2 = rgb_array[rgb_idx + 1];
              data[pix_index]     = color1[0] * (1 - val) + color2[0] * val;
              data[pix_index + 1] = color1[1] * (1 - val) + color2[1] * val;
              data[pix_index + 2] = color1[2] * (1 - val) + color2[2] * val;
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

        resize: function () {
          // Don't do anything, canvas width and height depend on  grid
          // dimensions, not CSS dimensions of canvas itself.
          // If grid is 100x100, but CSS dimensions are 500x500, CSS scaling
          // will be used.
        },

        setCanvasSize: function (w, h) {
          $heatmap_canvas.attr('width',  w);
          $heatmap_canvas.attr('height', h);
        },

        setMinTemperature: function (v) {
          min_temp = v;
        },
        setMaxTemperature: function (v) {
          max_temp = v;
        },
        setColorPalette: function (id) {
          rgb_array = new ColorPalette(id).getRGBArray();
          max_rgb_idx = rgb_array.length - 1;
        }
      };
    // One-off initialization.
    // Set the default color palette.
    heatmap_view.setColorPalette('DEFAULT');

    initHTMLelement();

    return heatmap_view;
  };
});

/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false*/

// Energy2D parts view.
//
// It uses HTML5 Canvas for rendering.
// getHTMLElement() returns jQuery object with canvas used for rendering.
// Before use, this view should be bound with the parts array using bindPartsArray(parts).
// To render parts use renderParts() method.
// Set size of the parts view using CSS rules. The view fits canvas dimensions to the real
// size of the HTML element to avoid low quality scaling.

define(function (require) {
  'use strict';
  // Dependencies.
  var $ = require('jquery');

  return function PartsView(html_id) {
    var
      DEFAULT_ID = 'energy2d-parts-view',
      DEFAULT_CLASS = 'energy2d-parts-view',

      $parts_canvas,
      canvas_ctx,
      canvas_width,
      canvas_height,

      parts,
      scale_x,
      scale_y,
      scene_width,
      scene_height,

      textures = [],

      //
      // Private methods.
      //
      initHTMLelement = function () {
        $parts_canvas = $('<canvas />');
        $parts_canvas.attr('id', html_id || DEFAULT_ID);
        $parts_canvas.addClass(DEFAULT_CLASS);

        canvas_ctx = $parts_canvas[0].getContext('2d');
      },

      setCanvasStyle = function () {
        canvas_ctx.strokeStyle = "black";
        canvas_ctx.lineCap = "round";
        canvas_ctx.lineJoin = "round";
        canvas_ctx.lineWidth = 1;
        canvas_ctx.font = "12px sans-serif";
        canvas_ctx.textBaseline = "middle";
      },

      // TODO: add more textures, move it another module?
      initTextures = function () {
        var
          WIDTH  = 8,
          HEIGHT = 8,
          $texture_canvas,
          ctx;

        // Create canvas element.
        $texture_canvas = $('<canvas />');
        $texture_canvas.attr('width', WIDTH);
        $texture_canvas.attr('height', HEIGHT);
        ctx = $texture_canvas[0].getContext("2d");

        // Generate simple pattern.
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(HEIGHT, HEIGHT);
        ctx.stroke();

        textures.push($texture_canvas[0]);
      },

      drawRectangle = function (rectangle) {
        var
          px = rectangle.x * scale_x - 1,        // "- 1 / + 2" too keep positions
          py = rectangle.y * scale_y - 1,        // consistent with Energy2d
          pw = rectangle.width * scale_x + 2,
          ph = rectangle.height * scale_y + 2,
          label_x = px + 0.5 * pw,
          label_y = py + 0.5 * ph;

        canvas_ctx.beginPath();
        canvas_ctx.moveTo(px, py);
        canvas_ctx.lineTo(px + pw, py);
        canvas_ctx.lineTo(px + pw, py + ph);
        canvas_ctx.lineTo(px, py + ph);
        canvas_ctx.lineTo(px, py);
        canvas_ctx.closePath();
      },

      drawPolygon = function (polygon) {
        var
          x_coords = polygon.x_coords,
          y_coords = polygon.y_coords,
          label_x = 0,
          label_y = 0,
          i, len;

        canvas_ctx.beginPath();
        canvas_ctx.moveTo(x_coords[0] * scale_x, y_coords[0] * scale_y);
        for (i = 1, len = polygon.count; i < len; i += 1) {
          canvas_ctx.lineTo(x_coords[i] * scale_x, y_coords[i] * scale_y);
        }
        canvas_ctx.closePath();
      },

      drawLabel = function (part) {
        var
          label, label_x, label_y, label_width,
          verts, i, len;

        if (part.rectangle) {
          label_x = part.rectangle.x + 0.5 * part.rectangle.width;
          label_y = part.rectangle.y + 0.5 * part.rectangle.height;
        } else if (part.ellipse) {
          label_x = part.ellipse.x;
          label_y = part.ellipse.y;
        } else if (part.ring) {
          label_x = part.ring.x;
          label_y = part.ring.y;
        } else if (part.polygon) {
          verts = part.polygon.vertices;
          label_x = label_y = 0;
          for (i = 0, len = part.polygon.count; i < len; i += 1) {
            label_x += verts[i * 2];
            label_y += verts[i * 2 + 1];
          }
          label_x /= len;
          label_y /= len;
        }
        label_x *= scale_x;
        label_y *= scale_y;

        canvas_ctx.fillStyle = "white";
        label = part.getLabel();
        label_width = canvas_ctx.measureText(label).width;
        canvas_ctx.fillText(label, label_x - 0.5 * label_width, label_y);
      },

      getPartColor = function (part) {
        var
          default_fill_color = "gray",
          color;

        if (part.color) {
          if (typeof part.color === 'string') {
            color = part.color;
          } else {
            color = part.color.toString();
            while (color.length < 6) {
              color = '0' + color;
            }
          }
        } else if (part.power > 0) {
          color = 'FFFF00';
        } else if (part.power < 0) {
          color = 'B0C4DE';
        } else if (part.constant_temperature) {
          // Transparent color.
          // Part will have color of underlying background.
          color = 'rgba(0, 0, 0, 0.0)';
        } else {
          color = default_fill_color;
        }
        return color;
      },

      //
      // Public API.
      //
      parts_view = {
        // Render vectormap on the canvas.
        renderParts: function () {
          var
            part,
            last_composite_op,
            i, len;

          if (!parts) {
            throw new Error("Parts view: bind parts array before rendering.");
          }

          // Follow size of the canvas defined by CSS rules.
          if (canvas_width !== $parts_canvas.width() || canvas_height !== $parts_canvas.height()) {
            this.updateCanvasSize();
          }

          canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);
          for (i = 0, len = parts.length; i < len; i += 1) {
            part = parts[i];
            if (!part.visible) {
              continue;
            }
            // Step 1. Draw path on the canvas.
            drawPolygon(part.shape.polygonize());
            if (part.rectangle) {
              // Special case for rectangle to draw in the same manner
              // as original Energy2D.
              drawRectangle(part.shape);
            } else {
              // Polygonize ellipses, rings and... polygons
              // (which returns itself when polygonize() is called).
              // Polygonize for rings returns OUTER circle.
              drawPolygon(part.shape.polygonize());
            }
            // Step 2. Fill.
            if (part.filled) {
              canvas_ctx.fillStyle = getPartColor(part);
              canvas_ctx.fill();
            }
            // Step 3. Cover with texture.
            if (part.texture) {
              // TODO: Add support of different patterns.
              canvas_ctx.fillStyle = canvas_ctx.createPattern(textures[0], "repeat");
              canvas_ctx.fill();
            }
            canvas_ctx.stroke();

            // Step 4. Special case for rings, remove inner circle.
            if (part.ring) {
              drawPolygon(part.shape.polygonizeInner());
              last_composite_op = canvas_ctx.globalCompositeOperation;
              canvas_ctx.globalCompositeOperation = 'destination-out';
              canvas_ctx.fill();
              canvas_ctx.globalCompositeOperation = last_composite_op;
              canvas_ctx.stroke();
            }

            // Step 5. Draw label.
            if (part.label) {
              drawLabel(part);
            }

          }
        },

        // Bind vector map to the view.
        bindPartsArray: function (new_parts, new_scene_width, new_scene_height) {
          parts = new_parts;
          scene_width = new_scene_width;
          scene_height = new_scene_height;
          scale_x = canvas_width / scene_width;
          scale_y = canvas_height / scene_height;
        },

        getHTMLElement: function () {
          return $parts_canvas;
        },

        updateCanvasSize: function () {
          canvas_width = $parts_canvas.width();
          canvas_height = $parts_canvas.height();
          scale_x = canvas_width / scene_width;
          scale_y = canvas_height / scene_height;
          $parts_canvas.attr('width', canvas_width);
          $parts_canvas.attr('height', canvas_height);
          // Need to do it after canvas size change.
          setCanvasStyle();
        }
      };

    // One-off initialization.
    initHTMLelement();
    setCanvasStyle();
    initTextures();

    return parts_view;
  };
});

/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/views/energy2d/views.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Main Energy2D scene.
//
// It combines three views and arranges them into layers:
// - HeatmapView
// - VelocityView
// - PartsView
//
// getHTMLElement() method returns JQuery object with DIV that contains these views.
// Constructor sets only necessary style options.
// If you want to resize Energy2D scene view use CSS rule for wrapping DIV.
// Do not resize manually internal views (heatmap, velocity or parts)!
energy2d.views.makeEnergy2DScene = function (html_id) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-scene-view',
    DEFAULT_CLASS = 'energy2d-scene-view',

    heatmap_view,
    velocity_view,
    parts_view,
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

    energy2d_scene_view = {
      getHeatmapView: function () {
        return heatmap_view;
      },

      getVelocityView: function () {
        return velocity_view;
      },

      getPartsView: function () {
        return parts_view;
      },

      getTimeView: function () {
        return time_view;
      },

      getHTMLElement: function () {
        return $scene_view_div;
      }
    };

  heatmap_view = energy2d.views.makeHeatmapView();
  setAsNextLayer(heatmap_view);

  velocity_view = energy2d.views.makeVectormapView();
  setAsNextLayer(velocity_view);

  parts_view = energy2d.views.makePartsView();
  setAsNextLayer(parts_view);

  time_view = energy2d.views.makeTimeView();
  setAsTimeLayer(time_view);

  // Append all views to the scene view DIV.
  initHTMLelement();

  return energy2d_scene_view;
};

// Energy2D parts view.
//
// It uses HTML5 Canvas for rendering.
// getHTMLElement() returns jQuery object with canvas used for rendering.
// Before use, this view should be bound with the parts array using bindPartsArray(parts).
// To render parts use renderParts() method.
// Set size of the parts view using CSS rules. The view fits canvas dimensions to the real
// size of the HTML element to avoid low quality scaling.
energy2d.views.makePartsView = function (html_id) {
  'use strict';
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
      canvas_ctx.strokeStyle = "black";
      canvas_ctx.lineCap = "round";
      canvas_ctx.lineJoin = "round";
      canvas_ctx.lineWidth = 2;
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

    drawEllipse = function (ellipse) {
      var
        px = ellipse.x * scale_x,
        py = ellipse.y * scale_y,
        pa = ellipse.a * scale_x * 0.5,
        pb = ellipse.b * scale_y * 0.5,
        x_pos, y_pos, t;

      canvas_ctx.beginPath();
      for (t = 0; t < 2 * Math.PI; t += 0.1) {
        x_pos = px + (pa * Math.cos(t));
        y_pos = py + (pb * Math.sin(t));

        if (t === 0) {
          canvas_ctx.moveTo(x_pos, y_pos);
        } else {
          canvas_ctx.lineTo(x_pos, y_pos);
        }
      }
      canvas_ctx.closePath();
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
        verts = polygon.vertices,
        label_x = 0,
        label_y = 0,
        i, len;

      canvas_ctx.beginPath();
      canvas_ctx.moveTo(verts[0] * scale_x, verts[1] * scale_y);
      for (i = 1, len = polygon.count; i < len; i += 1) {
        canvas_ctx.lineTo(verts[i * 2] * scale_x, verts[i * 2 + 1] * scale_y);
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
          color = part.color.toString(16);
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
          if (part.rectangle) {
            drawRectangle(part.rectangle);
          } else if (part.polygon) {
            drawPolygon(part.polygon);
          } else if (part.ellipse) {
            drawEllipse(part.ellipse);
          } else if (part.ring) {
            // Draw a circle, its interior will be deleted later.
            drawEllipse({
              x: part.ring.x,
              y: part.ring.y,
              a: part.ring.outer,
              b: part.ring.outer
            });
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
            drawEllipse({
              x: part.ring.x,
              y: part.ring.y,
              a: part.ring.inner,
              b: part.ring.inner
            });
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
      }
    };

  // One-off initialization.
  initHTMLelement();
  initTextures();

  return parts_view;
};

// Simple player.
//
// Should be bound with simulation controller, which has to implement following methods:
// - simulationPlay()
// - simulationStep()
// - simulationStop()
// - simulationReset()
//
// getHTMLElement() method returns JQuery object with DIV that contains all buttons.
// If you want to style its components:
// Default div id = "energy2d-simulation-player",
// Buttons ids: "sim-play", "sim-step", "sim-stop", "sim-reset".
energy2d.views.makeSimulationPlayerView = function (html_id) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-simulation-player',
    DEFAULT_CLASS = 'energy2d-simulation-player',

    simulation_controller,
    $player_div,

    //
    // Private methods.
    //
    initHTMLelement = function () {
      var $button;

      $player_div = $('<div />');
      $player_div.attr('id', html_id || DEFAULT_ID);
      $player_div.addClass(DEFAULT_CLASS);
      // Stop button.
      $button = $('<button type="button" id="sim-stop">Stop</button>');
      $button.click(function () {
        simulation_controller.simulationStop();
      });
      $player_div.append($button);
      // One step button.
      $button = $('<button type="button" id="sim-step">Step</button>');
      $button.click(function () {
        simulation_controller.simulationStep();
      });
      $player_div.append($button);
      // Play button.
      $button = $('<button type="button" id="sim-play">Play</button>');
      $button.click(function () {
        simulation_controller.simulationPlay();
      });
      $player_div.append($button);
      // Reset button.
      $button = $('<button type="button" id="sim-reset">Reset</button>');
      $button.click(function () {
        simulation_controller.simulationReset();
      });
      $player_div.append($button);
    },

    //
    // Public API.
    //
    simulation_player = {
      bindSimulationController: function (controller) {
        simulation_controller = controller;
      },

      getHTMLElement: function () {
        return $player_div;
      }
    };

  // One-off initialization.
  initHTMLelement();

  return simulation_player;
};

// Simulation time.
//
// getHTMLElement() method returns JQuery object with DIV that contains time.
// If you want to style its components:
// Default div id = "energy2d-time"
energy2d.views.makeTimeView = function (html_id) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-time',
    DEFAULT_CLASS = 'energy2d-time',

    $time_div,

    //
    // Private methods.
    //
    initHTMLelement = function () {
      $time_div = $('<div />');
      $time_div.attr('id', html_id || DEFAULT_ID);
      $time_div.addClass(DEFAULT_CLASS);
      $time_div.html('0:00:00:00');
    },

    pad = function (num, size) {
      var s = num.toString();
      while (s.length < size) {
        s = "0" + s;
      }
      return s;
    },

    //
    // Public API.
    //
    simulation_time = {
      renderTime: function (time) {
        var seconds, minutes, hours, days;
        time = Math.floor(time);
        seconds = time % 60;
        time = Math.floor(time / 60);
        minutes = time % 60;
        time = Math.floor(time / 60);
        hours = time % 24;
        time = Math.floor(time / 24);
        days = time;
        $time_div.html(days + ':' + pad(hours, 2) + ':' + pad(minutes, 2)  + ':' + pad(seconds, 2));
      },

      getHTMLElement: function () {
        return $time_div;
      }
    };

  // One-off initialization.
  initHTMLelement();

  return simulation_time;
};


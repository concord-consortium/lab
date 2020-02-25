/*jslint indent: 2, browser: true, newcap: true */

// Vector map view.
//
// It uses HTML5 Canvas for rendering.
// getHTMLElement() returns jQuery object with canvas used for rendering.
// Before use, this view should be bound with the vector map using bindVectormap(vectormap_u, vectormap_v, width, height, spacing).
// To render vector map use renderVectormap() method.
// Set size of the vectormap using CSS rules. The view fits canvas dimensions to the real
// size of the HTML element to avoid low quality CSS scaling.

export default function VectormapView(html_id) {
  var DEFAULT_ID = 'energy2d-vectormap-view',
    VECTOR_SCALE = 100,
    VECTOR_BASE_LEN = 8,
    WING_COS = Math.cos(0.523598776),
    WING_SIN = Math.sin(0.523598776),
    WING_LEN = 4,
    ARROW_COLOR = "rgb(175,175,175)",

    $vectormap_canvas,
    canvas_ctx,
    canvas_width,
    canvas_height,

    vectormap_u,
    vectormap_v,
    grid_width,
    grid_height,
    spacing,

    enabled = true,

    //
    // Private methods.
    //
    initHTMLelement = function() {
      $vectormap_canvas = $('<canvas />');
      $vectormap_canvas.attr('id', html_id || DEFAULT_ID);
      canvas_ctx = $vectormap_canvas[0].getContext('2d');
    },

    // Helper method for drawing a single vector.
    drawVector = function(x, y, vx, vy) {
      var r = 1.0 / Math.sqrt(vx * vx + vy * vy),
        arrowx = vx * r,
        arrowy = vy * r,
        x1 = x + arrowx * VECTOR_BASE_LEN + vx * VECTOR_SCALE,
        y1 = y + arrowy * VECTOR_BASE_LEN + vy * VECTOR_SCALE,
        wingx = WING_LEN * (arrowx * WING_COS + arrowy * WING_SIN),
        wingy = WING_LEN * (arrowy * WING_COS - arrowx * WING_SIN);

      canvas_ctx.beginPath();
      canvas_ctx.moveTo(x, y);
      canvas_ctx.lineTo(x1, y1);

      canvas_ctx.lineTo(x1 - wingx, y1 - wingy);
      canvas_ctx.moveTo(x1, y1);

      wingx = WING_LEN * (arrowx * WING_COS - arrowy * WING_SIN);
      wingy = WING_LEN * (arrowy * WING_COS + arrowx * WING_SIN);
      canvas_ctx.lineTo(x1 - wingx, y1 - wingy);

      canvas_ctx.stroke();
    },

    //
    // Public API.
    //
    vectormap_view = {
      // Render vectormap on the canvas.
      renderVectormap: function() {
        if (!enabled) return;

        var dx, dy, x0, y0, uij, vij,
          i, j, iny, ijny;

        if (!vectormap_u || !vectormap_v) {
          throw new Error("Vectormap: bind vectormap before rendering.");
        }

        dx = canvas_width / grid_width;
        dy = canvas_height / grid_height;

        canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);
        canvas_ctx.strokeStyle = ARROW_COLOR;
        canvas_ctx.lineWidth = 1;

        for (i = 1; i < grid_width - 1; i += spacing) {
          iny = i * grid_height;
          x0 = (i + 0.5) * dx; // + 0.5 to move arrow into field center
          for (j = 1; j < grid_height - 1; j += spacing) {
            ijny = iny + j;
            y0 = (j + 0.5) * dy; // + 0.5 to move arrow into field center
            uij = vectormap_u[ijny];
            vij = vectormap_v[ijny];
            if (uij * uij + vij * vij > 1e-15) {
              drawVector(x0, y0, uij, vij);
            }
          }
        }
      },

      clear: function() {
        canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);
      },

      get enabled() {
        return enabled;
      },
      set enabled(v) {
        enabled = v;
        // Clear vectormap, as .renderVectormap() call won't do it.
        if (!enabled) vectormap_view.clear();
      },

      // Bind vector map to the view.
      bindVectormap: function(new_vectormap_u, new_vectormap_v, new_grid_width, new_grid_height, arrows_per_row) {
        if (new_grid_width * new_grid_height !== new_vectormap_u.length) {
          throw new Error("Heatmap: provided U component of vectormap has wrong dimensions.");
        }
        if (new_grid_width * new_grid_height !== new_vectormap_v.length) {
          throw new Error("Heatmap: provided V component of vectormap has wrong dimensions.");
        }
        vectormap_u = new_vectormap_u;
        vectormap_v = new_vectormap_v;
        grid_width = new_grid_width;
        grid_height = new_grid_height;
        spacing = Math.round(new_grid_width / arrows_per_row);
      },

      getHTMLElement: function() {
        return $vectormap_canvas;
      },

      resize: function() {
        canvas_width = $vectormap_canvas.width();
        canvas_height = $vectormap_canvas.height();
        $vectormap_canvas.attr('width', canvas_width);
        $vectormap_canvas.attr('height', canvas_height);
      }
    };

  // One-off initialization.
  initHTMLelement();

  return vectormap_view;
};

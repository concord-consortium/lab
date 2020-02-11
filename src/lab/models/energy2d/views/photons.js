/*global define: false, $: false*/

// Energy2D photons view.
//
// It uses HTML5 Canvas for rendering.
// getHTMLElement() returns jQuery object with canvas used for rendering.
// Before use, this view should be bound with the parts array using bindPhotonsArray(photons).
// To render parts use renderPhotons() method.
// Set size of the parts view using CSS rules. The view fits canvas dimensions to the real
// size of the HTML element to avoid low quality scaling.

export default function PhotonsView(html_id) {
  var
    DEFAULT_ID = 'energy2d-photons-view',
    DEFAULT_CLASS = 'energy2d-photons-view',

    PHOTON_LENGTH = 10,

    $photons_canvas,
    canvas_ctx,
    canvas_width,
    canvas_height,

    photons,
    scale_x,
    scale_y,
    scene_width,
    scene_height,

    //
    // Private methods.
    //
    initHTMLelement = function() {
      $photons_canvas = $('<canvas />');
      $photons_canvas.attr('id', html_id || DEFAULT_ID);
      $photons_canvas.addClass(DEFAULT_CLASS);

      canvas_ctx = $photons_canvas[0].getContext('2d');
    },

    setCanvasStyle = function() {
      canvas_ctx.strokeStyle = "rgba(255,255,255,128)";
      canvas_ctx.lineWidth = 0.5;
    },

    //
    // Public API.
    //
    photons_view = {
      // Render vectormap on the canvas.
      renderPhotons: function() {
        var
          photon, sx, sy, r,
          i, len;

        if (!photons) {
          throw new Error("Photons view: bind parts array before rendering.");
        }

        canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);
        for (i = 0, len = photons.length; i < len; i += 1) {
          photon = photons[i];

          sx = photon.x * scale_x;
          sy = photon.y * scale_y;
          r = 1 / Math.sqrt(photon.vx * photon.vx + photon.vy * photon.vy);

          canvas_ctx.beginPath();
          canvas_ctx.moveTo(sx, sy);
          canvas_ctx.lineTo(sx + PHOTON_LENGTH * photon.vx * r, sy + PHOTON_LENGTH * photon.vy * r);
          canvas_ctx.stroke();
        }
      },

      // Bind vector map to the view.
      bindPhotonsArray: function(new_photons, new_scene_width, new_scene_height) {
        photons = new_photons;
        scene_width = new_scene_width;
        scene_height = new_scene_height;
        scale_x = canvas_width / scene_width;
        scale_y = canvas_height / scene_height;
      },

      getHTMLElement: function() {
        return $photons_canvas;
      },

      resize: function() {
        canvas_width = $photons_canvas.width();
        canvas_height = $photons_canvas.height();
        scale_x = canvas_width / scene_width;
        scale_y = canvas_height / scene_height;
        $photons_canvas.attr('width', canvas_width);
        $photons_canvas.attr('height', canvas_height);
        setCanvasStyle();
      }
    };

  // One-off initialization.
  initHTMLelement();
  setCanvasStyle();

  return photons_view;
};
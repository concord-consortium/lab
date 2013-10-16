/*global define: false, $: false */

define(function(require) {
  var HeatmapView        = require('models/energy2d/views/heatmap'),
      HeatmapWebGLView   = require('models/energy2d/views/heatmap-webgl'),
      WebGLStatusView    = require('models/energy2d/views/webgl-status'),
      VectormapView      = require('models/energy2d/views/vectormap'),
      VectormapWebGLView = require('models/energy2d/views/vectormap-webgl'),
      PhotonsView        = require('models/energy2d/views/photons'),
      PartsView          = require('models/energy2d/views/parts'),
      SensorsView        = require('models/energy2d/views/sensors');


  return function Renderer(SVGContainer, model) {
    var api,

        heatmap_view,
        velocity_view,
        photons_view,
        parts_view,
        sensors_view,
        webgl_status = new WebGLStatusView(null, model),
        $status = webgl_status.getHTMLElement(),
        $canvasCont = $("<div id='e2d-canvas-views'>"),
        canvasCount = 0,

        isSetup = false;

    function setAsNextLayer(view) {
      var $layer = view.getHTMLElement();

      $layer.css('width', '100%');
      $layer.css('height', '100%');
      $layer.css('position', 'absolute');
      $layer.css('top', 0);
      $layer.css('left', 0);
      $layer.css('z-index', canvasCount);
      canvasCount += 1;

      $canvasCont.append($layer);

      // Note that we SHOULD implement it in the following way:
      //
      // var $layer = view.getHTMLElement(),
      //     fo = g.append("foreignObject").attr({
      //       width: "100%",
      //       height: "100%"
      //     }).style({
      //       width: "100%",
      //       height: "100%"
      //     });
      // $layer.css('width', '100%');
      // if (!customHeight) $layer.css('height', '100%');
      // $layer.appendTo(fo);
      //
      // but foreignObject support is completely broken in Chrome (works fine in Firefox).
      // TODO: check if new version (30+?) fixes that.
    }

    function setupCanvasViews() {
      var props = model.properties;

      $canvasCont.empty();
      canvasCount = 0;
      // Use isWebGLActive() method, not use_WebGL property. The fact that
      // use_WebGL option is set to true doesn't mean that WebGL can be
      // initialized. It's only a preference.
      if (model.isWebGLActive()) {
        heatmap_view = new HeatmapWebGLView();
        velocity_view = new VectormapWebGLView();
        // Both VectormapWebGL and HeatmapWebGL use common canvas,
        // so it's enough to set it only once as the next layer.
        setAsNextLayer(velocity_view);
      } else {
        heatmap_view = new HeatmapView();
        setAsNextLayer(heatmap_view);
        velocity_view = new VectormapView();
        setAsNextLayer(velocity_view);
      }
      photons_view = new PhotonsView();
      setAsNextLayer(photons_view);

      // It must be called after attaching to parent node.
      heatmap_view.resize();
      velocity_view.resize();
      photons_view.resize();

      // Bind models to freshly created views.
      if (model.isWebGLActive()) {
        heatmap_view.bindHeatmapTexture(model.getTemperatureTexture());
        velocity_view.bindVectormapTexture(model.getVelocityTexture(), props.grid_width, props.grid_height, 25);
      } else {
        heatmap_view.bindHeatmap(model.getTemperatureArray(), props.grid_width, props.grid_height);
        velocity_view.bindVectormap(model.getUVelocityArray(), model.getVVelocityArray(), props.grid_width, props.grid_height, 25);
      }
      photons_view.bindPhotonsArray(model.getPhotonsArray(), props.model_width, props.model_height);
    }

    function setVisOptions () {
      var props = model.properties;
      velocity_view.enabled = props.velocity;
      heatmap_view.setMinTemperature(props.minimum_temperature);
      heatmap_view.setMaxTemperature(props.maximum_temperature);
      heatmap_view.setColorPalette(props.color_palette_type);
      sensors_view.setMinMaxTemp(props.minimum_temperature, props.maximum_temperature);
    }

    api = {
      getHeightForWidth: function(width) {
        return width * model.properties.grid_height / model.properties.grid_width;
      },

      setup: function (model) {
        isSetup = true;
        setupCanvasViews();

        parts_view.bindPartsArray(model.getPartsArray());
        sensors_view.bindSensorsArray(model.getSensorsArray());
        webgl_status.bindModel(model);
        setVisOptions();

        parts_view.renderParts();
        sensors_view.renderSensors();
        webgl_status.render();
        api.update();

        model.addPropertiesListener("use_WebGL", function() {
          setupCanvasViews();
          setVisOptions();
          webgl_status.render();
          api.update();
        });
        model.addPropertiesListener(["color_palette_type", "velocity",
                                     "minimum_temperature", "maximum_temperature"], function () {
          setVisOptions();
          api.update();
        });
        model.on('tick.view-update', api.update);
        model.on('partsChanged.view-update', function () {
          parts_view.renderParts();
        });
        model.on('sensorsChanged.view-update', function () {
          sensors_view.renderSensors();
        });
      },

      update: function () {
        if (!isSetup) return;
        heatmap_view.renderHeatmap();
        velocity_view.renderVectormap();
        photons_view.renderPhotons();
        sensors_view.update();
      },

      resize: function () {
        // Ignore all resize() callbacks if view isn't already set up.
        if (!isSetup) return;
        heatmap_view.resize();
        velocity_view.resize();
        photons_view.resize();
        parts_view.renderParts();
        sensors_view.renderSensors();
        api.update();
      },

      reset: function () {},

      setFocus: function () {
        if (model.get("enableKeyboardHandlers")) {
          this.$el.focus();
        }
      },

      bindModel: function(newModel) {
        model = newModel;
      }
    };

    (function() {
      // Instantiate SVG views.
      var viewport = SVGContainer.appendViewport();

      parts_view = new PartsView(SVGContainer, viewport.append("g"));
      sensors_view = new SensorsView(SVGContainer, viewport.append("g"));
      SVGContainer.$el.append($canvasCont);
      SVGContainer.$el.append($status);
    }());

    return api;
  };
});
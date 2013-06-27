/*global define: false, $: false */

define(function(require) {
  var HeatmapView        = require('energy2d/views/heatmap'),
      HeatmapWebGLView   = require('energy2d/views/heatmap-webgl'),
      WebGLStatus        = require('energy2d/views/webgl-status'),
      VectormapView      = require('energy2d/views/vectormap'),
      VectormapWebGLView = require('energy2d/views/vectormap-webgl'),
      PartsView          = require('energy2d/views/parts'),
      PhotonsView        = require('energy2d/views/photons');


  return function View() {
    var api,
        model,
        heatmap_view,
        velocity_view,
        parts_view,
        photons_view,
        webgl_status,

        layers_count = 0;

    function setAsNextLayer (view, customHeight) {
      var $layer = view.getHTMLElement();

      $layer.css('width', '100%');
      if (!customHeight) $layer.css('height', '100%');
      $layer.css('position', 'absolute');
      $layer.css('left', '0');
      $layer.css('top', '0');
      $layer.css('z-index', layers_count);
      layers_count += 1;
    }

    function createEnergy2DScene () {
      var props = model.properties;

      api.$el.empty();
      layers_count = 0;

      // Instantiate views.
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
      parts_view = new PartsView();
      setAsNextLayer(parts_view);
      webgl_status = new WebGLStatus();
      setAsNextLayer(webgl_status, true);

      // Append containers.
      api.$el.append(heatmap_view.getHTMLElement());
      api.$el.append(velocity_view.getHTMLElement());
      api.$el.append(photons_view.getHTMLElement());
      api.$el.append(parts_view.getHTMLElement());
      api.$el.append(webgl_status.getHTMLElement());

      // Bind models to freshly created views.
      if (model.isWebGLActive()) {
        heatmap_view.bindHeatmapTexture(model.getTemperatureTexture());
        velocity_view.bindVectormapTexture(model.getVelocityTexture(), props.grid_width, props.grid_height, 25);
      } else {
        heatmap_view.bindHeatmap(model.getTemperatureArray(), props.grid_width, props.grid_height);
        velocity_view.bindVectormap(model.getUVelocityArray(), model.getVVelocityArray(), props.grid_width, props.grid_height, 25);
      }
      parts_view.bindPartsArray(model.getPartsArray(), props.model_width, props.model_height);
      photons_view.bindPhotonsArray(model.getPhotonsArray(), props.model_width, props.model_height);
      webgl_status.bindModel(model);

      // It's enough to render parts only once, they don't move.
      parts_view.renderParts();
      // WebGL status also doesn't change during typical 'tick'.
      webgl_status.render();
    }

    function setVisOptions () {
      var props = model.properties;
      velocity_view.enabled = props.velocity;
      heatmap_view.setMinTemperature(props.minimum_temperature);
      heatmap_view.setMaxTemperature(props.maximum_temperature);
      heatmap_view.setColorPalette(props.color_palette_type);
    }

    api = {
      $el: $("<div>").attr("tabindex", 0),

      getHeightForWidth: function(width) {
        return width * model.properties.grid_height / model.properties.grid_width;
      },

      resize: function() {
        api.update();
        parts_view.renderParts();
      },

      reset: function() {},

      update: function () {
        heatmap_view.renderHeatmap();
        velocity_view.renderVectormap();
        photons_view.renderPhotons();
      },

      setFocus: function () {
        if (model.get("enableKeyboardHandlers")) {
          this.$el.focus();
        }
      },

      bindModel: function(newModel) {
        model = newModel;
        model.on('tick.view-update', api.update);
        model.addPropertiesListener("use_WebGL", function() {
          createEnergy2DScene();
          setVisOptions();
          api.update();
        });
        model.addPropertiesListener(["color_palette_type", "velocity",
                                     "minimum_temperature", "maximum_temperature"], function() {
          setVisOptions();
          api.update();
        });

        createEnergy2DScene();
        setVisOptions();
        api.update();
      }
    };

    return api;
  };
});
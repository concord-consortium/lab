/* global define, $ */

define(function() {
  var VisualizationContainer = require('energy2d/views/visualization-container'),
      use_WebGL = false;

  return function View() {
    var api,
        model,
        energy2d_scene,
        heatmap_view,
        velocity_view,
        parts_view,
        photons_view;

    function createEnergy2DScene () {
      energy2d_scene = new VisualizationContainer('model-container', use_WebGL);
      heatmap_view = energy2d_scene.getHeatmapView();
      velocity_view = energy2d_scene.getVelocityView();
      photons_view = energy2d_scene.getPhotonsView();
      parts_view = energy2d_scene.getPartsView();

      return energy2d_scene;
    }

    api = {
      $el: null,

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

        var props = model.properties;

        energy2d_scene.setVisualizationOptions(props);
        parts_view.bindPartsArray(model.getPartsArray(), props.model_width, props.model_height);
        photons_view.bindPhotonsArray(model.getPhotonsArray(), props.model_width, props.model_height);

        if (use_WebGL) {
          heatmap_view.bindHeatmapTexture(model.getTemperatureTexture());
          velocity_view.bindVectormapTexture(model.getVelocityTexture(), props.grid_width, props.grid_height, 25);
        } else {
          heatmap_view.bindHeatmap(model.getTemperatureArray(), props.grid_width, props.grid_height);
          velocity_view.bindVectormap(model.getUVelocityArray(), model.getVVelocityArray(), props.grid_width, props.grid_height, 25);
        }

        api.update();
        parts_view.renderParts();
      }
    };

    energy2d_scene = createEnergy2DScene();
    api.$el = energy2d_scene.getHTMLElement();

    return api;
  };
});
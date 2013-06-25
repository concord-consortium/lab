/*global define: false, $: false */

define(function() {
  var VisualizationContainer = require('energy2d/views/visualization-container');

  return function View() {
    var api,
        model,
        energy2d_scene,
        heatmap_view,
        velocity_view,
        parts_view,
        photons_view;

    function createEnergy2DScene () {
      var props = model.properties;

      energy2d_scene = new VisualizationContainer(api.$el, props.use_WebGL);
      heatmap_view = energy2d_scene.getHeatmapView();
      velocity_view = energy2d_scene.getVelocityView();
      photons_view = energy2d_scene.getPhotonsView();
      parts_view = energy2d_scene.getPartsView();

      if (props.use_WebGL) {
        heatmap_view.bindHeatmapTexture(model.getTemperatureTexture());
        velocity_view.bindVectormapTexture(model.getVelocityTexture(), props.grid_width, props.grid_height, 25);
      } else {
        heatmap_view.bindHeatmap(model.getTemperatureArray(), props.grid_width, props.grid_height);
        velocity_view.bindVectormap(model.getUVelocityArray(), model.getVVelocityArray(), props.grid_width, props.grid_height, 25);
      }

      parts_view.bindPartsArray(model.getPartsArray(), props.model_width, props.model_height);
      photons_view.bindPhotonsArray(model.getPhotonsArray(), props.model_width, props.model_height);

      // It's enough to render parts only once, they don't move.
      parts_view.renderParts();
    }

    function setVisOptions () {
      energy2d_scene.setVisualizationOptions(model.properties);
    }

    api = {
      $el: $("<div>"),

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
        model.addPropertiesListener(["color_palette_type", "minimum_temperature", "maximum_temperature"], function() {
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
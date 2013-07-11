/*global define: false, $: false */

define(function(require) {
  var HeatmapView        = require('energy2d/views/heatmap'),
      HeatmapWebGLView   = require('energy2d/views/heatmap-webgl'),
      WebGLStatus        = require('energy2d/views/webgl-status'),
      VectormapView      = require('energy2d/views/vectormap'),
      VectormapWebGLView = require('energy2d/views/vectormap-webgl'),
      PhotonsView        = require('energy2d/views/photons'),
      PartsView          = require('energy2d/views/parts'),
      SensorsView        = require('energy2d/views/sensors');


  return function Renderer(SVGContainer) {
    var api,
        model,

        heatmap_view,
        velocity_view,
        photons_view,
        parts_view,
        sensors_view,
        webgl_status = new WebGLStatus(),
        $status = webgl_status.getHTMLElement(),
        $canvasCont = $("<div>"),
        cavasCount = 0,

        beforeSetup = true;

    function setAsNextLayer (view) {
      var $layer = view.getHTMLElement();

      $layer.css('width', '100%');
      $layer.css('height', '100%');
      $layer.css('position', 'absolute');
      $layer.css('top', 0);
      $layer.css('left', 0);
      $layer.css('z-index', cavasCount);
      cavasCount += 1;

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

    function createEnergy2DScene () {
      var props = model.properties;

      $canvasCont.empty();
      cavasCount = 0;

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

      // Bind models to freshly created views.
      if (model.isWebGLActive()) {
        heatmap_view.bindHeatmapTexture(model.getTemperatureTexture());
        velocity_view.bindVectormapTexture(model.getVelocityTexture(), props.grid_width, props.grid_height, 25);
      } else {
        heatmap_view.bindHeatmap(model.getTemperatureArray(), props.grid_width, props.grid_height);
        velocity_view.bindVectormap(model.getUVelocityArray(), model.getVVelocityArray(), props.grid_width, props.grid_height, 25);
      }
      parts_view.bindPartsArray(model.getPartsArray(), props.model_width, props.model_height);
      sensors_view.bindSensorsArray(model.getSensorsArray());
      photons_view.bindPhotonsArray(model.getPhotonsArray(), props.model_width, props.model_height);
      webgl_status.bindModel(model);


      // WebGL status also doesn't change during typical 'tick', it also
      // doesn't need to react to resize event, as it's a dimple DIV that uses
      // % to define its dimensions.
      webgl_status.render();
      // Call this to setup dimensions of various views.
      api.resize();
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

      resize: function() {
        // Ignore all resize() callbacks if view isn't already set up.
        if (beforeSetup) return;
        heatmap_view.resize();
        velocity_view.resize();
        photons_view.resize();
        parts_view.renderParts();
        sensors_view.renderSensors();
        api.update();
      },

      reset: function() {},

      setup: function () {
        beforeSetup = false;
        createEnergy2DScene();
        setVisOptions();
      },

      update: function () {
        heatmap_view.renderHeatmap();
        velocity_view.renderVectormap();
        photons_view.renderPhotons();
        sensors_view.update();
      },

      setFocus: function () {
        if (model.get("enableKeyboardHandlers")) {
          this.$el.focus();
        }
      },

      bindModel: function(newModel) {
        model = newModel;
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
        model.on('tick.view-update', api.update);
        model.on('partsChanged.view-update', parts_view.renderParts);
        model.on('sensorsChanged.view-update', sensors_view.renderSensors);
      }
    };

    (function() {
      var vp = SVGContainer.viewport;
      parts_view = new PartsView(SVGContainer, vp.append("g").attr("class", "parts-layer"));
      sensors_view = new SensorsView(SVGContainer, vp.append("g").attr("class", "sensors-layer"));

      SVGContainer.$el.append($canvasCont);
      setPos($canvasCont, -1); // underneath SVG view.
      SVGContainer.$el.append($status);
      setPos($status, 1, true); // on top of SVG view.

      function setPos($el, zIndex, customHeight) {
        $el.css({
          'position': 'absolute',
          'width': '100%',
          'height': customHeight ? undefined : '100%',
          'top': 0,
          'left': 0,
          'z-index': zIndex
        });
      }
    }());

    return api;
  };
});
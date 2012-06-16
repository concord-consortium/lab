/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/controllers/energy2d/controllers.js
//

// define namespace
energy2d.namespace('energy2d.controllers');

// Basic Energy2D controller.
//
// Call this constructor function with interactive definition and the ID of the DOM container for an application.
// This HTML element is used as a default container for all interactive components that don't define their own containers.
energy2d.controllers.makeInteractiveController = function (interactive, interactive_container_id) {
  'use strict';
  var
    // Dependencies:
    modeler_ns = energy2d.modeler,
    views_ns = energy2d.views,
    // end.

    // Object with public API.
    controller,
    // Energy2D model.
    modeler,

    // Views:
    energy2d_scene,
    heatmap_view,
    velocity_view,
    parts_view,
    simulation_player_view,
    simulation_description_view,

    // Parameters:
    last_options,
    interval_id,
    steps_per_frame = 4,

    //
    // Private methods
    //
    createEnergy2DScene = function (component_def) {
      energy2d_scene = views_ns.makeEnergy2DScene(component_def.id);
      heatmap_view = energy2d_scene.getHeatmapView();
      velocity_view = energy2d_scene.getVelocityView();
      parts_view = energy2d_scene.getPartsView();

      return energy2d_scene;
    },

    createSimulationPlayer = function (component_def) {
      simulation_player_view = views_ns.makeSimulationPlayerView(component_def.id);
      // Bind itself (public API).
      simulation_player_view.bindSimulationController(controller);

      return simulation_player_view;
    },

    createSimulationDescription = function (component_def) {
      simulation_description_view = views_ns.makeSimulationDescription(component_def);
      // Bind itself (public API).
      simulation_description_view.bindSimulationController(controller);

      return simulation_description_view;
    },

    createComponent = function (component_def) {
      if (!component_def.type) {
        throw new Error('Interactive controller: missing component "type" property.');
      }
      switch (component_def.type) {
      case 'energy2d-scene-view':
        return createEnergy2DScene(component_def);
      case 'energy2d-simulation-player':
        return createSimulationPlayer(component_def);
      case 'energy2d-description':
        return createSimulationDescription(component_def)
      default:
        throw new Error('Interactive controller: unknow type of component.');
      }
    },

    nextStep = function () {
      var i = steps_per_frame;
      while (i > 0) {
        i -= 1;
        modeler.nextStep();
      }
      heatmap_view.renderHeatmap();
      velocity_view.renderVectormap();
    };

  //
  // Public API
  //
  controller = {
    loadInteractive: function (interactive, interactive_container_id) {
      var
        components = interactive.components || [],
        layout = interactive.layout || {},
        component, component_layout, $html_element,
        i, len;

      for (i = 0, len = components.length; i < len; i += 1) {
        component = createComponent(components[i]);

        // Get jQuery object with DOM element.
        $html_element = component.getHTMLElement();
        // Apply style if layout contains CSS definition.
        component_layout = layout[components[i].id] || {};
        if (component_layout.css) {
          $html_element.css(component_layout.css);
        }
        if (component_layout.class) {
          $html_element.addClass(component_layout.class);
        }
        // Append.
        if (component_layout.container) {
          $html_element.appendTo(component_layout.container);
        } else {
          $html_element.appendTo(interactive_container_id);
        }
      }

      // Finally, load scene model.
      controller.loadSceneModelFromURL(interactive.model);
    },

    loadSceneModelFromURL: function (options_url) {
      $.get(options_url)
        .success(function (data) {
          controller.loadSceneModel(data);
        })
        .error(function (jqXHR, textStatus, errorThrown) {
          throw new Error("Interactive controller: loading scene options failed - " + textStatus);
        });
    },

    loadSceneModel: function (options) {
      var grid_x, grid_y;
      modeler = modeler_ns.makeModeler(options.model);
      last_options = options;

      grid_x = modeler.getGridWidth();
      grid_y = modeler.getGridHeight();
      heatmap_view.bindHeatmap(modeler.getTemperatureArray(), grid_x, grid_y);
      velocity_view.bindVectormap(modeler.getUVelocityArray(), modeler.getVVelocityArray(), grid_x, grid_y, 4);
      parts_view.bindPartsArray(modeler.getPartsArray(), modeler.getWidth(), modeler.getHeight());

      heatmap_view.renderHeatmap();
      parts_view.renderParts();
    },

    //
    // Simulation controller methods implementation.
    //
    simulationPlay: function () {
      if (!interval_id) {
        interval_id = setInterval(nextStep, 0);
      }
    },

    simulationStep: function () {
      nextStep();
    },

    simulationStop: function () {
      if (interval_id !== undefined) {
        clearInterval(interval_id);
        interval_id = undefined;
      }
    },

    simulationReset: function () {
      controller.simulationStop();
      // TODO: use modeler.reset()
      controller.loadSceneModel(last_options);
    }
  };

  // One-off initialization.
  controller.loadInteractive(interactive, interactive_container_id);

  return controller;
};


import metadata from 'common/controllers/interactive-metadata';
import validator from 'common/validator';
import helpIconSupport from 'common/controllers/help-icon-support';


export default function ColorIndicatorController(component, interactivesController) {
  var propertyName, initialValue,
    title, colorFunc,
    // View elements.
    $elem,
    $title,
    $swatch,
    model,
    scriptingAPI,
    // Public API object.
    controller,

    // Updates joystick using model property. Used in modelLoadedCallback.
    // Make sure that this function is only called when:
    // a) model is loaded,
    // b) joystick is bound to some property.
    updateColorIndicator = function() {
      var value = interactivesController.getModel().get(propertyName);

      // Set the new color
      var color = colorFunc(value); // "hsl("+value+",100%,50%)";
      $swatch.css("background-color", color);
    };

  function initialize() {
    //
    // Initialize.
    //
    scriptingAPI = interactivesController.getScriptingAPI();
    model = interactivesController.getModel();
    // Validate component definition, use validated copy of the properties.
    component = validator.validateCompleteness(metadata.colorIndicator, component);
    propertyName = component.property;
    initialValue = component.initialValue;
    title = component.title;

    colorFunc = scriptingAPI.makeFunctionInScriptContext('value', component.colorValue);

    model = interactivesController.getModel();

    $title = $('<div class="title">' + title + '</div>');
    $swatch = $('<div class="swatch"></div>');

    $elem = $('<div class="interactive-color-indicator">')
      .append($title)
      .append($swatch);

    // Each interactive component has to have class "component".
    $elem.addClass("component");

    if (component.tooltip) {
      $elem.attr("title", component.tooltip);
    }

    helpIconSupport(controller, component, interactivesController.helpSystem);

    // Apply custom width and height settings.
    // Also not that we set dimensions of the most outer container, not slider.
    // Slider itself will always follow dimensions of container DIV.
    // We have to do it that way to ensure that labels refer correct dimensions.
    $elem.css({
      "width": component.width,
      "height": component.height
    });
    // Call resize function to support complex resizing when height is different from "auto".
    controller.resize();
  }

  // Public API.
  controller = {
    // This callback should be triggered when model is loaded.
    modelLoadedCallback: function() {
      if (model && propertyName) {
        model.removeObserver(propertyName, updateColorIndicator);
      }
      scriptingAPI = interactivesController.getScriptingAPI();
      model = interactivesController.getModel();
      if (propertyName) {
        model.addPropertiesListener([propertyName], updateColorIndicator);
      }

      if (propertyName) {
        updateColorIndicator();
      }
    },

    // Returns view container (div).
    getViewContainer: function() {
      return $elem;
    },

    resize: function() {},

    // Returns serialized component definition.
    serialize: function() {
      return $.extend(true, {}, component);
    }
  };

  initialize();

  // Return Public API object.
  return controller;
};

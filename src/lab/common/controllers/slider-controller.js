/*global define $ model*/

define(function () {

  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator');

  return function SliderController(component, scriptingAPI) {
    var min, max, steps, propertyName,
        action, initialValue,
        title, labels, displayValue,
        i, label,
        // View elements.
        $elem,
        $title,
        $label,
        $slider,
        $sliderHandle,
        $container,
        // Public API object.
        controller,

        // Updates slider using model property. Used in modelLoadedCallback.
        // Make sure that this function is only called when:
        // a) model is loaded,
        // b) slider is bound to some property.
        updateSlider = function  () {
          var value = model.get(propertyName);
          $slider.slider('value', value);
          if (displayValue) {
            $sliderHandle.text(displayValue(value));
          }
        };

    //
    // Initialize.
    //
    // Validate component definition, use validated copy of the properties.
    component = validator.validateCompleteness(metadata.slider, component);
    min = component.min;
    max = component.max;
    steps = component.steps;
    action = component.action;
    propertyName = component.property;
    initialValue = component.initialValue;
    title = component.title;
    labels = component.labels;
    displayValue = component.displayValue;

    // Setup view.
    if (min === undefined) min = 0;
    if (max === undefined) max = 10;
    if (steps === undefined) steps = 10;

    $title = $('<p class="title">' + title + '</p>');
    // we pick up the SVG slider component CSS if we use the generic class name 'slider'
    $container = $('<div class="container">');
    $slider = $('<div class="html-slider">').attr('id', component.id);
    $slider.appendTo($container);

    $slider.slider({
      min: min,
      max: max,
      step: (max - min) / steps
    });

    $sliderHandle = $slider.find(".ui-slider-handle");

    $elem = $('<div class="interactive-slider">')
              .append($title)
              .append($container);

    // Apply custom width and height settings.
    // Styles for jQuery UI components (see SASS files) ensure
    // that it will follow dimensions of its container.
    $elem.css({
      width: component.width,
      height: component.height
    });

    for (i = 0; i < labels.length; i++) {
      label = labels[i];
      $label = $('<p class="label">' + label.label + '</p>');
      $label.css('left', (label.value-min) / (max-min) * 100 + '%');
      $container.append($label);
    }

    // Bind action or/and property, process other options.
    if (action) {
      // The 'action' property is a source of a function which assumes we pass it a parameter
      // called 'value'.
      action = scriptingAPI.makeFunctionInScriptContext('value', action);
      $slider.bind('slide', function(event, ui) {
        action(ui.value);
        if (displayValue) {
          $sliderHandle.text(displayValue(ui.value));
        }
      });
    }

    if (propertyName) {
      $slider.bind('slide', function(event, ui) {
        // Just ignore slide events that occur before the model is loaded.
        var obj = {};
        obj[propertyName] = ui.value;
        if (model) model.set(obj);
        if (displayValue) {
          $sliderHandle.text(displayValue(ui.value));
        }
      });
    }

    if (displayValue) {
      displayValue = scriptingAPI.makeFunctionInScriptContext('value', displayValue);
    }

    // Public API.
    controller = {
      // This callback should be trigger when model is loaded.
      modelLoadedCallback: function () {
        var obj;

        if (propertyName) {
          model.addPropertiesListener([propertyName], updateSlider);
        }

        if (initialValue !== undefined && initialValue !== null) {
          // Make sure to call the action with the startup value of slider. (The script action may
          // manipulate the model, so we have to make sure it runs after the model loads.)
          if (action) {
            $slider.slider('value', initialValue);
            action(initialValue);
            if (displayValue) {
              $sliderHandle.text(displayValue(initialValue));
            }
          }

          if (propertyName) {
            obj = {};
            obj.propertyName = initialValue;
            model.set(obj);
          }
        } else if (propertyName) {
          updateSlider();
        }
      },

      // Returns view container (div).
      getViewContainer: function () {
        return $elem;
      },

      // Returns serialized component definition.
      serialize: function () {
        var result = $.extend(true, {}, component);

        if (propertyName) {
          // Two way binding between slider and model property.
          // Initial value was used to set model property once,
          // we do not need to do this again. Value of the slider
          // will be defined by the model.
          delete result.initialValue;
        }
        else {
          // No property binding. Just action script.
          // Update "initialValue" to represent current
          // value of the slider.
          result.initialValue = $slider.slider('value');
        }

        return result;
      }
    };
    // Return Public API object.
    return controller;
  };
});

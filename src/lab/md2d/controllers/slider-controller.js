/*global define $ model*/

define(function () {

  return function SliderController(component, scriptingAPI) {
    var min = component.min,
        max = component.max,
        steps = component.steps,
        action = component.action,
        propertyName = component.property,
        initialValue = component.initialValue,
        title = component.title || "",
        labels = component.labels || [],
        displayValue = component.displayValue,
        i,
        label,
        // View elements.
        $elem,
        $title,
        $label,
        $slider,
        $sliderHandle,
        $container,
        // Public API object.
        controller;

    if (min === undefined) min = 0;
    if (max === undefined) max = 10;
    if (steps === undefined) steps = 10;

    $title = $('<p class="title">' + title + '</p>');
    // we pick up the SVG slider component CSS if we use the generic class name 'slider'
    $container = $('<div class="container">');
    $slider = $('<div class="html-slider">');
    $container.append($slider);

    $slider.slider({
      min: min,
      max: max,
      step: (max - min) / steps
    });

    $sliderHandle = $slider.find(".ui-slider-handle");

    $elem = $('<div class="interactive-slider">')
              .append($title)
              .append($container);

    for (i = 0; i < labels.length; i++) {
      label = labels[i];
      $label = $('<p class="label">' + label.label + '</p>');
      $label.css('left', (label.value-min) / (max-min) * 100 + '%');
      $container.append($label);
    }

    if (displayValue) {
      displayValue = scriptingAPI.makeFunctionInScriptContext('value', displayValue);
    }

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

    // Public API.
    controller = {
      // This callback should be trigger when model is loaded.
      modelLoadedCallback: function () {
        var obj, value;

        if (propertyName) {
          $slider.bind('slide', function(event, ui) {
            // just ignore slide events that occur before the model is loaded
            var obj = {};
            obj[propertyName] = ui.value;
            if (model) model.set(obj);
            if (displayValue) {
              $sliderHandle.text(displayValue(ui.value));
            }
          });

          model.addPropertiesListener([propertyName], function() {
            var value = model.get(propertyName);
            $slider.slider('value', value);
            if (displayValue) {
              $sliderHandle.text(displayValue(value));
            }
          });
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
            value = model.get(propertyName);
            $slider.slider('value', value);
            if (displayValue) {
              $sliderHandle.text(displayValue(value));
            }
        }
      },

      // Returns view container (div).
      getViewContainer: function () {
        return $elem;
      }
    };
    // Return Public API object.
    return controller;
  };
});

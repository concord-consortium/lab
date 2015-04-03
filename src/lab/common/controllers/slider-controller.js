/*global define, $*/

define(function () {

  var metadata        = require('common/controllers/interactive-metadata'),
      validator       = require('common/validator'),
      disablable      = require('common/controllers/disablable'),
      helpIconSupport = require('common/controllers/help-icon-support');

  return function SliderController(component, interactivesController) {
    var min, max, steps, propertyName,
        actionFunc, initialValue, sliderOrientation,
        title, labels, displayValue, displayFunc,
        i, label,
        // View elements.
        $elem,
        $title,
        $label,
        $labelContainer,
        $slider,
        $sliderHandle,
        $container,
        model,
        scriptingAPI,
        // Public API object.
        controller,

        // Updates slider using model property. Used in modelLoadedCallback.
        // Make sure that this function is only called when:
        // a) model is loaded,
        // b) slider is bound to some property.
        updateSlider = function () {
          var value = interactivesController.getModel().get(propertyName);
          $slider.slider('value', value);
          if (displayValue) {
            $sliderHandle.text(displayFunc(value));
          }
        },
        updateSliderDisabledState = function () {
          var description = model.getPropertyDescription(propertyName);
          controller.setDisabled(description.getFrozen());
        };

    function bindTargets() {
      // Bind action or/and property, process other options.
      if (component.action) {
        // The 'action' property is a source of a function which assumes we pass it a parameter
        // called 'value'.
        actionFunc = scriptingAPI.makeFunctionInScriptContext('value', component.action);
        $slider.bind('slide', function(event, ui) {
          actionFunc(ui.value);
          if (displayValue) {
            $sliderHandle.text(displayFunc(ui.value));
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
            $sliderHandle.text(displayFunc(ui.value));
            if (component.orientation == "vertical") {
              $sliderHandle.css("left", -((parseFloat($sliderHandle.css("width"))) * .5))
            }
          }
        });
      }

      if (displayValue) {
        displayFunc = scriptingAPI.makeFunctionInScriptContext('value', displayValue);
      }
    }

    function initialize() {
      //
      // Initialize.
      //
      scriptingAPI = interactivesController.getScriptingAPI();
      model = interactivesController.getModel();
      // Validate component definition, use validated copy of the properties.
      component = validator.validateCompleteness(metadata.slider, component);
      min = component.min;
      max = component.max;
      steps = component.steps;
      sliderOrientation = component.orientation;
      propertyName = component.property;
      initialValue = component.initialValue;
      title = component.title;
      labels = component.labels;
      displayValue = component.displayValue;

      model = interactivesController.getModel();

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
        orientation: sliderOrientation,
        min: min,
        max: max,
        step: (max - min) / steps
      });

      $sliderHandle = $slider.find(".ui-slider-handle");

      $sliderHandle.attr('tabindex', interactivesController.getNextTabIndex());

      $elem = $('<div class="interactive-slider">')
                .append($title)
                .append($container);
      // Each interactive component has to have class "component".
      $elem.addClass("component");
      // Add class defining component orientation - "horizontal" or "vertical".
      $container.addClass(sliderOrientation);
      $elem.addClass(sliderOrientation);
      $slider.addClass(sliderOrientation);
      $sliderHandle.addClass(sliderOrientation);

      $labelContainer = $('<div></div>');
      $labelContainer.addClass(sliderOrientation);
      $container.append($labelContainer);
      for (i = 0; i < labels.length; i++) {
        label = labels[i];
        $label = $('<p class="label">' + label.label + '</p>');
        $label.addClass(sliderOrientation);
        if (sliderOrientation === "vertical") {
          // vertical calculation more complicated.
          // we want percentage of container height (element minus title height)
          // 12em is the min height of the vertical slider
          // 1em is the height of the title, .3em is the bottom margin of title
          // since the font-size of labels is 0.8em, we need to scale up
          var componentHeight;
          if(component.height == "auto") {
            componentHeight = 12;
          } else {
            componentHeight = parseFloat(component.height);
          }
          var remainingHeight = componentHeight - 1.3;
          $label.css('top', (label.value-max) / (min-max) * ((remainingHeight - 1) / 0.8) + 'em');
        } else {
          $label.css('left', (label.value-min) / (max-min) * 100 + '%');
        }
        $labelContainer.append($label);
      }

      bindTargets();

      if (component.tooltip) {
        $elem.attr("title", component.tooltip);
      }

      disablable(controller, component);
      helpIconSupport(controller, component, interactivesController.helpSystem);

      // Prevent keyboard control of slider from stepping the model backwards and forwards
      $sliderHandle.on('keydown.slider-handle', function(event) {
          event.stopPropagation();
      });

      // Apply custom width and height settings.
      // Also not that we set dimensions of the most outer container, not slider.
      // Slider itself will always follow dimensions of container DIV.
      // We have to do it that way to ensure that labels refer correct dimensions.
      $elem.css({
        "width": component.width,
        "height": component.height
      });
      if (component.width === "auto" && sliderOrientation === "horizontal") {
        // Ensure that min width is 12em, when width is set to "auto".
        // Prevent from situation when all sliders with short labels have
        // different widths, what looks distracting.
        $elem.css("min-width", "12em");
      }
      if (component.height === "auto" && sliderOrientation === "vertical") {
        // Ensure that min height is 12em, when height is set to "auto".
        // Prevent from situation when all sliders with short labels have
        // different widths, what looks distracting.
        $elem.css("height", "12em");
        $elem.css("min-height", "12em");
      }
      // Call resize function to support complex resizing when height is different from "auto".
      controller.resize();

      // Finally set the initial value if it's provided.
      if (initialValue !== undefined && initialValue !== null) {
        $slider.slider('value', initialValue);
        if (displayValue) {
          $sliderHandle.text(displayFunc(initialValue));
        }
      }
    }

    // Public API.
    controller = {
      // This callback should be triggered when model is loaded.
      modelLoadedCallback: function () {
        if (model && propertyName) {
          model.removeObserver(propertyName, updateSlider);
          model.removePropertyDescriptionObserver(propertyName, updateSliderDisabledState);
        }
        scriptingAPI = interactivesController.getScriptingAPI();
        model = interactivesController.getModel();
        if (propertyName) {
          model.addPropertiesListener([propertyName], updateSlider);
          model.addPropertyDescriptionObserver(propertyName, updateSliderDisabledState);
        }

        bindTargets();

        if (propertyName) {
          updateSlider();
        }
      },

      // Returns view container (div).
      getViewContainer: function () {
        return $elem;
      },

      resize: function () {
        var remainingHeight, emSize, remainingWidth, containerWidth, sliderWidth;
        if (component.height !== "auto" && sliderOrientation === "horizontal") {
          // Height calculation is more complex when height is different from
          // "auto". Calculate dynamically available height for slider itself.
          // Note that component.height refers to the height of the *whole*
          // component!
          remainingHeight = $elem.height() - $title.outerHeight(true);
          if ($label !== undefined) {
            remainingHeight -= $label.outerHeight(true);
          }
          $container.css("height", remainingHeight);
          $slider.css("top", 0.5 * remainingHeight);
          // Handle also requires dynamic styling.
          emSize = parseFloat($sliderHandle.css("font-size"));
          $sliderHandle.css("height", remainingHeight + emSize * 0.4);
          $sliderHandle.css("top", -0.5 * remainingHeight - emSize * 0.4);
        } else if (component.width !== "auto" && sliderOrientation === "vertical") {
          remainingWidth = $elem.width();
          // all labels have the same width, so the last one is just fine.
          // (more text in label gets pushed to another line)
          $container.css("width", remainingWidth);
          emSize = parseFloat($sliderHandle.css("font-size"));
          $sliderHandle.css("width", remainingWidth + emSize * 0.4);
        }
        if(sliderOrientation === "vertical") {
          // make sure slider handle is (initially) centered
          sliderWidth = parseFloat($sliderHandle.css("width"));
          $sliderHandle.css("left", -((sliderWidth) * .5));
          // find out what max slider width will be, wihtout messing it up
          var tmp = parseFloat($sliderHandle.text());
          if (!isNaN(tmp)) {
            $sliderHandle.text(displayFunc(max));
            sliderWidth = parseFloat($sliderHandle.css("width"));
            $sliderHandle.text(displayFunc(tmp));
          }
          //make the container height fill the element, minus the title height
          remainingHeight = $elem.height() - $title.outerHeight(true);
          $container.css("height", remainingHeight);
          //make sure labels not covered by slider or slider handle
          //set to max value first, to get the max width of slider
          $labelContainer.css("position", "absolute");
          $labelContainer.css("top", 0);
          //make the container move left past the labels
          containerWidth = parseFloat($container.css("width"));
          if ($label !== undefined) {
            var containerLeft;
            containerLeft = $label.outerWidth(true) + (sliderWidth - containerWidth) / 2;
            $container.css("left", containerLeft);
            //add a few pixels so it's not right next to the handle
            $labelContainer.css("left", -containerLeft - 5);
          }

        }
      },

      // Returns serialized component definition.
      serialize: function () {
        var result = $.extend(true, {}, component);

        if (!propertyName) {
          // No property binding. Just action script.
          // Update "initialValue" to represent current
          // value of the slider.
          result.initialValue = $slider.slider('value');
        }

        return result;
      }
    };

    initialize();

    // Return Public API object.
    return controller;
  };
});

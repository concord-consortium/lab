/*global define, $ */

define(function () {

  var metadata   = require('common/controllers/interactive-metadata'),
      disablable = require('common/controllers/disablable'),
      validator  = require('common/validator');

  return function CheckboxController(component, interactivesController) {
    var propertyName,
        actionScript,
        initialValue,
        $checkbox,
        $fakeCheckable,
        $label,
        $element,
        controller,
        model,
        scriptingAPI;

    // Updates checkbox using model property. Used in modelLoadedCallback.
    // Make sure that this function is only called when:
    // a) model is loaded,
    // b) checkbox is bound to some property.
    function updateCheckbox () {
      setCheckbox(model.get(propertyName));
    }

    function updateCheckboxDisabledState() {
      var description = model.getPropertyDescription(propertyName);
      controller.setDisabled(description.getFrozen());
    }

    function setCheckbox(value) {
      if (value) {
        $checkbox.prop('checked', true);
        $fakeCheckable.addClass('checked');
      } else {
        $checkbox.prop('checked', false);
        $fakeCheckable.removeClass('checked');
      }
    }

    function getCheckboxState() {
      return $checkbox.prop('checked');
    }

    function customClickEvent (e) {
      e.preventDefault();

      if ($checkbox.prop('checked')) {
        setCheckbox(false);
      } else {
        setCheckbox(true);
      }
      // Trigger change event!
      $checkbox.trigger('change');
    }

    model = interactivesController.getModel();
    scriptingAPI = interactivesController.getScriptingAPI();

    // Validate component definition, use validated copy of the properties.
    component = validator.validateCompleteness(metadata.checkbox, component);
    propertyName  = component.property;
    actionScript = component.action;
    initialValue  = component.initialValue;

    $label = $('<label>').append('<span>' + component.text + '</span>');
    $label.attr('for', component.id);
    $checkbox = $('<input type="checkbox">').attr('id', component.id);

    if (interactivesController) {
      $checkbox.attr('tabindex', interactivesController.getNextTabIndex());
    }

    $fakeCheckable = $('<div class="fakeCheckable">');
    // Hide native input, use fake checkable.
    $checkbox.css("display", "none");

    // default is to have label on right of checkbox
    if (component.textOn === "left") {
      $element = $('<div>').append($label).append($checkbox).append($fakeCheckable.addClass("right"));
    } else {
      $element = $('<div>').append($checkbox).append($fakeCheckable).append($label);
    }

    // Append class to the most outer container.
    $element.addClass("interactive-checkbox");
    // Each interactive component has to have class "component".
    $element.addClass("component");

    // Ensure that custom div (used for styling) is clickable.
    $fakeCheckable.on('click', customClickEvent);
    // Label also requires custom event handler to ensure that click updates
    // fake clickable element too.
    $label.on('click', customClickEvent);

    // Custom dimensions.
    $element.css({
      width: component.width,
      height: component.height
    });

    // Process onClick script if it is defined.
    if (actionScript) {
      // Create a function which assumes we pass it a parameter called 'value'.
      actionScript = scriptingAPI.makeFunctionInScriptContext('value', actionScript);
    }

    // Register handler for change event.
    $checkbox.on('change', function () {
      var value = false,
          propObj;
      // $(this) will contain a reference to the checkbox.
      if ($(this).is(':checked')) {
        value = true;
      }
      // Change property value if checkbox is connected
      // with model's property.
      if (propertyName !== undefined) {
        propObj = {};
        propObj[propertyName] = value;
        model.set(propObj);
      }
      // Finally, if checkbox has onClick script attached,
      // call it in script context with checkbox status passed.
      if (actionScript !== undefined) {
        actionScript(value);
      }
    });

    if (component.tooltip) {
      $element.attr("title", component.tooltip);
    }

    // Set initial value if provided.
    if (initialValue !== undefined) {
      setCheckbox(initialValue);
    }

    // Public API
    controller = {
      // This callback should be trigger when model is loaded.
      modelLoadedCallback: function () {
        if (model && propertyName !== undefined) {
          model.removeObserver(propertyName, updateCheckbox);
          model.removePropertyDescriptionObserver(propertyName, updateCheckboxDisabledState);
        }
        model = interactivesController.getModel();
        scriptingAPI = interactivesController.getScriptingAPI();

        // Connect checkbox with model's property if its name is defined.
        if (propertyName !== undefined) {
          // Register listener for 'propertyName'.
          model.addPropertiesListener([propertyName], updateCheckbox);
          model.addPropertyDescriptionObserver(propertyName, updateCheckboxDisabledState);
          // Perform initial checkbox setup.
          updateCheckbox();
        }
      },

      // Returns view container. Label tag, as it contains checkbox anyway.
      getViewContainer: function () {
        return $element;
      },

      // Returns serialized component definition.
      serialize: function () {
        var result = $.extend(true, {}, component);

        if (propertyName === undefined) {
          // No property binding. Just action script.
          // Update "initialValue" to represent current
          // value of the slider.
          result.initialValue = $checkbox.is(':checked') ? true : false;
        }

        return result;
      }
    };

    disablable(controller, component);

    // Return Public API object.
    return controller;
  };
});

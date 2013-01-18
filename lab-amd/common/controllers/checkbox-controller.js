/*global define $ model */

define(function () {

  return function CheckboxController(component, scriptingAPI) {
    var propertyName  = component.property,
        onClickScript = component.onClick,
        $checkbox,
        $label,
        controller,

        // Updates checkbox using model property. Used in modelLoadedCallback.
        // Make sure that this function is only called when:
        // a) model is loaded,
        // b) checkbox is bound to some property.
        updateCheckbox = function () {
          var value = model.get(propertyName);
          if (value) {
            $checkbox.attr('checked', true);
          } else {
            $checkbox.attr('checked', false);
          }
        };

    $checkbox = $('<input type="checkbox">').attr('id', component.id);
    $label = $('<label>').append(component.text).append($checkbox);
    // Append class to label, as it's the most outer container in this case.
    $label.addClass("interactive-checkbox");

    // Process onClick script if it is defined.
    if (onClickScript) {
      // Create a function which assumes we pass it a parameter called 'value'.
      onClickScript = scriptingAPI.makeFunctionInScriptContext('value', onClickScript);
    }

    // Register handler for click event.
    $checkbox.click(function () {
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
      if (onClickScript !== undefined) {
        onClickScript(value);
      }
    });

    // Public API.
    controller = {
      // This callback should be trigger when model is loaded.
      modelLoadedCallback: function () {
        // Connect checkbox with model's property if its name is defined.
        if (propertyName !== undefined) {
          // Register listener for 'propertyName'.
          model.addPropertiesListener([propertyName], updateCheckbox);
          // Perform initial checkbox setup.
          updateCheckbox();
        }
      },

      // Returns view container. Label tag, as it contains checkbox anyway.
      getViewContainer: function () {
        return $label;
      }
    };
    // Return Public API object.
    return controller;
  };
});

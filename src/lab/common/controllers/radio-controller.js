/*global define $ model */

define(function () {

  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator');

  return function RadioController(component, scriptingAPI, interactivesController) {
        // List of jQuery objects wrapping <input type="radio">.
    var $options = [],
        $div, $option, $span,
        controller,
        options, option, i, len;

    // Updates radio using model property. Used in modelLoadedCallback.
    // Make sure that this function is only called when:
    // a) model is loaded,
    // b) radio is bound to some property.
    function updateRadio() {
      var value = model.get(component.property);
      for (i = 0, len = options.length; i < len; i++) {
        if (options[i].value === value) {
          $options[i].attr("checked", true);
        }
      }
    }

    // Validate component definition, use validated copy of the properties.
    component = validator.validateCompleteness(metadata.radio, component);
    // Validate radio options too.
    options = component.options;
    for (i = 0, len = options.length; i < len; i++) {
      options[i] = validator.validateCompleteness(metadata.radioOption, options[i]);
    }

    $div = $('<div>').attr('id', component.id);
    // Each interactive component has to have class "component".
    $div.addClass("component");
    for (i = 0, len = options.length; i < len; i++) {
      option = options[i];
      $option = $('<input>')
        .attr('type', "radio")
        .attr('name', component.id);
      $options.push($option);
      if (option.disabled) {
        $option.attr("disabled", option.disabled);
      }
      if (option.selected) {
        $option.attr("checked", option.selected);
      }
      $span = $('<span class="radio">')
        .append($option)
        .append(option.text);
      $div.append($span);
      if (component.orientation === "vertical") {
        $div.append("<br/>");
      }
      $option.change((function(option, index) {
        return function() {
          var i, len;

          // Update component definition only if there is no property binding.
          if (component.property === undefined) {
            for (i = 0, len = options.length; i < len; i++) {
              delete options[i].selected;
            }
            options[index].selected = true;
          }

          if (option.action){
            scriptingAPI.makeFunctionInScriptContext(option.action)();
          } else if (option.loadModel){
            model.stop();
            interactivesController.loadModel(option.loadModel);
          } else if (option.value !== undefined) {
            model.set(component.property, option.value);
          }
        };
      })(option, i));
    }


    // Public API.
    controller = {
      modelLoadedCallback: function () {
        // Connect radio with model's property if its name is defined.
        if (component.property !== undefined) {
          // Register listener for property.
          model.addPropertiesListener([component.property], updateRadio);
          // Perform initial radio setup.
          updateRadio();
        }
      },

      // Returns view container.
      getViewContainer: function () {
        return $div;
      },

      // Returns serialized component definition.
      serialize: function () {
        // Return compoment definition. It's always valid,
        // as selected option is updated during 'change' callback.
        return $.extend(true, {}, component);
      }
    };
    // Return Public API object.
    return controller;
  };
});

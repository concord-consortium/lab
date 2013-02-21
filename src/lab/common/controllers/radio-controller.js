/*global define $ model */

define(function () {

  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator');

  return function RadioController(component, scriptingAPI, interactivesController) {
    var $div, $option, $span,
        controller,
        options, option, i, len;

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
      if (option.disabled) {
        $option.attr("disabled", option.disabled);
      }
      if (option.selected) {
        $option.attr("checked", option.selected);
      }
      $span = $('<span class="radio">')
        .append($option)
        .append(option.text);
      $div.append($span)
      if (component.orientation === "vertical") {
        $div.append("<br/>");
      }
      $option.change((function(option, index) {
        return function() {
          var i, len;

          // Update component definition.
          for (i = 0, len = options.length; i < len; i++) {
            delete options[i].selected;
          }
          options[index].selected = true;

          if (option.action){
            scriptingAPI.makeFunctionInScriptContext(option.action)();
          } else if (option.loadModel){
            model.stop();
            interactivesController.loadModel(option.loadModel);
          }
        };
      })(option, i));
    }

    // Public API.
    controller = {
      // No modelLoadeCallback is defined. In case of need:
      // modelLoadedCallback: function () {
      //   (...)
      // },

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

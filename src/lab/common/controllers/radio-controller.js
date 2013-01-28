/*global define $ model */

define(function () {

  return function RadioController(component, scriptingAPI, interactivesController) {
    var $div, $option, $span,
        options = component.options || [],
        id = component.id,
        controller,
        option, i, ii;

    $div = $('<div>').attr('id', id);
    $div.addClass("component");

    for (i=0, ii=options.length; i<ii; i++) {
      option = options[i];
      $option = $('<input>')
        .attr('type', "radio")
        .attr('name', id);
      if (option.disabled) {
        $option.attr("disabled", option.disabled);
      }
      if (option.selected) {
        $option.attr("checked", option.selected);
      }
      $span = $('<span>')
        .append($option)
        .append(option.text);
      $div.append($span).append("<br/>");

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

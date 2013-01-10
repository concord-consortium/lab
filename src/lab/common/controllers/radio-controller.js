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

      $option.change((function(option) {
        return function() {
          if (option.action){
            scriptingAPI.makeFunctionInScriptContext(option.action)();
          } else if (option.loadModel){
            model.stop();
            interactivesController.loadModel(option.loadModel);
          }
        };
      })(option));
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
      }
    };
    // Return Public API object.
    return controller;
  };
});

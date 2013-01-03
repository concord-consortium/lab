/*global define $ model*/

define(function () {

  return function PulldownController(component, scriptingAPI, interactivesController) {
    var $pulldown, $option,
        options = component.options || [],
        option,
        controller,
        i, ii;

    $pulldown = $('<select>').attr('id', component.id);
    $pulldown.addClass("component");

    for (i=0, ii=options.length; i<ii; i++) {
      option = options[i];
      $option = $('<option>').html(option.text);
      if (option.disabled) {
        $option.attr("disabled", option.disabled);
      }
      if (option.selected) {
        $option.attr("selected", option.selected);
      }
      $pulldown.append($option);
    }

    $pulldown.change(function() {
      var index = $(this).prop('selectedIndex'),
          action = component.options[index].action;

      if (action){
        scriptingAPI.makeFunctionInScriptContext(action)();
      } else if (component.options[index].loadModel){
        model.stop();
        interactivesController.loadModel(component.options[index].loadModel);
      }
    });

    // Public API.
    controller = {
      // No modelLoadeCallback is defined. In case of need:
      // modelLoadedCallback: function () {
      //   (...)
      // },

      // Returns view container.
      getViewContainer: function () {
        return $pulldown;
      }
    };
    // Return Public API object.
    return controller;
  };
});

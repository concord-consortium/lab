 // Set of available components.
      // - Key defines 'type', which is used in the interactive JSON.
      // - Value is a constructor function of the given component.
      // Each constructor should assume that it will be called with
      // following arguments:
      // 1. component definition (unmodified object from the interactive JSON),
      // 2. scripting API object,
      // 3. public API of the InteractiveController.
      // Of course, some of them can be passed unnecessarily, but
      // the InteractiveController follows this convention.
      //
      // The instantiated component should provide following interface:
      // # serialize()           - function returning a JSON object, which represents current state
      //                           of the component. When component doesn't change its state,
      //                           it should just return a copy (!) of the initial component definition.
      // # getViewContainer()    - function returning a jQuery object containing
      //                           DOM elements of the component.
      // # modelLoadedCallback(model) - optional function with , a callback which is called when the model is loaded.
      // # resize()              - optional function taking no arguments, a callback
      //                           which is called by the layout algorithm when component's container
      //                           dimensions are changed. This lets component to adjust itself to the
      //                           new container dimensions.
      //
      // Note that each components view container (so, jQuery object returned by getViewContainer() has to
      // have class 'component'! It's required and checked in the runtime by the interactive controller.
      // It ensures good practices while implementing new components.
      // Please see: src/sass/lab/_interactive-component.sass to check what this CSS class defines.


define(function(){
      
  var metadata          = require('common/controllers/interactive-metadata'),
      validator         = require('common/validator'),
      helpIconSupport   = require('common/controllers/help-icon-support'),
      // NumericOutputView = require('common/views/numeric-output-view');

      return function Spinner(component, interactivesController){
      var controller,model,scriptingAPI;

      function renderValue() {
      var value = model.properties[propertyName];

      if (displayValue) {
        value = displayValue(value);
      }
      view.update(value);
    }

      model = interactivesController.getModel();
    scriptingAPI = interactivesController.getScriptingAPI();
    component = validator.validateCompleteness(metadata.spinner, component);

      
    function renderValue() {
      var value = model.properties[propertyName];

      if (displayValue) {
        value = displayValue(value);
      }
      view.update(value);
    }
      
function initialize() {
      var $option, $fakeCheckable, $label,
          option, i, len;

      // Create HTML elements.
      $div = $('<div>').attr('id', component.id);
      $div.addClass("interactive-spinner");
      // Each interactive component has to have class "component".
      $div.addClass("component");
      // Add class defining component orientation - "horizontal" or "vertical".
      $div.addClass(component.orientation);

      if (component.label) {
        $label = $("<span>").text(component.label);
        $label.addClass("label");
        $label.addClass(component.labelOn === "top" ? "on-top" : "on-left");
        $div.append($label);
      }

      // Create options (<input type="number">)
      for (i = 0, len = options.length; i < len; i++) {
        option = options[i];
        $option = $('<input>')
          .attr('type', "number")
          .attr('name', component.id)
          .attr('value',0);
          // .attr('tabindex', interactivesController.getNextTabIndex())
          // .attr('id', component.id + '-' + i);
        $options.push($option);

        $label = $('<label>') 
          .attr("for", component.id + '-' + i)
          .text(option.text);

     

    };



      controller = {
      // This callback should be trigger when model is loaded.
      modelLoadedCallback: function () {
        if (model) {
          model.removeObserver(propertyName, renderValue);
        }
        model = interactivesController.getModel();
        scriptingAPI = interactivesController.getScriptingAPI();
        if (propertyName) {
          propertyDescription = model.getPropertyDescription(propertyName);
          if (propertyDescription) {
            if (!label) { view.updateLabel(propertyDescription.getLabel()); }
            if (!units) { view.updateUnits(propertyDescription.getUnitAbbreviation()); }
          }
          renderValue();
          model.addObserver(propertyName, renderValue);
        }
      },

      // getViewContainer: function () {
      //   return $element;
      // },

      serialize: function () {
        // Return the initial component definition.
        // Numeric output component doesn't have any state, which can be changed.
        // It's value is defined by underlying model.
        return $.extend(true, {}, component);
      }
    };
    return controller;
}
});

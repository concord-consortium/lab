/** 
 *Controller for the spinnner functionality that can be used in place of other input methods
*/

/**
 * The functions that have been implemented are :-
 * serialize()
 * getViewContainer()
 * modelLoadedCallback(model)
 * resize()
*/
define(function () {

  var metadata        = require('common/controllers/interactive-metadata'),
      validator       = require('common/validator'), 
      disablable      = require('common/controllers/disablable'),
      helpIconSupport = require('common/controllers/help-icon-support');

  return function SpinnerController(component, interactivesController) {
    var min, max, id, type, title, units,
        steps, initialValue, displayValue,
        propertyName, displayFunc,
        //View Elements.
        $container,
        $title,
        $spinnerBox,
        $spinnnerValue,
        $spinnerButtonUp,
        $spinnerButtonDown,
        model,
        scriptingAPI,
        controller,
    
        updateSpinner = function () {
          var value = interactivesController.getModel().get(propertyName);
          $spinnerBox.spinner('value', value);
          if (displayValue) {
            $spinnerBox.val(displayFunc(value));
          }
        },
        updateSpinnerDisabledState = function () {
          var description = model.getPropertyDescription(propertyName);
          controller.setDisabled(description.getFrozen());
        };
        
    // Binding the appropriate events to elements
    function bindTargets() {
      
      if (component.action) {
        actionFunc = scriptingAPI.makeFunctionInScriptContext('value');
        $spinnerButtonUp.bind('click', function(event){
          value = $spinnerBox.spinner('value');
          actionFunc(value);
          if (displayValue) {
            $spinnerBox.val(displayFunc(value));
          }
        });

        $spinnerButtonDown.bind('click', function(event){
          value = $spinnerBox.spinner('value');
          actionFunc(value);
          if (displayValue) {
            $spinnerBox.val(displayFunc(value));
          }
        });
      }

      if (propertyName) {
        $spinnerButtonUp.bind('click', function(event) {
          var obj = {};
          value = $spinnerBox.spinner('value')
          obj[propertyName] = value;
          if (model) model.set(obj);
          if (displayValue) {
            $spinnerBox.val(displayFunc(value));
          }
        });
        
        $spinnerButtonDown.bind('click', function(event) {
          var obj = {};
          value = $spinnerBox.spinner('value')
          obj[propertyName] = value;
          if (model) model.set(obj);
          if (displayValue) {
            $spinnerBox.val(displayFunc(value));
          }
        });
      }

      if (displayValue) {
        displayFunc = scriptingAPI.makeFunctionInScriptContext('value', displayValue);
      }
    }

    // Initializing the values and structure of the component
    function initialize() {

      scriptingAPI = interactivesController.getScriptingAPI();
      model = interactivesController.getModel();
      /**
      * Validate the components' JSON  for completeness
      */
      component = validator.validateCompleteness(metadata.spinner, component);
      
      // Initialize the spinner components
      min = component.min;
      max = component.max;
      steps  = component.steps;
      title = component.title + ' (' + component.units + ')';
      initialValue = component.initialValue;
      displayValue = component.displayValue;
      propertyName = component.property;

      if (min === undefined) min=0;
      if (max === undefined) max=100;
      if (steps === undefined) steps = 1;

      // Initializing the view components
      $container = $('<div class="interactive-spinner">');
      $spinnerBox = $('<input class="html5-spinner">').attr(id, component.id);
      $title = $('<p class="title">' + title + '</p>');
      $title.appendTo($container);
      $spinnerBox.appendTo($container);
      //Assign the tabIndex to every anchor or input component

      // As each interactive component should have class component
      $container.addClass('component');
      
      //Applying the height and width to the spinner
      $spinnerBox.width(component.width);
      $spinnerBox.height(component.height);

      if (component.width === "auto") $container.css({"min-width":"12em"});

      // Initialize spinner with given values, the spinner comes in spinnerBox
      $spinnerBox.spinner({
        step: (max - min) / steps,
        min : min,
        max : max
      });

      $spinnerButtonUp = $container.find(".ui-spinner-up");
      $spinnerButtonDown = $container.find(".ui-spinner-down");

      bindTargets();
      if (component.tooltip) {
        $container.attr("title", component.tooltip);
      }

      disablable(controller, component);
      helpIconSupport(controller, component, interactivesController.helpSystem);
      
      controller.resize();
      //Set the initial values to the spinner if it is defined
      if (initialValue !== undefined && initialValue !== null) {
       $spinnerBox.spinner('value', initialValue);
       if (displayValue) {
         $spinnerBox.val(displayFunc(value));
        }
      }
    }

    // Public API
    controller = {

      //This is triggered when model is loaded
      modelLoadedCallback: function () {
        if (model && propertyName) {
          model.removeObserver(propertyName, updateSpinner);
          model.removePropertyDescriptionObserver(propertyName, updateSpinnerDisabledState);
        }
        scriptingAPI = interactivesController.getScriptingAPI();
        model = interactivesController.getModel();
        if (propertyName) {
          model.addPropertiesListener([propertyName], updateSpinner);
          model.addPropertyDescriptionObserver(propertyName, updateSpinnerDisabledState);
        }

        bindTargets();

        if (propertyName) {
          updateSpinner();
        }
      },

      //get the HTML container of the spinner 
      getViewContainer: function () {
        return $container;
      },

      //when the browser window resizes
      resize: function () {

      },

      //Returns serialized component definition
      serialize: function () {
        var result = $.extend(true, {}, component);
        
        if(!propertyName){
          result.initialValue = $spinnerBox.spinner('value');
        }
        return result;
      }
    };
    initialize();

    return controller;
  };
});

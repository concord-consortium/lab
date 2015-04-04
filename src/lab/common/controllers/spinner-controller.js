/** 
 *Controller for the spinnner funcionality that can be used in place of other input methods
*/

/**
 * The functions that have been implemented are :-
 * serialize()
 * getViewContainer()
 * modelLoadedCallback(model)
 * resize()
*/
define(function(){

  var metadata   = require('common/controllers/interactive-metadata'),
      validator  = require('common/validator'), 
      disablable = require('common/controllers/disablable');

  return function SpinnerController(componenet, interactivesController){
    var min, max, id, type, title, units,
        stepSize, initialValue, displayValue,
        propertyName, numberFormat,
        $container,
        $title,
        $spinnerBox,
        $spinnnerValue,
        $spinnerButtons,
        model,
        scriptingAPI,
        component;


    // Binding the appropriate events to elements
    function bindTargets(){

    }

    // Initializing the values and structure of the component
    function initialize(){

      scriptingAPI = interactivesController.getScriptingAPI();
      model = interactivesController.getModel();

      /**
      * Validate the components' JSON  for completeness
      */
      component = validator.validateCompleteness(metadata.spinner, component);
      
      // Initialize the spinner components
      min = component.min;
      max = component.max;
      stepSize  = component.stepSize;
      initialValue = component.initialValue;
      displayValue = component.displayValue;
      propertyName = component.property;
      numberFormat = component.numberFormat;
      title = component.title;
      units = component.units;

      if(stepSize === undefined) stepSize = 1;

      // Initializing the view components
      $container = $('<div class="spinner-container">');
      $spinnerBox = $('<div class="html5-spinner">').attr(id, component.id);
      $title = $('<p class="title">' + title + '</p>');
      $title.appendTo($container);
      $spinnerBox.appendTo($container);

      $spinnerButtons = $spinnerBox.find("ui-spinner-button");

      //Assign the tabIndex to every anchor or input component
      $spinnerButtons.attr('tabindex', interactivesController.getNextTabindex());

      // As each interactive component should have class component
      $container.addClass('component');

      // Space left for adding a tooltip and helpicon if needed later


      //Applying the height and width to the spinner
      $container.css({
        width: component.width,
        height: component.height
      });

      if(component.width === "auto") $container.css({"min-width":"14em"});

      // Initialize spinner with given values, the spinner comes in spinnerBox
      $spinnerBox.spinner({
        step: stepSize,
        min : min,
        max : max,
        numberFormat : numberFormat
      });

      bindTargets();

      $spinnerButtons.on('keydown.ui-spinner-button', function(event){
        event.stopPropagation();
      });

      //Set the initial values to the spinner if it is defined
      if(initialValue !== undefined && initialValue !== null) $spinnerBox.spinner('value',initialValue);
    }

    // Public API
    controller = {

      //This is triggered when model is loaded
      modelLoadedCallback: function(){

      },

      //get the HTML container of the spinner 
      getViewContainer: function(){
        return $container;
      },

      //when the browser window resizes
      resize: function(){

      },

      //Returns serialized component definition
      serialize: function(){

      }
    };

    initialize();

    return controller;
  };
});

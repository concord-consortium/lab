/*global define, $ */
/*jshint loopfunc: true */

define(function () {

  var metadata   = require('common/controllers/interactive-metadata'),
      validator  = require('common/validator'),
      disablable = require('common/controllers/disablable');

  return function RadioController(component, interactivesController) {
        // Public API.
    var controller,
        // DOM elements.
        $div, $span,
        // Options definitions from component JSON definition.
        options,
        // List of jQuery objects wrapping <input type="radio"> elements.
        $options = [],
        // List of jQuery objects wrapping <div> used for radio styling.
        $fakeCheckables = [],
        model,
        scriptingAPI;

    // Updates radio using model property. Used in modelLoadedCallback.
    // Make sure that this function is only called when:
    // a) model is loaded,
    // b) radio is bound to some property.
    function updateRadio() {
      if (component.property !== undefined) {
        var value = model.get(component.property);
        for (var i = 0, len = options.length; i < len; i++) {
          if (options[i].value === value) {
            $options[i].attr("checked", true);
            $fakeCheckables[i].addClass('checked');
          } else {
            $options[i].removeAttr("checked");
            $fakeCheckables[i].removeClass('checked');
          }
        }
      }
    }

    function updateRadioDisabledState() {
      var description = model.getPropertyDescription(component.property);
      controller.setDisabled(description.getFrozen());
    }


    function customClickEvent (e) {
      var $clickedParent = $(this).closest('span'),
          $input = $clickedParent.find('input'),
          $fakeCheckable = $clickedParent.find('.fakeCheckable'),
          i, len;

      e.preventDefault();

      if ($input.attr("disabled") !== undefined) {
        // Do nothing when option is disabled.
        return;
      }

      for (i = 0, len = $options.length; i < len; i++) {
        $options[i].removeAttr('checked');
        $fakeCheckables[i].removeClass('checked');
      }

      if ($input.attr('checked') !== undefined) {
        $input.removeAttr('checked');
        $fakeCheckable.removeClass('checked');
      } else {
        $input.attr('checked', 'checked');
        $fakeCheckable.addClass('checked');
      }

      // Trigger change event!
      $input.trigger('change');
    }

    function initialize() {
      var $option, $fakeCheckable, $label,
          option, i, len;

      model = interactivesController.getModel();
      scriptingAPI = interactivesController.getScriptingAPI();

      // Validate component definition, use validated copy of the properties.
      component = validator.validateCompleteness(metadata.radio, component);
      // Validate radio options too.
      options = component.options;
      for (i = 0, len = options.length; i < len; i++) {
        options[i] = validator.validateCompleteness(metadata.radioOption, options[i]);
      }

      // Create HTML elements.
      $div = $('<div>').attr('id', component.id);
      $div.addClass("interactive-radio");
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

      // Create options (<input type="radio">)
      for (i = 0, len = options.length; i < len; i++) {
        option = options[i];
        $option = $('<input>')
          .attr('type', "radio")
          .attr('name', component.id)
          .attr('tabindex', interactivesController.getNextTabIndex())
          .attr('id', component.id + '-' + i);
        $options.push($option);

        $label = $('<label>')
          .attr("for", component.id + '-' + i)
          .text(option.text);

        $fakeCheckable = $('<div class="fakeCheckable">');
        $fakeCheckables.push($fakeCheckable);

        $span = $('<span>')
          .addClass('option')
          .append($option)
          .append($fakeCheckable)
          .append($label);
        $div.append($span);

        if (option.disabled) {
          $option.attr("disabled", option.disabled);
          $span.addClass('lab-disabled');
        }
        if (option.selected) {
          $option.attr("checked", option.selected);
          $fakeCheckable.addClass("checked");
        }

        // Ensure that custom div (used for styling) is clickable.
        $fakeCheckable.on('touchstart click', customClickEvent);
        // Label also requires custom event handler to ensure that click updates
        // fake clickable element too.
        $label.on('touchstart click', customClickEvent);

        $option.change((function(option) {
          return function() {
            if (option.action){
              scriptingAPI.makeFunctionInScriptContext(option.action)();
            } else if (option.value !== undefined) {
              model.set(component.property, option.value);
            }
          };
        })(option));
      }

      if (component.tooltip) {
        $div.attr("title", component.tooltip);
      }

      disablable(controller, component);
    }

    // Public API.
    controller = {
      modelLoadedCallback: function () {
        if (model && component.property !== undefined) {
          model.removeObserver(component.property, updateRadio);
          model.removePropertyDescriptionObserver(component.property, updateRadioDisabledState);
        }
        model = interactivesController.getModel();
        scriptingAPI = interactivesController.getScriptingAPI();
        // Connect radio with model's property if its name is defined.
        if (component.property !== undefined) {
          // Register listener for property.
          model.addPropertiesListener([component.property], updateRadio);
          model.addPropertyDescriptionObserver(component.property, updateRadioDisabledState);
        }
        // Perform initial radio setup.
        updateRadio();
      },

      // Returns view container.
      getViewContainer: function () {
        return $div;
      },

      // Returns serialized component definition.
      serialize: function () {
        var i, len;
        if (component.property === undefined) {
          // When property binding is not defined, we need to keep track
          // which option is currently selected.
          for (i = 0, len = options.length; i < len; i++) {
            if ($options[i].attr("checked")) {
              options[i].selected = true;
            } else {
              delete options[i].selected;
            }
          }
        }
        // Note that 'options' array above is a reference to component.options array.
        // Every thing is updated, return a copy.
        return $.extend(true, {}, component);
      }
    };

    initialize();

    // Return Public API object.
    return controller;
  };
});

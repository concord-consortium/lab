/*global define, $ */
/*jshint loopfunc: true */

define(function () {

  var metadata        = require('common/controllers/interactive-metadata'),
      validator       = require('common/validator'),
      disablable      = require('common/controllers/disablable'),
      helpIconSupport = require('common/controllers/help-icon-support');

  return function RadioController(component, interactivesController) {
        // Public API.
    var controller,
        // DOM elements.
        $div,
        // Options definitions from component JSON definition.
        options,
        // List of jQuery objects wrapping <input type="radio"> elements.
        $inputs = [],
        // List of jQuery objects wrapping option <div>.
        $options = [],
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
            $inputs[i].attr("checked", true);
            $options[i].addClass('checked');
          } else {
            $inputs[i].removeAttr("checked");
            $options[i].removeClass('checked');
          }
        }
      }
    }

    function updateRadioDisabledState() {
      var description = model.getPropertyDescription(component.property);
      controller.setDisabled(description.getFrozen());
    }


    function customClickEvent (e) {
      var $span = $(this),
          $input = $span.find('input'),
          i, len;

      e.preventDefault();

      if ($input.attr("disabled") !== undefined) {
        // Do nothing when option is disabled.
        return;
      }

      for (i = 0, len = $inputs.length; i < len; i++) {
        $inputs[i].removeAttr('checked');
        $options[i].removeClass('checked');
      }

      if ($input.attr('checked') !== undefined) {
        $input.removeAttr('checked');
        $span.removeClass('checked');
      } else {
        $input.attr('checked', 'checked');
        $span.addClass('checked');
      }

      // Trigger change event!
      $input.trigger('change');
    }

    function initialize() {
      var $input, $span, $label, $optionsContainer,
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
      // "radio" or "toggle".
      $div.addClass(component.style);

      if (component.label) {
        $label = $("<span>").html(component.label);
        $label.addClass("label");
        $label.addClass(component.labelOn === "top" ? "on-top" : "on-left");
        $div.append($label);
      }

      $optionsContainer = $("<span>").addClass("options").appendTo($div);

      // Create options (<input type="radio">)
      for (i = 0, len = options.length; i < len; i++) {
        option = options[i];
        $input = $('<input>')
          .attr('type', "radio")
          .attr('name', component.id)
          .attr('tabindex', interactivesController.getNextTabIndex())
          .attr('id', component.id + '-' + i);
        $inputs.push($input);

        $span = $('<span>')
          .addClass('option')
          .append($input);
        $options.push($span);
        $optionsContainer.append($span);

        if (component.style === 'radio') {
          $('<div class="fakeCheckable">').appendTo($span);
        }

        $('<label>')
          .attr("for", component.id + '-' + i)
          .html(option.text)
          .appendTo($span);

        if (option.disabled) {
          $input.attr("disabled", option.disabled);
          $span.addClass('lab-disabled');
        }
        if (option.selected) {
          $input.attr("checked", option.selected);
          $span.addClass("checked");
        }

        $span.on('touchstart click', customClickEvent);

        $input.change((function(option) {
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
      helpIconSupport(controller, component, interactivesController.helpSystem);
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
            if ($inputs[i].attr("checked")) {
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

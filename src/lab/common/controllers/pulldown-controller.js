
import metadata from 'common/controllers/interactive-metadata';
import validator from 'common/validator';
import disablable from 'common/controllers/disablable';
import helpIconSupport from 'common/controllers/help-icon-support';
import SelectBoxView from 'common/views/select-box-view';
import $__common_jquery_plugins from 'common/jquery-plugins';


$__common_jquery_plugins;

export default function PulldownController(component, interactivesController) {
  // Public API.
  var controller,
    model,
    scriptingAPI,
    // Logging function, can be injected by #enableLogging call.
    logAction,
    // Options definitions from component JSON definition.
    options,
    view,
    $element;

  function updatePulldown() {
    if (component.property !== undefined) {
      view.update(model.get(component.property));
    }
  }

  function updatePulldownDisabledState() {
    var description = model.getPropertyDescription(component.property);
    controller.setDisabled(description.getFrozen());
  }

  function logChange(optionSpec) {
    if (!logAction) return; // logging is not enabled
    var data = {
      id: component.id,
      selected: optionSpec.text
    };
    if (component.label) data.label = component.label;
    if (component.property) {
      data.property = component.property;
      data.value = optionSpec.value;
    }
    logAction('PulldownChanged', data);
  }

  function initialize() {
    var parent = interactivesController.interactiveContainer,
      i, len;

    model = interactivesController.getModel();
    scriptingAPI = interactivesController.getScriptingAPI();

    // Validate component definition, use validated copy of the properties.
    component = validator.validateCompleteness(metadata.pulldown, component);
    // Validate pulldown options too.
    options = component.options;
    for (i = 0, len = options.length; i < len; i++) {
      options[i] = validator.validateCompleteness(metadata.pulldownOption, options[i]);
    }

    view = new SelectBoxView({
      id: component.id,
      options: options,
      label: component.label,
      labelOn: component.labelOn,
      onChange: function(option) {
        if (option.action) {
          scriptingAPI.makeFunctionInScriptContext(option.action)();
        } else if (option.value !== undefined) {
          scriptingAPI.api.set(component.property, option.value);
        }
        logChange(option);
      }
    });

    $element = view.render(parent);

    $element
      .addClass("interactive-pulldown")
      .addClass("component");

    if (component.tooltip) {
      $element.attr("title", component.tooltip);
    }

    disablable(controller, component);
    helpIconSupport(controller, component, interactivesController.helpSystem);
  }

  // Public API.
  controller = {
    modelLoadedCallback: function() {
      scriptingAPI = interactivesController.getScriptingAPI();
      if (component.property !== undefined) {
        if (model) {
          model.removeObserver(component.property, updatePulldown);
          model.removePropertyDescriptionObserver(component.property, updatePulldownDisabledState);
        }
        model = interactivesController.getModel();
        // Register listener for property.
        model.addObserver(component.property, updatePulldown);
        model.addPropertyDescriptionObserver(component.property, updatePulldownDisabledState);
        // Perform initial pulldown setup.
      } else {
        model = interactivesController.getModel();
      }
      updatePulldown();
    },

    enableLogging: function(logFunc) {
      logAction = logFunc;
    },

    // Returns view container.
    getViewContainer: function() {
      return $element;
    },

    // Returns serialized component definition.
    serialize: function() {
      var i, len, $options;
      if (component.property === undefined) {
        // When property binding is not defined, we need to keep track
        // which option is currently selected.
        $options = $element.find('option');
        for (i = 0, len = options.length; i < len; i++) {
          if ($($options[i]).prop("selected")) {
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

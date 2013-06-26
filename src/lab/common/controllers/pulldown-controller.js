/*global require, define, $, model */

define(function () {

  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator');
      require('common/jquery-plugins');

  return function PulldownController(component, scriptingAPI, interactivesController) {
        // Public API.
    var controller,
        // DOM elements.
        $wrapper, $pulldown, $option,
        // Options definitions from component JSON definition.
        options,
        // List of jQuery objects wrapping <select> elements.
        $options = [],
        // Indicates which change event are caused by the user and which are
        // caused by select box update after property change.
        ignoreChangeEvent = false;

    // Updates pulldown using model property. Used in modelLoadedCallback.
    // Make sure that this function is only called when:
    // a) model is loaded,
    // b) pulldown is bound to some property.
    function updatePulldown() {
      // Set flag indicating that change event should be ignored by our own
      // change listener. It prevents from infinite loop like: pulldown update
      // => property update => pulldown update => ...
      // It's necessary as selectOption() call below will trigger change event
      // of original select. It's used by selectBoxIt to update its view.
      ignoreChangeEvent = true;
      // Retrieve all of the SelectBoxIt methods and call selectOption(). Note
      // that we have to call .toString() as numeric values are interpreted as
      // option index by selectBoxIt. See:
      // http://gregfranko.com/jquery.selectBoxIt.js/#Methods
      $pulldown.data("selectBox-selectBoxIt").selectOption(model.get(component.property).toString());
    }

    function initialize() {
      var parent = interactivesController.interactiveContainer,
          $label, ulWidth, arrowWidth, boxWidth,
          i, len, option;

      // Validate component definition, use validated copy of the properties.
      component = validator.validateCompleteness(metadata.pulldown, component);
      // Validate pulldown options too.
      options = component.options;
      for (i = 0, len = options.length; i < len; i++) {
        options[i] = validator.validateCompleteness(metadata.pulldownOption, options[i]);
      }

      $pulldown = $('<select>');

      for (i = 0, len = options.length; i < len; i++) {
        option = options[i];
        $option = $('<option>').html(option.text);
        $options.push($option);
        if (option.disabled) {
          $option.prop("disabled", option.disabled);
        }
        if (option.selected) {
          $option.prop("selected", option.selected);
        }
        // allow pulldowns to have "falsy" values (e.g. "0")
        if (typeof option.value !== 'undefined') {
          $option.prop("value", option.value);
        }
        $pulldown.append($option);
      }

      $pulldown.change(function() {
        if (ignoreChangeEvent) {
          // Ignore change event caused by the pulldown menu update. It
          // prevents from infinite loop of pulldown - property updates.
          ignoreChangeEvent = false;
          return;
        }

        var index = $(this).prop('selectedIndex'),
            action = component.options[index].action,
            value = component.options[index].value;

        if (action){
          scriptingAPI.makeFunctionInScriptContext(action)();
        } else if (component.options[index].loadModel){
          model.stop();
          interactivesController.loadModel(component.options[index].loadModel);
        } else if (value !== undefined) {
          model.set(component.property, value);
        }
      });

      $wrapper = $('<div>')
        .attr('id', component.id)
        .addClass("interactive-pulldown")
        .addClass("component");

      if (component.label) {
        $label = $("<span>").text(component.label);
        $label.addClass("label");
        $label.addClass(component.labelOn === "top" ? "on-top" : "on-left");
        $wrapper.append($label);
      }

      // Add $pulldown to a wrapping div. This way $pulldown.selectBoxIt() will create
      // a selectBox element which will also be in the span, and then we can return
      // this element to be embedded in the interactive
      $wrapper.append($pulldown);

      $pulldown.selectBoxIt();

      $wrapper.find(".selectboxit").css("width", "auto");
      $wrapper.find(".selectboxit-text").css("max-width", "none");

      // SelectBoxIt assumes that all select boxes are always going to have a width
      // set in CSS (default 220px). This doesn't work for us, as we don't know how
      // wide the content is going to be. Instead we have to measure the needed width
      // of the internal ul list, and use that to define the width of the select box.
      //
      // This issue has been raised in SelectBoxIt:
      // https://github.com/gfranko/jquery.selectBoxIt.js/issues/129
      //
      // However, this is still problematic because we haven't added the element to
      // the page yet. This $().measure function allows us to embed the element hidden
      // on the page first to allow us to check the required width.
      ulWidth    = $wrapper.measure(function(){ return this.width(); }, "ul", parent );
      arrowWidth = $wrapper.measure(function(){ return this.width(); }, ".selectboxit-arrow-container", parent );

      // ems for a given pixel size
      function pxToEm(input) {
        var emSize = parseFloat(parent.css("font-size"));
        return (input / emSize);
      }

      boxWidth = (pxToEm(ulWidth+arrowWidth)+0.3)+"em";

      $wrapper.find(".selectboxit").css("width", boxWidth);
      $wrapper.find(".selectboxit-text").css("max-width", pxToEm(ulWidth)+"em");

      // set hidden select box dimensions too, for mobile devices
      $wrapper.find(".selectboxit-container select").css({width: boxWidth, height: "100%"});
    }

    // Public API.
    controller = {
      modelLoadedCallback: function () {
        // Connect pulldown with model's property if its name is defined.
        if (component.property !== undefined) {
          // Register listener for property.
          model.addPropertiesListener([component.property], updatePulldown);
          // Perform initial pulldown setup.
          updatePulldown();
        }
      },

      // Returns view container.
      getViewContainer: function () {
        return $wrapper;
      },

      // Returns serialized component definition.
      serialize: function () {
        var i, len;
        if (component.property === undefined) {
          // When property binding is not defined, we need to keep track
          // which option is currently selected.
          for (i = 0, len = options.length; i < len; i++) {
            if ($options[i].prop("selected")) {
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

/*global define, $*/

define(function () {

  var metadata        = require('common/controllers/interactive-metadata'),
      validator       = require('common/validator'),
      disablable      = require('common/controllers/disablable'),
      helpIconSupport = require('common/controllers/help-icon-support');

  return function JoystickController(component, interactivesController) {
    var propertyName, actionFunc, initialValue,
        title, labels, displayValue, displayFunc,
        // View elements.
        $elem,
        $container,
        $title,
        $labelN,$labelS,$labelE,$labelW,
        $joystickBase,
        $joystickHandle,
        $valueText,
        model,
        scriptingAPI,
        // Public API object.
        controller,
        valueChanged,
        hasBeenSetUp = false,
        base = {}, joystick = {},

        // Updates joystick using model property. Used in modelLoadedCallback.
        // Make sure that this function is only called when:
        // a) model is loaded,
        // b) joystick is bound to some property.
        updateJoystick = function (firstTime) {
          var value = interactivesController.getModel().get(propertyName);
          if (firstTime) { // FIXME This disables any changes coming from outside of our component...
            moveJoystickTo(value);
          }
          if (displayValue) {
            $valueText.text(displayFunc(value));
          }
        },
        updateJoystickDisabledState = function () {
          var description = model.getPropertyDescription(propertyName);
          controller.setDisabled(description.getFrozen());
        };

    function bindTargets() {
      // Bind action or/and property, process other options.
      if (component.action) {
        // The 'action' property is a source of a function which assumes we pass it a parameter
        // called 'value'.
        actionFunc = scriptingAPI.makeFunctionInScriptContext('value', component.action);
        valueChanged = function(value) {
          actionFunc(value);
          if (displayValue) {
            $valueText.text(displayFunc(value));
          }
        };
      }

      if (propertyName) {
        valueChanged = function(value) {
          if (model) model.properties[propertyName] = value;
          if (displayValue) {
            $valueText.text(displayFunc(value));
          }
        };
      }

      if (displayValue) {
        scriptingAPI.api.getCardinalDirection = function(angle, inverse) {
          var direction = ["", ""];
          if (angle > Math.PI/8 && angle < Math.PI*7/8)
            direction[0] = inverse ? "S" : "N";
          else if (angle > Math.PI*9/8 && angle < Math.PI*15/8)
            direction[0] = inverse ? "N" : "S";
          if (angle < Math.PI*3/8 || angle > Math.PI*13/8) {
            direction[1] = inverse ? "W" : "E";
          } else if (angle > Math.PI*5/8 && angle < Math.PI*11/8) {
            direction[1] = inverse ? "E" : "W";
          }
          return direction.join("");
        };

        scriptingAPI.api.getCompassDirection = function(angle, inverse) {
          angle = (angle + Math.PI*3/2) % (2*Math.PI);
          var deg = 360 - angle * 180 / Math.PI;
          return inverse ? (180 + deg) % 360 : deg;
        };
        displayFunc = scriptingAPI.makeFunctionInScriptContext('value', displayValue);
      }
    }

    function setup() {
      $joystickHandle.draggable({
          revert: false,    // set to true to have joystick slide back to center
          create: function() {
            init();
          },
          drag: function (event, ui) {
            var loc = limitXY(ui.position.left+joystick.halfWidth, ui.position.top+joystick.halfHeight);
            if (loc) {
              ui.position.left = loc.x-joystick.halfWidth;
              ui.position.top = loc.y-joystick.halfHeight;
            }

            // Normalize x/y to range from -1 to 1
            var rel_left = (ui.position.left - joystick.startLeft)/(base.radius - joystick.halfWidth);
            var rel_top = (joystick.startTop - ui.position.top)/(base.radius - joystick.halfHeight);
            joystickMoved(rel_left, rel_top);
          },
          stop: function () {
            //$('#coords').html("&nbsp;");
          }
      });
    }

    function init() {
      if (hasBeenSetUp) return;
      hasBeenSetUp = true;

      base.width = $joystickBase[0].offsetWidth;
      base.height = $joystickBase[0].offsetHeight;
      base.top = $joystickBase[0].offsetTop;
      base.left = $joystickBase[0].offsetLeft;
      base.center = [base.width / 2, base.height / 2];
      base.radius = base.width / 2;

      joystick.startLeft = parseInt($joystickHandle.css("left"));
      joystick.startTop = parseInt($joystickHandle.css("top"));

      $joystickHandle.data("startLeft", joystick.startLeft);
      $joystickHandle.data("startTop", joystick.startTop);

      joystick.halfWidth = $joystickHandle[0].offsetWidth/2;
      joystick.halfHeight = $joystickHandle[0].offsetHeight/2;
    }

    function limitXY(x, y) {
      var dist = distance([x, y], base.center);
      if (dist <= base.radius - joystick.halfWidth) {
        return null;
      } else {
        x = x - base.center[0];
        y = y - base.center[1];
        var radians = Math.atan2(y, x);
        return {
          x: Math.cos(radians) * (base.radius-joystick.halfWidth) + base.center[0],
          y: Math.sin(radians) * (base.radius-joystick.halfWidth) + base.center[1]
        };
      }
    }

    function distance(dot1, dot2) {
      var x1 = dot1[0],
          y1 = dot1[1],
          x2 = dot2[0],
          y2 = dot2[1];
      return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }

    function joystickMoved(x, y) {
      var magnitude = Math.sqrt(x*x + y*y) * component.scale,
          direction = (Math.atan2(y, x) + 2*Math.PI) % (2*Math.PI),
          data = {magnitude: magnitude, direction: direction};

      // Send the new value
      if (valueChanged) valueChanged(data);
    }

    function moveJoystickTo(value) {
      // Set the joystick in the right position
      var mag = (base.radius - joystick.halfWidth) * value.magnitude / component.scale, // Normalized to -radius to radius
          dx = mag * Math.cos(value.direction),
          dy = mag * Math.sin(value.direction),
          startLeft = base.center[0] - joystick.halfWidth + dx,
          startTop = base.center[1] - joystick.halfWidth - dy; // invert the y direction

      $joystickHandle.css({top: startTop, left: startLeft});
    }

    function initialize() {
      //
      // Initialize.
      //
      scriptingAPI = interactivesController.getScriptingAPI();
      model = interactivesController.getModel();
      // Validate component definition, use validated copy of the properties.
      component = validator.validateCompleteness(metadata.joystick, component);
      propertyName = component.property;
      initialValue = component.initialValue;
      title = component.title;
      labels = component.labels;
      displayValue = component.displayValue;

      model = interactivesController.getModel();

      if (propertyName === undefined && initialValue === undefined) initialValue = { magnitude: 0, direction: 0 };

      // Setup view.
      // <div id="interactive-joystick">
      //   <p class="title">Wind</p>
      //   <div id="joystick-base">
      //       <div id="joystick-handle"></div>
      //   </div>
      //   <span id="label n">N</span>
      //   <span id="label e">E</span>
      //   <span id="label s">S</span>
      //   <span id="label w">W</span>
      //   <div id="joystick-value">0 MPH</div>
      // </div>
      $container = $('<div class="container">');
      $title = $('<div class="title">' + title + '</div>');

      $joystickBase = $('<div class="base">').attr('id', component.id);
      $joystickHandle = $('<div class="handle">');
      $joystickHandle.appendTo($joystickBase);

      $labelN = $('<div class="label n">' + labels.n + '</div>');
      $labelS = $('<div class="label s">' + labels.s + '</div>');
      $labelW = $('<div class="label w">' + labels.w + '</div>');
      $labelE = $('<div class="label e">' + labels.e + '</div>');

      $container.append($labelN)
                .append($labelW)
                .append($joystickBase)
                .append($labelE)
                .append($labelS);

      $elem = $('<div class="interactive-joystick">')
                .append($title)
                .append($container);

      // Each interactive component has to have class "component".
      $elem.addClass("component");

      $valueText = $('<div class="value"></div>');
      $elem.append($valueText);

      if (component.tooltip) {
        $elem.attr("title", component.tooltip);
      }

      disablable(controller, component);
      helpIconSupport(controller, component, interactivesController.helpSystem);

      // Apply custom width and height settings.
      // Also not that we set dimensions of the most outer container, not slider.
      // Slider itself will always follow dimensions of container DIV.
      // We have to do it that way to ensure that labels refer correct dimensions.
      $elem.css({
        "width": component.width,
        "height": component.height
      });
      // Call resize function to support complex resizing when height is different from "auto".
      controller.resize(true);

      // Finally set the initial value if it's provided.
      if (initialValue !== undefined && initialValue !== null) {
        moveJoystickTo(initialValue);
        if (displayValue) {
          $valueText.text(displayFunc(initialValue));
        }
      }
    }

    // Public API.
    controller = {
      // This callback should be triggered when model is loaded.
      modelLoadedCallback: function () {
        if (model && propertyName) {
          model.removeObserver(propertyName, updateJoystick);
          model.removePropertyDescriptionObserver(propertyName, updateJoystickDisabledState);
        }
        scriptingAPI = interactivesController.getScriptingAPI();
        model = interactivesController.getModel();
        if (propertyName) {
          model.addPropertiesListener([propertyName], updateJoystick);
          model.addPropertyDescriptionObserver(propertyName, updateJoystickDisabledState);
        }

        bindTargets();

        setup();

        if (propertyName) {
          updateJoystick(true);
        }
      },

      // Returns view container (div).
      getViewContainer: function () {
        return $elem;
      },

      resize: function (fromSetup) {
        if (fromSetup) return;
        var width = $elem[0].clientWidth,
            height = $elem[0].clientHeight,
            emSize = parseFloat($elem.css('font-size')),
            baseHeight = height - 4.2*emSize, // subtract for title, value text, N-label, S-label and 0.1em padding on both top and bottom\
            labelsWidth = $labelE.outerWidth(true) + $labelW.outerWidth(true),
            baseWidth = width - labelsWidth,
            labelsOverflow = 0;

        if (baseWidth < 2*emSize) {
          labelsOverflow = Math.abs(2*emSize - baseWidth);
          baseWidth = 2*emSize;
        }

        var baseSize = baseWidth < baseHeight ? baseWidth : baseHeight,
            handleSize = baseSize * 0.3,
            containerHeight = baseSize + 2.2*emSize,
            centerX;

        if (labelsOverflow > 0) {
          var adjPct = (labelsWidth - labelsOverflow - 0.1*emSize) / labelsWidth;
          centerX = $labelW.outerWidth(true) * adjPct + 0.1*emSize + baseSize/2;
        } else {
          centerX = $labelW.outerWidth(true) + 0.1*emSize + baseSize/2;
        }

        $container.css({ width: width, height: containerHeight });

        $labelE.css({ left: centerX + baseSize/2 + 0.1*emSize });
        $labelW.css({ left: centerX - baseSize/2 - 0.1*emSize - $labelW[0].clientWidth });
        $labelN.css({ left: centerX - $labelN.outerWidth(true)/2 });
        $labelS.css({ left: centerX - $labelS.outerWidth(true)/2 });

        $joystickBase.css({ height: baseSize, width: baseSize, left: centerX - baseSize/2, top: 1.1*emSize, borderRadius: baseSize });
        $joystickHandle.css({ height: handleSize, width: handleSize, borderRadius: baseSize, left: baseSize/2 - handleSize/2, top: baseSize/2 - handleSize/2 });

        // update joystick cached info
        hasBeenSetUp = false;
        init();

        // update the actual joystick position to match the current value
        var value = interactivesController.getModel().get(propertyName);
        moveJoystickTo(value);
      },

      // Returns serialized component definition.
      serialize: function () {
        var result = $.extend(true, {}, component);

        if (!propertyName) {
          // No property binding. Just action script.
          // Update "initialValue" to represent current
          // value of the slider.
          result.initialValue = {magnitude: 0, direction: 0};
        }

        return result;
      }
    };

    initialize();

    // Return Public API object.
    return controller;
  };
});

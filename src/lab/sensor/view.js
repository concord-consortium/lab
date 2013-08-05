define(function() {

  var SelectBoxView = require('common/views/select-box-view'),
      NumericOutputView = require('common/views/numeric-output-view');

  return function(model, modelUrl) {
    var sensorTypeView = new SelectBoxView({
          id: 'sensor-type-view',
          options: [{
            text: "GoMotion",
            value: 'goMotion',
            selected: true,
            disabled: false
          }, {
            text: "Something Else",
            value: 'somethingElse',
            selected: false,
            disabled: false
          }],
          label: "Sensor Type",
          labelOn: "left",
          onChange: function(option) {
            console.log(option.value + " chosen.");
          },
        }),
        // TODO use the formatter from the property description. Right now, it automatically adds
        // units to the returned string (which we don't want here).
        format = d3.format('.2f'),
        sensorReadingView,
        lastHeight = null;

    return  {
      $el: $("<div id='model-container' class='container' style='font-size: 0.7em'/>"),

      bindModel: function(newModel, newModelUrl) {
        modelUrl = newModelUrl || modelUrl;
        model = newModel || model;
      },

      getHeightForWidth: function(width, fontSizeChanged) {
        if (fontSizeChanged || lastHeight == null) {
          lastHeight = 2 * parseInt(this.$el.parent().css('font-size'), 10);
        }
        return lastHeight;
      },

      // called once we're in the DOM
      setup: function() {

        this.$el.empty();

        sensorReadingView = new NumericOutputView({
          id: 'sensor-value-view',
          label: "Reading: ",
          units: model.getPropertyDescription('sensorReading').getUnitAbbreviation()
        });

        var $selectBox = sensorTypeView.render(this.$el),
            $disconnectButton = $("<div><button>Disconnect</button></div>"),
            $zeroButton = $("<div><button>Zero</button></div>"),
            $sensorReading = sensorReadingView.render();

        $selectBox.addClass('interactive-pulldown component component-spacing');
        $disconnectButton.addClass('interactive-button component component-spacing');
        $zeroButton.addClass('interactive-button component component-spacing');
        $sensorReading.addClass('numeric-output component horizontal component-spacing');

        this.$el.css('zIndex', 4);
        this.$el.append($selectBox);
        this.$el.append($disconnectButton);
        this.$el.append($sensorReading);
        this.$el.append($zeroButton);
      },

      resize: function() {},

      update: function() {
        sensorReadingView.update(format(model.properties.sensorReading));
      }
    };
  };
});

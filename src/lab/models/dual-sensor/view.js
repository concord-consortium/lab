define(function() {

  var SelectBoxView = require('common/views/select-box-view'),
      NumericOutputView = require('common/views/numeric-output-view'),
      sensorDefinitions = require('sensor-applet/sensor-definitions'),
      viewState = require('common/views/view-state');

  return function(model, modelUrl) {

    var sensorTypeView = new SelectBoxView({
      id: 'sensor-type-view',
      options: [{
        value: null,
        text: "Select type of sensor...",
        selected: model.properties.sensorType == null,
        disabled: true
      }].concat(Object.keys(sensorDefinitions).filter(function(key) {
        return sensorDefinitions[key].appletClass === "labquest";
      }).map(function(key) {
        return {
          value: key,
          text: sensorDefinitions[key].sensorName,
          selected: key === model.properties.sensorType,
          disabled: false
        };
      })),
      onChange: function(option) {
        model.properties.sensorType = option.value;
      }
    });

    var sensorType2View = new SelectBoxView({
      id: 'sensor-type2-view',
      options: [{
        value: null,
        text: "Select type of sensor...",
        selected: model.properties.sensorType2 == null,
        disabled: true
      }].concat(Object.keys(sensorDefinitions).filter(function(key) {
        return sensorDefinitions[key].appletClass === "labquest";
      }).map(function(key) {
        return {
          value: key,
          text: sensorDefinitions[key].sensorName,
          selected: key === model.properties.sensorType2,
          disabled: false
        };
      })),
      onChange: function(option) {
        model.properties.sensorType2 = option.value;
      }
    });

    // TODO use the formatter from the property description. Right now, it automatically adds
    // units to the returned string (which we don't want here).
    var format = d3.format('.2f');
    var sensorReadingView, sensorReading2View;
    var view;

    function setIsTaringState() {
      if (model.properties.isTaring) {
        view.$zeroButton.find('button').html("Zeroing...");
      } else {
        view.$zeroButton.find('button').html("Zero");
      }
    }

    function setCanTareState() {
      if (model.properties.canTare) {
        viewState.enableView(view.$zeroButton);
      } else {
        viewState.disableView(view.$zeroButton);
      }
    }

    function setSensorTypeDisabledState() {
      var description = model.getPropertyDescription('sensorType');
      if (description.getFrozen()) {
        viewState.disableView(view.$selectBox);
      } else {
        viewState.enableView(view.$selectBox);
      }
    }

    function setSensorType2DisabledState() {
      var description = model.getPropertyDescription('sensorType2');
      if (description.getFrozen()) {
        viewState.disableView(view.$selectBox2);
      } else {
        viewState.enableView(view.$selectBox2);
      }
    }

    function setupModelObservers() {
      model.addObserver('isTaring', setIsTaringState);
      setIsTaringState();

      model.addObserver('canTare', setCanTareState);
      setCanTareState();

      model.addPropertyDescriptionObserver('sensorType', setSensorTypeDisabledState);
      setSensorTypeDisabledState();
      model.addPropertyDescriptionObserver('sensorType2', setSensorType2DisabledState);
      setSensorType2DisabledState();
    }

    return view = {
      $el: $("<div id='model-container' class='container sensor-model-container' />"),

      bindModel: function(newModel, newModelUrl) {
        modelUrl = newModelUrl || modelUrl;
        model = newModel || model;

        setupModelObservers();
      },

      getHeightForWidth: function() {
        return "2.6em";
      },

      // called once we're in the DOM
      setup: function() {

        this.$el.empty();

        sensorReadingView = new NumericOutputView({
          id: 'sensor-value-view',
          label: "Reading: ",
          units: model.getPropertyDescription('sensorReading').getUnitAbbreviation()
        });

        sensorReading2View = new NumericOutputView({
          id: 'sensor-value-2-view',
          label: "Reading: ",
          units: model.getPropertyDescription('sensorReading2').getUnitAbbreviation()
        });

        var $selectBox  = sensorTypeView.render(this.$el),
            $selectBox2 = sensorType2View.render(this.$el),
            $zeroButton = $("<div><button>Zero</button></div>"),
            $sensorReading  = sensorReadingView.render(),
            $sensorReading2 = sensorReading2View.render();

        $selectBox.addClass('interactive-pulldown component component-spacing');
        $selectBox2.addClass('interactive-pulldown component component-spacing');
        $zeroButton.addClass('interactive-button component component-spacing');
        $sensorReading.addClass('numeric-output component horizontal component-spacing');
        $sensorReading2.addClass('numeric-output component horizontal component-spacing');

        this.$el.css('zIndex', 4);
        this.$el.append($selectBox);
        this.$el.append($sensorReading);
        this.$el.append($selectBox2);
        this.$el.append($sensorReading2);
        this.$el.append($zeroButton);

        this.$zeroButton = $zeroButton;
        this.$selectBox = $selectBox;
        this.$selectBox2 = $selectBox2;

        setupModelObservers();

        $zeroButton.on('click', 'button', function() {
          model.tare();
        });
      },

      showInitializationProgress: function() {
        var $progressbar;

        if (!this.$progressbarContainer) {
          $progressbar = $('<div/>')
            .attr('id', 'sensor-progressbar');

          this.$progressbarContainer = $('<div/>')
            .attr('id', 'sensor-progressbar-container')
            .css('bottom', $('body').height() / 2 + 75 + $('#responsive-content').offset().top)
            .append('<div class="label">Loading sensor...</div>')
            .append($progressbar)
            .appendTo('#responsive-content');

          $progressbar.progressbar({ value: false });
        }

        this.$progressbarContainer.show();
      },

      hideInitializationProgress: function() {
        this.$progressbarContainer.hide();
      },

      resize: function() {},

      repaint: function() {},

      updateUnits: function(units) {
        sensorReadingView.updateUnits(units);
        if (model.properties.sensorReading == null) {
          sensorReadingView.hideUnits();
        }
      },

      updateUnits2: function(units) {
        sensorReading2View.updateUnits(units);
        if (model.properties.sensorReading2 == null) {
          sensorReading2View.hideUnits();
        }
      },

      update: function() {
        if (model.properties.sensorReading == null) {
          sensorReadingView.update("");
          sensorReadingView.hideUnits();
        } else {
          sensorReadingView.update(format(model.properties.sensorReading));
          sensorReadingView.showUnits();
        }

        if (model.properties.sensorReading2 == null) {
          sensorReading2View.update("");
          sensorReading2View.hideUnits();
        } else {
          sensorReading2View.update(format(model.properties.sensorReading2));
          sensorReading2View.showUnits();
        }
      }
    };
  };
});

define(function() {

  var SelectBoxView = require('common/views/select-box-view'),
      NumericOutputView = require('common/views/numeric-output-view'),
      sensorDefinitions = require('sensor-applet').sensorDefinitions,
      viewState = require('common/views/view-state');

  return function(model, modelUrl, i18n) {

    var sensorTypeView = new SelectBoxView({
      id: 'sensor-type-view',
      options: [{
        value: null,
        text: i18n.t("sensor.select_sensor_type"),
        selected: model.properties.sensorType == null,
        disabled: true
      }].concat(Object.keys(sensorDefinitions).map(function(key) {
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

    // TODO use the formatter from the property description. Right now, it automatically adds
    // units to the returned string (which we don't want here).
    var format = d3.format('.2f');
    var sensorReadingView;
    var view;

    function setIsTaringState() {
      if (model.properties.isTaring) {
        view.$zeroButton.find('button').html(i18n.t("sensor.zeroing"));
      } else {
        view.$zeroButton.find('button').html(i18n.t("sensor.zero"));
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

    function setupModelObservers() {
      model.addObserver('isTaring', setIsTaringState);
      setIsTaringState();

      model.addObserver('canTare', setCanTareState);
      setCanTareState();

      model.addPropertyDescriptionObserver('sensorType', setSensorTypeDisabledState);
      setSensorTypeDisabledState();
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
          label: i18n.t("sensor.reading"),
          units: model.getPropertyDescription('sensorReading').getUnitAbbreviation()
        });

        var $selectBox = sensorTypeView.render(this.$el),
            $zeroButton = $("<div><button>" + i18n.t("sensor.zero") + "</button></div>"),
            $sensorReading = sensorReadingView.render();

        $selectBox.addClass('interactive-pulldown component component-spacing');
        $zeroButton.addClass('interactive-button component component-spacing');
        $sensorReading.addClass('numeric-output component horizontal component-spacing');

        this.$el.css('zIndex', 4);
        this.$el.append($selectBox);
        this.$el.append($sensorReading);
        this.$el.append($zeroButton);

        this.$zeroButton = $zeroButton;
        this.$selectBox = $selectBox;

        sensorReadingView.resize();
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
            .css('bottom', $('body').height() / 2 + 75 + $('.lab-responsive-content').offset().top)
            .append('<div class="label">' + i18n.t('sensor.loading_sensor') + '</div>')
            .append($progressbar)
            .appendTo('.lab-responsive-content');

          $progressbar.progressbar({ value: false });
        }

        this.$progressbarContainer.show();
      },

      hideInitializationProgress: function() {
        this.$progressbarContainer.hide();
      },

      resize: function() {
        if (sensorReadingView) {
          sensorReadingView.resize();
        }
      },

      repaint: function() {},

      setFocus: function () {},

      updateUnits: function(units) {
        sensorReadingView.updateUnits(units);
        if (model.properties.sensorReading == null) {
          sensorReadingView.hideUnits();
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
      }
    };
  };
});

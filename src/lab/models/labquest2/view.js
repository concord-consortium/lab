define(function(require) {

  var NumericOutputView = require('common/views/numeric-output-view'),
      BasicDialog       = require('common/controllers/basic-dialog'),
      getSensorDefinitions = require('models/sensor-common/i18n-sensor-definitions-connector'),
      viewState = require('common/views/view-state');

  return function(model, modelUrl, i18n) {

    // TODO use the formatter from the property description. Right now, it automatically adds
    // units to the returned string (which we don't want here).
    var format = d3.format('.2f');
    var sensorReadingView;
    var view;

    var sensorDefinitions = getSensorDefinitions(i18n);

    function setCanTareState() {
      if (model.properties.canTare) {
        viewState.enableView(view.$zeroButton);
      } else {
        viewState.disableView(view.$zeroButton);
      }
    }

    function setCanConnectState() {
      if (model.properties.canConnect) {
        viewState.enableView(view.$connectButton);
      } else {
        viewState.disableView(view.$connectButton);
      }
    }

    function setHasMultipleSensorsState() {
      if (model.properties.hasMultipleSensors && model.properties.isPlayable) {
        viewState.enableView(view.$selectSensorButton);
      } else {
        viewState.disableView(view.$selectSensorButton);
      }
    }

    function setMessageText() {
      view.$message.text(model.properties.message);
    }

    function setupModelObservers() {
      model.addObserver('canTare', setCanTareState);
      setCanTareState();

      model.addObserver('canConnect', setCanConnectState);
      setCanConnectState();

      model.addObserver('hasMultipleSensors', setHasMultipleSensorsState);
      model.addObserver('isPlayable', setHasMultipleSensorsState);
      setHasMultipleSensorsState();

      model.addObserver('message', setMessageText);
      setMessageText();
    }

    function chooseSensorPopup() {
      var dialog = new BasicDialog({
        width: "60%",
        dialogClass: 'interactive-dialog no-close',
        closeOnEscape: false,
        title: i18n.t("sensor.choose_sensor_title"),
        buttons: {
          OK: function() {
            console.log("OK Clicked");
            $(this).dialog("close");
            // TODO Change the model's selected sensor
            model.setSelectedSensor($(this).find('input:checked').val());
          },
          Cancel: function() {
            console.log("Cancel Clicked");
            $(this).dialog("close");
            // TODO Make sure the model continues using the previously selected sensor
          }
        }
      }, i18n);
      var content = "",
          label = "",
          sensors = model.connectedSensors(),
          first = true,
          selectedSensor = model.getSelectedSensor(),
          i, checked, sensorDef;
      for (i = 0; i < sensors.length; i++) {
        if (sensors[i] !== 's') {
          checked = "";
          sensorDef = sensorDefinitions[sensors[i]];
          if (!sensorDef) {
            sensorDef = { measurementName: "Unknown" };
          }
          label = sensorDef.measurementName + " (" + sensors[i] + ")";
          if (selectedSensor == i || (first && selectedSensor == -1)) {
            checked = "checked ";
          };
          content += "<input type='radio' name='selected-sensor-index' value='" + i + "' " + checked + "/>" + label + "<br/>";
          first = false;
        }
      }
      dialog.setContent(content);
      dialog.open();
    }

    return view = {
      $el: $("<div id='model-container' class='container sensor-model-container' />"),
      remoteAddress: null,

      bindModel: function(newModel, newModelUrl) {
        modelUrl = newModelUrl || modelUrl;
        model = newModel || model;

        setupModelObservers();
      },

      getHeightForWidth: function() {
        return "2.8em";
      },

      // called once we're in the DOM
      setup: function() {
        view.$el.empty();
        view.$controlsContainer = $("<div></div>");
        view.$statusContainer = $("<div></div>");
        view.$addressInput = $("<div class='address-input'><input type='text' name='address-input' placeholder='" + i18n.t("sensor.address_labquest2") + "'></input></div>");
        sensorReadingView = new NumericOutputView({
          id: 'sensor-value-view',
          label: i18n.t("sensor.reading"),
          units: model.getPropertyDescription('sensorReading').getUnitAbbreviation()
        });

        view.$connectButton = $("<div class='interactive-button'><button>" + i18n.t("sensor.connect") + "</button></div>");
        view.$zeroButton = $("<div class='interactive-button'><button>" + i18n.t("sensor.zero") + "</button></div>");
        view.$selectSensorButton = $("<div class='interactive-button'><button>" + i18n.t("sensor.select_sensor") + "</button></div>");
        view.$message = $("<div class='message'></div>");
        view.$sensorReading = sensorReadingView.render().addClass("horizontal");

        view.$controlsContainer
          .append(view.$addressInput)
          .append(view.$connectButton)
          .append(view.$sensorReading)
          .append(view.$zeroButton)
          .append(view.$selectSensorButton);

        view.$statusContainer
          .append(view.$message);

        view.$el.css('zIndex', 4)
          .append(view.$controlsContainer)
          .append(view.$statusContainer);

        view.$controlsContainer.find('div').addClass('component component-spacing');
        view.$statusContainer.find('div').addClass('component component-spacing');

        sensorReadingView.resize();
        setupModelObservers();

        if (typeof(view.remoteAddress) == "string") {
          view.$addressInput.find('input').val(view.remoteAddress);
        }
        view.$addressInput.find('input').on('change', function() {
          view.remoteAddress = $(this).val();
        });

        // connect when the user hits enter
        view.$addressInput.find('input').on('keypress', function(evt) {
          var code = evt.keyCode || evt.which || 0;
          if (code == 13 && model.properties.canConnect) {
            model.connect(view.$addressInput.find('input').val());
            evt.preventDefault();
          }
        });

        view.$connectButton.on('click', 'button', function() {
          model.connect(view.$addressInput.find('input').val());
        });
        view.$zeroButton.on('click', 'button', model.tare);
        view.$selectSensorButton.on('click', 'button', chooseSensorPopup);
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
        if (model.properties.liveSensorReading == null) {
          sensorReadingView.hideUnits();
        }
      },

      update: function() {
        if (model.properties.liveSensorReading == null) {
          sensorReadingView.update("");
          sensorReadingView.hideUnits();
        } else {
          sensorReadingView.update(format(model.properties.liveSensorReading));
          sensorReadingView.showUnits();
        }
      }
    };
  };
});

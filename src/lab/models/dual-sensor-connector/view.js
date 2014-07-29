define(function(require) {

  var NumericOutputView    = require('common/views/numeric-output-view'),
      BasicDialog          = require('common/controllers/basic-dialog'),
      getSensorDefinitions = require('models/sensor-common/i18n-sensor-definitions-connector'),
      viewState = require('common/views/view-state');

  return function(model, modelUrl, i18n) {

    // TODO use the formatter from the property description. Right now, it automatically adds
    // units to the returned string (which we don't want here).
    var format = d3.format('.2f');
    var sensorReadingView;
    var sensorReadingView2;
    var view;

    var sensorDefinitions = getSensorDefinitions(i18n);

    function setCanTareState() {
      if (model.properties.canTare) {
        viewState.enableView(view.$zeroButton);
      } else {
        viewState.disableView(view.$zeroButton);
      }
    }

    function setCanTare2State() {
      if (model.properties.canTare2) {
        viewState.enableView(view.$zeroButton2);
      } else {
        viewState.disableView(view.$zeroButton2);
      }
    }

    function setCanConnectState() {
      // if (model.properties.canConnect) {
      //   viewState.enableView(view.$connectButton);
      // } else {
      //   viewState.disableView(view.$connectButton);
      // }
    }

    function setHasMultipleSensorsState() {
      if (model.properties.hasMultipleSensors && model.properties.isPlayable) {
        viewState.enableView(view.$selectSensorButton);
        viewState.enableView(view.$selectSensorButton2);
      } else {
        viewState.disableView(view.$selectSensorButton);
        viewState.disableView(view.$selectSensorButton2);
      }
    }

    function setMessageText() {
      view.$message.text(model.properties.message);
    }

    function setupModelObservers() {
      model.addObserver('canTare', setCanTareState);
      model.addObserver('canTare2', setCanTare2State);
      setCanTareState();
      setCanTare2State();

      model.addObserver('canConnect', setCanConnectState);
      setCanConnectState();

      model.addObserver('hasMultipleSensors', setHasMultipleSensorsState);
      model.addObserver('isPlayable', setHasMultipleSensorsState);
      setHasMultipleSensorsState();

      model.addObserver('message', setMessageText);
      setMessageText();
    }

    function chooseSensorPopup1() {
      chooseSensorPopup(false);
    }

    function chooseSensorPopup2() {
      chooseSensorPopup(true);
    }

    function chooseSensorPopup(second) {
      second = second || false;
      var dialog = new BasicDialog({
        width: "60%",
        dialogClass: 'interactive-dialog no-close',
        closeOnEscape: false,
        title: i18n.t("sensor.choose_sensor_title"),
        buttons: {
          OK: function() {
            console.log("OK Clicked");
            $(this).dialog("close");
            // Change the model's selected sensor
            if (second) {
              model.setSelectedSensor2($(this).find('input:checked').val());
            } else {
              model.setSelectedSensor($(this).find('input:checked').val());
            }
          },
          Cancel: function() {
            console.log("Cancel Clicked");
            $(this).dialog("close");
          }
        }
      }, i18n);
      var content = "",
          label = "",
          sensors = model.connectedSensors(),
          first = true,
          selectedSensor = (second ? model.getSelectedSensor2() : model.getSelectedSensor()),
          i, checked, sensorDef;
      for (i = 0; i < sensors.length; i++) {
        if (sensors[i].units !== 's') {
          checked = "";
          if (sensors[i].name) {
            sensorDef = { measurementName: sensors[i].name };
          } else {
            sensorDef = sensorDefinitions[sensors[i].units];
            if (!sensorDef) {
              sensorDef = { measurementName: "Unknown" };
            }
          }
          label = sensorDef.measurementName + " (" + sensors[i].units + ")";
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
        // view.$addressInput = $("<div class='address-input'><input type='text' name='address-input' placeholder='address of LabQuest2'></input></div>");
        sensorReadingView = new NumericOutputView({
          id: 'sensor-value-view',
          label: i18n.t("sensor.reading"),
          units: model.getPropertyDescription('sensorReading').getUnitAbbreviation()
        });
        sensorReadingView2 = new NumericOutputView({
          id: 'sensor-value-view-2',
          label: i18n.t("sensor.reading"),
          units: model.getPropertyDescription('sensorReading2').getUnitAbbreviation()
        });

        // view.$connectButton = $("<div class='interactive-button'><button>Connect</button></div>");
        view.$zeroButton = $("<div class='interactive-button'><button>" + i18n.t("sensor.zero") + "</button></div>");
        view.$zeroButton2 = $("<div class='interactive-button'><button>" + i18n.t("sensor.zero") + "</button></div>");
        view.$selectSensorButton = $("<div class='interactive-button'><button>" + i18n.t("sensor.select_sensor") + "</button></div>");
        view.$selectSensorButton2 = $("<div class='interactive-button'><button>" + i18n.t("sensor.select_sensor") + "</button></div>");
        view.$message = $("<div class='message'></div>");
        view.$sensorReading = sensorReadingView.render().addClass("horizontal");
        view.$sensorReading2 = sensorReadingView2.render().addClass("horizontal");

        view.$controlsContainer
          // .append(view.$addressInput)
          // .append(view.$connectButton)
          .append(view.$sensorReading)
          .append(view.$zeroButton)
          .append(view.$selectSensorButton)
          .append(view.$sensorReading2)
          .append(view.$zeroButton2)
          .append(view.$selectSensorButton2);

        view.$statusContainer
          .append(view.$message);

        view.$el.css('zIndex', 4)
          .append(view.$controlsContainer)
          .append(view.$statusContainer);

        view.$controlsContainer.find('div').addClass('component component-spacing');
        view.$statusContainer.find('div').addClass('component component-spacing');

        sensorReadingView.resize();
        sensorReadingView2.resize();
        setupModelObservers();

        // if (typeof(view.remoteAddress) == "string") {
        //   view.$addressInput.find('input').val(view.remoteAddress);
        // }
        // view.$addressInput.find('input').on('change', function() {
        //   view.remoteAddress = $(this).val();
        // });

        // view.$connectButton.on('click', 'button', function() {
        //   model.connect(view.$addressInput.find('input').val());
        // });
        view.$zeroButton.on('click', 'button', model.tare);
        view.$zeroButton2.on('click', 'button', model.tare2);
        view.$selectSensorButton.on('click', 'button', chooseSensorPopup1);
        view.$selectSensorButton2.on('click', 'button', chooseSensorPopup2);
      },

      resize: function() {
        if (sensorReadingView) {
          sensorReadingView.resize();
        }
        if (sensorReadingView2) {
          sensorReadingView2.resize();
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

      updateUnits2: function(units) {
        sensorReadingView2.updateUnits(units);
        if (model.properties.liveSensorReading2 == null) {
          sensorReadingView2.hideUnits();
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
        if (model.properties.liveSensorReading2 == null) {
          sensorReadingView2.update("");
          sensorReadingView2.hideUnits();
        } else {
          sensorReadingView2.update(format(model.properties.liveSensorReading2));
          sensorReadingView2.showUnits();
        }
      }
    };
  };
});

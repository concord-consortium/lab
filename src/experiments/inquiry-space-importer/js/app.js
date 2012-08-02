/*globals defineClass extendClass grapher d3 */

if (typeof ISImporter === 'undefined') ISImporter = {};

/**
  Quick & dirty fixed-digit formatter. Should work for reasonable ranges of numbers.
*/
ISImporter.fixed = function(d, n) {
  var str;

  // round and right zero pad
  str = ""+Math.round(d*Math.pow(10, n));

  // left zero pad
  while (str.length < n+1) {
    str = '0' + str;
  }
  // And put the decimal point in the right place
  return str.slice(0, str.length-n) + '.' + str.slice(-n);
};

// Hmm.
ISImporter.Object = defineClass();

ISImporter.sensors = {

  distance: {
    applet: new ISImporter.GoIOApplet({
      otmlPath: '/distance.otml',
      listenerPath: 'ISImporter.sensors.distance.applet',
      appletId: 'distance-sensor'
    }),
    title: "Distance",
    yMax: 5,
    units: "m"
  },

  temperature: {
    applet: new ISImporter.GoIOApplet({
      otmlPath: '/temperature.otml',
      listenerPath: 'ISImporter.sensors.temperature.applet',
      appletId: 'temperature-sensor'
    }),
    title: "Temperature",
    yMax: 100,
    units: "°C"
  },

  light: {
    applet: new ISImporter.GoIOApplet({
      otmlPath: '/light.otml',
      listenerPath: 'ISImporter.sensors.light.applet',
      appletId: 'light-sensor'
    }),
    title: "Light Intensity",
    yMax: 2000,
    units: "lux"
  }
};


ISImporter.GraphController = defineClass({

  title: "Graph",
  yLabel: "Y Axis",
  xLabel: "X Axis",

  element: null,
  graph: null,
  dataset: null,

  setTitle: function(title) {
    this.title = title;
    this.graph.title(title);
  },

  setYMax: function(yMax) {
    this.yMax = yMax;
    this.graph.ymax(yMax);
  },

  setYLabel: function() {},

  setDataset: function(dataset) {
    if (this.dataset) {
      this.dataset.removeListener('data', this.dataListener);
      this.dataset.removeListener('dataReset', this.dataResetListener);
    }
    this.dataset = dataset;
    this.dataset.on('data', this.dataListener);
    this.dataset.on('dataReset', this.dataResetListener);
    this.dataResetListener();
  },

  init: function() {
    var self = this;
    this.initGraph();

    this.dataListener = function(d) {
      self.graph.add_data(d);
    };

    this.dataResetListener = function() {
      self.graph.data(self.dataset.getDataPoints());
    };
  },

  initGraph: function() {
    this.graph = grapher.graph(this.element, {
      title       : this.title,
      xlabel      : this.xLabel,
      xmin        : 0,
      xmax        : 60,
      ylabel      : this.yLabel,
      ymin        : 0,
      ymax        : 40,
      points      : [],
      circleRadius: false,
      dataChange  : false
    }, "Select a sensor type");

    // allow title to be styled by CSS
    d3.select(this.element + ' text.title').style('font-size', null);
  },

  removeNotification: function() {
    this.graph.notify('');
  },

  resetGraph: function() {
    this.graph.reset();
  },

  showSelection: function() {},
  hideSelection: function() {},
  enableSelection: function() {},
  disableSelection: function() {},

  getSelectionDataset: function() {}
});


ISImporter.graphController = new ISImporter.GraphController({
  element: '#graph',
  title:   "Sensor Graph",
  xLabel:  "Time (s)"
});


ISImporter.appController = new ISImporter.Object({

  currentApplet: null,
  currentAppletReady: false,
  started: false,

  // could split interface controller from generic app container--but not yet.
  $sensorTypeSelector: null,
  $startButton: null,
  $stopButton: null,
  $resetButton: null,
  $realtimeDisplayValue: null,
  $realtimeDisplayUnits: null,

  init: function() {
    var self = this;
    this.appletDataListener = function(y) {
      self.dataset.add(y);
    };

    this.initInterface();
  },

  initInterface: function() {
    var self = this,
        key;

    this.$sensorTypeSelector = $('#sensor-type-selector');

    for (key in ISImporter.sensors) {
      if (ISImporter.sensors.hasOwnProperty(key)) {
        this.addSensorTypeSelection(key, key);
      }
    }

    this.$sensorTypeSelector.on('change', function() {
      self.sensorTypeChanged();
    });

    this.$startButton = $('#start-button');
    this.$startButton.on('click', function() {
      if ($(this).hasClass('disabled')) return false;
      self.start();
    });

    this.$stopButton = $('#stop-button');
    this.$stopButton.on('click', function() {
      if ($(this).hasClass('disabled')) return false;
      self.stop();
    });

    this.$resetButton = $('#reset-button');
    this.$resetButton.on('click', function() {
      if ($(this).hasClass('disabled')) return false;
      self.reset();
    });

    this.$realtimeDisplayValue = $('#realtime-display .realtime-value');
    this.$realtimeDisplayUnits = $('#realtime-display .realtime-units');
  },

  disableControlButtons: function() {
    this.$startButton.addClass('disabled').removeClass('enabled');
    this.$stopButton.addClass('disabled').removeClass('enabled');
    this.$resetButton.addClass('disabled').removeClass('enabled');
  },

  enableStartButton: function() {
    this.$startButton.removeClass('disabled').addClass('enabled');
  },

  disableStartButton: function() {
    this.$startButton.removeClass('enabled').addClass('disabled');
  },

  enableStopButton: function() {
    this.$stopButton.removeClass('disabled').addClass('enabled');
  },

  disableStopButton: function() {
    this.$stopButton.removeClass('enabled').addClass('disabled');
  },

  enableResetButton: function() {
    this.$resetButton.removeClass('disabled').addClass('enabled');
  },

  disableResetButton: function() {
    this.$resetButton.removeClass('enabled').addClass('disabled');
  },

  // initialization
  addSensorTypeSelection: function(value, text) {
    this.$sensorTypeSelector.append('<option value="' + value + '">' + text + '</option>');
  },

  setupGraph: function(title, yLabel, yMax, dataset) {},

  setupRealtimeDisplay: function(units) {
    var self = this;

    this.$realtimeDisplayValue.text('');
    self.$realtimeDisplayUnits.text(units).hide();

    this.dataset.on('data', function(d) {
      self.$realtimeDisplayValue.text(ISImporter.fixed(d[1], 1));
      self.$realtimeDisplayUnits.show();
    });

    this.dataset.on('dataReset', function(d) {
      var length = self.dataset.getLength(),
          text;

      if (length > 0) {
        text = ISImporter.fixed(self.dataset.getDataPoints()[length-1], 1);
      } else {
        text = '';
        self.$realtimeDisplayUnits.hide();
      }
      self.$realtimeDisplayValue.text(text);
    });
  },

  // events
  sensorTypeChanged: function() {
    var val        = this.getSensorTypeSelection(),
        sensorInfo = ISImporter.sensors[val],
        self       = this;

    if (this.currentApplet === sensorInfo.applet) {
      return;
    }

    if (this.started) this.stop();

    if (this.currentApplet) {
      this.currentApplet.removeListener('data', this.appletDataListener);
      this.currentApplet.remove();
    }

    this.currentApplet = sensorInfo.applet;
    this.currentAppletReady = false;
    this.currentApplet.on('sensorReady', function() {
      self.sensorAppletReady();
    });

    this.dataset = new ISImporter.Dataset();
    this.dataset.setXIncrement(0.1);

    this.setupRealtimeDisplay(sensorInfo.units);

    ISImporter.graphController.setDataset( this.dataset );
    ISImporter.graphController.setYMax( sensorInfo.yMax );
    ISImporter.graphController.setTitle( sensorInfo.title + " Graph");

    this.currentApplet.on('data', this.appletDataListener);
    this.currentApplet.append();

    // we'll skip explicit state management... for now.
    this.disableControlButtons();
    ISImporter.graphController.removeNotification();
  },

  metadataLabelChanged: function(fieldNum) {},
  metadataValueChanged: function(fieldNum) {},
  frequencyChanged: function() {},
  selectionChanged: function() {

  },

  sensorAppletReady: function() {
    if (this.currentAppletReady) return;
    this.currentAppletReady = true;
    this.enableStartButton();
  },

  start: function() {
    this.started = true;
    this.currentApplet.start();
    this.disableStartButton();
    this.enableStopButton();
  },

  stop: function() {
    this.started = false;
    if (this.currentApplet) this.currentApplet.stop();
    this.disableStopButton();
    this.enableResetButton();
  },

  reset: function() {
    this.dataset.setDataPoints();   // perhaps this should be a 'clear' convenience method
    this.dataset.setNextX(0);
    this.enableStartButton();
    this.disableResetButton();
  },

  exportClicked: function() {},
  selectClicked: function() {},
  cancelClicked: function() {},

  // accessors
  getSensorTypeSelection: function() {
    return this.$sensorTypeSelector.val();
  },

  getMetadataLabel: function(fieldNum) {},
  getMetadataValue: function(fieldNum) {},
  getFrequency: function() {}

});

ISImporter.main = function() {
  ISImporter.graphController.init();
  ISImporter.appController.init();

  window.graph = ISImporter.graphController.graph;
};

$(document).ready(function() {
  ISImporter.main();
});

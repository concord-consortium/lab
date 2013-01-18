/*global defineClass extendClass Lab d3 */

if (typeof ISImporter === 'undefined') ISImporter = {};
(function() {

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

// Returns true if the argument is a string that represents a valid, finite number (or is a valid, finite number)
function isNumeric(val) {
  // see http://stackoverflow.com/questions/18082/validate-numbers-in-javascript-isnumeric/1830844#1830844
  return !isNaN(parseFloat(val)) && isFinite(val);
}

// Hmm.
ISImporter.Object = defineClass();

var MENU_GROUPS = {
  NONE: { name: null },
  GO_LINK: { name: "GoLink" },
  LAB_QUEST: { name: "LabQuest" }
};

ISImporter.sensors = {

  goMotion: {
    applet: new ISImporter.GoIOApplet({
      listenerPath: 'ISImporter.sensors.goMotion.applet',
      sensorType: 'distance',
      appletId: 'distance-sensor'
    }),
    menuGroup: MENU_GROUPS.NONE,
    menuText: "GoMotion",
    title: "Distance",
    maxReading: 3,
    readingUnits: "m",
    maxSeconds: 20
  },

  goLinkTemperature: {
    applet: new ISImporter.GoIOApplet({
      listenerPath: 'ISImporter.sensors.goLinkTemperature.applet',
      sensorType: 'temperature',
      appletId: 'temperature-sensor'
    }),
    menuGroup: MENU_GROUPS.GO_LINK,
    menuText: "Temperature",
    title: "Temperature",
    readingUnits: "°C",
    maxReading: 40,
    maxSeconds: 20
  },

  goLinkLight: {
    applet: new ISImporter.GoIOApplet({
      listenerPath: 'ISImporter.sensors.goLinkLight.applet',
      sensorType: 'light',
      appletId: 'light-sensor'
    }),
    menuGroup:  MENU_GROUPS.GO_LINK,
    menuText: "Light",
    title: "Light Intensity",
    readingUnits: "lux",
    maxReading: 2000,
    maxSeconds: 20
    maxSeconds: 20
  },

  labQuestLight: {
    applet: new ISImporter.LabQuestApplet({
      listenerPath: 'ISImporter.sensors.labQuestLight.applet',
      sensorType: 'light',
      appletId: 'light-sensor'
    }),
    menuGroup:  MENU_GROUPS.LAB_QUEST,
    menuText: "Light",
    title: "Light Intensity",
    readingUnits: "lux",
    maxReading: 2000,
    maxSeconds: 20
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

  setXMax: function(xMax) {
    this.xMax = xMax;
    this.graph.xmax(xMax);
  },

  setYMax: function(yMax) {
    this.yMax = yMax;
    this.graph.ymax(yMax);
  },

  setYMin: function(yMin) {
    this.yMin = yMin;
    this.graph.ymin(yMin);
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
    this.graph = Lab.grapher.graph(this.element, {
      title       : this.title,
      xlabel      : this.xLabel,
      xmin        : 0,
      xmax        : 20,
      ylabel      : this.yLabel,
      ymin        : 0,
      ymax        : 2,
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

  startSelection: function() {
    var self = this;

    if (this.dataset.getSelectionDomain() === null) {
      this.dataset.select([]);
    }

    this.graph.selection_domain(this.dataset.getSelectionDomain());
    this.graph.selection_listener(function(domain) {
      self.dataset.select(domain);
    });
    this.graph.selection_visible(true);
  },

  stopSelection: function() {
    // first, make sure to turn off the listener so selection_domain(null) doesn't
    // change the dataset selection
    this.graph.selection_listener(null);
    this.graph.selection_domain(null).selection_visible(false);
  },

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
  selecting: false,

  // could split interface controller from generic app container--but not yet.
  $sensorSelector: null,
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
    ISImporter.DGExporter.init($(document.body).width() + 10, $(document.body).height() + 50);
  },

  initInterface: function() {
    var self = this,
        key;

    this.$sensorSelector = $('#sensor-selector');

    for (key in ISImporter.sensors) {
      if (ISImporter.sensors.hasOwnProperty(key)) {
        this.addSensorSelection(key);
      }
    }

    this.$sensorSelector.on('change', function() {
      self.sensorChanged();
    });

    // Set up button handlers. Surely this boilerplate can be eliminated.
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

    this.$exportButton = $('#export-data-button');
    this.$exportButton.on('click', function() {
      if ($(this).hasClass('disabled')) return false;
      self.exportData();
    });

    this.$selectButton = $('#select-data-button');
    this.$selectButton.on('click', function() {
      if ($(this).hasClass('disabled')) return false;
      self.select();
    });

    this.$cancelButton = $('#cancel-selection-button');
    this.$cancelButton.on('click', function() {
      if ($(this).hasClass('disabled')) return false;
      self.cancel();
    });

    this.$realtimeDisplayValue = $('#realtime-display .realtime-value');
    this.$realtimeDisplayUnits = $('#realtime-display .realtime-units');
  },

  disableControlButtons: function() {
    this.disable(this.$startButton);
    this.disable(this.$stopButton);
    this.disable(this.$resetButton);
  },

  enable: function($button) {
    $button.removeClass('disabled').addClass('enabled');
  },

  disable: function($button) {
    $button.removeClass('enabled').addClass('disabled');
  },

  show: function($el) {
    $el.removeClass('hidden');
  },

  hide: function($el) {
    $el.addClass('hidden');
  },

  // initialization
  addSensorSelection: function(sensorKey) {
    var sensor = ISImporter.sensors[sensorKey],
        $el;

    if (sensor.menuGroup.name == null) {
      $el = this.$sensorSelector;
    } else {
      $el = this.$sensorSelector.find('optgroup[label="' + sensor.menuGroup.name + '"]');
      if ($el.length < 1) {
        $el = $('<optgroup label="' + sensor.menuGroup.name + '"></optgroup>');
        $el.appendTo( this.$sensorSelector );
      }
    }

    $el.append('<option value="' + sensorKey + '">' + sensor.menuText + '</option>');
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
  sensorChanged: function() {
    var val        = this.getSensorSelection(),
        self       = this;

    this.sensor = ISImporter.sensors[val];

    if (this.currentApplet === this.sensor.applet) {
      return;
    }

    if (this.started) this.stop();

    if (this.currentApplet) {
      this.currentApplet.removeListener('data', this.appletDataListener);
      this.currentApplet.remove();
    }

    this.currentApplet = this.sensor.applet;
    this.currentAppletReady = false;
    this.currentApplet.on('sensorReady', function() {
      self.sensorAppletReady();
    });

    this.dataset = new ISImporter.Dataset();
    this.dataset.setXIncrement(0.1);

    this.setupRealtimeDisplay(this.sensor.readingUnits);

    ISImporter.graphController.setDataset( this.dataset );
    ISImporter.graphController.setXMax( this.sensor.maxSeconds );
    ISImporter.graphController.setYMin( this.sensor.minReading || 0 );
    ISImporter.graphController.setYMax( this.sensor.maxReading );
    ISImporter.graphController.setTitle( this.sensor.title + " Graph");

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
    this.enable(this.$startButton);
  },

  start: function() {
    this.started = true;
    this.currentApplet.start();
    this.disable(this.$startButton);
    this.enable(this.$stopButton);
  },

  stop: function() {
    this.started = false;
    if (this.currentApplet) this.currentApplet.stop();
    this.disable(this.$stopButton);
    this.enable(this.$resetButton);

    if (this.dataset.getLength() > 0) {
      this.enable(this.$exportButton);
      this.enable(this.$selectButton);
    }
  },

  reset: function() {
    this.dataset.setDataPoints();   // perhaps this should be a 'clear' convenience method
    this.dataset.select(null);
    this.dataset.setNextX(0);
    this.enable(this.$startButton);
    this.disable(this.$resetButton);
    this.disable(this.$selectButton);
    this.disable(this.$exportButton);
  },

  exportData: function() {
    var data,
        label,
        metadata = [];

    if (this.selecting) {
      data = this.dataset.getSelectedDataPoints();
    } else {
      data = this.dataset.getDataPoints();
    }

    for (var i = 1, len = this.getMetadataItemCount(); i <= len; i++) {
      label = this.getMetadataLabel(i);
      if (label) {
        metadata.push({ label: label, value: this.getMetadataValue(i) });
      }
    }

    ISImporter.DGExporter.exportData(this.sensor.applet.sensorType, data, metadata);

    this.selecting = false;

    ISImporter.graphController.stopSelection();
    this.hide(this.$cancelButton);
    this.enable(this.$resetButton);
    this.enable(this.$selectButton);
  },

  select: function() {
    this.selecting = true;
    ISImporter.graphController.startSelection();
    this.show(this.$cancelButton);
    this.enable(this.$cancelButton);
    this.disable(this.$selectButton);
    this.disable(this.$resetButton);
  },

  cancel: function() {
    this.selecting = false;
    this.dataset.select(null);
    ISImporter.graphController.stopSelection();
    this.hide(this.$cancelButton);
    this.enable(this.$resetButton);
    this.enable(this.$selectButton);
  },

  // accessors
  getSensorSelection: function() {
    return this.$sensorSelector.val();
  },

  getMetadataItemCount: function() {
    return $('#metadata-fields .metadata-value').length;
  },

  getMetadataLabel: function(fieldNum) {
    return $.trim( $('#metadata-' + fieldNum + ' .metadata-label').val() );
  },

  getMetadataValue: function(fieldNum) {
    var val = $('#metadata-' + fieldNum + ' .metadata-value').val();
    if (isNumeric(val)) return parseFloat(val);
    return val;
  },

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

}());

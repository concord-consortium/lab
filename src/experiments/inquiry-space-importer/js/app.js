/*global defineClass, extendClass, mixin, Lab, d3 */
/*jshint eqnull:true, indent: false */

if (typeof ISImporter === 'undefined') ISImporter = {};
(function() {

Lab.importExport.dgExporter.gameName = "InquirySpace Sensor Data Collector";

/**
  Quick & dirty fixed-digit formatter. Should work for reasonable ranges of numbers.
*/
ISImporter.fixed = function(d, n) {
  var str, out = "", negative = false;

  if (d < 0) { negative = true; }

  // round and right zero pad
  str = ""+Math.round(Math.abs(d)*Math.pow(10, n));

  // left zero pad
  while (str.length < n+1) {
    str = '0' + str;
  }
  // And put the decimal point in the right place
  if (negative) {
    out = "-";
  }
  out += str.slice(0, str.length-n) + '.' + str.slice(-n);
  return out;
};

// Returns true if the argument is a string that represents a valid, finite number (or is a valid, finite number)
function isNumeric(val) {
  // see http://stackoverflow.com/questions/18082/validate-numbers-in-javascript-isnumeric/1830844#1830844
  // AU 2013-04-09: modified so that strings with numbers and trailing characters still get interpreted as numbers
  return !isNaN(parseFloat(val)) && isFinite(parseFloat(val));
}

// Hmm.
ISImporter.Object = defineClass();

var MENU_GROUPS = {
  NONE: { name: null },
  GO_LINK: { name: "GoLink" },
  LAB_QUEST: { name: "LabQuest" }
};

// FIXME it should just be /jnlp
mixin( Lab.sensorApplet.GoIO.prototype, {codebase: '/jnlp'} );
mixin( Lab.sensorApplet.LabQuest.prototype, {codebase: '/jnlp'} );

ISImporter.sensors = {
  none: {
    applet: null,
    menuGroup: MENU_GROUPS.NONE,
    menuText: "select type of sensor...",
    menuDisabled: true,
    menuSelected: true,
    title: "Sensor",
    tareable: false,
    minReading: 0,
    maxReading: 2,
    readingUnits: "",
    precision: 1,
    maxSeconds: 20
  },
};
var sensorDef,
    appletClass,
    sensorMenuGroup,
    unitsDef = Lab.sensorApplet.unitsDefinition.units;

for (key in Lab.sensorApplet.sensorDefinitions) {
  if (Lab.sensorApplet.sensorDefinitions.hasOwnProperty(key)) {
    sensorDef = Lab.sensorApplet.sensorDefinitions[key];
    if(sensorDef.appletClass === 'goio') {
      appletClass = Lab.sensorApplet.GoIO;
    } else if (sensorDef.appletClass === 'labquest') {
      appletClass = Lab.sensorApplet.LabQuest;
    } else {
      throw "Unknown appletClass: " + sensorDef.appletClass;
    }
    if(sensorDef.deviceName === 'GoMotion') {
      sensorMenuGroup = MENU_GROUPS.NONE;
    } else if (sensorDef.deviceName === 'GoIO') {
      sensorMenuGroup = MENU_GROUPS.GO_LINK;
    } else if (sensorDef.deviceName === 'LabQuest') {
      sensorMenuGroup = MENU_GROUPS.LAB_QUEST;
    } else {
      throw "Unknown deviceName: " + sensorDef.deviceName;
    }

    ISImporter.sensors[key] = {
      applet: new appletClass({
        listenerPath: 'ISImporter.sensors.' + key + '.applet',
        sensorDefinitions: [sensorDef],
        appletId: sensorDef.measurementType + '-sensor'
      }),
      menuGroup: sensorMenuGroup,
      // This is different than before it will duplicate the menuGroup
      // in most cases, the sensor definitions will likely change shortly
      // then this can be fixed
      menuText: sensorDef.sensorName,
      title: sensorDef.measurementName,
      tareable: sensorDef.tareable,
      maxReading: sensorDef.maxReading,
      minReading: sensorDef.minReading,
      readingUnits: unitsDef[sensorDef.measurementType].symbol,
      precision: sensorDef.precision,
      samplesPerSecond: sensorDef.samplesPerSecond,
      maxSeconds: sensorDef.maxSeconds
    };
  }
}

// It just so happens that the keys of the

ISImporter.GraphController = defineClass({

  title: "Graph",
  yLabel: "Y Axis",
  xLabel: "X Axis",

  element: null,
  graph: null,
  dataset: null,

  // Some reasonable initial values
  xMin: 0,
  xMax: 20,
  yMin: 0,
  yMax: 2,

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
      self.graph.addPoint(d);
    };

    this.dataResetListener = function() {
      self.graph.resetPoints(self.dataset.getDataPoints());
    };
  },

  initGraph: function() {
    this.graph = Lab.grapher.Graph(this.element, {
      title       : this.title,
      xlabel      : this.xLabel,
      xmin        : this.xMin,
      xmax        : this.xMax,
      ylabel      : this.yLabel,
      ymin        : this.yMin,
      ymax        : this.yMax,
      xTickCount  : 6,
      yTickCount  : 7,
      xFormatter  : "2s",
      yFormatter  : "2s",

      dataType: 'points',
      dataPoints: [],

      markAllDataPoints: false,
      markNearbyDataPoints: false,
      extraCirclesVisibleOnHover: 0,
      showRulersOnSelection: true,
      dataChange  : false
    }, "Select a sensor type");

    // allow title to be styled by CSS
    d3.select(this.element + ' text.title').style('font-size', null);
  },

  removeNotification: function() {
    this.graph.notify('');
  },

  /* User interactions with the Lab grapher may change the displayed graph bounds (xmin, xmax, ymin,
     ymax) without notifying us. This restores the graph bounds to the last programmatically-set
     bounds, e.g., the default bounds for the currently selected sensor.
  */
  restoreLastSavedGraphBounds: function() {
    this.graph.xmin(this.xMin);
    this.graph.xmax(this.xMax);
    this.graph.ymin(this.yMin);
    this.graph.ymax(this.yMax);
  },

  resetGraph: function() {
    this.restoreLastSavedGraphBounds();
    this.graph.reset();
  },

  startSelection: function() {
    var self = this;

    if (this.dataset.getSelectionDomain() === null) {
      this.dataset.select([]);
    }

    this.graph.selectionDomain(this.dataset.getSelectionDomain());
    this.graph.selectionListener(function(domain) {
      self.dataset.select(domain);
    });
    this.graph.selectionVisible(true);
  },

  stopSelection: function() {
    // first, make sure to turn off the listener so selectionDomain(null) doesn't
    // change the dataset selection
    this.graph.selectionListener(null);
    this.graph.selectionDomain(null).selectionVisible(false);
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
  filledMetadata: [],
  runNumber: 1,

  // could split interface controller from generic app container--but not yet.
  $body: null,
  $sensorDisconnect: null,
  $tareButton: null,
  $sensorSelector: null,
  $startButton: null,
  $stopButton: null,
  $resetButton: null,
  $realtimeDisplay: null,
  $realtimeDisplayValue: null,
  $realtimeDisplayUnits: null,

  init: function() {
    var self = this;
    this.appletDataListener = function(y) {
      y = y[0];
      if (self.sensor.tareable) {
        y -= (self.sensor.tareValue || 0);
      }
      self.rawDataset.add(y);
    };

    this.tareListener = function(y) {
      self.sensor.tareValue = y;
      self.endTare();
    };

    this.initInterface();
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

    this.$realtimeDisplay = $('#realtime-display');

    // Set up button handlers. Surely this boilerplate can be eliminated.

    this.$sensorDisconnect = $('#sensor-disconnect-button');
    this.$sensorDisconnect.on('click', function() {
      if ($(this).hasClass('disabled')) return false;
      self.sensorDisconnect();
    });

    this.$tareButton = $('#tare-button');
    this.$tareButton.on('click', function() {
      if ($(this).hasClass('disabled')) return false;
      self.tare();
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

    var updateExportAvailability = function() {
      var el = this,
         val = $(el).val();
      if (typeof(val) !== "undefined" && val != null && val !== "") {
        if (self.filledMetadata.indexOf(el) == -1) {
          self.filledMetadata.push(el);
        }
      } else {
        var idx = self.filledMetadata.indexOf(el);
        if (idx != -1) {
          self.filledMetadata.splice(idx,1);
        }
      }
      if (self.filledMetadata.length > 0 || self.dataset.getLength() > 0) {
        self.enable(self.$exportButton);
      } else {
        self.disable(self.$exportButton);
      }
    };
    $('.metadata-label, .metadata-value').on('keyup', updateExportAvailability);
  },

  disableControlButtons: function() {
    this.disable(this.$startButton);
    this.disable(this.$stopButton);
    this.disable(this.$resetButton);
    this.disable(this.$exportButton);
    this.disable(this.$selectButton);
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

    disabled = sensor.menuDisabled ? " disabled" : "";
    selected = sensor.menuSelected ? " selected" : "";
    $el.append('<option value="' + sensorKey + '"' + disabled + selected + '>' + sensor.menuText + '</option>');
  },

  setupGraph: function(title, yLabel, yMax, dataset) {},

  setupRealtimeDisplay: function(units) {
    var self = this;

    this.$realtimeDisplayValue.text('');
    self.$realtimeDisplayUnits.text(units).hide();

    var precision = self.sensor.precision;
    if (typeof(precision) === 'undefined' || precision === null) {
      precision = 1;
    }

    this.dataset.on('data', function(d) {
      self.$realtimeDisplayValue.text(ISImporter.fixed(d[1], precision));
      self.$realtimeDisplayUnits.show();
    });

    this.dataset.on('dataReset', function(d) {
      var length = self.dataset.getLength(),
          text;

      if (length > 0) {
        text = ISImporter.fixed(self.dataset.getDataPoints()[length-1], precision);
      } else {
        text = self.$realtimeDisplayValue.text();
        // text = '';
        // self.$realtimeDisplayUnits.hide();
      }
      self.$realtimeDisplayValue.text(text);
    });
  },

  stopInterface: function(self) {
    if (self.started) self.stop();
    if (self.taring) self.endTare();
    if (self.singleValueTimerId) {
      clearInterval(self.singleValueTimerId);
      self.singleValueTimerId = null;
    }
  },

  // events
  sensorDisconnect: function() {
    this.logAction('disconnect');
    this.stopInterface(this);
    this.currentApplet.removeListeners('data');
    this.currentApplet.remove();
    this.disable(this.$startButton);
    this.disable(this.$stopButton);
    this.disable(this.$resetButton);
    this.hide(this.$tareButton);
    this.hide(this.$realtimeDisplay);
    if (this.taring) this.endTare();
    this.$sensorSelector.val("select-sensor");
    this.disable(this.$sensorDisconnect);
    $('.metadata-label, .metadata-value').attr("disabled","disabled");
  },

  handleSensorNotConnected: function() {
      var self = this;
      $('#dialog-confirm-content').text("No sensor (or the wrong sensor) is connected! Please connect your sensor and click OK to try again, or Cancel to stop trying.");
      $('#dialog-confirm').attr('title', "No sensor found!");
      $('#dialog-confirm').dialog({
        resizable: false,
        height: 300,
        width: 400,
        modal: true,
        buttons: {
          "OK": function() {
            $(this).dialog("close");
            if (self.singleValueTimerId === null) {
              self.singleValueTimerId = setInterval(function() {self.readSingleValue();}, 1000);
            }
          },
          "Cancel": function() {
            $(this).dialog("close");
            self.sensorDisconnect();
          }
        }
      });
  },

  // events
  sensorChanged: function() {
    var val        = (this.getSensorSelection() || "none"),
        self       = this;

    this.sensor = ISImporter.sensors[val];

    if (this.currentApplet === this.sensor.applet && (this.currentApplet === null || this.currentApplet.getState() !== "not appended")) {
      return;
    }

    this.stopInterface(self);

    if (this.currentApplet) {
      this.currentApplet.removeListeners('data');
      this.currentApplet.remove();
    }

    this.currentApplet = this.sensor.applet;
    this.currentAppletReady = false;
    if (this.currentApplet !== null) {
      this.currentApplet.on('sensorReady', function() {
        self.sensorAppletReady();
      });
      this.currentApplet.on('deviceUnplugged', function() {
        self.stopInterface(self);
        self.logAction('deviceUnplugged');
        $('#dialog-confirm-content').text("No sensor device is connected! Please connect your device and click OK to try again, or Cancel to stop trying.");
        $('#dialog-confirm').attr('title', "No sensor device found!");
        $('#dialog-confirm').dialog({
          resizable: false,
          height: 300,
          width: 400,
          modal: true,
          buttons: {
            "OK": function() {
              $(this).dialog("close");
              if (self.singleValueTimerId === null) {
                self.singleValueTimerId = setInterval(function() {self.readSingleValue();}, 1000);
              }
            },
            "Cancel": function() {
              $(this).dialog("close");
              self.sensorDisconnect();
            }
          }
        });
      });
      this.currentApplet.on('sensorUnplugged', function() {
        self.stopInterface(self);
        self.logAction('sensorUnplugged');
        self.handleSensorNotConnected();
      });
    }

    this.dataset = new ISImporter.Dataset();
    this.rawDataset = this.getNewRawDataset();
    this.dataset.setXIncrement( this.rawDataset.getXIncrement() * (this.sensor.downsampleRate || 1) );

    this.setupRealtimeDisplay(this.sensor.readingUnits);

    ISImporter.graphController.setDataset( this.dataset );
    ISImporter.graphController.setXMax( this.sensor.maxSeconds );
    ISImporter.graphController.setYMin( this.sensor.minReading || 0 );
    ISImporter.graphController.setYMax( this.sensor.maxReading );
    ISImporter.graphController.setTitle( this.sensor.title + " Graph");

    if(this.currentApplet){
      this.currentApplet.append($('#main .left'), function(error){
        if(error) {
          if (error instanceof Lab.sensorApplet.JavaLoadError) {
            throw "It appears that Java applets cannot run in your browser. If you are able to fix this, reload the page to use the sensor";
          } else if (error instanceof Lab.sensorApplet.AppletInitializationError) {
            throw "The sensor applet appears not to be loading. If you are able to fix this, reload the page to use the sensor";
          } else if (error instanceof Lab.sensorApplet.SensorConnectionError) {
            self.handleSensorNotConnected();
          } else {
            throw "There was an unexpected error when connecting to the sensor";
          }
        } else {
          self.sensorAppletReady();
        }
      });
    }

    // we'll skip explicit state management... for now.
    this.disableControlButtons();
    $('.metadata-label, .metadata-value').attr("disabled","disabled");

    if (this.sensor.tareable) {
      this.disable(this.$tareButton);
      this.show(this.$tareButton);
    } else {
      this.hide(this.$tareButton);
    }

    if (this.currentApplet) {
      this.enable(this.$sensorDisconnect);
      this.show(this.$realtimeDisplay);
    } else {
      this.disable(this.$sensorDisconnect);
      this.hide(this.$realtimeDisplay);
    }

    ISImporter.graphController.removeNotification();
  },

  // useful because it creates a new counter for filtering data
  getNewRawDataset: function() {
    var rawDataset = new ISImporter.Dataset(),
        self = this;

    rawDataset.setXIncrement( 1 / (this.sensor.samplesPerSecond || 10));

    // Filter the raw dataset
    rawDataset.on('data', (function() {
      var count = 0,
          downsampleRate  = self.sensor.downsampleRate || 1,
          filteredDataset = self.dataset;

      return function(d) {
        if (count++ % downsampleRate === 0) {
          filteredDataset.add(d[1]);
        }
      };
    }()));
    return rawDataset;
  },

  metadataLabelChanged: function(fieldNum) {},
  metadataValueChanged: function(fieldNum) {},
  frequencyChanged: function() {},
  selectionChanged: function() {},

  sensorAppletReady: function() {
    if (this.currentAppletReady) return;
    this.currentAppletReady = true;
    this.enable(this.$startButton);
    if (this.sensor.tareable) this.enable(this.$tareButton);
    $('.metadata-label, .metadata-value').removeAttr("disabled");
    // Read the current sensor value and inject it into the display
    // TODO Poll and update this every second while we're not collecting and not errored out
    var _this = this;
    if (this.singleValueTimerId === null) {
      this.readSingleValue();
      this.singleValueTimerId = setInterval(function() {_this.readSingleValue();}, 1000);
    }
  },

  singleValueTimerId: null,
  readSingleValue: function() {
    try {
      var values = this.currentApplet.readSensor();
      var val = values[0];

      if (this.sensor.tareable) {
        val -= (this.sensor.tareValue || 0);
      }

      var precision = this.sensor.precision;
      if (typeof(precision) === 'undefined' || precision === null) {
        precision = 1;
      }

      this.$realtimeDisplayValue.text(ISImporter.fixed(val, precision));
      this.$realtimeDisplayUnits.show();
    } catch(e) {
      // console.log("problem enumeratingSensors " + e);
    }
  },

  start: function() {
    this.logAction('started');
    this.started = true;
    if (this.singleValueTimerId) {
      window.clearInterval(this.singleValueTimerId);
      this.singleValueTimerId = null;
    }
    this.currentApplet.on('data', this.appletDataListener);
    this.currentApplet.start();
    this.disable(this.$startButton);
    this.disable(this.$tareButton);
    this.enable(this.$stopButton);
  },

  stop: function() {
    this.started = false;
    if (this.currentApplet) this.currentApplet.stop();

    this.disable(this.$stopButton);
    this.enable(this.$tareButton);
    this.enable(this.$resetButton);

    // this.$realtimeDisplayValue.text('');
    // this.$realtimeDisplayUnits.hide();

    if (this.dataset.getLength() > 0) {
      this.enable(this.$exportButton);
      this.enable(this.$selectButton);
    }

    var _this = this;
    if (this.singleValueTimerId === null) {
      this.singleValueTimerId = window.setInterval(function() {_this.readSingleValue();}, 1000);
    }
  },

  reset: function() {
    if (this.taring) return;
    this.logAction('reset');
    this.currentApplet.removeListener('data', this.appletDataListener);
    this.rawDataset = this.getNewRawDataset();
    this.dataset.setDataPoints();   // perhaps this should be a 'clear' convenience method
    this.dataset.select(null);
    this.dataset.setNextX(0);
    this.enable(this.$startButton);
    this.enable(this.$tareButton);
    this.disable(this.$resetButton);
    this.disable(this.$selectButton);
    if (this.filledMetadata.length === 0) {
      this.disable(this.$exportButton);
    }
    ISImporter.graphController.resetGraph();
  },

  tare: function() {
    var self = this;

    if (this.started) return false;

    if (this.singleValueTimerId) {
      window.clearInterval(this.singleValueTimerId);
      this.singleValueTimerId = null;
    }

    this.taring = true;
    this.$tareButton.text("Zeroing...");
    this.disable(this.$tareButton);
    this.disable(this.$startButton);
    this.disable(this.$resetButton);

    this.currentApplet.removeListener('data', this.appletDataListener);
    this.currentApplet.on('data', this.tareListener);

    // Make sure UI updates before applet start locks it up...
    // TODO: should this happen in SensorApplet (js) class itself?
    window.setTimeout(function() {
      self.currentApplet.start();
    }, 10);
  },

  endTare: function() {
    this.currentApplet.removeListener('data', this.tareListener);
    this.currentApplet.stop();

    this.taring = false;

    // we've got your state management fail right here:
    if (this.dataset.getLength() > 0) {
      this.enable(this.$resetButton);
    } else {
      this.enable(this.$startButton);
    }

    this.$tareButton.text("Zero");
    if (this.sensor.tareable) {
      this.enable(this.$tareButton);
    }

    var _this = this;
    if (this.singleValueTimerId === null) {
      this.singleValueTimerId = window.setInterval(function() {_this.readSingleValue();}, 1000);
    }
  },

  exportData: function() {
    var data,
        label;

    this.logAction('exported');

    if (this.selecting) {
      data = this.dataset.getSelectedDataPoints();
    } else {
      data = this.dataset.getDataPoints();
    }

    Lab.importExport.dgExporter.exportData(["Run"], [this.runNumber], ["Sensor reading"], data);
    this.runNumber++;

    this.selecting = false;

    ISImporter.graphController.stopSelection();
    this.hide(this.$cancelButton);
    if (this.$startButton.hasClass('disabled') && this.$stopButton.hasClass('disabled')) {
      this.enable(this.$resetButton);
      this.enable(this.$selectButton);
    } else {
      this.disable(this.$exportButton);
    }
  },

  logAction: function(action) {
    var logString,
        len,
        label,
        value,
        labels = [],
        values = [],
        i;

    for (i = 1, len = this.getMetadataItemCount(); i <= len; i++) {
      label = this.getMetadataLabel(i);
      if (label && label.length > 0) {
        labels.push(label);
        values.push(this.getMetadataValue(i));
      }
    }

    logString = "User " + action + " " + this.sensor.title + " sensor. ";
    logString += "Per-run Settings and Data: ";
    logString += JSON.stringify({
      action: action,
      type: "sensor",
      measurementType: this.sensor.title,
      fields: labels,
      values: values
    });

    Lab.importExport.dgExporter.logAction(logString);
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

  setSensorSelection: function(id) {
    this.$sensorSelector.val(id);
    this.sensorChanged();
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

  clearMetadata: function(fieldNum) {
    this._clearMetadata(fieldNum, "label");
    this._clearMetadata(fieldNum, "value");
  },

  _clearMetadata: function(fieldNum, type) {
    var md = $('#metadata-' + fieldNum + ' .metadata-' + type);
    md.val('');
    var idx = this.filledMetadata.indexOf(md[0]);
    if (idx != -1) {
      this.filledMetadata.splice(idx,1);
    }
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

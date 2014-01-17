define(function () {
  var ListeningPool   = require('common/listening-pool');
  var DispatchSupport = require('common/dispatch-support');
  var dataSetCount    = 0;

  // TODO: placeholder function:
  function validateComponent (component) {
    // TODO: Validate component definition, use validated copy of the properties.
    // component = validator.validateCompleteness(metadata.graph, component);
    return component;
  }

  /**
   * DataSet: Manage Collections of data for tables, graphs, others.
   *
   * @constructor
   *
   * @param {component} the json definition for our dataset.
   * @param {interactivesController}
   */
  function DataSet(component, interactivesController) {
    this.interactivesController = interactivesController;
    this._model                 = interactivesController.getModel();
    this.namespace              = "dataSet" + (++dataSetCount);
    this.component              = validateComponent(component);
    this.xPropertyName          = this.component.xProperty;
    this.modelProperties        = this.component.properties || [];
    this.streamDataFromModel    = this.component.streamDataFromModel;
    this.clearOnModelLoad       = this.component.clearOnModelLoad;
    // Set initial data only if there is real data there. Otherwise set null for convenience.
    this.initialData            = this.component.initialData && this.component.initialData.length > 0 ?
                                  $.extend(true, [], this.component.initialData) : null;
    this._dataSeriesArry        = [];  // [seriesa,seriesb,seriesc]
    this._listeningPool         = new ListeningPool(this.namespace);
    this._dispatch              = new DispatchSupport();

    this.modelPropertiesIndices = {};
    for (var i = 0; i < this.modelProperties.length; i++) {
      this.modelPropertiesIndices[this.modelProperties[i]] = i;
    }

    for (var key in DataSet.Events) {
      this._dispatch.addEventTypes(DataSet.Events[key]);
    }
    this._dispatch.mixInto(this);
  }

  DataSet.Events = {
    SAMPLE_ADDED:      "sampleAdded",
    NEW_SERIES:        "newSeries",
    DATA_TRUNCATED:    "dataTruncated",
    DATA_RESET:        "dataReset",
    REMOVE_ALL_SERIES: "removeAlldataPointseries",
    SELECTION_CHANGED: "selectionChanged",
    X_LABEL_CHANGED:   "xLabelChanged",
    Y_LABELS_CHANGED:  "yLabelsChanged"
  };

  /******************************************************************
    "Private" methods, not intended for use by outside objects.
  *******************************************************************/

  /**
  * Used for datasets that don't use an xProperty
  */
  DataSet.prototype._dataIndex = 0;

  /**
  * returns the number of (model) data points we have recorded.
  * TODO: This is for model invadlidation / data truncation,
  * so its assumed that the first columns are from model data.
  */
  DataSet.prototype._numberOfPoints = function () {
    if (this._dataSeriesArry.length > 0) {
      return this._dataSeriesArry[0].length;
    }
    return 0;
  };

  /**
    Check that we haven't invalidated future datapoints.
  */
  DataSet.prototype._inNewModelTerritory = function () {
    return (this._model.stepCounter() < this._numberOfPoints());
  };

  /**
    register model listeners
  */
  DataSet.prototype._addListeners = function() {
    var listeningPool  = this._listeningPool;
    var model          = this.interactivesController.getModel();
    var context        = this;

    var positionChanged = function() {
      context._trigger(DataSet.Events.SELECTION_CHANGED, model.stepCounter());
    };

    listeningPool.removeAll(); // remove previous listeners.

    if (this.streamDataFromModel) {
      listeningPool.listen(model, 'tick', function () {
        context.appendDataPoint();
      });

      listeningPool.listen(model, 'play', function() {
        if (context._inNewModelTerritory()) {
          context.removeDataAfterStepPointer();
        }
      });

      listeningPool.listen(model, 'stepBack',    positionChanged);
      listeningPool.listen(model, 'stepForward', positionChanged);
      listeningPool.listen(model, 'seek',        positionChanged);

      listeningPool.listen(model, 'invalidation', function() {
        context.removeDataAfterStepPointer();
      });
    }

    // Register observers of model properties descriptions so labels can be updated by client code.
    this._model.addPropertyDescriptionObserver(this.xPropertyName, function() {
      context._trigger(DataSet.Events.X_LABEL_CHANGED, context.getXLabel());
    });

    this.modelProperties.forEach(function (prop) {
      context._model.addPropertyDescriptionObserver(prop, function() {
        context._trigger(DataSet.Events.Y_LABELS_CHANGED, context.getYLabels());
      });
    });
  };

  /**
    Law of demeter workaround ;)
  */
  DataSet.prototype._getModelProperty = function (propName) {
    return this._model.get(propName);
  };

  /**
    Trigger a custom event for listeners.
    @param {name} event name we are triggering
    @param {data} extra data for the event.
  */
  DataSet.prototype._trigger = function (name, data) {
    this._dispatch[name]({'data': data});
  };

  DataSet.prototype._getPropertyLabel = function(prop) {
    var description = this._model.getPropertyDescription(prop);
    return description.getLabel() + " (" + description.getUnitAbbreviation() + ")";
  };


  /******************************************************************
    "Public" methods, should have associated unit tests.
  *******************************************************************/
  /**
    Returns an array containing two-element arrays each containing the current model
    time and the current value of each model property specified in component.properties.
    NP: Perhaps this should be named "LoadCurrentDatumForModel" -- it inserts each row of
    series data from the model.
  */
  DataSet.prototype.getDataPoint = function () {
    var ret = [], i, len, xval;

    if (this.xPropertyName) {
      xval = this._getModelProperty(this.xPropertyName);
    } else {
      xval = this._dataIndex++;
    }

    for (i = 0, len = this.modelProperties.length; i < len; i++) {
      ret.push([xval, this._getModelProperty(this.modelProperties[i])]);
    }
    return ret;
  };

  /**
    Resets the cached data array to a single, initial data point,
    and pushes that data into graph.
  */
  DataSet.prototype.resetData = function () {
    this._dataIndex = 0;

    if (this.initialData) {
      this._dataSeriesArry = $.extend(true, [], this.initialData);
    } else if (this._model && this.streamDataFromModel) {
      var dataPoint = this.getDataPoint();
      this._dataSeriesArry = [];
      for (i = 0; i < dataPoint.length; i++) {
        this._dataSeriesArry[i] = [dataPoint[i]];
      }
    } else {
      this._dataSeriesArry = [];
      for (var i = 0, len = this.modelProperties.length; i < len; i++) {
        this._dataSeriesArry[i] = [];
      }
    }
    this._trigger(DataSet.Events.DATA_RESET, this._dataSeriesArry);
  };

  /**
    Appends the current data point (as returned by getDataPoint()) to the graph
    and to the cached data array
  */
  DataSet.prototype.appendDataPoint = function () {
    var dataPoint = this.getDataPoint();
    var i;

    for (i = 0; i < dataPoint.length; i++) {
      this._dataSeriesArry[i].push(dataPoint[i]);
    }
    // The grapher considers each individual (property, time) pair to be a "point", and therefore
    // considers the set of properties at any 1 time (what we consider a "point") to be "points".
    this._trigger(DataSet.Events.SAMPLE_ADDED, dataPoint);
  };

  /**
    Replaces the current data point (as returned by getDataPoint()). If no data point have been
    added, one will be added, so this will be equivalent to appendDataPoint().
  */
  DataSet.prototype.replaceDataPoint = function () {
    var dataPoint = this.getDataPoint(),
        arr,
        i;

    for (i = 0; i < dataPoint.length; i++) {
      arr = this._dataSeriesArry[i];
      if (arr.length > 0){
        arr[arr.length - 1] = dataPoint[i];
      } else {
        arr.push(dataPoint[i]);
      }
    }
    // The grapher considers each individual (property, time) pair to be a "point", and therefore
    // considers the set of properties at any 1 time (what we consider a "point") to be "points".
    this._trigger(DataSet.Events.SAMPLE_ADDED, dataPoint);
  };


  /**
    Removes all data from the graph that correspond to steps following the
    current step pointer. This is used when a change is made that
    invalidates the future data.
  */
  DataSet.prototype.removeDataAfterStepPointer = function () {
    var i;
    var newLength = this._model.stepCounter() + 1;
    for (i = 0; i < this.modelProperties.length; i++) {
      // Account for initial data, which corresponds to stepCounter == 0
      this._dataSeriesArry[i].length = newLength;
    }
    this._trigger(DataSet.Events.DATA_TRUNCATED, this._dataSeriesArry);
  };

  /**
    Add non-realtime dataset to the graph.
    @param {series} [[x,y]] series values being added.
  */
  DataSet.prototype.addStaticDataSeries = function (series) {
    this._dataSeriesArry.push(series);
    this._trigger(DataSet.Events.NEW_SERIES, series);
  };

  /**
    Remove all non-realtime datasets
  */
  DataSet.prototype.clearStaticDataSeries =  function () {
    this._dataSeriesArry.length = this.modelProperties.length;
    this._trigger(DataSet.Events.REMOVE_ALL_SERIES);
  };

  /**
    Just like appendDataPoint, but used to insert a row of static data.
    Currently used when the data table loads in serialized data.

    Expects the data to be passed in the current dataPoint format:
    [
      [xval, yval1],    // property 1
      [xval, yval2],    // property 2
      ...
    ]
  */
  DataSet.prototype.appendStaticDataPoint = function(dataPoint) {
    var i;

    for (i = 0; i < dataPoint.length; i++) {
      this._dataSeriesArry[i].push(dataPoint[i]);
    }

    if (!this.xPropertyName) {
      // keep the next dataIndex ahead of any static points added
      this._dataIndex = Math.max(this._dataIndex, dataPoint[0][0]) + 1;
    }

    this._trigger(DataSet.Events.SAMPLE_ADDED, dataPoint);
  };

  /**
    Modifies an existing data point at a given xValue, with a new value
    for a given property
  */
  DataSet.prototype.editDataPoint = function (xValue, property, newValue) {
    var row = this.getIndexForXValue(xValue),
        col = this.modelPropertiesIndices[property];

    if (row > -1 && typeof col !== "undefined") {
      this._dataSeriesArry[col][row][1] = newValue;
    }
  };

  DataSet.prototype.getDataPointForXValue = function (xValue, property) {
    var row = this.getIndexForXValue(xValue),
        col = this.modelPropertiesIndices[property];

    if (row > -1 && typeof col !== "undefined") {
      return this._dataSeriesArry[col][row][1];
    } else {
      return null;
    }
  };

  DataSet.prototype.getIndexForXValue = function (xValue) {
    var arry, i, ii;
    if (this._dataSeriesArry.length) {
      arry = this._dataSeriesArry[0];
      for (i = 0, ii = arry.length; i < ii; i++) {
        if (arry[i] && arry[i][0] === xValue) {
          return i;
        }
      }
    }
    return -1;
  };

  /**
    Return two dimensional array which contains values of listed properties.
   */
  DataSet.prototype.getPropertiesValues = function(properties) {
    var result = [];
    var rowResult;
    var property;
    var col;

    for (var i = 0, ii = this._dataSeriesArry[0].length; i < ii; i++) {
      rowResult = [];
      for (var j = 0, jj = properties.length; j < jj; j++) {
        property = properties[j];
        col = this.modelPropertiesIndices[property];
        rowResult.push(this._dataSeriesArry[col][i][1]);
      }
      result.push(rowResult);
    }

    return result;
  };

  /**
    Return X property label.
   */
  DataSet.prototype.getXLabel = function() {
    return this._getPropertyLabel(this.xPropertyName);
  };

  /**
    Return Y properties labels (array).
   */
  DataSet.prototype.getYLabels = function() {
    var res = [];
    var context = this;
    this.modelProperties.forEach(function (prop) {
      res.push(context._getPropertyLabel(prop));
    });
    return res;
  };

  /**
    Called when the model has loaded. Setup listeners. Clear Data.
    TODO: Right now this only works becuase classes using DataSet are
    directly invoking dataset.modelLoadedCallback() after receiving
    such notification from the interactives controller.  in the future
    we probably want to register the dataset for model load callbacks
    directly.
  */
  DataSet.prototype.modelLoadedCallback = function() {
    this._model = this.interactivesController.getModel();
    this._addListeners();
    if (this.clearOnModelLoad || this.isSetup || this._dataSeriesArry.length === 0) {
      this.resetData();
    }
  };

  DataSet.prototype.serialize = function () {
    return this._dataSeriesArry.slice();
  };

  return DataSet;
});

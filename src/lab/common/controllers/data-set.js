define(function () {
  var metadata        = require('common/controllers/interactive-metadata');
  var validator       = require('common/validator');
  var ListeningPool   = require('common/listening-pool');
  var DispatchSupport = require('common/dispatch-support');
  var dataSetCount    = 0;

  /**
   * DataSet: Manage Collections of data for tables, graphs, others.
   *
   * @constructor
   *
   * @param {object}                 component              The json definition for our dataset.
   * @param {interactivesController} interactivesController InteractivesController instance.
   * @param {boolean}                private                If true, data set will register itself
   *                                                        as 'private' data set in interactives
   *                                                        controller.
   */
  function DataSet(component, interactivesController, private) {
    this.interactivesController = interactivesController;
    this._model                 = interactivesController.getModel();
    this.namespace              = "dataSet" + (++dataSetCount);
    this.component              = validator.validateCompleteness(metadata.dataSet, component);
    this.name                   = this.component.name;
    this.modelProperties        = this.component.properties || [];
    this.streamDataFromModel    = this.component.streamDataFromModel;
    this.clearOnModelReset      = this.component.clearOnModelReset;
    // Set initial data only if there is real data there. Otherwise set null for convenience.
    this.initialData            = this.component.initialData ?
                                  $.extend(true, {}, this.component.initialData) : null;
    this._data                  = {};
    this._listeningPool         = new ListeningPool(this.namespace);
    this._dispatch              = new DispatchSupport();

    // TODO: rm me
    this.modelPropertiesIndices = {};
    for (var i = 0; i < this.modelProperties.length; i++) {
      this.modelPropertiesIndices[this.modelProperties[i]] = i;
    }

    for (var key in DataSet.Events) {
      this._dispatch.addEventTypes(DataSet.Events[key]);
    }
    this._dispatch.mixInto(this);

    // This will initialize _data in a right way (e.g. copy initial data).
    this.resetData();

    // Finally register itself in interactives controller (e.g. it's necessary to ensure that
    // modelLoadedCallback will be called).
    this.interactivesController.addDataSet(this, private);
  }

  DataSet.Events = {
    SAMPLE_ADDED:      "sampleAdded",
    SAMPLE_CHANGED:    "sampleChanged",

    DATA_TRUNCATED:    "dataTruncated",
    DATA_RESET:        "dataReset",

    SELECTION_CHANGED: "selectionChanged",

    LABELS_CHANGED:    "labelsChanged"
  };

  /******************************************************************
    "Private" methods, not intended for use by outside objects.
  *******************************************************************/

  /**
  * returns the number of (model) data points we have recorded.
  * TODO: This is for model invadlidation / data truncation,
  * so its assumed that the first columns are from model data.
  */
  DataSet.prototype._numberOfPoints = function () {
    if (this.modelProperties.length > 0) {
      return this._data[this.modelProperties[0]].length;
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

    listeningPool.listen(model, 'reset', function() {
      if (context.clearOnModelReset) {
        context.resetData();
      }
    });

    this.modelProperties.forEach(function (prop) {
      context._model.addPropertyDescriptionObserver(prop, function() {
        context._trigger(DataSet.Events.LABELS_CHANGED, context.getLabels());
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
    if (!this._model.hasProperty(prop)) return "";
    var description = this._model.getPropertyDescription(prop);
    return description.getLabel() + " (" + description.getUnitAbbreviation() + ")";
  };


  /******************************************************************
    "Public" methods, should have associated unit tests.
  *******************************************************************/

  DataSet.prototype.getDataPoint = function () {
    var context = this;
    var ret = {};

    this.modelProperties.forEach(function (prop) {
      ret[prop] = context._getModelProperty(prop);
    });

    return ret;
  };

  DataSet.prototype.getData = function() {
    return this._data;
  };

  /**
    Resets the cached data array to a single, initial data point,
    and pushes that data into graph.
  */
  DataSet.prototype.resetData = function () {
    var context = this;
    if (this.initialData) {
      this._data = $.extend(true, {}, this.initialData);
    } else {
      this.modelProperties.forEach(function (prop) {
        context._data[prop] = [];
      });
    }
    this._trigger(DataSet.Events.DATA_RESET, this._data);
  };

  DataSet.prototype.appendDataPoint = function () {
    var dataPoint = this.getDataPoint();
    var context = this;

    this.modelProperties.forEach(function (prop) {
      context._data[prop].push(dataPoint[prop]);
    });

    this._trigger(DataSet.Events.SAMPLE_ADDED, dataPoint);
  };


  /**
    Removes all data that correspond to steps following the current step pointer. This is used when
    a change is made that invalidates the future data.
  */
  DataSet.prototype.removeDataAfterStepPointer = function () {
    var newLength = this._model.stepCounter() + 1;
    var context = this;

    this.modelProperties.forEach(function (prop) {
      context._data[prop].length = newLength;
    });

    this._trigger(DataSet.Events.DATA_TRUNCATED, this._data);
  };

  DataSet.prototype.editDataPoint = function (index, property, newValue) {
    this._data[property][index] = newValue;

    var context = this;
    var dataPoint = {};
    this.modelProperties.forEach(function (prop) {
      dataPoint[prop] = context._data[prop][index];
    });

    this._trigger(DataSet.Events.SAMPLE_CHANGED, {index:     index,
                                                  property:  property,
                                                  value:     newValue,
                                                  dataPoint: dataPoint});
  };

  DataSet.prototype.getPropertyValue = function (index, property) {
    return this._data[property][index];
  };

  /**
    Return properties labels (array).
   */
  DataSet.prototype.getLabels = function() {
    var res = {};
    var context = this;
    this.modelProperties.forEach(function (prop) {
      res[prop] = context._getPropertyLabel(prop);
    });
    return res;
  };

  /**
    Called when the model has loaded. Setup listeners. Clear Data.
  */
  DataSet.prototype.modelLoadedCallback = function() {
    this._model = this.interactivesController.getModel();
    this._addListeners();
    if (this.clearOnModelReset) {
      this.resetData();
    }
    if (this.streamDataFromModel) {
      this.appendDataPoint();
    }
  };

  DataSet.prototype.serialize = function () {
    // Start with the initial component definition.
    var result = $.extend(true, {}, this.component);
    // Save current data as initial data.
    result.initialData = this.serializeData();
    return result;
  };

  DataSet.prototype.serializeData = function () {
    return $.extend(true, {}, this._data);
  };

  return DataSet;
});

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
    this.properties             = this.component.properties || [];
    this.streamDataFromModel    = this.component.streamDataFromModel;
    this.clearOnModelReset      = this.component.clearOnModelReset;
    // Set initial data only if there is real data there. Otherwise set null for convenience.
    this.initialData            = this.component.initialData ?
                                  $.extend(true, {}, this.component.initialData) : null;
    this._data                  = {};
    // Keep clear distinction between model properties and other properties (e.g. they can be
    // filled by the user). Data streaming streams only model properties.
    this._modelProperties       = [];
    this._listeningPool         = new ListeningPool(this.namespace);
    this._dispatch              = new DispatchSupport();

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

  DataSet.prototype._setupEmptyData = function () {
    var context = this;
    this.properties.forEach(function (prop) {
      context._data[prop] = [];
    });
  };

  /**
    Check that we haven't invalidated future datapoints.
  */
  DataSet.prototype._inNewModelTerritory = function () {
    return (this._model.stepCounter() < this.maxLength(this._modelProperties));
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
        positionChanged();
      });

      listeningPool.listen(model, 'play', function() {
        if (context._inNewModelTerritory()) {
          context.removeModelDataAfterStepPointer();
        }
      });

      listeningPool.listen(model, 'stepBack',    positionChanged);
      listeningPool.listen(model, 'stepForward', positionChanged);
      listeningPool.listen(model, 'seek',        positionChanged);

      listeningPool.listen(model, 'invalidation', function() {
        context.removeModelDataAfterStepPointer();
      });
    }

    listeningPool.listen(model, 'reset', function() {
      if (context.clearOnModelReset) {
        context.resetData();
      }
    });

    this.properties.forEach(function (prop) {
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

  DataSet.prototype.getData = function() {
    return this._data;
  };

  DataSet.prototype.maxLength = function(props) {
    var maxLength = -Infinity;
    var context = this;
    props.forEach(function (prop) {
      if (maxLength < context._data[prop].length) maxLength = context._data[prop].length;
    });
    return maxLength;
  };

  /**
    Resets data sat to its initial data. When initial data is not provided, clears data
    set (in such case this function behaves exactly like .clearData()).
  */
  DataSet.prototype.resetData = function () {
    this._setupEmptyData();
    if (this.initialData) {
      $.extend(true, this._data, this.initialData);
    }
    this._trigger(DataSet.Events.DATA_RESET, this._data);
  };

  /**
    Clears completely data set.
   */
  DataSet.prototype.clearData = function () {
    this._setupEmptyData();
    this._trigger(DataSet.Events.DATA_RESET, this._data);
  };

  DataSet.prototype.appendDataPoint = function (props, values) {
    if (!props) {
      props = this._modelProperties;
    }
    var dataPoint = {};
    var context = this;
    props.forEach(function (prop) {
      var val = values && values[prop] !== undefined ? values[prop] : context._getModelProperty(prop);
      if (val === undefined) return;
      dataPoint[prop] = val;
      context._data[prop].push(val);
    });

    this._trigger(DataSet.Events.SAMPLE_ADDED, dataPoint);
  };


  /**
    Removes all data that correspond to steps following the current step pointer. This is used when
    a change is made that invalidates the future data.
  */
  DataSet.prototype.removeModelDataAfterStepPointer = function () {
    var newLength = this._model.stepCounter() + 1;
    var context = this;

    this._modelProperties.forEach(function (prop) {
      if (context._data[prop].length > newLength) {
        context._data[prop].length = newLength;
      }
    });

    this._trigger(DataSet.Events.DATA_TRUNCATED, this._data);
  };

  DataSet.prototype.editDataPoint = function (index, property, newValue) {
    this._data[property][index] = newValue;

    var context = this;
    var dataPoint = {};
    this.properties.forEach(function (prop) {
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
    this.properties.forEach(function (prop) {
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
    // Keep list of properties that are defined in model. Only these properties will be streamed.
    this._modelProperties = [];
    var context = this;
    this.properties.forEach(function (prop) {
      if (context._model.hasProperty(prop)) {
        context._modelProperties.push(prop);
      }
    });
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
    if (this.component.serializableProperties === "none") return {};
    var props = this.component.serializableProperties === "all" ?
                this.properties : this.component.serializableProperties;
    var result = {};
    var context = this;
    props.forEach(function (prop) {
      result[prop] = $.extend(true, [], context._data[prop]);
    });
    return result;
  };

  return DataSet;
});

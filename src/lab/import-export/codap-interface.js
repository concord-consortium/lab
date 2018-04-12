/*jshint eqnull: true */
/*global define */

define(function(require) {

  var iframePhone = require('iframe-phone');

  // Width of the interactive when embedded in CODAP.
  var DEF_CODAP_WIDTH = 640; // px

  var PARENT_TABLE_LABELS = {
    singleCase: 'run',
    pluralCase: 'runs',
    singleCaseWithArticle: 'a run',
    setOfCases: 'set',
    setOfCasesWithArticle: 'a set'
  };

  var CHILD_TABLE_LABELS = {
    singleCase: 'measurement',
    pluralCase: 'measurements',
    singleCaseWithArticle: 'a measurement',
    setOfCases: 'time series',
    setOfCasesWithArticle: 'a time series'
  };

  var SINGLE_TABLE_LABELS = {
    singleCase: 'measurement',
    pluralCase: 'measurements',
    singleCaseWithArticle: 'a measurement',
    setOfCases: 'set',
    setOfCasesWithArticle: 'a set'
  };

  function throwIfError(resp) {
    if (resp.success === false) {
      throw new Error('CODAP error: ' + resp.values.error);
    }
  }

  return {
    isCodapPresent: false,

    init: function(frameConfig) {
      if (this.codapPhone) return; // nothing to initialize
      this.frameConfig = frameConfig;
      this.codapPhone = new iframePhone.IframePhoneRpcEndpoint(
        this.notificationHandler.bind(this),
        "data-interactive",
        window.parent
      );
    },

    isEmbeddedInCODAP: function() {
      return this.isCodapPresent;
    },

    canExportData: function() {
      return this.isCodapPresent;
    },

    /**
      Listener for messages sent from CODAP via the iframePhone RPC endpoint.

      Currently, the only message from CODAP that we listen for is the 'codap-present' message
      indicating that we are embedded in an iframePhone-capable CODAP instance. When this message is
      received, `this.codapDidConnect` (a method to be added by client code) is invoked, if present.

      request:   request sent by iframePhone
      callback:  callback passed by iframePhone; must be called to acknowledge receipt of message
    */
    notificationHandler: function(request, callback) {
      var action = request.action;
      var resource = request.resource;
      var response = { success: true };
      // Handler of CODAP-initiated actions.
      if (request && request.message === 'codap-present') {
        // codap-present message has a bit different format.
        this.isCodapPresent = true;
        this.initInteractiveFrame();
        this.codapDidConnect();
      } else if (action === 'get' && resource === 'interactiveState') {
        // Return empty state. In fact the only reason we save any state is to know whether interactive is added
        // to CODAP document for the first time or an existing CODAP document is being opened. At this moment,
        // it is useful to set dimensions correctly, but there might be more use cases.
        response.values = { version: 1 };
      }
      callback(response);
    },

    initInteractiveFrame: function () {
      // First, get interactive frame info.
      this.doCommand({action: 'get', resource: 'interactiveFrame'}, function (resp) {
        throwIfError(resp);
        var existingConfig = resp.values;
        var newIframeConfig = {
          name: this.frameConfig.title,
          title: this.frameConfig.title
        };
        // Update dimensions only if the interactive is added to CODAP for the first time.
        // Then, authors can adjust size of the interactive and it should not be overwritten.
        // Existing `savedState` means that we load an existing CODAP document.
        if (!existingConfig.savedState) {
          newIframeConfig.dimensions = {
            width: DEF_CODAP_WIDTH,
            height: DEF_CODAP_WIDTH / this.frameConfig.aspectRatio
          };
        }
        this.doCommand({
          action: 'update',
          resource: 'interactiveFrame',
          values: newIframeConfig
        }, throwIfError);
      }.bind(this));
    },

    doCommand: function(cmd, callback) {
      this.codapPhone.call(cmd, callback);
    },

    /**
      Exports the summary data about a run as 1 CODAP table and exports timeseries data, if any, as
      a second, linked table.

      perRunAttr: list of attributes for the "left" table which contains a summary of the run
        (this can contain parameters that define the run, as well as )

      perRunData: list containing 1 row of data to be added to the left table

      timeSeriesAttrs (optional): List of attributes for the "right" table which contains a
        set of time points that will be linked to the single row which is added to the "left", run-
        summary table

        If no timeSeriesLabels are provided, the linked "time series" table will not be created.

      timeSeriesData (optional): A list of lists, each of which contains 1 row of data to be added
      to the right table.

      This method automatically adds, as the first column of the run-summary table, a column
      labeled "Number of Time Points", which contains the number of time points in the timeseries
      that is associated with the run.

      Note: Call this method once per run, or row of data to be added to the left table.
      This method "does the right thing" if per-run column labels are added, removed, and/or
      reordered between calls to the method. However, currently, it does not handle the removal
      of time series labels (except from the end of the list) and it does not handle reordering of
      time series labels.
    */
    exportData: function(perRunAttrs, perRunData, timeSeriesAttrs, timeSeriesData) {
      timeSeriesAttrs = timeSeriesAttrs || [];

      perRunAttrs = perRunAttrs.slice();
      // Insert "Run" automatically attribute.
      perRunAttrs.unshift({ name: "Run", type: "nominal" });

      var shouldExportTimeSeries = timeSeriesAttrs.length > 0;
      var parentTableName;
      var childTableName;
      if (shouldExportTimeSeries) {
        parentTableName = PARENT_TABLE_LABELS.pluralCase;
        childTableName = CHILD_TABLE_LABELS.pluralCase;
      } else {
        parentTableName = SINGLE_TABLE_LABELS.pluralCase;
      }

      var exportData = function (runNumber) {
        perRunData = perRunData.slice();
        perRunData.unshift(runNumber);

        // Data export using "item" approach. A single item consists of both per-run and time series attributes.
        this.doCommand({
          action: 'create',
          resource: 'dataContext.item',
          // If time series attributes are not defined, we will insert just a single item with per-run attributes only.
          values: (shouldExportTimeSeries ? timeSeriesData : [ null ]).map(function (data) {
            var item = {};
            perRunAttrs.forEach(function (attr, idx) {
              item[attr.name] = perRunData[idx];
            });
            timeSeriesAttrs.forEach(function (attr, idx) {
              item[attr.name] = data[idx];
            });
            return item;
          })
        }, function (resp) {
          throwIfError(resp);
          // Open case table after successful export.
          this.openTable();
        }.bind(this));
      }.bind(this);

      var createDataContext = function () {
        var collections = [{
          name: parentTableName,
          attrs: perRunAttrs,
          labels: shouldExportTimeSeries ? PARENT_TABLE_LABELS : SINGLE_TABLE_LABELS,
          collapseChildren: true
        }];

        if (shouldExportTimeSeries) {
          collections.push({
            name: childTableName,
            attrs: timeSeriesAttrs,
            parent: parentTableName,
            labels: CHILD_TABLE_LABELS
          });
        }

        this.doCommand({
          action: 'create',
          resource: 'dataContext',
          values: {
            title: 'Runs',
            collections: collections
          }
        }, function (resp) {
          throwIfError(resp);
          // Data context has just been created, so the run number is equal to 1.
          exportData(1);
        });
      }.bind(this);

      var getDataContext = function () {
        this.doCommand({
          action: 'get',
          resource: 'dataContext'
        }, function (resp) {
          if (resp.success) {
            // If data context already exists, it's necessary to get the last run number first.
            this.doCommand({
              action: 'get',
              resource: 'collection[' + parentTableName + '].allCases'
            }, function (resp) {
              throwIfError(resp);
              var runNumber = resp.values.cases[resp.values.cases.length - 1].case.values["Run"];
              exportData(runNumber + 1);
            }.bind(this));
          } else {
            createDataContext();
          }
        }.bind(this));
      }.bind(this);

      // Start export by obtaining (or creating) data context. Other callbacks will be called later.
      getDataContext();
    },

    /**
      Call this to cause DataGames to open the "case table" containing the all the data exported by
      exportData() so far.
    */
    openTable: function() {
      this.doCommand({
        action: 'create',
        resource: 'component',
        values: {
          'type': 'caseTable',
          'name': 'Runs'
        }
      }, throwIfError);
    },

    /**
      Call any time to log an event to DataGames
    */
    logAction: function(logString) {
      this.doCommand({
        action: 'notify',
        resource: 'logMessage',
        values: {
          formatStr: logString
        }
      });
    }
  };
});

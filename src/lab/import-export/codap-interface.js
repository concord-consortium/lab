/*jshint eqnull: true */
/*global define */

define(function(require) {

  var iframePhone = require('iframe-phone');

  // Width of the interactive when embedded in CODAP.
  var DEF_CODAP_WIDTH = 640; // px

  // Limit number of data points sent to CODAP in one request to avoid long freezes.
  var CODAP_VALUES_LIMIT = 100;

  function throwIfError(resp) {
    if (resp.success === false) {
      throw new Error('CODAP error: ' + resp.values.error);
    }
  }

  // Divides array into chunks.
  function chunks(arr, chunkSize) {
    var result = [];
    for (var i = 0, len = arr.length; i < len; i += chunkSize) {
      result.push(arr.slice(i, i + chunkSize));
    }
    return result;
  }

  function getLabels(i18n) {
    return {
      dataContextName: i18n.t('codap.dataContextName'),
      parentTable: {
        singleCase: i18n.t('codap.parentTable.singleCase'),
        pluralCase: i18n.t('codap.parentTable.pluralCase'),
        singleCaseWithArticle: i18n.t('codap.parentTable.singleCaseWithArticle'),
        setOfCases: i18n.t('codap.parentTable.setOfCases'),
        setOfCasesWithArticle: i18n.t('codap.parentTable.setOfCasesWithArticle')
      },
      childTable: {
        singleCase: i18n.t('codap.childTable.singleCase'),
        pluralCase: i18n.t('codap.childTable.pluralCase'),
        singleCaseWithArticle: i18n.t('codap.childTable.singleCaseWithArticle'),
        setOfCases: i18n.t('codap.childTable.setOfCases'),
        setOfCasesWithArticle: i18n.t('codap.childTable.setOfCasesWithArticle')
      },
      singleTable: {
        singleCase: i18n.t('codap.singleTable.singleCase'),
        pluralCase: i18n.t('codap.singleTable.pluralCase'),
        singleCaseWithArticle: i18n.t('codap.singleTable.singleCaseWithArticle'),
        setOfCases: i18n.t('codap.singleTable.setOfCases'),
        setOfCasesWithArticle: i18n.t('codap.singleTable.setOfCasesWithArticle')
      }
    };
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
          title: this.frameConfig.title,
          preventDataContextReorg: false
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
    exportData: function(perRunAttrs, perRunData, timeSeriesAttrs, timeSeriesData, i18n) {
      timeSeriesAttrs = timeSeriesAttrs || [];

      perRunAttrs = perRunAttrs.slice();
      // Insert "Run" automatically attribute.
      perRunAttrs.unshift({ name: "Run", type: "nominal" });

      var labels = getLabels(i18n);

      var shouldExportTimeSeries = timeSeriesAttrs.length > 0;
      var parentTableName;
      var childTableName;
      if (shouldExportTimeSeries) {
        parentTableName = labels.parentTable.pluralCase;
        childTableName = labels.childTable.pluralCase;
      } else {
        parentTableName = labels.singleTable.pluralCase;
      }

      var exportData = function (runNumber) {
        perRunData = perRunData.slice();
        perRunData.unshift(runNumber);

        // If time series attributes are not defined, we will insert just a single item with per-run attributes only.
        // An array with single item (any value) ensures that it will happen. One element is necessary to make sure that
        // per-run attributes are send to CODAP. But it will be never dereferenced as timeSeriesAttrs is an empty array.
        var values = (shouldExportTimeSeries ? timeSeriesData : [ 'this_value_is_ignored' ]).map(function (data) {
          var item = {};
          perRunAttrs.forEach(function (attr, idx) {
            item[attr.name] = perRunData[idx];
          });
          timeSeriesAttrs.forEach(function (attr, idx) {
            item[attr.name] = data[idx];
          });
          return item;
        });

        // Send values in smaller chunks to avoid performance problems.
        var valuesChunks = chunks(values, CODAP_VALUES_LIMIT);
        valuesChunks.forEach(function(values, idx) {
          // Data export using "item" approach. A single item consists of both per-run and time series attributes.
          this.doCommand({
            action: 'create',
            resource: 'dataContext.item',
            values: values
          }, function (resp) {
            throwIfError(resp);
            if (idx === 0) {
              // Wait for the first call to be completed and open the table (since it already exists).
              this.openTable();
            }
          }.bind(this));
        }.bind(this));
      }.bind(this);

      var createDataContext = function () {
        var collections = [{
          name: parentTableName,
          attrs: perRunAttrs,
          labels: shouldExportTimeSeries ? labels.parentTable : labels.singleTable,
          collapseChildren: true
        }];

        if (shouldExportTimeSeries) {
          collections.push({
            name: childTableName,
            attrs: timeSeriesAttrs,
            parent: parentTableName,
            labels: labels.childTable
          });
        }

        this.doCommand({
          action: 'create',
          resource: 'dataContext',
          values: {
            title: labels.dataContextName,
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
              var casesCount = resp.values.cases.length;
              var prevRunNumber = casesCount > 0 ? resp.values.cases[casesCount - 1].case.values["Run"] : 0;
              exportData(prevRunNumber + 1);
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
          'type': 'caseTable'
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

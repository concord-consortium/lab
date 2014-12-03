/*jshint eqnull: true */
/*global define */

define(function(require) {

  var config  = require('lab.config');
  var iframePhone = require('iframe-phone');

  /*
    Private method. Listener for messages sent from CODAP via the iframePhone RPC endpoint.

    Currently, the only message from CODAP that we listen for is the 'codap-present' message
    indicating that we are embedded in an iframePhone-capable CODAP instance. When this message is
    received, `this.codapDidConnect` (a method to be added by client code) is invoked, if present.

    message:   message sent by iframePhone
    callback:  callback passed by iframePhone; must be called to acknowledge receipt of message
  */
  function codapCallbackHandler(message, callback) {
    var wasConnected;
    if (message && message.message === 'codap-present') {
      wasConnected = this.isCodapPresent;

      this.isCodapPresent = true;

      // Some simple (but very limited) zero-configuration event listening:
      if ( ! wasConnected  && typeof this.codapDidConnect === 'function' ) {
        this.codapDidConnect();
      }
    }
    callback();
  }

  var dgExporter = {

    gameName: 'Next Gen MW',
    parentCollectionName: 'Summary of Run',
    childCollectionName: 'Time Series of Run',

    perRunColumnLabelCount: 0,
    perRunColumnLabelPositions: {},

    isCodapPresent: false,

    init: function() {
      this.codapPhone = new iframePhone.IframePhoneRpcEndpoint(
        codapCallbackHandler.bind(this),
        "codap-game",
        window.parent
      );
    },

    canCallDGDirect: function() {
      if (config.codap || config.dataGamesProxyPrefix) {
        try {
          if (window.parent.DG.doCommand) {
            return true;
          }
        } catch (e) {
          // could be a security exception if window.parent is not same-origin, or a ReferenceError
          // if the game controller isn't defined; in either case, fall through.
        }
      }
      return false;
    },

    canExportData: function() {
      return this.isCodapPresent || this.canCallDGDirect();
    },

    doCommand: function(name, args, callback) {
      var cmd = {
        action: name,
        args: args
      };

      // Ensure the "direct" path follows an async execution pattern, because the iframePhone path
      // is unavoidably async. APIs that call back synchronously sometimes, async other times
      // release Zalgo: http://blog.izs.me/post/59142742143/designing-apis-for-asynchrony

      if (this.canCallDGDirect()) {
        setTimeout(function() {
          var result = window.parent.DG.doCommand(cmd);
          if (callback) {
            setTimeout(function() {
                callback(result);
            }, 1);
          }
        }, 1);
      } else if (this.isCodapPresent) {
        this.codapPhone.call(cmd, callback);
      }
    },

    /**
      Exports the summary data about a run and timeseries data from the run to DataGames as 2
      linked tables.

      perRunLabels: list of column labels for the "left" table which contains a summary of the run
        (this can contain parameters that define the run, as well as )

      perRunData: list containing 1 row of data to be added to the left table

      timeSeriesLabels: list of column labels for the "right" table which contains a set of time
        points that will be linked to the single row which is added to the "left", run-summary table

      timeSeriesData: a list of lists, each of which contains 1 row of data to be added to the
        right table.

      This method automatically adds, as the first column of the run-summary table, a column
      labeled "Number of Time Points", which contains the number of time points in the timeseries
      that is associated with the run.

      Note: Call this method once per run, or row of data to be added to the left table.
      This method "does the right thing" if per-run column labels are added, removed, and/or
      reordered between calls to the method. However, currently, it does not handle the removal
      of time series labels (except from the end of the list) and it does not handle reordering of
      time series labels.
    */
    exportData: function(perRunLabels, perRunData, timeSeriesLabels, timeSeriesData) {
      var label,
          value,
          position,
          perRunColumnLabels = [],
          perRunColumnValues = [],
          timeSeriesColumnLabels = [],
          i;

      // Extract metadata in the forms needed for export, ie values need to be an array of values,
      // labels need to be an array of {name: label} objects.
      // Furthermore note that during a DG session, the value for a given label needs to be in the
      // same position in the array every time the DG collection is 'created' (or reopened as the
      // case may be.)

      for (i = 0; i < perRunData.length; i++) {
        label = perRunLabels[i];
        value = perRunData[i];

        if ( this.perRunColumnLabelPositions[label] == null ) {
          this.perRunColumnLabelPositions[label] = this.perRunColumnLabelCount++;
        }
        position = this.perRunColumnLabelPositions[label];

        if (i === 0) {
          perRunColumnLabels[position] = { name: label, formula: "caseIndex" };
          perRunColumnValues[position] = null;
        } else {
          perRunColumnLabels[position] = { name: label };
          perRunColumnValues[position] = value;
        }
      }

      // Extract list of data column labels into form needed for export (needs to be an array of
      // name: label objects)
      for (i = 0; i < timeSeriesLabels.length; i++) {
        timeSeriesColumnLabels.push({ name: timeSeriesLabels[i] });
      }

      // Export.

      // Step 1. Tell DG we're a "game".
      this.doCommand('initGame', {
        name: this.gameName
      });

      // Step 2. Create a parent table. Each row will have the value of each of the perRunData,
      // plus the number of time series points that are being exported for combination of
      // parameter values.
      // (It seems to be ok to call this multiple times with the same collection name, e.g., for
      // multiple exports during a single DG session.)
      this.doCommand('createCollection', {
        name: this.parentCollectionName,
        attrs: perRunColumnLabels,
        childAttrName: 'contents',
        collapseChildren: true
      });

      // Step 3. Create a table to be the child of the parent table; each row of the child
      // has a single time series reading (time, property1, property2...)
      // (Again, it seems to be ok to call this for the same table multiple times per DG session)
      this.doCommand('createCollection', {
        name: this.childCollectionName,
        attrs: timeSeriesColumnLabels
      });

      // Step 4. Open a row in the parent table. This will contain the individual time series
      // readings as children.
      this.doCommand('openCase', {
        collection: this.parentCollectionName,
        values: perRunColumnValues
      }, function(parentCase) {

        // Step 5. Create rows in the child table for each data point. Using 'createCases' we can
        // do this inline, so we don't need to call openCase, closeCase for each row.
        this.doCommand('createCases', {
          collection: this.childCollectionName,
          values: timeSeriesData,
          parent: parentCase.caseID
        });

        // Step 6. Close the case.
        this.doCommand('closeCase', {
          collection: this.parentCollectionName,
          caseID: parentCase.caseID
        });
      }.bind(this));
    },

    /**
      Call this to cause DataGames to open the 'case table" containing the all the data exported by
      exportData() so far.
    */
    openTable: function() {
      this.doCommand('createComponent', {
        type: 'DG.TableView',
        log: false
      });
    },

    /**
      Call any time to log an event to DataGames
    */
    logAction: function(logString) {
      this.doCommand('logAction', {
        formatStr: logString
      });
    }
  };

  return dgExporter;
});

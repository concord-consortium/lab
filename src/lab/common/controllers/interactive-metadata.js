/*global define: false */

define(function() {

  return {
    /**
      Interactive top-level properties:
    */
    interactive: {
      title: {
        required: true
      },

      publicationStatus: {
        defaultValue: "public"
      },

      labEnvironment: {
        // An indicator of which Lab environment the interactive is compatible with.
        // Possible values:
        // - "production"
        // - "staging"
        // - "development"
        defaultValue: "production"
      },

      // Optional path to metadata containing information about available translations.
      // If present and valid, a new pulldown will be added to interactive UI that lets user
      // change language and locales.
      i18nMetadata: {
        defaultValue: ""
      },

      lang: {
        defaultValue: "en_US"
      },

      subtitle: {
        defaultValue: ""
      },

      about: {
        defaultValue: ""
      },

      // optional: used by activity finder (pt: http://bit.ly/IGmyks)
      category: {
        defaultValue: ""
      },

      // optional: used by activity finder (pt: http://bit.ly/IGmyks)
      subCategory: {
        defaultValue: ""
      },

      // optional: used by activity finder (pt: http://bit.ly/IGpo96)
      screenshot: {
        defaultValue: ""
      },

      // optional: holds path of html or cml page this Interactive was imported from
      importedFrom: {},

      aspectRatio: {
        defaultValue: 1.3
      },

      fontScale: {
        defaultValue: 1
      },

      randomSeed: {
        required: false
      },

      helpOnLoad: {
        // If true, the help mode will be automatically shown on interactive load.
        defaultValue: false
      },

      models: {
        // List of model definitions. Its definition is below ('model').
        required: true
      },

      parameters: {
        // List of custom parameters.
        defaultValue: []
      },

      dataSets: {
        // List of data sets.
        defaultValue: []
      },

      propertiesToRetain: {
        // List of properties that should be retained during model reload or reset.
        defaultValue: []
      },

      outputs: {
        // List of outputs.
        defaultValue: []
      },

      filteredOutputs: {
        // List of filtered outputs.
        defaultValue: []
      },

      experiment: {
        required: false
      },

      exports: {
        required: false
      },

      hideExportDataControl: {
        required: false,
        defaultValue: false
      },

      components: {
        // List of the interactive components. Their definitions are below ('button', 'checkbox' etc.).
        defaultValue: []
      },

      layout: {
        // Layout definition.
        defaultValue: {}
      },

      template: {
        // Layout template definition.
        defaultValue: "simple"
      },

      helpTips: {
        // List of help tips. See 'helpTip' metadata.
        defaultValue: []
      }
    },

    model: {
      // Definition of a model.
      // Can include either a URL to model definition or model options hash..
      type: {
        required: true
      },
      id: {
        required: true
      },
      url: {
        conflictsWith: ["model"]
      },
      // optional: holds path of html or cml page this Interactive was imported from
      importedFrom: {},
      model: {
        conflictsWith: ["url"]
      },
      // Optional "onLoad" script.
      onLoad: {},
      // Optional hash of options overwriting model options.
      viewOptions: {},
      modelOptions: {},
      // Parameters, outputs and filtered outputs can be also specified per model.
      parameters: {},
      outputs: {},
      filteredOutputs: {}
    },

    parameter: {
      name: {
        required: true
      },
      initialValue: {
        required: true
      },
      // Optional "onChange" script.
      onChange: {},
      // Optional description.
      label: {},
      unitType: {},
      unitName: {},
      unitPluralName: {},
      unitAbbreviation: {}
    },

    output: {
      name: {
        required: true
      },
      value: {
        required: true
      },
      // Optional description.
      label: {},
      unitType: {},
      unitName: {},
      unitPluralName: {},
      unitAbbreviation: {}
    },

    dataSet: {
      name: {
        required: true
      },
      properties: {
        defaultValue: []
      },
      serializableProperties: {
        // You can provide a list of properties that should be serialized, e.g.:
        // ["prop1", "prop2", "time"]
        // or use special values: "all" or "none".
        defaultValue: "all"
      },
      streamDataFromModel: {
        defaultValue: true
      },
      clearOnModelReset: {
        // Note that "model reset" in general includes actions like:
        // - reset
        // - reload
        // - new model load
        defaultValue: true
      },
      initialData: {}
    },

    filteredOutput: {
      name: {
        required: true
      },
      property: {
        required: true
      },
      type: {
        // For now, only "RunningAverage" is supported.
        defaultValue: "RunningAverage"
      },
      period: {
        // Smoothing time period in fs.
        defaultValue: 2500
      },
      // Optional description.
      label: {},
      unitType: {},
      unitName: {},
      unitPluralName: {},
      unitAbbreviation: {}
    },

    exports: {
      selectionComponents: {
        required: false,
        defaultValue: []
      },
      perRun: {
        required: false,
        defaultValue: []
      },
      perTick: {
        required: true
      }
    },

    /**
      Interactive experiment template:
    */
    experiment: {
      timeSeries: {
        required: true
      },
      parameters: {
        required: true,
        defaultValue: []
      },
      destinations: {
        required: true,
        defaultValue: []
      },
      stateButtons: {
        required: true,
        startRun: {
          required: true,
          defaultValue: "start-run"
        },
        stopRun: {
          required: true,
          defaultValue: "stop-run"
        },
        saveRun: {
          required: true,
          defaultValue: "save-run"
        },
        nextRun: {
          required: true,
          defaultValue: "next-run"
        },
        clearAll: {
          required: true,
          defaultValue: "clear-all"
        }
      },
      onReset: {
      },
      savedRuns: {
        defaultValue: []
      }
    },

    experimentTimeSeries: {
      time: {
        defaultValue: "displayTime"
      },
      properties: {
        required: true,
        defaultValue: []
      }
    },

    experimentParameter: {
      inputs: {
        required: true,
        defaultValue: []
      },
      outputs: {
        required: true,
        defaultValue: []
      }
    },

    experimentDestination: {
      type: {
        required: true
      },
      componentIds: {
        required: true,
        defaultValue: []
      },
      properties: {
        required: true,
        defaultValue: []
      }
    },

    experimentSavedRun: {
      timeStamp: {
        required: true
      },
      timeSeries: {
        required: true,
        defaultValue: []
      },
      parameters: {
        required: true,
        defaultValue: []
      }
    },

    /**
      Interactive components:
    */
    playback: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      stepping: {
        defaultValue: true
      }
    },

    text: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      onClick: {
        // Script executed on user click, optional.
      },
      text: {
        // Text content.
        defaultValue: ""
      },
      width: {
        defaultValue: "auto"
      },
      height: {
        defaultValue: "auto"
      },
      tooltip: {
        defaultValue: ""
      }
    },

    image: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      src: {
        // Absolute path should start with http(s)://
        // Relative path is relative to model URL.
        defaultValue: ""
      },
      width: {
        defaultValue: "auto"
      },
      height: {
        defaultValue: "auto"
      },
      onClick: {
        // Script executed on user click, optional.
      },
      tooltip: {
        defaultValue: ""
      }
    },

    div: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      content: {
        defaultValue: ""
      },
      width: {
        defaultValue: "auto"
      },
      height: {
        defaultValue: "auto"
      },
      onClick: {
        // Script executed on user click, optional.
      },
      classes: {
        defaultValue: []
      },
      tooltip: {
        defaultValue: ""
      }
    },

    button: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      action: {
        required: true
      },
      text: {
        defaultValue: ""
      },
      width: {
        defaultValue: ""
      },
      height: {
        defaultValue: ""
      },
      disabled: {
        defaultValue: false
      },
      tooltip: {
        defaultValue: ""
      }
    },

    checkbox: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      text: {
        defaultValue: ""
      },
      textOn: {
        defaultValue: "right"
      },
      width: {
        defaultValue: "auto"
      },
      height: {
        defaultValue: "auto"
      },
      property: {
        conflictsWith: ["initialValue", "action"]
      },
      retainProperty: {
        // If property binding is used (so 'property' is defined), this flag decides whether
        // property should be retained during model reload / reset or not.
        defaultValue: true
      },
      action: {
        // Script executed when checkbox is changed, optional.
        conflictsWith: ["property"]
      },
      initialValue: {
        // Note that 'initialValue' makes sense only for checkboxes without property binding.
        // Do not use checkbox as setter of a given property.
        conflictsWith: ["property"]
      },
      disabled: {
        defaultValue: false
      },
      tooltip: {
        defaultValue: ""
      }
    },

    slider: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      min: {
        required: true
      },
      max: {
        required: true
      },
      steps: {
        required: true
      },
      title: {
        defaultValue: ""
      },
      labels: {
        // Label is specified by the following object:
        // {
        //   "value": [value, e.g. 100],
        //   "label": [label, e.g. "High"]
        // }
        defaultValue: []
      },
      width: {
        defaultValue: "auto"
      },
      height: {
        defaultValue: "auto"
      },
      displayValue: {},
      // Use "property" OR "action" + "initialValue".
      property: {
        // If you use property binding, do not mix it with action scripts and initial values.
        conflictsWith: ["initialValue", "action"]
      },
      retainProperty: {
        // If property binding is used (so 'property' is defined), this flag decides whether
        // property should be retained during model reload / reset or not.
        defaultValue: true
      },
      action: {
        conflictsWith: ["property"]
      },
      initialValue: {
        // Do not use slider as a property setter.
        // There are better ways to do it, e.g.:
        // "onLoad" scripts (and set({ }) call inside), "modelOptions", etc.
        conflictsWith: ["property"]
      },
      disabled: {
        defaultValue: false
      },
      tooltip: {
        defaultValue: ""
      }
    },

    pulldown: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      label: {
        defaultValue: ""
      },
      labelOn: {
        // Other option is "left".
        defaultValue: "top"
      },
      options: {
        defaultValue: []
      },
      property: {
        // Pulldown can be also connected to a model property.
        // In such case, options should define "value", not "action".
      },
      retainProperty: {
        // If property binding is used (so 'property' is defined), this flag decides whether
        // property should be retained during model reload / reset or not.
        defaultValue: true
      },
      disabled: {
        defaultValue: false
      },
      tooltip: {
        defaultValue: ""
      }
    },

    pulldownOption: {
      text: {
        defaultValue: ""
      },
      action: {
        // Use it when pulldown is not bound to any model property.
        conflictsWith: ["value"]
      },
      value: {
        // Use it when pulldown is bound to some model property.
        conflictsWith: ["action"]
      },
      selected: {
        // Use it when pulldown is not bound to any model property.
        // When "property" is used for pulldown, it will determine
        // selection.
        conflictsWith: ["value"]
      },
      disabled: {}
    },

    radio: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      orientation: {
        defaultValue: "vertical"
      },
      label: {
        defaultValue: ""
      },
      labelOn: {
        // Other option is "left".
        defaultValue: "top"
      },
      options: {
        defaultValue: []
      },
      property: {
        // Radio can be also connected to a model property.
        // In such case, options should define "value", not "action".
      },
      retainProperty: {
        // If property binding is used (so 'property' is defined), this flag decides whether
        // property should be retained during model reload / reset or not.
        defaultValue: true
      },
      disabled: {
        defaultValue: false
      },
      tooltip: {
        defaultValue: ""
      }
    },

    radioOption: {
      text: {
        defaultValue: ""
      },
      action: {
        // Use it when radio is not bound to any model property.
        conflictsWith: ["value"]
      },
      value: {
        // Use it when radio is bound to some model property.
        conflictsWith: ["action"]
      },
      selected: {
        // Use it when radio is not bound to any model property.
        // When "property" is used for radio, it will determine
        // selection.
        conflictsWith: ["value"]
      },
      disabled: {}
    },

    numericOutput: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      property: {
        required: true
      },
      label: {
        defaultValue: ""
      },
      units: {
        defaultValue: ""
      },
      orientation: {
        defaultValue: "horizontal"
      },
      width: {
        defaultValue: "auto"
      },
      height: {
        defaultValue: "auto"
      },
      displayValue: {},
      tooltip: {
        defaultValue: ""
      }
    },

    thermometer: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      min: {
        required: true
      },
      max: {
        required: true
      },
      width: {
        // It controls width of the thermometer graphics!
        // It won't affect label, e.g. making it truncated
        // as width is only "2.5em".
        defaultValue: "2.5em"
      },
      height: {
        // Height of the whole thermometer with reading.
        defaultValue: "100%"
      },
      labelIsReading: {
        defaultValue: false
      },
      reading: {
        defaultValue: {
          units: "K",
          offset: 0,
          scale: 1,
          digits: 0
        }
      },
      labels: {
        // Label is specified by the following object:
        // {
        //   "value": [value, e.g. 100],
        //   "label": [label, e.g. "High"]
        // }
        defaultValue: []
      }
    },

    table: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      title: {
        defaultValue: null
      },
      dataSet: {
        // Optional. When external data set is referenced, then properties listed in "conflictsWith"
        // array should be defined inside data set definition, not in table definition.
        conflictsWith: ["tableData", "clearOnModelReset", "streamDataFromModel"]
      },
      tableData: {
        conflictsWith: ["dataSet"]
      },
      clearOnModelReset: {
        conflictsWith: ["dataSet"]
      },
      streamDataFromModel: {
        conflictsWith: ["dataSet"]
      },
      addNewRows: {
        defaultValue: true
      },
      visibleRows: {
        defaultValue: 4
      },
      showBlankRow: {
        // If true, a new blank row will be always visible.
        defaultValue: false
      },
      indexColumn: {
        defaultValue: true
      },
      propertyColumns: {
        defaultValue: []
      },
      headerData: {
        defaultValue: []
      },
      width: {
        defaultValue: "auto"
      },
      height: {
        defaultValue: "100%"
      },
      tooltip: {
        defaultValue: ""
      }
    },

    graph: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      dataSet: {
        // Optional. When external data set is referenced, then properties listed in "conflictsWith"
        // array should be defined inside data set definition, not in table definition.
        conflictsWith: ["dataPoints", "clearOnModelReset", "streamDataFromModel"]
      },
      dataPoints: {
        conflictsWith: ["dataSet"]
      },
      clearOnModelReset: {
        conflictsWith: ["dataSet"]
      },
      streamDataFromModel: {
        conflictsWith: ["dataSet"]
      },
      resetAxesOnReset: {
        defaultValue: true
      },
      enableAutoScaleButton: {
        defaultValue: true
      },
      enableAxisScaling: {
        defaultValue: true
      },
      autoScaleX: {
        defaultValue: true
      },
      autoScaleY: {
        defaultValue: true
      },
      enableSelectionButton: {
        defaultValue: false
      },
      clearSelectionOnLeavingSelectMode: {
        defaultValue: false
      },
      markAllDataPoints: {
        defaultValue: false
      },
      showRulersOnSelection: {
        defaultValue: false
      },
      fontScaleRelativeToParent: {
        defaultValue: true
      },
      properties: {
        defaultValue: []
      },
      xProperty: {
        defaultValue: "displayTime"
      },
      title: {
        defaultValue: "Graph"
      },
      lineWidth: {
        defaultValue: 2.0
      },
      width: {
        defaultValue: "100%"
      },
      height: {
        defaultValue: "100%"
      },
      xlabel: {
        defaultValue: "auto"
      },
      xmin: {
        defaultValue: 0
      },
      xmax: {
        defaultValue: 20
      },
      ylabel: {
        defaultValue: "auto"
      },
      ymin: {
        defaultValue: 0
      },
      ymax: {
        defaultValue: 10
      },
      xTickCount: {
        defaultValue: 10
      },
      yTickCount: {
        defaultValue: 10
      },
      xscaleExponent: {
        defaultValue: 0.5
      },
      yscaleExponent: {
        defaultValue: 0.5
      },
      xFormatter: {
        defaultValue: ".2r"
      },
      yFormatter: {
        defaultValue: ".2r"
      },
      lines: {
        defaultValue: true
      },
      bars: {
        defaultValue: false
      },
      tooltip: {
        defaultValue: ""
      }
    },

    barGraph: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      property: {
        required: true
      },
      secondProperty: {
        // Additional value displayed
        // using small triangle. E.g.
        // can be used to present
        // averaged value.
        conflictsWith: ["averagePeriod"]
      },
      min: {
        // Min value displayed.
        defaultValue: 0
      },
      max: {
        // Max value displayed.
        defaultValue: 10
      },
      title: {
        // Graph title.
        defaultValue: ""
      },
      titleOn: {
        // Title position, accepted values are:
        // "right", "top", "bottom"
        defaultValue: "right"
      },
      labels: {
        // Number of labels displayed on the left side of the graph.
        // This value is *only* a suggestion. The most clean
        // and human-readable values are used.
        // You can also specify value-label pairs, e.g.:
        // [
        //   {
        //     "value": 0,
        //     "label": "low"
        //   },
        //   {
        //     "value": 10,
        //     "label": "high"
        //   }
        // ]
        // Use 0 or null to disable labels completely.
        defaultValue: 5
      },
      units: {
        // Units displayed next to labels. Set it to 'true' to use units
        // automatically retrieved from property description. Set it to any
        // string to use custom unit symbol.
        defaultValue: false
      },
      gridLines: {
        // Number of grid lines displayed on the bar.
        // This value is *only* a suggestion, it's similar to 'ticks'.
        defaultValue: 10
      },
      labelFormat: {
        // Format of labels.
        // See the specification of this format:
        // https://github.com/mbostock/d3/wiki/Formatting#wiki-d3_format
        // or:
        // http://docs.python.org/release/3.1.3/library/string.html#formatspec
        defaultValue: "0.1f"
      },
      averagePeriod: {
        // Setting this property to some numeric value
        // enables displaying of the averaged property.
        // It's a shortcut which can be used instead
        // of a custom filtered output bound
        // to the "secondProperty".
        conflictsWith: ["secondProperty"]
      },
      barWidth: {
        // Widht of the bar graph, WITHOUT
        // labels, title and padding.
        defaultValue: "2em"
      },
      height: {
        // Height of the bar graph container,
        // including small padding.
        defaultValue: "100%"
      },
      barColor: {
        // Color of the main bar.
        defaultValue:  "#e23c34"
      },
      fillColor: {
        // Color of the area behind the bar.
        defaultValue: "#fff"
      },
      tooltip: {
        defaultValue: ""
      }
    },

    helpTip: {
      component: {
        defaultValue: ""
      },
      text: {
        defaultValue: ""
      }
    }
  };
});

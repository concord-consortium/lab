/*global Lab $ CodeMirror */

$(function () {

  var INDENT = 2,

      model = new Lab.grapher.BarGraphModel({value: 5}),
      view  = new Lab.grapher.BarGraphView({model: model}),

      // Model examples.
      options = {
        "default": {},
        "scientific": {
          "value": 5e+5,
          "minValue": 0,
          "maxValue": 7e+5,
          "width": 200,
          "height": 500,
          "barColor": "orange",
          "fillColor": "gold",
          "title": "Scientific notation",
          "ticks": 7,
          "tickSubdivide": 5,
          "labelFormat": "0.2e"
        },
        "small-size": {
          "value": 8,
          "width": 75,
          "height": 150,
          "title": "Small size"
        },
        "value-label pairs": {
          "value": 5,
          "ticks": [
            {
              "value": 0,
              "label": "low"
            },
            {
              "value": 10,
              "label": "high"
            }
          ]
        }
      },

      $modelTextarea = $("#model-textarea").text(JSON.stringify(model.toJSON(), null, INDENT)),
      editor = CodeMirror.fromTextArea($modelTextarea.get(0), {
        mode: 'javascript',
        indentUnit: INDENT,
        lineNumbers: true,
        lineWrapping: false
      });

  // Initial render.
  view.$el.appendTo("#bar-graph-view");
  view.render();

  // Update model button.
  $("#update-model").on('click', function () {
    var newOptions = JSON.parse(editor.getValue());

    model.set(model.defaults);
    model.set(newOptions);
  });

  // Select ready example.
  $("#preload").change(function () {
    var optionsName =  $("#preload").val(),
        newOptions = options[optionsName];

    model.set(model.defaults);
    model.set(newOptions);
    // Update editor.
    editor.setValue(JSON.stringify(model.toJSON(), null, INDENT));
  });
});

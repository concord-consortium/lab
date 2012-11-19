/*global Lab $ CodeMirror */

function setupComponent(component, $modelContainer) {
  var $container = $('#' + component.id),
      $el        = $('<div></div>');

  // ID not found in the layout definition.
  if ($container.length === 0)
    return;

  if ($container.data('width')) {
    if ($container.data('width') === "model-width")
      $container.width($modelContainer.width());
    else
      $container.width($container.data('width'));
  }
  if (component.canonicalWidth) {
    $container.width(component.canonicalWidth);
  }

  if ($container.data('height')) {
    if ($container.data('height') === "model-height")
      $container.height($modelContainer.height());
    else
      $container.height($container.data('height'));
  } else if (component.aspectRatio) {
    $container.height($container.width() * component.aspectRatio);
  } else if (component.canonicalHeight) {
    $container.height(component.canonicalHeight);
  }

  $el.height("100%");
  $el.width("100%");
  $el.css('background', component.color);

  $el.appendTo($container);

  return $container;
}

function setupLayout(layoutTpl, components) {
  var i, modelComponent, $modelContainer;

  // Find model.
  for (i = 0; i < components.length; i++) {
    if (components[i].model) {
      modelComponent = components[i];
    }
  }

  // Setup it, save reference.
  $modelContainer = setupComponent(modelComponent);

  // Setup rest of the components.
  for (i = 0; i < components.length; i++) {
    if (!components[i].model) {
      setupComponent(components[i], $modelContainer);
    }
  }
}

$(function () {

  var INDENT = 2,

      $layoutTextarea = $("#layout-textarea"),
      layoutEditor = CodeMirror.fromTextArea($layoutTextarea.get(0), {
        mode: 'htmlmixed',
        indentUnit: INDENT,
        lineNumbers: true,
        lineWrapping: false
      }),

      $interactiveTextarea = $("#interactive-textarea"),
      interactiveEditor = CodeMirror.fromTextArea($interactiveTextarea.get(0), {
        mode: 'javascript',
        indentUnit: INDENT,
        lineNumbers: true,
        lineWrapping: false
      });

  function update() {
    var newLayout     = layoutEditor.getValue(),
        newComponents = interactiveEditor.getValue();

    $('#interactive-container').remove();
    $('.view').append(newLayout);

    setupLayout(newLayout, JSON.parse(newComponents));
  }

  $(".view").resizable();
  $(".view").bind('resize', update);

  // Update model button.
  $("#update-layout").on('click', update);

  // Trigger layout setup.
  $("#update-layout").click();
});

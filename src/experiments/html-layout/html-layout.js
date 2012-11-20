/*global Lab $ CodeMirror */

function setupComponent(component, $modelContainer) {
  var $container = $('#' + component.id),
      $el        = $('<div></div>'),

      getDataWidth = function () {
        if ($container.data('width') === "model-width")
          return $modelContainer.width();
        return $container.data('width');
      },

      getDataHeight = function () {
        if ($container.data('height') === "model-height")
          return $modelContainer.height();
        return $container.data('height');
      };

  // ID not found in the layout definition.
  if ($container.length === 0)
    return;

  // Case 1.
  // There is defined data-width attribute at least.
  if ($container.data('width') !== undefined) {
    // Setup width.
    $container.width(getDataWidth());

    // Setup height.
    if ($container.data('height'))
      // 1. Try to use data-height attribute.
      $container.height(getDataHeight());
    else if (component.aspectRatio)
      // 2. Try to use aspectRatio.
      $container.height($container.width() * component.aspectRatio);
    else if (component.canonicalHeight)
      // 3. Try to use canonicalHeight.
      $container.height(component.canonicalHeight);
  }
  // Case 2.
  // There is defined data-height but not data-width attribute.
  else if ($container.data('height') !== undefined) {
    // Setup height.
    $container.height(getDataHeight());

    // Setup width (not defined explicitly in layout).
    if (component.aspectRatio)
      // 1. Try to use aspectRatio.
      $container.width($container.height() / component.aspectRatio);
    else if (component.canonicalWidth)
      // 2. Try to use canonicalWidth.
      $container.width(component.canonicalWidth);
  }
  // Case 3.
  // There are no data-width and data-height attributes.
  else {
    $container.width(component.canonicalWidth);
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
      }),

      initialLayout;

  function update() {
    var newLayout     = layoutEditor.getValue(),
        newComponents = interactiveEditor.getValue(),
        $wrapper      = $('#wrapper');

    $wrapper.remove();
    $wrapper = $('<div id="wrapper"></div>').append(newLayout);
    $wrapper.css({width: "100%", height: "100%"});

    $('.view').append($wrapper);
    setupLayout(newLayout, JSON.parse(newComponents));
  }

  $(".view").resizable();
  $(".view").bind('resize', update);

  // Update model button.
  $("#update-layout").on('click', update);

  // Select ready example.
  $("#preload").change(function () {
    document.location.hash = '#' + $("#preload").val();
  });

  // Update editor.
  $(window).bind('hashchange', function() {
    layoutEditor.setValue($(document.location.hash).text());
    update();
  });

  // Set default layout and trigger its setup.
  initialLayout = document.location.hash !== "" ? document.location.hash : "#width-oriented";
  layoutEditor.setValue($(initialLayout).text());
  update();
});

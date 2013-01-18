/*global Lab $ CodeMirror */

$.fn.hasScrollBar = function() {
    //note: clientHeight= height of holder
    //scrollHeight= we have content till this height
    var _elm = $(this)[0];
    var _hasScrollBar = false;
   if ((_elm.clientWidth < _elm.scrollWidth) || (_elm.clientHeight < _elm.scrollHeight)) {
        _hasScrollBar = true;
    }
    return _hasScrollBar;
};

function setupComponent(component, $modelContainer, updateOnly) {
  var $container = $('#' + component.id),
      $el        = updateOnly ? $container.children() : $('<div></div>'),

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

  if (!updateOnly) {
    $el.appendTo($container);
  }

  return $container;
}

function setupLayout(layoutTpl, components, updateOnly) {
  var i, modelComponent, $modelContainer;

  // Find model.
  for (i = 0; i < components.length; i++) {
    if (components[i].model) {
      modelComponent = components[i];
    }
  }

  // Setup it, save reference.
  $modelContainer = setupComponent(modelComponent, undefined, updateOnly);

  // Setup rest of the components.
  for (i = 0; i < components.length; i++) {
    if (!components[i].model) {
      setupComponent(components[i], $modelContainer, updateOnly);
    }
  }

  if ($modelContainer.data('width') && $modelContainer.data('height') === undefined) {
    return 'w';
  }
  else if($modelContainer.data('height') && $modelContainer.data('width') === undefined) {
    return 'h';
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
        newComponents = JSON.parse(interactiveEditor.getValue()),
        $wrapper, $interCont, orientantion,
        i = 0;

    $('#wrapper').remove();
    $wrapper = $('<div id="wrapper"></div>').append(newLayout);
    $wrapper.css({width: "100%", height: "100%"});

    $('.view').append($wrapper);

    orientantion = setupLayout(newLayout, newComponents, false);

    if ($('#avoid-scrollbar').attr('checked') && orientantion !== '') {
      $interCont = $('#interactive-container');
      while($interCont.hasScrollBar() && i < 25) {
        if (orientantion === 'w')
          $interCont.width($interCont.width() * 0.95);
        if (orientantion === 'h')
          $interCont.height($interCont.height() * 0.95);
        setupLayout(newLayout, newComponents, true);
        i++;
      }
      if ($interCont.hasScrollBar()) {
        $wrapper.remove();
        $('.view').append($("<h2 id='wrapper'>Sorry, this layout can't handle current view size!</h2>"));
      }
    }
  }

  $(".view").resizable();
  $(".view").bind('resize', update);

  // Update model button.
  $("#update-layout").on('click', update);

  // Select ready example.
  $("#preload").change(function () {
    document.location.hash = '#' + $("#preload").val();
  });

  // Select ready example.
  $("#avoid-scrollbar").change(function () {
    update();
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

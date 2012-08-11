/*globals $ CodeMirror controllers model alert DEVELOPMENT: true */
/*jshint boss:true */

DEVELOPMENT = true;

var ROOT = '/examples',
    ROOT_REGEX = new RegExp(ROOT + '/.*$'),
    ACTUAL_ROOT = document.location.pathname.replace(ROOT_REGEX, '');

(function() {

  var interactiveDefinitionLoaded = $.Deferred(),
      windowLoaded = $.Deferred(),

      editor,
      controller,
      indent = 2,
      foldFunc = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder),
      interactiveUrl,
      interactive,
      hash;

  if (!document.location.hash) {
     document.location.hash = '#interactives/heat-and-cool-example.json';
  }

  if (hash = document.location.hash) {
    interactiveUrl = hash.substr(1, hash.length);

    $.get(interactiveUrl).done(function(results) {
      if (typeof results === 'string') results = JSON.parse(results);
      interactive = results;
      interactiveDefinitionLoaded.resolve();
    });
  }

  $(window).load(function() {
    windowLoaded.resolve();
  });

  $.when(interactiveDefinitionLoaded, windowLoaded).done(function(results) {
    controller = controllers.interactivesController(interactive, '#interactive-container', 'interactive-iframe');
  });

  $(window).bind('hashchange', function() {
    if (document.location.hash !== hash) {
      location.reload();
    }
  });

}());

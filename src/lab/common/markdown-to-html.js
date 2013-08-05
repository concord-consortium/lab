/*global define: true, $ */

/**
 * Converts markdown to HTML. Passed argument can be a string or array of strings.
 */
define(function (require) {
  var markdown = require('markdown'),
      NEW_WINDOW = 'class="opens-in-new-window" target="blank"';

  return function markdownToHTML(text) {
    var content = "", html;
    if (!$.isArray(text)) text = [text];
    text.forEach(function (line) {
      content += line + "\n";
    });
    html = '<div class="markdown-typography">' + markdown.toHTML(content) + '</div>';
    return html.replace(/<a(.*?)>/g, "<a$1 " + NEW_WINDOW + ">");
  };
});

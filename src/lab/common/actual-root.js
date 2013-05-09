/*global define: false */

define(function () {
  var newPattern = /^(\/.+?\/)(interactives|embeddable)\.html$/,

      // For legacy code, if any, that (a) uses actualRoot and (b) isn't in an interactive
      // (Not folded into the same regex as newPattern for the sake of readability. Note the regexes
      // are only matched against one time.)
      oldPattern = /(\/.+?\/)(doc|examples|experiments)(\/\w+)*?\/\w+\.html/,
      match;

  match = document.location.pathname.match(newPattern);
  if (match && match[1]) {
    return match[1];
  }

  match = document.location.pathname.match(oldPattern);
  return match && match[1] || "/";
});

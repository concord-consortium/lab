/*global define: false */

define(function (require) {
  // Dependencies.
  var staticResourceMatch = new RegExp("/(\/.*?)\/(doc|examples|experiments)(\/\w+)*?\/\w+\.html/"),
      // String to be returned.
      value;

  function actualRoot() {
    var match = document.location.pathname.match(staticResourceMatch);
    if (match && match[1]) {
      return match[1]
    } else {
      return ""
    }
  }

  value = actualRoot();
  return value;
});


define(function (require) {
  var version  = require('lab.version');
  var config   = require('lab.config');

  var addParam = function(string, key, value) {
    if (string.length > 0) {
      return string + "&" + key + "=" + value;
    }
    return "?" + key + "=" + value;
  };

  return {
    getVersionedUrl: function () {
      if (config.versionedHome && version.repo.last_tag) {
        var majorVersion = version.repo.last_tag.split(".")[0];
        return config.versionedHome(majorVersion);
      }
      var host     = window.location.host;
      var path     = window.location.pathname;
      var search   = window.location.search;
      var protocol = window.location.protocol;
      search = addParam(search, 'show_data_warning', 'true');
      return protocol + "//" + host + path + search;
    }
  };
});

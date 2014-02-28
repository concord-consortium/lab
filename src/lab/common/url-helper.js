
define(function (require) {
  var version    = require('lab.version');
  var addParam   = function(string, key, value) {
    if (string.length > 0) {
      return string + "&" + key + "=" + value;
    }
    return "?" + key + "=" + value;
  };

  /**
   * UrlHelper:  A simple helper to find versioned URLS for interatives.
   *
   * @constructor
   *
   * @param {config} the Lab configuration instance.
   */
  function UrlHelper(config) {
    this.versioned_home = null;
    this.version = null;
    this.has_versioned_home = false;
    if (config.versioned_home && version.repo.last_tag) {
      this.version            = version.repo.last_tag;
      this.versioned_home     = config.versioned_home;
      this.has_versioned_home = true;
    }
  }

  UrlHelper.prototype.getVersionedUrl = function(load_learner) {
    var host     = window.location.host;
    var path     = window.location.pathname;
    var search   = window.location.search;
    var protocol = window.location.protocol;
    var base     = host;
    // Do not return hash when learner data will be provided later (no need to download and load
    // interactive that will be immediately replaced).
    var hash     = load_learner ? "" : window.location.hash;

    if (this.has_versioned_home) {
      base   = this.versioned_home + this.version;
      search = addParam(search, 'is_versioned_url', 'true');
    } else {
      search = addParam(search, 'show_data_warning', 'true');
    }
    if (/^https?\:\/\//.test(base)) {
      return base + path + search + hash;
    }
    return protocol + "//" + base + path + search + hash;
  };

  return UrlHelper;
});

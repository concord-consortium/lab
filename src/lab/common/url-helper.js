
define(function (require) {
  var version    = require('lab.version');
  var addParam   = function(string,key,value) {
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
    var host   = window.location.host;
    var path   = window.location.pathname;
    var search = window.location.search;
    var hash   = window.location.hash;
    var base   = host;
    if (load_learner) {
      search = addParam(search,'load_learner_data','true');
    }

    if(this.has_versioned_home) {
      base   = this.versioned_home + this.version;
      search = addParam(search,'is_versioned_url','true');
    }
    else {
      search = addParam(search,'show_data_warning', 'true');
    }
    return base + path + search + hash;
  };


  return UrlHelper;
});

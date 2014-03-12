define(function (require) {
  var actualRoot = require('common/actual-root');
  var urlHelper  = require('common/url-helper');
  var publicAPI = {
    "sharing": true,
    "logging": false,
    "tracing": false,
    // Set homeForSharing to the host where shared Interactives are found
    // if you don't want to share the ones on the actual server.
    // Example if you host the Interactives on a static S3 site and want the
    // sharing links to point to the same Interactives at http://lab.concord.org
    "homeForSharing": "",
    "homeInteractivePath": "/interactives.html",
    "homeEmbeddablePath": "/embeddable.html",
    // Root URL of Lab distribution, used to get Lab resources (e.g. DNA images).
    "rootUrl": "",
    "dataGamesProxyPrefix": "",
    "fontface": "Lato",
    "utmCampaign": null,
    "versioned_home": "http://lab.concord.org/version/"
  };
  publicAPI.actualRoot = actualRoot;
  publicAPI.urlHelper = new urlHelper(publicAPI);
  publicAPI.getVersionedUrl = function(load_learner_data) {
   return publicAPI.urlHelper.getVersionedUrl(load_learner_data);
  };
  return publicAPI;
});

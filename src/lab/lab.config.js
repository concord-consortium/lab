define(function (require) {
  var actualRoot = require('common/actual-root');
  return {
    "sharing": true,
    "logging": false,
    "tracing": false,
    // Set homeForSharing to the host where shared Interactives are found
    // if you don't want to share the ones on the actual server.
    // Example if you host the Interactives on a static S3 site and want the
    // sharing links to point to the same Interactives at http://lab.concord.org
    "homeForSharing": "",
    "homeEmbeddablePath": "/embeddable.html",
    // Root URL of Lab distribution, used to get Lab resources (e.g. DNA images).
    "rootUrl": "lab",
    "dataGamesProxyPrefix": "",
    "fontface": "Lato",
    "utmCampaign": null,
    // You can set versioned home to function that accepts major version of Lab and returns
    // URL of embeddable page that uses particular version of Lab, e.g.:
    // Lab.config.versionedHome = function (version) {
    //    return "http://some.domain.com/lab/embeddable-" + version + ".html";
    // }
    // When Lab receives 'getLearnerUrl' messaga via iframe phone, it will respond providing
    // return value of this function.
    "versionedHome": null,
    // Note that actualRoot is calculated dynamically, actually it's not a configuration option!
    // However it can be used by client code to quickly get actual root, as well as it's used
    // by Lab itself.
    // TODO: make it clearer, perhaps pull out actualRoot from config object.
    "actualRoot": actualRoot
  };
});

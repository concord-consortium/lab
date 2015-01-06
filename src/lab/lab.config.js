define(function () {
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
    // Models root URL, appended to all model paths. Leave it empty if model paths are relative
    // to page that contains Lab interactive.
    "modelsRootUrl": "",
    // Set codap to true if Lab is running inside of CODAP
    "codap": false,
    // dataGamesProxyPrefix was the old way of configuring CODAP
    "dataGamesProxyPrefix": "",
    "utmCampaign": null,
    // You can set versioned home to function that accepts major version of Lab and returns
    // URL of embeddable page that uses particular version of Lab, e.g.:
    // Lab.config.versionedHome = function (version) {
    //    return "http://some.domain.com/lab/embeddable-" + version + ".html";
    // }
    // When Lab receives 'getLearnerUrl' messaga via iframe phone, it will respond providing
    // return value of this function.
    "versionedHome": null
  };
});

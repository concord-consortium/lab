// Simple RequireJS config, common for Lab modules.
exports.labConfig = {
  baseUrl: 'src/lab',
  nodeRequire: require,

  paths: {
    // Define RequireJS plugin for CoffeScript loading.
    'cs': '../vendor/require-cs/cs',
      // Plugin for loading plain text files (GLSL sources).
    'text': '../vendor/text/text',
    'underscore': '../vendor/underscore/underscore',
    'backbone': '../vendor/backbone/backbone'
  },

  // The shim config allows us to configure dependencies for
  // scripts that do not call define() to register a module
  shim: {
    'underscore': {
      exports: '_'
    },
    'backbone': {
      deps: [
        'underscore'
        //'jquery' is also required, but the whole 'Lab' libary depends on jQuery,
        // which is expected to be available on the host website.
      ],
      exports: 'Backbone'
    }
  }
};

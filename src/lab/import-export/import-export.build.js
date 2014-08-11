({
  baseUrl: '..',
  // Use Almond.
  // A replacement AMD loader for RequireJS. It is a smaller "shim" loader,
  // providing the minimal AMD API footprint that includes loader plugin support.
  name: '../../vendor/almond/almond',

  // Export Public API.
  include: ['import-export/public-api'],
  // Out file.
  out: '../../../public/lab/lab.import-export.js',
  // Do not use UglifyJS.
  // It's done via Makefile routines.
  optimize: 'none',
  //Allow "use strict"; be included in the RequireJS files.
  useStrict: true,

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
  },

  // Additional modules.
  paths: {
    'underscore': '../../vendor/underscore/underscore',
    'backbone': '../../vendor/backbone/backbone',
    'iframe-phone': '../../vendor/iframe-phone/dist/iframe-phone'
  },

  // Protect global namespace and call export of API.
  wrap: {
    start: "(function() {",
    // Manual require at the end of the file instead of such option:
    // insertRequire: ['grapher/public-api'],
    // It is a workaround, as Almond by default simulates async call
    // of require (sets timeout). Last argument (true) forces sync call instead.
    // TODO: ask a question on requirejs group about this issue.
    end: "require(['import-export/public-api'], undefined, undefined, true); }());"
  }
})
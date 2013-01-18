({
  baseUrl: '..',
  // Use Almond.
  // A replacement AMD loader for RequireJS. It is a smaller "shim" loader,
  // providing the minimal AMD API footprint that includes loader plugin support.
  name: '../vendor/almond/almond',

  // Export Public API.
  include: ['md2d/public-api'],
  // Out file.
  out: '../../../server/public/lab/lab.md2d.js',
  // Do not use UglifyJS.
  // It's done via Makefile routines.
  optimize: 'none',
  //Allow "use strict"; be included in the RequireJS files.
  useStrict: true,

  // Paths to CommonJS modules.
  packages: [
    {
        name: "arrays",
        main: "index",
        location: "../modules/arrays"
    }
  ],

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
    'cs' :'../vendor/require-cs/cs',
    'coffee-script': '../vendor/coffee-script/extras/coffee-script',
    'underscore': '../vendor/underscore/underscore',
    'backbone': '../vendor/backbone/backbone'
  },

  // Protect global namespace and call export of API.
  wrap: {
    start: "(function() {",
    // Manual require at the end of the file instead of such option:
    // insertRequire: ['md2d/public-api'],
    // It is a workaround, as Almond by default simulates async call
    // of require (sets timeout). Last argument (true) forces sync call instead.
    end: "require(['md2d/public-api'], undefined, undefined, true); }());"
  },

  //Stub out the cs module after a build since
  //it will not be needed.
  stubModules: ['cs'],

  // The optimization will load CoffeeScript to convert
  // the CoffeeScript files to plain JS. Use the exclude
  // directive so that the coffee-script module is not included
  // in the built file.
  exclude: ['coffee-script']
})
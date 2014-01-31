({
  baseUrl: './',
  // Use Almond.
  // A replacement AMD loader for RequireJS. It is a smaller "shim" loader,
  // providing the minimal AMD API footprint that includes loader plugin support.
  name: '../../vendor/almond/almond',

  // Export Public API.
  include: ['public-api'],
  // Out file.
  out: '../../public/lab/lab.js',
  // Do not use UglifyJS.
  // It's done via Makefile routines.
  optimize: 'none',
  //Allow "use strict"; be included in the RequireJS files.
  useStrict: true,

  //Stub out the cs module after a build since
  //it will not be needed.
  stubModules: ['cs'],

  //The optimization will load CoffeeScript to convert
  //the CoffeeScript files to plain JS. Use the exclude
  //directive so that the coffee-script module is not included
  //in the built file.
  exclude: ['coffee-script'],

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
    },
    'markdown': {
      exports: 'markdown'
    },
    'pixi':  {
      exports: 'PIXI'
    },
    'rgbcolor': {
      exports: 'rgbcolor'
    },
    'canvg': {
      deps: [
        'rgbcolor'
      ],
      exports: 'canvg'
    }
  },

  // Additional modules.
  paths: {
    'lab-grapher': '../../vendor/lab-grapher/dist/lab-grapher',
    'text': '../../vendor/text/text',
    'cs' :'../../vendor/require-cs/cs',
    'coffee-script': '../../vendor/coffee-script/extras/coffee-script',
    'underscore': '../../vendor/underscore/underscore',
    'pixi': '../../vendor/pixi.js/bin/pixi.dev',
    'canvg': '../../vendor/canvg-1.3/canvg',
    'rgbcolor': '../../vendor/canvg-1.3/rgbcolor',
    'fastclick': '../../vendor/fastclick/lib/fastclick',
    'seedrandom': '../../vendor/seedrandom/seedrandom',
    'backbone': '../../node_modules/backbone/backbone',
    'mustache': '../../node_modules/mustache/mustache',
    'markdown': '../../node_modules/markdown/lib/markdown',
    'sensor-applet': '../../vendor/lab-sensor-applet-interface-dist/sensor-applet-interface',
    'labquest2-interface': '../../vendor/sensor-labquest-2-interface/dist/sensor-labquest-2-interface'
  },

  // Protect global namespace and call export of API.
  wrap: {
    start: "(function() {",
    // Manual require at the end of the file instead of such option:
    // insertRequire: ['public-api'],
    // It is a workaround, as Almond by default simulates async call
    // of require (sets timeout). Last argument (true) forces sync call instead.
    // TODO: ask a question on requirejs group about this issue.
    end: "require(['public-api'], undefined, undefined, true); }());"
  }
})

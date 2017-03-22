({
  baseUrl: '..',
  // Use Almond.
  // A replacement AMD loader for RequireJS. It is a smaller "shim" loader,
  // providing the minimal AMD API footprint that includes loader plugin support.
  name: '../../vendor/almond/almond',

  // Export Public API.
  include: ['mml-converter/public-api'],
  // Out file.
  out: '../../../public/lab/lab.mml-converter.js',
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

  // Additional modules.
  paths: {
    'arrays': '../modules/arrays/index',
    'browserified-cheerio': '../../vendor/browserified-cheerio/browserified-cheerio',
    'cs': '../../vendor/require-cs/cs',
    'coffee-script': '../../vendor/coffee-script/extras/coffee-script'
  },

  // Protect global namespace and call export of API.
  wrap: {
    start: "(function() {",
    // Manual require at the end of the file instead of such option:
    // insertRequire: ['public-api'],
    // It is a workaround, as Almond by default simulates async call
    // of require (sets timeout). Last argument (true) forces sync call instead.
    // TODO: ask a question on requirejs group about this issue.
    end: "require(['mml-converter/public-api'], undefined, undefined, true); }());"
  }
})

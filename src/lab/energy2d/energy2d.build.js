({
  baseUrl: '..',
  // Use Almond.
  // A replacement AMD loader for RequireJS. It is a smaller "shim" loader,
  // providing the minimal AMD API footprint that includes loader plugin support.
  name: '../vendor/almond/almond',

  // Export Public API.
  include: ['energy2d/public-api'],
  // Out file.
  out: '../../../server/public/lab/lab.energy2d.js',
  // Do not use UglifyJS.
  // It's done via Makefile rutines.
  optimize: 'none',

  // Paths to CommonJS modules.
  packages: [
    {
        name: "arrays",
        main: "index",
        location: "../modules/arrays"
    }
  ],

  paths: {
    // Plugin for loading plain text files (GLSL sources).
    'text': '../vendor/text/text'
  },

  // Protect global namespace and call export of API.
  wrap: {
    start: "(function() {",
    // Manual require at the end of the file instead of such option:
    // insertRequire: ['energy2d/public-api'],
    // It is a workaround, as Almond by default simulates async call
    // of require (sets timeout). Last argument (true) forces sync call instead.
    end: "require(['energy2d/public-api'], undefined, undefined, true); }());"
  }
})
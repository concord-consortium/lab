({
  baseUrl: '..',
  // Use Almond.
  // A replacement AMD loader for RequireJS. It is a smaller "shim" loader,
  // providing the minimal AMD API footprint that includes loader plugin support.
  name: '../vendor/almond/almond',
  // Export Public API.
  include: ['controllers/public-api'],
  // Out file.
  out: '../../../server/public/lab/lab.controllers.js',
  // Do not use UglifyJS.
  // It's done via Makefile routines.
  optimize: 'none',
  // Paths to CommonJS modules.
  packages: [
    {
        name: "arrays",
        main: "index",
        location: "../modules/arrays"
    }
  ],
  // Protect global namespace.
  wrap: {
    start: "(function() {",
    // Manual require at the end of the file instead of such option:
    // insertRequire: ['controllers/public-api'],
    // It is a workaround, as Almond by default simulates async call
    // of require (sets timeout). Last argument (true) forces sync call instead.
    end: "require(['controllers/public-api'], undefined, undefined, true); }());"
  }
})
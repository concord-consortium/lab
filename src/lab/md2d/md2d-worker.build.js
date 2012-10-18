({
  baseUrl: '..',
  // Use Almond.
  // A replacement AMD loader for RequireJS. It is a smaller "shim" loader,
  // providing the minimal AMD API footprint that includes loader plugin support.
  name: '../vendor/almond/almond',

  // Start spidering requires from md2d/worker.
  include: ['md2d/worker'],

  // Build product to generate
  out: '../../../server/public/lab/lab.md2d-worker.js',

  // Require.js optimizer should not use UglifyJS.
  // Minification is done by the 'make' process instead.
  optimize: 'none',

  // Paths to CommonJS modules.
  packages: [
    {
      name: "arrays",
      main: "index",
      location: "../modules/arrays"
    }
  ],

  // Protect global namespace and call export of API.
  wrap: {
    start: "(function() {",
    // Append a manual require at the end of the file instead of using the option:
    // insertRequire: ['md2d/worker'],
    // This is a workaround, as Almond by default simulates async call
    // of require (sets timeout). Last argument (true) forces sync call instead.
    end: "require(['md2d/worker'], undefined, undefined, true); }());"
  }
})
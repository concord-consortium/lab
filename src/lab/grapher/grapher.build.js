({
  baseUrl: '..',
  // Use Almond.
  // A replacement AMD loader for RequireJS. It is a smaller "shim" loader,
  // providing the minimal AMD API footprint that includes loader plugin support.
  name: '../vendor/almond/almond',
  // Export Public API.
  include: ['grapher/public-api'],
  insertRequire: ['grapher/public-api'],
  // Out file.
  out: '../../../server/public/lab/lab.grapher.js',
  // Do not use UglifyJS.
  // It's done via Makefile routines.
  optimize: 'none',
  // Protect global namespace.
  wrap: true
})
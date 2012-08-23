({
  baseUrl: '.',
  // Use Almond.
  // A replacement AMD loader for RequireJS. It is a smaller "shim" loader, 
  // providing the minimal AMD API footprint that includes loader plugin support.
  name: '../../vendor/almond/almond',
  paths: {
  	  // Plugin for loading plain text files (GLSL sources).
      text: '../../vendor/text/text'
  },
  // Export Public API.
  include: ['public-api'],
  insertRequire: ['public-api'],
  // Out file.
  out: '../../../server/public/lab/lab.energy2d.js',
  // Do not use UglifyJS.
  // It's done via Makefile rutines.
  optimize: 'none',
  // Protect global namespace.
  wrap: true
})
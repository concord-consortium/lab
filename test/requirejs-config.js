// Simple RequireJS config, common for Lab modules.
exports.labConfig = {
  baseUrl: 'src/lab',
  nodeRequire: require,

  paths: {
    // Define RequireJS plugin for CoffeScript loading.
    'cs': '../../vendor/require-cs/cs',
      // Plugin for loading plain text files (GLSL sources).
    'text': '../../vendor/text/text',
    'sensor-applet': '../../vendor/lab-sensor-applet-interface-dist/sensor-applet-interface',
    'lab-grapher': '../../vendor/lab-grapher/dist/lab-grapher',
    'seedrandom': '../../vendor/seedrandom/seedrandom'
  }
};

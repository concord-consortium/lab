// Simple RequireJS config, common for Lab modules.
exports.labConfig = {
  baseUrl: 'src/lab',
  nodeRequire: require,

  paths: {
    'arrays': '../modules/arrays/index',
    // Define RequireJS plugin for CoffeScript loading.
    'cs': '../../vendor/require-cs/cs',
      // Plugin for loading plain text files (GLSL sources).
    'text': '../../vendor/text/text',
    'sensor-applet': '../../vendor/lab-sensor-applet-interface-dist/sensor-applet-interface',
    'labquest2-interface': '../../vendor/sensor-labquest-2-interface/dist/sensor-labquest-2-interface',
    'sensor-connector-interface': '../../vendor/sensor-connector-interface/dist/sensor-connector-interface',
    'lab-grapher': '../../vendor/lab-grapher/dist/lab-grapher',
    'iframe-phone': '../../vendor/iframe-phone/dist/iframe-phone',
    'seedrandom': '../../vendor/seedrandom/seedrandom',
    'i18next': '../../vendor/i18next/i18next.amd'
  }
};

// Simple RequireJS config, common for Lab modules.
exports.labConfig = {
  baseUrl: 'src/lab',
  nodeRequire: require,
  // Define RequireJS plugin for CoffeScript loading.
  paths: {
    'cs' :'../vendor/require-cs/cs'
  }
};

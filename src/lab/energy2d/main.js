/*jslint indent: 2 */
/*globals require: false, energy2d: true */
//main.js

// Define global energy2d namespace object.
// It's not necessary, only for convenience.
// The client application doesn't have to use RequireJS AMD loading.
var energy2d = {};

// Require.js allows us to configure shortcut alias.
require.config({
  paths: {
    jquery: '../../vendor/jquery/jquery.min',
    text: '../../vendor/text/text'
  }
});

require([
  'controllers/interactive'
], function (InteractiveController) {
  'use strict';
  // Export InteractiveController constructor.
  energy2d.InteractiveController = InteractiveController;
});

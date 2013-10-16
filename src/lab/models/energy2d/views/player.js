/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false, $: false*/

// Simple player.
//
// Should be bound with simulation controller, which has to implement following methods:
// - simulationPlay()
// - simulationStep()
// - simulationStop()
// - simulationReset()
//
// getHTMLElement() method returns JQuery object with DIV that contains all buttons.
// If you want to style its components:
// Default div id = "energy2d-simulation-player",
// Buttons ids: "sim-play", "sim-step", "sim-stop", "sim-reset".

define(function () {
  'use strict';

  return function SimulationPlayerView(html_id) {
    var
      DEFAULT_ID = 'energy2d-simulation-player',
      DEFAULT_CLASS = 'energy2d-simulation-player',

      simulation_controller,
      $player_div,

      //
      // Private methods.
      //
      initHTMLelement = function () {
        var $button;

        $player_div = $('<div />');
        $player_div.attr('id', html_id || DEFAULT_ID);
        $player_div.addClass(DEFAULT_CLASS);
        // Stop button.
        $button = $('<button type="button" id="sim-stop">Stop</button>');
        $button.click(function () {
          simulation_controller.simulationStop();
        });
        $player_div.append($button);
        // One step button.
        $button = $('<button type="button" id="sim-step">Step</button>');
        $button.click(function () {
          simulation_controller.simulationStep();
        });
        $player_div.append($button);
        // Play button.
        $button = $('<button type="button" id="sim-play">Play</button>');
        $button.click(function () {
          simulation_controller.simulationPlay();
        });
        $player_div.append($button);
        // Reset button.
        $button = $('<button type="button" id="sim-reset">Reset</button>');
        $button.click(function () {
          simulation_controller.simulationReset();
        });
        $player_div.append($button);
      },

      //
      // Public API.
      //
      simulation_player = {
        bindSimulationController: function (controller) {
          simulation_controller = controller;
        },

        getHTMLElement: function () {
          return $player_div;
        }
      };

    // One-off initialization.
    initHTMLelement();

    return simulation_player;
  };
});

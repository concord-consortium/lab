/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false, $: false*/

// Simulation time.
//
// getHTMLElement() method returns JQuery object with DIV that contains time.
// If you want to style its components:
// Default div id = "energy2d-time"

define(function () {
  'use strict';

  return function TimeView(html_id) {
    var
      DEFAULT_ID = 'energy2d-time',
      DEFAULT_CLASS = 'energy2d-time',

      $time_div,

      //
      // Private methods.
      //
      initHTMLelement = function () {
        $time_div = $('<div />');
        $time_div.attr('id', html_id || DEFAULT_ID);
        $time_div.addClass(DEFAULT_CLASS);
        $time_div.html('0:00:00:00');
      },

      pad = function (num, size) {
        var s = num.toString();
        while (s.length < size) {
          s = "0" + s;
        }
        return s;
      },

      //
      // Public API.
      //
      simulation_time = {
        renderTime: function (time) {
          var seconds, minutes, hours, days;
          time = Math.floor(time);
          seconds = time % 60;
          time = Math.floor(time / 60);
          minutes = time % 60;
          time = Math.floor(time / 60);
          hours = time % 24;
          time = Math.floor(time / 24);
          days = time;
          $time_div.html(days + ':' + pad(hours, 2) + ':' + pad(minutes, 2)  + ':' + pad(seconds, 2));
        },

        getHTMLElement: function () {
          return $time_div;
        }
      };

    // One-off initialization.
    initHTMLelement();

    return simulation_time;
  };
});

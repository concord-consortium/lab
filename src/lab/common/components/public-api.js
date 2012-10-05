/*jslint indent: 2 */
/*globals define: false, window: false */
//main.js

define(function (require) {
  'use strict';
  var ButtonBarComponent       = require('cs!common/components/button_bar_component'),
      ButtonComponent          = require('cs!common/components/button_component'),
      JSliderComponent         = require('cs!common/components/jslider'),
      ModelControllerComponent = require('cs!common/components/model_controller_component'),
      ModelPlayer              = require('cs!common/components/model_player'),
      PlayOnlyComponentSVG     = require('cs!common/components/play_only_svg'),
      PlayResetComponentSVG    = require('cs!common/components/play_reset_svg'),
      PlaybackBarComponent     = require('cs!common/components/playback_bar_component'),
      PlaybackComponentSVG     = require('cs!common/components/playback_svg'),
      SliderComponent          = require('cs!common/components/slider'),
      Thermometer              = require('cs!common/components/thermometer'),
      ToggleButtonComponent    = require('cs!common/components/toggle_button_component'),

      // Object to be returned.
      publicAPI,
      name;

  publicAPI = {
    // ==========================================================================
    ButtonBarComponent:       ButtonBarComponent,
    ButtonComponent:          ButtonComponent,
    JSliderComponent:         JSliderComponent,
    ModelControllerComponent: ModelControllerComponent,
    ModelPlayer:              ModelPlayer,
    PlayOnlyComponentSVG:     PlayOnlyComponentSVG,
    PlayResetComponentSVG:    PlayResetComponentSVG,
    PlaybackBarComponent:     PlaybackBarComponent,
    PlaybackComponentSVG:     PlaybackComponentSVG,
    SliderComponent:          SliderComponent,
    Thermometer:              Thermometer,
    ToggleButtonComponent:    ToggleButtonComponent
    // ==========================================================================
  };

  // Finally, export API to global namespace.
  // TODO: Export this API using some namespace (e.g. 'components').
  // window.components = publicAPI;
  // Following loop is a temporary solution:
  for (name in publicAPI) {
    if (publicAPI.hasOwnProperty(name)) {
      window[name] = publicAPI[name];
    }
  }

  // Also return publicAPI as module.
  return publicAPI;
});

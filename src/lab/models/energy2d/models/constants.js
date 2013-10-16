/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false*/

// Basic constants used by Energy2D module

define(function (require, exports, module) {
  'use strict';
  // Air's thermal conductivity = 0.025 W/(m*K)
  exports.AIR_THERMAL_CONDUCTIVITY = 0.025;
  // Air's specific heat = 1012 J/(kg*K)
  exports.AIR_SPECIFIC_HEAT = 1012;
  // Air's density = 1.204 kg/m^3 at 25 C
  exports.AIR_DENSITY = 1.204;
  // By default, air's kinematic viscosity = 1.568 x 10^-5 m^2/s at 27 C is
  // used. It can be set to zero for inviscid fluid.
  exports.AIR_VISCOSITY = 0.00001568;
  // Stefan's constant unit J/(s*m^2*K^-4)
  exports.STEFAN_CONSTANT = 0.0000000567;
});

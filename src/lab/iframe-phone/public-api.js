/*global define: false, window: false */

define(function (require) {
  'use strict';

  var IFramePhone         = require('iframe-phone/iframe-phone'),
      structuredClone     = require('iframe-phone/structured-clone');

  // create Lab namespace if it doesn't exist
  window.Lab = window.Lab || {};

  // add ourselves to it
  window.Lab.IFramePhone = IFramePhone;

  // add some convienences properties to the 'class'
  IFramePhone.structuredClone = structuredClone;
  IFramePhone.version = "1.0";

  // return the IFramePhone itself, it doesn't look like this is is used anywhere
  return IFramePhone;
});
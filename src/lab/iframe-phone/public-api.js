/*global define: false, window: false */

define(function (require) {
  'use strict';

  var IFramePhone         = require('iframe-phone/iframe-phone');

  // create Lab namespace if it doesn't exist
  window.Lab = window.Lab || {};

  // add ourselves to it
  window.Lab.IFramePhone = IFramePhone;

  // return the IFramePhone itself, it doesn't look like this is is used anywhere
  return IFramePhone;
});
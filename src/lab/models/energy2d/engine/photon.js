/*jslint indent: 2 */
//
// lab/models/energy2d/engine/photon.js
//

// 
// Photon class.
//
exports.Photon = function (x, y, energy, c, angle) {
  'use strict';
  this.x = x;
  this.y = y;
  this.energy = energy;
  this.c = c;

  if (angle !== undefined) {
    this.vx = Math.cos(angle) * c;
    this.vy = Math.sin(angle) * c;
  }
};

exports.Photon.prototype.isContained = function (xmin, xmax, ymin, ymax) {
  'use strict';
  return this.x >= xmin && this.x <= xmax && this.y >= ymin && this.y <= ymax;
};

exports.Photon.prototype.move = function (dt) {
  'use strict';
  this.x += this.vx * dt;
  this.y += this.vy * dt;
};
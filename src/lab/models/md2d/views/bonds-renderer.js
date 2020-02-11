/*global define: false */

import $__pixi from 'pixi.js';
// Dependencies.
var PIXI = $__pixi,

  RADIAL_BOND_TYPES = {
    STANDARD_STICK: 101,
    LONG_SPRING: 102,
    BOND_SOLID_LINE: 103,
    GHOST: 104,
    UNICOLOR_STICK: 105,
    SHORT_SPRING: 106,
    DOUBLE_BOND: 107,
    TRIPLE_BOND: 108,
    DISULPHIDE_BOND: 109
  },

  RENDERING_OPTIONS = ["keShading", "chargeShading", "chargeShadingStyle", "aminoAcidColorScheme"];

export default function BondsRenderer(modelView, model, pixiContainer, atomsRenderer) {
  // Public API object to be returned.
  var api,

    m2px,
    m2pxInv,

    modelBonds,
    modelAtoms,

    graphics = new PIXI.Graphics();

  function init() {
    model.addPropertiesListener(RENDERING_OPTIONS, function() {
      api.setup();
      // TODO: we shouldn't call .renderCanvas() here. E.g. when keShading is toggled, rendering
      // will be triggered both by bonds renderer and atoms renderer.
      modelView.renderCanvas();
    });
  }

  function renderSpring(d) {
    var x1 = m2px(d.x1),
      y1 = m2pxInv(d.y1),
      x2 = m2px(d.x2),
      y2 = m2pxInv(d.y2),
      dx = x2 - x1,
      dy = y2 - y1,

      length = Math.sqrt(dx * dx + dy * dy) / m2px(0.01),

      numTurns = Math.floor(d.length * 24),
      springDiameter = length / numTurns,

      costheta = dx / length,
      sintheta = dy / length,
      cosThetaDiameter = costheta * springDiameter,
      sinThetaDiameter = sintheta * springDiameter,
      cosThetaSpikes = costheta * numTurns,
      sinThetaSpikes = sintheta * numTurns,
      pointX, pointY, i;

    graphics.lineStyle(getBondWidth(d), getBondColor(d, 1), getBondOpacity(d, 1));
    graphics.moveTo(x1, y1);
    for (i = 0; i < numTurns; i++) {
      if (i % 2 === 0) {
        pointX = x1 + (i + 0.5) * cosThetaDiameter - 0.5 * sinThetaSpikes;
        pointY = y1 + (i + 0.5) * sinThetaDiameter + 0.5 * cosThetaSpikes;
      } else {
        pointX = x1 + (i + 0.5) * cosThetaDiameter + 0.5 * sinThetaSpikes;
        pointY = y1 + (i + 0.5) * sinThetaDiameter - 0.5 * cosThetaSpikes;
      }
      graphics.lineTo(pointX, pointY);
    }
    graphics.lineTo(x2, y2);
  }

  function renderBond(d) {
    var x1 = m2px(d.x1),
      y1 = m2pxInv(d.y1),
      x2 = m2px(d.x2),
      y2 = m2pxInv(d.y2),
      r1 = m2px(modelAtoms[d.atom1].radius),
      r2 = m2px(modelAtoms[d.atom2].radius),
      dx = x2 - x1,
      dy = y2 - y1,
      len = Math.sqrt(dx * dx + dy * dy);

    // Fast path if bond is invisible anyway. Use 2 ratio, because when length is exactly equal
    // to r1 and r2 sum, double and triple bonds can be still visible (they are wide enough).
    if (2 * len - r1 - r2 <= 0) return;

    var midRatio = 0.5 * (len + r1 - r2) / len,
      xMid = x1 + midRatio * dx,
      yMid = y1 + midRatio * dy,

      bondWidth = getBondWidth(d),
      bondColor1 = getBondColor(d, 1),
      bondColor2 = getBondColor(d, 2),
      bondOpacity1 = getBondOpacity(d, 1),
      bondOpacity2 = getBondOpacity(d, 2),
      bondShift, bondAngle, xs, ys;

    if (d.type === RADIAL_BOND_TYPES.DOUBLE_BOND) {
      bondShift = m2px(Math.min(modelAtoms[d.atom1].radius, modelAtoms[d.atom2].radius)) * 0.4;
      bondAngle = Math.atan2(dy, dx);
      xs = Math.sin(bondAngle) * bondShift;
      ys = -Math.cos(bondAngle) * bondShift;

      graphics.lineStyle(bondWidth, bondColor1, bondOpacity1);
      graphics.moveTo(x1 + xs, y1 + ys);
      graphics.lineTo(xMid + xs, yMid + ys);
      graphics.moveTo(x1 - xs, y1 - ys);
      graphics.lineTo(xMid - xs, yMid - ys);

      graphics.lineStyle(bondWidth, bondColor2, bondOpacity2);
      graphics.moveTo(xMid + xs, yMid + ys);
      graphics.lineTo(x2 + xs, y2 + ys);
      graphics.moveTo(xMid - xs, yMid - ys);
      graphics.lineTo(x2 - xs, y2 - ys);
    } else if (d.type === RADIAL_BOND_TYPES.TRIPLE_BOND) {
      bondShift = m2px(Math.min(modelAtoms[d.atom1].radius, modelAtoms[d.atom2].radius)) * 0.52;
      bondAngle = Math.atan2(dy, dx);
      xs = Math.sin(bondAngle) * bondShift;
      ys = -Math.cos(bondAngle) * bondShift;

      graphics.lineStyle(bondWidth, bondColor1, bondOpacity1);
      graphics.moveTo(x1, y1);
      graphics.lineTo(xMid, yMid);
      graphics.moveTo(x1 + xs, y1 + ys);
      graphics.lineTo(xMid + xs, yMid + ys);
      graphics.moveTo(x1 - xs, y1 - ys);
      graphics.lineTo(xMid - xs, yMid - ys);

      graphics.lineStyle(bondWidth, bondColor2, bondOpacity2);
      graphics.moveTo(xMid, yMid);
      graphics.lineTo(x2, y2);
      graphics.moveTo(xMid + xs, yMid + ys);
      graphics.lineTo(x2 + xs, y2 + ys);
      graphics.moveTo(xMid - xs, yMid - ys);
      graphics.lineTo(x2 - xs, y2 - ys);
    } else if (d.type !== RADIAL_BOND_TYPES.GHOST) {
      // STANDARD_STICK and other types that are not yet supported.
      // However, GHOST bonds will not be drawn.
      graphics.lineStyle(bondWidth, bondColor1, bondOpacity1);
      graphics.moveTo(x1, y1);
      graphics.lineTo(xMid, yMid);

      graphics.lineStyle(bondWidth, bondColor2, bondOpacity2);
      graphics.moveTo(xMid, yMid);
      graphics.lineTo(x2, y2);
    }
  }

  function getBondColor(d, num) {
    if (d.type === RADIAL_BOND_TYPES.SHORT_SPRING) {
      return 0x888888;
    } else if (d.type === RADIAL_BOND_TYPES.DISULPHIDE_BOND) {
      return 0xffe95a;
    } else if (num === 1) {
      return parseInt(atomsRenderer.getAtomColors(d.atom1)[2].substr(1), 16);
    } else if (num === 2) {
      return parseInt(atomsRenderer.getAtomColors(d.atom2)[2].substr(1), 16);
    }
  }

  function getBondOpacity(d, num) {
    if (num === 1) {
      return atomsRenderer.getAtomOpacity(d.atom1);
    } else if (num === 2) {
      return atomsRenderer.getAtomOpacity(d.atom2);
    }
  }

  function getBondWidth(bond) {
    if (bond.type === RADIAL_BOND_TYPES.SHORT_SPRING) {
      return m2px(0.012);
      // The following code is intended to use a thicker stroke-width when
      // the spring constant is larger ... but to work properly in models with
      // both MD2D and MKS units schemes the model would need to supply
      // an appropriately scaled default spring constant.
      // For example in the Spring and Mass Interactive which uses an MKS unit
      // scheme the spring constant is varied between 0.001 and 0.003 ... while in
      // the Comparing Dipole atom-pulling Interactive that uses an MD2D unit
      // scheme the spring constant is 10.
      // return (1 + Math.log(1+bond.strength*1000)) * 0.25;;
    }
    var result = m2px(Math.min(modelAtoms[bond.atom1].radius, modelAtoms[bond.atom2].radius));
    if (bond.type === RADIAL_BOND_TYPES.DOUBLE_BOND) {
      return result * 0.50;
    } else if (bond.type === RADIAL_BOND_TYPES.TRIPLE_BOND) {
      return result * 0.35;
    } else { // STANDARD_STICK and other types that are not yet implemented.
      return result * 0.75;
    }
  }

  api = {
    setup: function() {
      modelBonds = model.getRadialBonds();
      modelAtoms = model.getAtoms();

      m2px = modelView.model2canvas;
      m2pxInv = modelView.model2canvasInv;

      api.update();
    },

    bindModel: function(newModel) {
      model = newModel;

      init();
    },

    update: function() {
      var i, len, bond;

      graphics.clear();
      for (i = 0, len = modelBonds.length; i < len; ++i) {
        bond = modelBonds[i];
        if (bond.type === RADIAL_BOND_TYPES.SHORT_SPRING) {
          renderSpring(bond);
        } else {
          renderBond(bond);
        }
      }
    }
  };

  init();
  pixiContainer.addChild(graphics);

  return api;
};

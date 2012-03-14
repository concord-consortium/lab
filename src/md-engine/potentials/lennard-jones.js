var lennardJones = exports.lennardJones = {};

var epsilon = -1.0,                      // depth of the potential well
    sigma   =  4.0,                      // finite distance at which the inter-particle potential is zero
    rmin    = Math.pow(2, 1/6) * sigma,  // distance at which the potential well reaches its minimum

    alpha = 4 * epsilon * Math.pow(sigma, 12),
    beta  = 4 * epsilon * Math.pow(sigma, 6);

lennardJones.epsilon = function(e) {
  return lennardJones.coefficients(e, sigma);
};

lennardJones.sigma = function(s) {
  return lennardJones.coefficients(epsilon, s);
};

lennardJones.coefficients = function(e, s) {
  if (arguments.length)  {
    epsilon = e;
    sigma   = s;
    rmin    = Math.pow(2, 1/6) * sigma;
    alpha   = 4 * epsilon * Math.pow(sigma, 12);
    beta    = 4 * epsilon * Math.pow(sigma, 6);
  }
  var coefficients = {
    epsilon: epsilon,
    sigma  : sigma,
    rmin   : rmin,
    alpha  : alpha,
    beta   : beta
  };
  return coefficients;
};

lennardJones.potential = function(r) {
  return (alpha/Math.pow(r, 12) - beta/Math.pow(r, 6)) * -1;
};

lennardJones.force = function(r) {
  var r_6th  = Math.pow(r, 6),
      r_7th  = r_6th * r,
      r_13th = r_6th * r_7th;

  return (12*alpha/r_13th - 6*beta/r_7th);
};

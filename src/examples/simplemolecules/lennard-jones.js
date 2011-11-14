// ------------------------------------------------------------
//
// Lennard-Jones potentional and forces
//
// ------------------------------------------------------------

(function(){ 
  
  var root = this;
  lennard_jones = {};
  lennard_jones = { version: "0.0.1" };

  var epsilon = -0.4,                   // depth of the potential well
      sigma   =  4.0,                   // finite distance at which the inter-particle potential is zero
      rmin = Math.pow(2, 1/6) * sigma,  // distance at which the potential well reaches its minimum

      alpha = 4 * epsilon * Math.pow(sigma, 12),
      beta  = 4 * epsilon * Math.pow(sigma, 6);

  lennard_jones.epsilon = function(e) {
    return lennard_jones.coefficients(e, sigma)
  };

  lennard_jones.sigma = function(s) {
    return lennard_jones.coefficients(epsilon, s)
  };

  lennard_jones.coefficients = function(e, s) {
    if (arguments.length)  {
      epsilon = e;
      sigma = s;
      rmin = Math.pow(2, 1/6) * sigma;
      alpha = 4 * epsilon * Math.pow(sigma, 12);
      beta  = 4 * epsilon * Math.pow(sigma, 6);
    }
    var coefficients = { 
      epsilon: epsilon,
      sigma: sigma, 
      rmin: rmin,
      alpha: alpha,
      beta: beta 
    };
    return coefficients;
  };

  lennard_jones.potential = function(distance) {
    return (alpha/Math.pow(distance, 12) - beta/Math.pow(distance, 6)) * -1
  };

  lennard_jones.force = function(distance) {
    return (12*alpha/Math.pow(distance, 13) - 6*beta/Math.pow(distance, 7))
  };

  // export namespace
  if (root !== 'undefined') { root.lennard_jones = lennard_jones; }
})()

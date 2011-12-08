// ------------------------------------------------------------
//
// Couloumb forces
//
// ------------------------------------------------------------

(function(){ 
  
  var root = this;
  coulomb = {};
  coulomb = { version: "0.0.1" };

  var ke_constant = -50;            // coulomb constant

  coulomb.force = function(distance, q1, q2) {
    return ke_constant * ((q1 * q2) / (distance * distance));
  };

  coulomb.energy = function(distance, q1, q2) {
    return -ke_constant * ((q1 * q2) / distance);
  };

  // export namespace
  if (root !== 'undefined') { root.coulomb = coulomb; }
})()

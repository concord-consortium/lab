var coulomb = exports.coulomb = {};

var k_e = -50;            // Coulomb constant

coulomb.potential = function(r, q1, q2) {
  return -k_e * ((q1 * q2) / r);
};

coulomb.force = function(r, q1, q2) {
  return coulomb.forceFromSquaredDistance(r*r);
};

coulomb.forceFromSquaredDistance = function(r_sq, q1, q2) {
  return k_e * ((q1 * q2) / r_sq);
};
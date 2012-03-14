var coulomb = exports.coulomb = {};

var k_e = -50;            // Coulomb constant

coulomb.force = function(r, q1, q2) {
  return k_e * ((q1 * q2) / (r * r));
};

coulomb.potential = function(r, q1, q2) {
  return -k_e * ((q1 * q2) / r);
};

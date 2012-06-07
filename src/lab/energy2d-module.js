//
// energy2d-module.js
//

// module definition and namespace helper function

energy2d = { VERSION: "0.1.0" };

energy2d.namespace = function (ns_string) {
  var parts = ns_string.split('.'),
      parent = energy2d,
      i;
  // strip redundant leading global
  if (parts[0] === "energy2d") {
    parts = parts.slice(1);
  }
  for (i = 0; i < parts.length; i += 1) {
    // create a property if it doesn't exist
    if (typeof parent[parts[i]] === "undefined") {
      parent[parts[i]] = {};
    }
    parent = parent[parts[i]];
  }
  return parent;    
};

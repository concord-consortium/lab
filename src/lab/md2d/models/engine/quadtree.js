// Constructs a new quadtree for the specified array of points. A quadtree is a
// two-dimensional recursive spatial subdivision. This implementation uses
// square partitions, dividing each square into four equally-sized squares. Each
// point exists in a unique node; if multiple points are in the same position,
// some points may be stored on internal nodes rather than leaf nodes. Quadtrees
// can be used to accelerate various spatial operations, such as the Barnes-Hut
// approximation for computing n-body forces, or collision detection.
if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function (require, exports, module) {

  exports.quadtree = function(xCoords, yCoords, x1, y1, x2, y2) {
    var i = -1,
        n = xCoords.length;

    // Allow bounds to be specified explicitly.
    if (arguments.length < 6) {
      if (arguments.length === 4) {
        y2 = x2 = y1;
        y1 = x1;
      } else {
        x1 = y1 = Infinity;
        x2 = y2 = -Infinity;

        // Compute bounds.
        while (++i < n) {
          if (xCoords[i] < x1) x1 = xCoords[i];
          if (yCoords[i] < y1) y1 = yCoords[i];
          if (xCoords[i] > x2) x2 = xCoords[i];
          if (yCoords[i] > y2) y2 = yCoords[i];
        }

        // Squarify the bounds.
        var dx = x2 - x1,
            dy = y2 - y1;
        if (dx > dy) y2 = y1 + dx;
        else x2 = x1 + dy;
      }
    }

    // Recursively inserts the specified point p at the node n or one of its
    // descendants. The bounds are defined by [x1, x2] and [y1, y2].
    function insert(n, p, x1, y1, x2, y2) {
      if (n.leaf) {
        var v = n.point;
        if (v !== undefined) {
          // If the point at this leaf node is at the same position as the new
          // point we are adding, we leave the point associated with the
          // internal node while adding the new point to a child node. This
          // avoids infinite recursion.
          if ((Math.abs(xCoords[v] - xCoords[p]) + Math.abs(yCoords[v] - yCoords[p])) < 0.01) {
            insertChild(n, p, x1, y1, x2, y2);
          } else {
            n.point = undefined;
            insertChild(n, v, x1, y1, x2, y2);
            insertChild(n, p, x1, y1, x2, y2);
          }
        } else {
          n.point = p;
        }
      } else {
        insertChild(n, p, x1, y1, x2, y2);
      }
    }

    // Recursively inserts the specified point p into a descendant of node n. The
    // bounds are defined by [x1, x2] and [y1, y2].
    function insertChild(n, p, x1, y1, x2, y2) {
      // Compute the split point, and the quadrant in which to insert p.
      var sx = (x1 + x2) * 0.5,
          sy = (y1 + y2) * 0.5,
          right = xCoords[p] >= sx,
          bottom = yCoords[p] >= sy,
          i = (bottom << 1) + right;

      // Recursively insert into the child node.
      n.leaf = false;
      n = n.nodes[i] || (n.nodes[i] = quadtreeNode());

      // Update the bounds as we recurse.
      if (right) x1 = sx; else x2 = sx;
      if (bottom) y1 = sy; else y2 = sy;
      insert(n, p, x1, y1, x2, y2);
    }

    // Create the root node.
    var root = quadtreeNode();

    root.add = function(p) {
      insert(root, p, x1, y1, x2, y2);
    };

    root.visit = function(f) {
      quadtreeVisit(f, root, x1, y1, x2, y2);
    };

    // Insert all points.
    i = -1;
    while (++i < n) {
      root.add(i);
    }
    return root;
  };

  function quadtreeNode() {
    return {
      leaf: true,
      nodes: [],
      point: undefined
    };
  }

  function quadtreeVisit(f, node, x1, y1, x2, y2) {
    if (!f(node, x1, y1, x2, y2)) {
      var sx = (x1 + x2) * 0.5,
          sy = (y1 + y2) * 0.5,
          children = node.nodes;
      if (children[0]) quadtreeVisit(f, children[0], x1, y1, sx, sy);
      if (children[1]) quadtreeVisit(f, children[1], sx, y1, x2, sy);
      if (children[2]) quadtreeVisit(f, children[2], x1, sy, sx, y2);
      if (children[3]) quadtreeVisit(f, children[3], sx, sy, x2, y2);
    }
  }
});

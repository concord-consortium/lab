/*global define: true */
/*jshint eqnull:true */
/**
  Simple, good-enough minimization via gradient descent.
*/
import $__common_console from 'common/console';
// Dependencies.
var console = $__common_console;

export default function minimize(f, x0, opts) {
  opts = opts || {};

  if (opts.precision == null) opts.precision = 0.01;

  var // stop when the absolute difference between successive values of f is this much or less
    precision = opts.precision,

    // array of [min, max] boundaries for each component of x
    bounds = opts.bounds,

    // maximum number of iterations
    maxiter = opts.maxiter || 1000,

    // optionally, stop when f is less than or equal to this value
    stopval = opts.stopval || -Infinity,

    // maximum distance to move x between steps
    maxstep = opts.maxstep || 0.01,

    // multiplied by the gradient
    eps = opts.eps || 0.01,
    dim = x0.length,
    x,
    res,
    f_cur,
    f_prev,
    grad,
    maxstepsq,
    gradnormsq,
    iter,
    i,
    a;

  maxstepsq = maxstep * maxstep;

  // copy x0 into x (which we will mutate)
  x = [];
  for (i = 0; i < dim; i++) {
    x[i] = x0[i];
  }

  // evaluate f and get the gradient
  res = f.apply(null, x);
  f_cur = res[0];
  grad = res[1];

  iter = 0;
  do {
    if (f_cur <= stopval) {
      break;
    }

    if (iter > maxiter) {
      console.log("maxiter reached");
      // don't throw on error, but return some diagnostic information
      return {
        error: "maxiter reached",
        f: f_cur,
        iter: maxiter,
        x: x
      };
    }

    // Limit gradient descent step size to maxstep
    gradnormsq = 0;
    for (i = 0; i < dim; i++) {
      gradnormsq += grad[i] * grad[i];
    }
    if (eps * eps * gradnormsq > maxstepsq) {
      a = Math.sqrt(maxstepsq / gradnormsq) / eps;
      for (i = 0; i < dim; i++) {
        grad[i] = a * grad[i];
      }
    }

    // Take a step in the direction opposite the gradient
    for (i = 0; i < dim; i++) {
      x[i] -= eps * grad[i];

      // check bounds
      if (bounds && x[i] < bounds[i][0]) {
        x[i] = bounds[i][0];
      }
      if (bounds && x[i] > bounds[i][1]) {
        x[i] = bounds[i][1];
      }
    }

    f_prev = f_cur;

    res = f.apply(null, x);
    f_cur = res[0];
    grad = res[1];

    iter++;
  } while (Math.abs(f_cur - f_prev) > precision);

  return [f_cur, x];
};

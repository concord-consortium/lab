/*global define: true */
import $____distributions from './distributions';
import $____utils from './utils';
import minimize from './minimizer';

export default {
  normal: $____distributions.normal,
  getWindowedAverager: $____utils.getWindowedAverager,
  getAngleBetweenVec: $____utils.getAngleBetweenVec,
  minimize: minimize
};

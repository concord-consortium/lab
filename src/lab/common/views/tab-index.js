/*global define*/
/**
 * Views can require this function to get next available tab index.
 */
define(function () {
  var tabIndex = 0;

  return function getNextTabIndex() {
    return tabIndex++;
  };
});

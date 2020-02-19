/**
 * Views can require this function to get next available tab index.
 */
var tabIndex = 0;

export default function getNextTabIndex() {
  return tabIndex++;
};

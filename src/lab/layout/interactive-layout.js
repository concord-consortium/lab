/*global $ layout:true */

layout = layout || {};

//
// Layout for non-embedded 'interactives' page
//

layout.setupInteractiveLayout = function setupInteractiveLayout() {

  var i,
      w,
      h,
      modelWidth,
      modelHeight,
      modelAspectRatio,
      modelWidthFactor,
      viewLists,
      viewSizes = {},
      viewType,
      containerWidth = $('#viz').width();

  // grab 'viewLists' from legacy layout system
  viewLists = layout.views;

  w = $(viewLists.moleculeContainers[0].outerNode).width();
  h = $(viewLists.moleculeContainers[0].outerNode).height();
  modelAspectRatio = w / h;

  // Model container should take up 45% of parent container width...
  modelWidthFactor = 0.45;

  // unless there needs to be room for energy graph *and* thermometer
  if (viewLists.energyGraphs && viewLists.thermometers) {
     modelWidthFactor = 0.35;
  }

  modelWidth = containerWidth * modelWidthFactor;
  modelHeight = modelWidth / modelAspectRatio;

  viewSizes.moleculeContainers = [modelWidth, modelHeight];

  if (viewLists.energyGraphs) {
    viewSizes.energyGraphs = [containerWidth * 0.40, modelHeight];
  }

  for (viewType in viewLists) {
    if (viewLists.hasOwnProperty(viewType) && viewLists[viewType].length) {
      i = -1;  while(++i < viewLists[viewType].length) {
        if (viewSizes[viewType]) {
          viewLists[viewType][i].resize(viewSizes[viewType][0], viewSizes[viewType][1]);
        } else {
          viewLists[viewType][i].resize();
        }
      }
    }
  }

  // FIXME this is a temporary hack ... put in layout code instead of memorializing it in the CSS,
  // which doesn't tend to get reviewed as closely ...  to push the molecule-container down so its
  // top lines up with the energy graph's top exactly. After brief investigation, couldn't tell for
  // sure why the energyGraph container was being pushed down ~5px by the browser...
  $(viewLists.moleculeContainers[0].outerNode).css('top', 5);

};

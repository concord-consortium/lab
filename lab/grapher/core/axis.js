/*globals define, d3 */
//TODO: Should change and newdomain be global variables?

define(function (require) {
  return {
    numberWidthUsingFormatter: function (elem, cx, cy, fontSizeInPixels, numberStr) {
      var testSVG,
          testText,
          bbox,
          width,
          height,
          node;

      testSVG = elem.append("svg")
        .attr("width",  cx)
        .attr("height", cy)
        .attr("class", "graph");

      testText = testSVG.append('g')
        .append("text")
          .attr("class", "axis")
          .attr("x", -fontSizeInPixels/4 + "px")
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .text(numberStr);

      node = testText.node();

      // This code is sometimes called by tests that use d3's jsdom-based mock SVG DOm, which
      // doesn't implement getBBox.
      if (node.getBBox) {
        bbox = testText.node().getBBox();
        width = bbox.width;
        height = bbox.height;
      } else {
        width = 0;
        height = 0;
      }

      testSVG.remove();
      return [width, height];
    },
    axisProcessDrag: function(dragstart, currentdrag, domain) {
      var originExtent, maxDragIn,
          newdomain = domain,
          origin = 0,
          axis1 = domain[0],
          axis2 = domain[1],
          extent = axis2 - axis1;
      if (currentdrag !== 0) {
        if  ((axis1 >= 0) && (axis2 > axis1)) {                 // example: (20, 10, [0, 40]) => [0, 80]
          origin = axis1;
          originExtent = dragstart-origin;
          maxDragIn = originExtent * 0.4 + origin;
          if (currentdrag > maxDragIn) {
            change = originExtent / (currentdrag-origin);
            extent = axis2 - origin;
            newdomain = [axis1, axis1 + (extent * change)];
          }
        } else if ((axis1 < 0) && (axis2 > 0)) {                // example: (20, 10, [-40, 40])       => [-80, 80]
          origin = 0;                                           //          (-0.4, -0.2, [-1.0, 0.4]) => [-1.0, 0.4]
          originExtent = dragstart-origin;
          maxDragIn = originExtent * 0.4 + origin;
          if ((dragstart >= 0 && currentdrag > maxDragIn) || (dragstart  < 0  && currentdrag < maxDragIn)) {
            change = originExtent / (currentdrag-origin);
            newdomain = [axis1 * change, axis2 * change];
          }
        } else if ((axis1 < 0) && (axis2 < 0)) {                // example: (-60, -50, [-80, -40]) => [-120, -40]
          origin = axis2;
          originExtent = dragstart-origin;
          maxDragIn = originExtent * 0.4 + origin;
          if (currentdrag < maxDragIn) {
            change = originExtent / (currentdrag-origin);
            extent = axis1 - origin;
            newdomain = [axis2 + (extent * change), axis2];
          }
        }
      }
      return newdomain;
    }
  };
});

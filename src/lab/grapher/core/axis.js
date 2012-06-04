grapher.axis = {
  axisProcessDrag: function(dragstart, currentdrag, domain) {
    var newdomain = domain,
        origin = 0,
        axis1 = domain[0],
        axis2 = domain[1],
        extent = axis2 - axis1;
    if (currentdrag !== 0) {
      if  ((axis1 >= 0) && (axis2 > axis1)) {      // example: (20, 10, [0, 40]) => [0, 80]
        origin = axis1;
        change = (dragstart-origin) / (currentdrag-origin);
        extent = axis2 - origin;
        newdomain = [axis1, axis1 + (extent * change)];
      } else if ((axis1 < 0) && (axis2 > 0)) {     // example: (20, 10, [-40, 40])       => [-80, 80]
        origin = 0;                                //          (-0.4, -0.2, [-1.0, 0.4]) => [-1.0, 0.4]
        change = (dragstart-origin) / (currentdrag-origin);
        extent = (currentdrag > 0) ? axis2 : axis1;
        newdomain = [axis1 * change, axis2 * change];
      } else if ((axis2 < 0) && (axis1 > 0)) {     // example: (20, 10, [-40, 40])       => [-80, 80]
        origin = 0;                                //          (-0.4, -0.2, [-1.0, 0.4]) => [-1.0, 0.4]
        change = (dragstart-origin) / (currentdrag-origin);
        extent = (currentdrag > 0) ? axis2 : axis1;
        newdomain = [axis1 * change, axis2 * change];
      } else if ((axis1 < 0) && (axis2 < 0)) {     // example: (-60, -50, [-80, -40]) => [-120, -40]
        origin = axis2;
        change = (dragstart-origin) / (currentdrag-origin);
        extent = axis1 - origin;
        newdomain = [axis2 + (extent * change), axis2];
      }
    }
    return newdomain;
  }
};

// ------------------------------------------------------------
//
//   Applet Container
//
// ------------------------------------------------------------

layout.appletContainer = function(e, options) {
  var elem = d3.select(e),
      node = elem.node(),
      cx = elem.property("clientWidth"),
      cy = elem.property("clientHeight"),
      applet, appletString,
      width, height,
      scale_factor,
      padding, size,
      mw, mh, tx, ty, stroke,
      default_options = {
        appletID:             "mw-applet",
        codebase:             "/jnlp",
        code:                 "org.concord.modeler.MwApplet",
        width:                "100%",
        height:               "100%",
        archive:              "org/concord/modeler/mw.jar",
        align:                "left",
        hspace:               "5",
        vspace:               "5",
        params: [
          ["script", "page:0:import /imports/legacy-mw-content/potential-tests/two-atoms-two-elements/two-atoms-two-elements.cml"]
        ]
      };

  if (options) {
    for(var p in default_options) {
      if (options[p] === undefined) {
        options[p] = default_options[p];
      }
    }
  } else {
    options = default_options;
  }

  scale(cx, cy);

  function scale(w, h) {
    if (!arguments.length) {
      cy = elem.property("clientHeight");
      cx = elem.property("clientWidth");
    } else {
      cy = h;
      node.style.height = cy +"px";
      cx = w;
    }
    node.style.width = cx +"px";
    scale_factor = layout.screen_factor;
    if (layout.screen_factor_width && layout.screen_factor_height) {
      scale_factor = Math.min(layout.screen_factor_width, layout.screen_factor_height);
    }
    scale_factor = cx/600;
    padding = {
       "top":    5,
       "right":  5,
       "bottom": 5,
       "left":   5
    };

    height = cy - padding.top  - padding.bottom;
    width  = cx - padding.left  - padding.right;
    size = { "width":  width, "height": height };

    return [cx, cy];
  }

  function container() {
    if (applet === undefined) {
      appletString = generateAppletString();
      node.innerHTML = appletString;
      applet = document.getElementById(options.appletID);
    } else {
      applet.style.width  = size.width;
      applet.style.height = size.height;
      applet.width  = size.width;
      applet.height = size.height;
    }

    function generateAppletString() {
      var i, param, strArray;
      strArray =
        ['<applet id="' + options.appletID + '", codebase="' + options.codebase + '", code="' + options.code + '"',
         '     width="' + options.width + '" height="' + options.height + '" MAYSCRIPT="true"',
         '     archive="' + options.archive + '">',
         '     MAYSCRIPT="true">'];
      for(i = 0; i < options.params.length; i++) {
        param = options.params[i];
        strArray.push('  <param name="' + param[0] + '" value="' + param[1] + '"/>');
      }
      strArray.push('  <param name="MAYSCRIPT" value="true"/>');
      strArray.push('  Your browser is completely ignoring the applet tag!');
      strArray.push('</applet>');
      return strArray.join('\n');
    }

    // make these private variables and functions available
    container.node = node;
    container.scale = scale;
    container.applet = applet;
  }

  container.resize = function(w, h) {
    container.scale(w, h);
  };

  if (node) { container(); }

  return container;
};

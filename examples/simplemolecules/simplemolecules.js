//
// simplemolecules.js
//

// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

var mol_number = 100,
    sample_time = 0.01,
    temperature = 4,
    maximum_model_steps = 5000,
    lj_sigma_min = 1,
    lj_sigma_max = 10,
    lj_epsilon_max = -0.0001,
    lj_epsilon_min = -5.0,
    lennard_jones_potential = [],
    lj_alpha, lj_beta,
    mol_rmin_radius_factor = 0.38,
    frame_number = 0,
    model_stopped;

// ------------------------------------------------------------
//
//   Molecule Container
//
// ------------------------------------------------------------

var mc_graph = {};
mc_graph.title   = "Simple Molecules";
mc_graph.xlabel  = "X position (nm)";
mc_graph.ylabel  = "Y position (nm)";
mc_graph.xmin    = 0,
mc_graph.xmax    = 100,
mc_graph.ymin    = 0,
mc_graph.ymax    = 100,
mc_graph.xdomain = mc_graph.xmax - mc_graph.xmin,
mc_graph.ydomain = mc_graph.ymax - mc_graph.ymin;

// ------------------------------------------------------------
//
// Average Kinetic Energy Graph
//
// ------------------------------------------------------------

var ke_data = [];

var kechart = document.getElementById("ke-chart");

var ke_graph_options = {
  title:     "Kinetic Energy of the System",
  xlabel:    "Model Time (ns)",
  xmin:      0, 
  xmax:      2500,
  sample:    sample_time,
  ylabel:    null,
  ymin:      0.0,
  ymax:      200,
  dataset:   ke_data,
  container: kechart
};

var ke_graph;

function finishSetupKEChart() {
  if (undefined !== ke_graph) {
    ke_graph.setup_graph();
  } else {
    ke_graph = grapher.graph(ke_graph_options);
  }
}

// ------------------------------------------------------------
//
// Speed Distribution Histogram
//
// ------------------------------------------------------------

var speed_graph      = {};
speed_graph.title    = "Distribution of Speeds";
speed_graph.xlabel   = null;
speed_graph.ylabel   = "Count";
speed_graph.xmax     = 2;
speed_graph.xmin     = 0;
speed_graph.ymax     = 20;
speed_graph.ymin     = 0;
speed_graph.quantile = 0.01;

// ------------------------------------------------------------
//
// Lennard-Jones Chart
//
// ------------------------------------------------------------

var lj_graph = {};
lj_graph.title   = "Lennard-Jones potential";
lj_graph.xlabel  = "Radius";
lj_graph.ylabel  = "Potential Energy";

lj_graph.coefficients = lennard_jones.coefficients();

lj_graph.xmax    = lj_graph.coefficients.sigma * 4;
lj_graph.xmin    = 0;
lj_graph.ymax    =  Math.ceil(lj_graph.coefficients.epsilon*-1) + 0.5;
lj_graph.ymin    = -Math.ceil(lj_graph.coefficients.epsilon*-1) - 0.5;

lj_graph.variables = [
  { 
    coefficient:"epsilon", 
    x: lj_graph.coefficients.rmin, 
    y: lj_graph.coefficients.epsilon 
  }, 
  { 
    coefficient:"sigma", 
    x: lj_graph.coefficients.sigma, 
    y: 0 
  }
];

function update_epsilon(e) {
  update_coefficients(lennard_jones.epsilon(e));
}

function update_sigma(s) {
  update_coefficients(lennard_jones.sigma(s));
}

function update_coefficients(coefficients) {
  var sigma   = coefficients.sigma,
      epsilon = coefficients.epsilon,
      rmin    = coefficients.rmin,
      y;

  lj_graph.coefficients.sigma   = sigma;
  lj_graph.coefficients.epsilon = epsilon;
  lj_graph.coefficients.rmin    = rmin;

  lj_graph.xmax    = sigma * 4;
  lj_graph.xmin    = 0;
  lj_graph.ymax    =  Math.ceil(epsilon*-1) + 0.5;
  lj_graph.ymin    = -Math.ceil(epsilon*-1) - 0.5;
  
  lj_graph.variables[0].x = rmin;

  lennard_jones_potential = []
  
  for(var r = sigma * 0.5; r < lj_graph.xmax * 3;  r += 0.05) {
    y = lennard_jones.potential(r)
    if (y < 100) {
      lennard_jones_potential.push([r, y]);
    }
  }
}

update_coefficients(lennard_jones.coefficients());

// ------------------------------------------------------------
//
// Get a few DOM elements
//
// ------------------------------------------------------------

var model_controls = document.getElementById("model-controls");
var model_controls_inputs = model_controls.getElementsByTagName("input");

// ------------------------------------------------------------
//
//   Screen Layout
//
// ------------------------------------------------------------

function setupScreen() {
  var fullscreen = document.fullScreen ||
                   document.webkitIsFullScreen ||
                   document.mozFullScreen;
  
  if(fullscreen) {
    setupFullScreen();
  } else {
    setupRegularScreen()
  }
}

function setupFullScreen() {
  setupFullScreenMoleculeContainer();
  setupFullScreenPotentialChart();
  setupFullScreenSpeedDistributionChart();
  setupFullScreenKEChart();
}

function setupRegularScreen() {
  setupRegularScreenMoleculeContainer();
  setupRegularScreenPotentialChart();
  setupRegularSpeedDistributionChart();
  setupRegularScreenKEChart();
}

//
// Regular Screen Layout
//
function setupRegularScreenMoleculeContainer() {
  moleculecontainer.style.width = document.body.clientWidth * 0.45 +"px";
  moleculecontainer.style.height = document.body.clientWidth * 0.45 + 2 +"px";
  finishSetupMoleculeContainer();
}

function setupRegularScreenPotentialChart() {
  lj_potential_chart.style.width = document.body.clientWidth * 0.25 +"px";
  lj_potential_chart.style.height = document.body.clientWidth * 0.20 +"px";
  finishSetupPotentialChart();
}

function setupRegularSpeedDistributionChart() {
  speed_distribution_chart.style.width = document.body.clientWidth * 0.25 +"px";
  speed_distribution_chart.style.height = document.body.clientWidth * 0.20 +"px";
  finishSetupSpeedDistributionChart();
}

function setupRegularScreenKEChart() {
  kechart.style.width = document.body.clientWidth * 0.50  + 5 +"px";
  kechart.style.height = document.body.clientWidth * 0.25 - 3 +"px";
  finishSetupKEChart();
}

// Full Screen Layout

function setupFullScreenMoleculeContainer() {
  moleculecontainer.style.width = screen.width * 0.48 +"px";
  moleculecontainer.style.height = screen.height * 0.80 + 3 + "px";
  finishSetupMoleculeContainer();
}

function setupFullScreenPotentialChart() {
  lj_potential_chart.style.width = screen.width * 0.22 +"px";
  lj_potential_chart.style.height = screen.height * 0.35 +"px";
  finishSetupPotentialChart();
}

function setupFullScreenSpeedDistributionChart() {
  speed_distribution_chart.style.width = screen.width * 0.22 +"px";
  speed_distribution_chart.style.height = screen.height * 0.35 +"px";
  finishSetupSpeedDistributionChart();
}

function setupFullScreenKEChart() {
  kechart.style.width = screen.width * 0.44 + 5 + "px";
  kechart.style.height = screen.height * 0.45 - 2 +"px";
  finishSetupKEChart();
}

// ------------------------------------------------------------
//
//   Molecule Container
//
// ------------------------------------------------------------

var moleculecontainer = document.getElementById("molecule-container");

var mc_cx, mc_cy, mc_padding, mc_size, 
    mc_mw, mc_mh, mc_tx, mc_ty, mc_stroke, 
    mc_x, mc_downscalex, mc_downx, 
    mc_y, mc_downscaley, mc_downy, 
    mc_dragged,  
    mc_vis, mc_plot, mc_container;

function finishSetupMoleculeContainer() {
  mc_cx = moleculecontainer.clientWidth,
  mc_cy = moleculecontainer.clientHeight,
  mc_padding = {
     "top":    mc_graph.title  ? 36 : 20, 
     "right":                    30, 
     "bottom": mc_graph.xlabel ? 46 : 20,
     "left":   mc_graph.ylabel ? 60 : 45
  },
  mc_size = { 
    "width":  mc_cx - mc_padding.left - mc_padding.right, 
    "height": mc_cy - mc_padding.top  - mc_padding.bottom 
  },
  mc_mw = mc_size.width,
  mc_mh = mc_size.height,
  mc_tx = function(d) { return "translate(" + mc_x(d) + ",0)"; },
  mc_ty = function(d) { return "translate(0," + mc_y(d) + ")"; },
  mc_stroke = function(d) { return d ? "#ccc" : "#666"; }
  // mc_x-scale
  mc_x = d3.scale.linear()
      .domain([mc_graph.xmin, mc_graph.xmax])
      .range([0, mc_mw]),
  
  // drag x-axis logic
  mc_downscalex = mc_x.copy(),
  mc_downx = Math.NaN,
  
  // mc_y-scale (inverted domain)
  mc_y = d3.scale.linear()
      .domain([mc_graph.ymax, mc_graph.ymin])
      .nice()
      .range([0, mc_mh])
      .nice(),
  
  // drag mc_x-axis logic
  mc_downscaley = mc_y.copy(),
  mc_downy = Math.NaN,
  mc_dragged = null;

  if (undefined !== mc_vis) {
    d3.select(moleculecontainer).select("svg")
        .attr("width", mc_cx)
        .attr("height", mc_cy);

    mc_vis.select("svg")
        .attr("width", mc_cx)
        .attr("height", mc_cy);

    mc_vis.select("rect.mc_plot")
      .attr("width", mc_size.width)
      .attr("height", mc_size.height)
      .style("fill", "#EEEEEE");

    mc_vis.select("svg.mc_container")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", mc_size.width)
      .attr("height", mc_size.height)
      .attr("viewBox", "0 0 "+mc_size.width+" "+mc_size.height);
    
    if (mc_graph.title) {
      mc_vis.select("text.title")
          .attr("x", mc_size.width/2)
          .attr("dy","-1em");
    }
    
    if (mc_graph.xlabel) {
      mc_vis.select("text.xlabel")
          .attr("x", mc_size.width/2)
          .attr("y", mc_size.height);
    }
    
    if (mc_graph.ylabel) {
      mc_vis.select("text.ylabel")
          .attr("transform","translate(" + -40 + " " + mc_size.height/2+") rotate(-90)");
    }

    mc_vis.selectAll("g.x").remove();
    mc_vis.selectAll("g.y").remove();
    
    update_molecule_radius();

    particle.attr("cx", function(d) { return mc_x(d.x); })
            .attr("cy", function(d) { return mc_y(d.y); })
            .attr("r",  function(d) { return mc_x(d.radius) });

    label.attr("transform", function(d) {
      return "translate(" + mc_x(d.x) + "," + mc_y(d.y) + ")";
    });

  } else {
    mc_vis = d3.select(moleculecontainer).append("svg:svg")
      .attr("width", mc_cx)
      .attr("height", mc_cy)
      .append("svg:g")
        .attr("transform", "translate(" + mc_padding.left + "," + mc_padding.top + ")");

    mc_plot = mc_vis.append("svg:rect")
      .attr("class", "mc_plot")
      .attr("width", mc_size.width)
      .attr("height", mc_size.height)
      .style("fill", "#EEEEEE");
      
    mc_container = mc_vis.append("svg:svg")
      .attr("class", "mc_container")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", mc_size.width)
      .attr("height", mc_size.height)
      .attr("viewBox", "0 0 "+mc_size.width+" "+mc_size.height);

    // add Chart Title
    if (mc_graph.title) {
      mc_vis.append("svg:text")
          .attr("class", "title")
          .text(mc_graph.title)
          .attr("x", mc_size.width/2)
          .attr("dy","-1em")
          .style("text-anchor","middle");
    }

    // Add the x-axis label
    if (mc_graph.xlabel) {
      mc_vis.append("svg:text")
          .attr("class", "xlabel")
          .text(mc_graph.xlabel)
          .attr("x", mc_size.width/2)
          .attr("y", mc_size.height)
          .attr("dy","2.4em")
          .style("text-anchor","middle");
    }

    // add y-axis label
    if (mc_graph.ylabel) {
      mc_vis.append("svg:g")
          .append("svg:text")
              .attr("class", "ylabel")
              .text(mc_graph.ylabel)
              .style("text-anchor","middle")
              .attr("transform","translate(" + -40 + " " + mc_size.height/2+") rotate(-90)");
    }
  }
  mc_redraw()
};

function mc_redraw() {
  if (d3.event && d3.event.transform && isNaN(mc_downx) && isNaN(mc_downy)) {
      d3.event.transform(x, y);
  };

  var mc_fx = mc_x.tickFormat(10),
      mc_fy = mc_y.tickFormat(10);

  // Regenerate x-ticks…
  var mc_gx = mc_vis.selectAll("g.x")
      .data(mc_x.ticks(10), String)
      .attr("transform", mc_tx);

  mc_gx.select("text")
      .text(mc_fx);

  var mc_gxe = mc_gx.enter().insert("svg:g", "a")
      .attr("class", "x")
      .attr("transform", mc_tx);

  mc_gxe.append("svg:line")
      .attr("stroke", mc_stroke)
      .attr("y1", 0)
      .attr("y2", mc_size.height);

  mc_gxe.append("svg:text")
      .attr("y", mc_size.height)
      .attr("dy", "1em")
      .attr("text-anchor", "middle")
      .text(mc_fx);

  mc_gx.exit().remove();

  // Regenerate y-ticks…
  var mc_gy = mc_vis.selectAll("g.y")
      .data(mc_y.ticks(10), String)
      .attr("transform", mc_ty);

  mc_gy.select("text")
      .text(mc_fy);

  var mc_gye = mc_gy.enter().insert("svg:g", "a")
      .attr("class", "y")
      .attr("transform", mc_ty)
      .attr("background-fill", "#FFEEB6");

  mc_gye.append("svg:line")
      .attr("stroke", mc_stroke)
      .attr("x1", 0)
      .attr("x2", mc_size.width);

  mc_gye.append("svg:text")
      .attr("x", -3)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .text(mc_fy);

  mc_gy.exit().remove();
}

// ------------------------------------------------------------
//
//   Lennard-Jones Potential Chart
//
// ------------------------------------------------------------

var lj_potential_chart = document.getElementById("lj-potential-chart");

var lj_cx, lj_cy, lj_padding, lj_size, 
    lj_mw, lj_mh, lj_tx, lj_ty, lj_stroke,
    lj_x, lj_downx, 
    lj_y, lj_downy, 
    lj_dragged, coefficient_dragged,  
    lj_vis, lj_plot, lj_container;

function finishSetupPotentialChart() {
  lj_cx = lj_potential_chart.clientWidth,
  lj_cy = lj_potential_chart.clientHeight,
  lj_padding = {
     "top":    lj_graph.title  ? 36 : 20, 
     "right":                    30, 
     "bottom": lj_graph.xlabel ? 46 : 20,
     "left":   lj_graph.ylabel ? 60 : 45
  },
  lj_size = { 
    "width":  lj_cx - lj_padding.left - lj_padding.right, 
    "height": lj_cy - lj_padding.top  - lj_padding.bottom 
  },
  lj_mw = lj_size.width,
  lj_mh = lj_size.height,
  lj_tx = function(d) { return "translate(" + lj_x(d) + ",0)"; },
  lj_ty = function(d) { return "translate(0," + lj_y(d) + ")"; },
  lj_stroke = function(d) { return d ? "#ccc" : "#666"; };

  // x-scale
  lj_x = d3.scale.linear()
    .domain([lj_graph.xmin, lj_graph.xmax])
    .range([0, lj_mw]),

  // drag x-axis logic
  lj_downx = Math.NaN,

  // y-scale (inverted domain)
  lj_y = d3.scale.linear()
      .domain([lj_graph.ymax, lj_graph.ymin])
      .nice()
      .range([0, lj_mh])
      .nice(),

  lj_line = d3.svg.line()
      .x(function(d, i) { return lj_x(lennard_jones_potential[i][0]); })
      .y(function(d, i) { return lj_y(lennard_jones_potential[i][1]); }),

  // drag x-axis logic
  lj_downy = Math.NaN,
  lj_dragged = null,
  lj_selected = lj_graph.variables[0],

  // drag coefficients logic
  coefficient_dragged, 
  coefficient_selected = lj_graph.variables[0];
  
  if (undefined !== lj_vis) {
    d3.select(lj_potential_chart).select("svg")
        .attr("width", lj_cx)
        .attr("height", lj_cy);

    lj_vis.select("svg")
        .attr("width", lj_cx)
        .attr("height", lj_cy);

    lj_vis.select("rect.plot")
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .style("fill", "#EEEEEE");

    lj_vis.select("svg.container")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .attr("viewBox", "0 0 "+lj_size.width+" "+lj_size.height);

    lj_vis.select("svg.linebox")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .attr("viewBox", "0 0 "+lj_size.width+" "+lj_size.height);
    
    if (lj_graph.title) {
      lj_vis.select("text.title")
          .attr("x", lj_size.width/2)
          .attr("dy","-1em");
    }
    
    if (lj_graph.xlabel) {
      lj_vis.select("text.xlabel")
          .attr("x", lj_size.width/2)
          .attr("y", lj_size.height);
    }
    
    if (lj_graph.ylabel) {
      lj_vis.select("text.ylabel")
          .attr("transform","translate(" + -40 + " " + lj_size.height/2+") rotate(-90)");
    }

    lj_vis.selectAll("g.x").remove();
    lj_vis.selectAll("g.y").remove();

  } else {

    lj_vis = d3.select(lj_potential_chart).append("svg:svg")
      .attr("width", lj_cx)
      .attr("height", lj_cy)
      .append("svg:g")
        .attr("transform", "translate(" + lj_padding.left + "," + lj_padding.top + ")");

    lj_plot = lj_vis.append("svg:rect")
      .attr("class", "plot")
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .style("fill", "#EEEEEE")
      .attr("pointer-events", "all")
      .call(d3.behavior.zoom().on("zoom", lj_redraw))
      .on("mousedown", function() {
        if (d3.event.altKey) {
            lj_points.push(lj_selected = lj_dragged = d3.svg.mouse(lj_vis.node()));
            lj_update();
            d3.event.preventDefault();
            d3.event.stopPropagation();
        }
      });

    lj_vis.append("svg:svg")
      .attr("class", "linebox")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .attr("viewBox", "0 0 "+lj_size.width+" "+lj_size.height)
      .append("svg:path")
          .attr("class", "line")
          .attr("d", lj_line(lennard_jones_potential))

    // add Chart Title
    if (lj_graph.title) {
      lj_vis.append("svg:text")
          .attr("class", "title")
          .text(lj_graph.title)
          .attr("x", lj_size.width/2)
          .attr("dy","-1em")
          .style("text-anchor","middle");
    }

    // Add the x-axis label
    if (lj_graph.xlabel) {
      lj_vis.append("svg:text")
          .attr("class", "xlabel")
          .text(lj_graph.xlabel)
          .attr("x", lj_size.width/2)
          .attr("y", lj_size.height)
          .attr("dy","2.4em")
          .style("text-anchor","middle");
    }

    // add y-axis label
    if (lj_graph.ylabel) {
      lj_vis.append("svg:g")
          .append("svg:text")
              .attr("class", "ylabel")
              .text( lj_graph.ylabel)
              .style("text-anchor","middle")
              .attr("transform","translate(" + -40 + " " + lj_size.height/2+") rotate(-90)");
    }
    
    lj_vis.on("mousemove", lj_mousemove)
          .on("mouseup", lj_mouseup);

  }
  lj_redraw()
}

function lj_redraw() {
  if (d3.event && d3.event.transform && isNaN(lj_downx) && isNaN(lj_downy)) {
      d3.event.transform(lj_x, lj_y);
  };

  var lj_fx = lj_x.tickFormat(10),
      lj_fy = lj_y.tickFormat(10);

  // Regenerate x-ticks…
  var lj_gx = lj_vis.selectAll("g.x")
      .data(lj_x.ticks(10), String)
      .attr("transform", lj_tx);

  lj_gx.select("text")
      .text(lj_fx);

  var lj_gxe = lj_gx.enter().insert("svg:g", "a")
      .attr("class", "x")
      .attr("transform", lj_tx);

  lj_gxe.append("svg:line")
      .attr("stroke", lj_stroke)
      .attr("y1", 0)
      .attr("y2", lj_size.height);

   lj_gxe.append("svg:text")
       .attr("y", lj_size.height)
       .attr("dy", "1em")
       .attr("text-anchor", "middle")
       .text(lj_fx)
       .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
       .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
       .on("mousedown", function(d) {
            var p = d3.svg.mouse(lj_vis[0][0]);
            lj_downx = lj_x.invert(p[0]);
            // d3.behavior.zoom().off("zoom", redraw);
       });


  lj_gx.exit().remove();

  // Regenerate y-ticks…
  var lj_gy = lj_vis.selectAll("g.y")
      .data(lj_y.ticks(10), String)
      .attr("transform", lj_ty);

  lj_gy.select("text")
      .text(lj_fy);

  var lj_gye = lj_gy.enter().insert("svg:g", "a")
      .attr("class", "y")
      .attr("transform", lj_ty)
      .attr("background-fill", "#FFEEB6");

  lj_gye.append("svg:line")
      .attr("stroke", lj_stroke)
      .attr("x1", 0)
      .attr("x2", lj_size.width);

  lj_gye.append("svg:text")
      .attr("x", -3)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .text(lj_fy)
      .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
      .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
      .on("mousedown", function(d) {
           var p = d3.svg.mouse(lj_vis[0][0]);
           lj_downy = lj_y.invert(p[1]);
           // d3.behavior.zoom().off("zoom", redraw);
      });

  lj_gy.exit().remove();
  lj_update();

}

// ------------------------------------------------------------
//
// Draw the Lennard-Jones function
//
// ------------------------------------------------------------

function lj_update() {
  var epsilon_circle = lj_vis.selectAll("circle")
      .data(lj_graph.variables, function(d) { return d });

  var lj_lines = lj_vis.select("path").attr("d", lj_line(lennard_jones_potential)),
      lj_x_extent = lj_x.domain()[1] - lj_x.domain()[0];
      
  epsilon_circle.enter().append("svg:circle")
      .attr("class", function(d) { return d === coefficient_dragged ? "selected" : null; })
      .attr("cx",    function(d) { return lj_x(d.x); })
      .attr("cy",    function(d) { return lj_y(d.y); })
      .attr("r", 8.0)
      .on("mousedown", function(d) {
        if (d.coefficient == "epsilon") {
          d.x = lj_graph.coefficients.rmin;
        } else {
          d.y = 0
        }
        coefficient_selected = coefficient_dragged = d;
        lj_update();
      });

  epsilon_circle
      .attr("class", function(d) { return d === coefficient_selected ? "selected" : null; })
      .attr("cx",    function(d) { return lj_x(d.x); })
      .attr("cy",    function(d) { return lj_y(d.y); });

  epsilon_circle.exit().remove();

  if (d3.event && d3.event.keyCode) {
    d3.event.preventDefault();
    d3.event.stopPropagation();
  }
}

function lj_mousemove() {
  if (!coefficient_dragged) return;
  lj_potential_chart.onselectstart = function(){ return false; }
  var m = d3.svg.mouse(lj_vis.node()),
    newx, newy;
  if (coefficient_dragged.coefficient == "epsilon") {
    newx = lj_graph.coefficients.rmin;
    newy = lj_y.invert(Math.max(0, Math.min(lj_size.height, m[1])));
    if (newy > lj_epsilon_max) { newy = lj_epsilon_max };
    if (newy < lj_epsilon_min) { newy = lj_epsilon_min };
    update_epsilon(newy);
  } else {
    newy = 0;
    newx = lj_x.invert(Math.max(0, Math.min(lj_size.width, m[0])));
    if (newx < lj_sigma_min) { newx = lj_sigma_min };
    if (newx > lj_sigma_max) { newx = lj_sigma_max };
    update_sigma(newx);
    lj_graph.variables[0].x = lj_graph.coefficients.rmin;
  }
  update_molecule_radius();
  // model.resolve_collisions(molecules);
  model.tick();
  coefficient_dragged.x = newx;
  coefficient_dragged.y = newy;
  lj_update();
}

function lj_mouseup() {
    if (!isNaN(lj_downx)) {
        lj_potential_chart.onselectstart = function(){ return true; }
        lj_redraw();
        lj_downx = Math.NaN;
        d3.event.preventDefault();
        d3.event.stopPropagation();
    }
    if (!isNaN(lj_downy)) {
        lj_redraw();
        lj_downy = Math.NaN;
        d3.event.preventDefault();
        d3.event.stopPropagation();
    }
    coefficient_dragged = null;
}

// ------------------------------------------------------------
//
// Potential Chart axis scaling
//
// attach the mousemove and mouseup to the body
// in case one wanders off the axis line
//
// ------------------------------------------------------------

d3.select(lj_potential_chart)
  .on("mousemove", function(d) {
    var p = d3.svg.mouse(lj_vis[0][0]);
    if (!isNaN(lj_downx)) {
      var rupx = lj_x.invert(p[0]),
        xaxis1 = lj_x.domain()[0],
        xaxis2 = lj_x.domain()[1],
        xextent = xaxis2 - xaxis1;
      if (rupx !== 0) {
          var changex, dragx_factor, new_domain;
          dragx_factor = xextent/lj_downx;
          changex = 1 + (lj_downx / rupx - 1) * (xextent/(lj_downx-xaxis1))/dragx_factor;
          new_domain = [xaxis1, xaxis1 + (xextent * changex)];
          lj_x.domain(new_domain);
          lj_redraw();
      }
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
    if (!isNaN(lj_downy)) {
        var rupy = lj_y.invert(p[1]),
        yaxis1 = lj_y.domain()[1],
        yaxis2 = lj_y.domain()[0],
        yextent = yaxis2 - yaxis1;
      if (rupy !== 0) {
          var changey, dragy_factor, new_range;
          dragy_factor = yextent/lj_downy;
          changey = 1 - (rupy / lj_downy - 1) * (yextent/(lj_downy-yaxis1))/dragy_factor;
          new_range = [yaxis1 + (yextent * changey), yaxis1];
          lj_y.domain(new_range);
          lj_redraw();
      }
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
  })
  .on("mouseup", function(d) {
      if (!isNaN(lj_downx)) {
          lj_redraw();
          lj_downx = Math.NaN;
          d3.event.preventDefault();
          d3.event.stopPropagation();
      }
      if (!isNaN(lj_downy)) {
          lj_redraw();
          lj_downy = Math.NaN;
          d3.event.preventDefault();
          d3.event.stopPropagation();
      }
  });

// ------------------------------------------------------------
//
//   Speed Distribution Histogram
//
// ------------------------------------------------------------

speed_distribution_chart = document.getElementById("speed-distribution-chart");

var speed_cx, speed_cy, speed_padding, speed_size,
    speed_mw, speed_mh, speed_tx, speed_ty, speed_stroke,
    speed_x, speed_y, speed_bar_width, speed_quantile, speed_line_step, speed_y_max,
    speed_vis, speed_plot, speed_bars, speed_line, speed_data, speed_fit;

function generate_speed_data() {
  speed_data = [];
  molecules.map(function(m) { speed_data.push(m.speed) });
  speed_graph.xmax = d3.max(speed_data);
  speed_graph.xmin = d3.min(speed_data);
  speed_graph.quantile = d3.quantile(speed_data, 0.1);
  speed_y_max = speed_graph.ymax;
}

function finishSetupSpeedDistributionChart() {
  speed_cx = speed_distribution_chart.clientWidth,
  speed_cy = speed_distribution_chart.clientHeight,
  speed_padding = {
     "top":    speed_graph.title  ? 36 : 20, 
     "right":                     30,
     "bottom": speed_graph.xlabel ? 46 : 20,
     "left":   speed_graph.ylabel ? 60 : 45
  },
  speed_size = { 
    "width":  speed_cx - speed_padding.left - speed_padding.right, 
    "height": speed_cy - speed_padding.top  - speed_padding.bottom 
  },
  speed_mw = speed_size.width,
  speed_mh = speed_size.height,
  speed_tx = function(d) { return "translate(" + speed_x(d) + ",0)"; },
  speed_ty = function(d) { return "translate(0," + speed_y(d) + ")"; },
  speed_stroke = function(d) { return d ? "#ccc" : "#666"; };

  generate_speed_data();

  // x-scale
  speed_x = d3.scale.linear()
    .domain([speed_graph.xmin, speed_graph.xmax])
    .range([0, speed_mw]);

  speed_bins = d3.layout.histogram().frequency(false).bins(speed_x.ticks(60))(speed_data);
  speed_bar_width = (speed_size.width - speed_bins.length)/speed_bins.length;
  speed_line_step = (speed_graph.xmax - speed_graph.xmin)/speed_bins.length;
  speed_max  = d3.max(speed_bins, function(d) { return d.y });

  // y-scale
  speed_y = d3.scale.linear()
      .domain([speed_graph.ymax, speed_graph.ymin])
      .nice()
      .range([0, speed_mh]);

  if (undefined !== speed_vis) {
    
    d3.select(speed_distribution_chart).select("svg")
      .attr("width", speed_cx)
      .attr("height", speed_cy);

    speed_vis.select("rect.plot")
      .attr("width", speed_size.width)
      .attr("height", speed_size.height);

    if (speed_graph.title) {
      speed_vis.select("text.title")
          .attr("x", speed_size.width/2)
          .attr("dy","-1em");
    }
    
    if (speed_graph.xlabel) {
      speed_vis.select("text.xlabel")
          .attr("x", speed_size.width/2)
          .attr("y", speed_size.height);
    }
    
    if (speed_graph.ylabel) {
      speed_vis.select("text.ylabel")
          .attr("transform","translate(" + -40 + " " + speed_size.height/2+") rotate(-90)");
    }
    
    speed_vis.selectAll("g.x").remove();
    speed_vis.selectAll("g.y").remove();

  } else {

    speed_vis = d3.select(speed_distribution_chart).append("svg:svg")
      .attr("width", speed_cx)
      .attr("height", speed_cy)
      .append("svg:g")
        .attr("transform", "translate(" + speed_padding.left + "," + speed_padding.top + ")");

    speed_plot = speed_vis.append("svg:rect")
      .attr("class", "plot")
      .attr("width", speed_size.width)
      .attr("height", speed_size.height)
      .style("fill", "#EEEEEE")

    // add Chart Title
    if (speed_graph.title) {
      speed_vis.append("svg:text")
          .attr("class", "title")
          .text(speed_graph.title)
          .attr("x", speed_size.width/2)
          .attr("dy","-1em")
          .style("text-anchor","middle");
    }

    // Add the x-axis label
    if (speed_graph.xlabel) {
      speed_vis.append("svg:text")
          .attr("class", "xlabel")
          .text(speed_graph.xlabel)
          .attr("x", speed_size.width/2)
          .attr("y", speed_size.height)
          .attr("dy","2.4em")
          .style("text-anchor","middle");
    }

    // add y-axis label
    if (speed_graph.ylabel) {
      speed_vis.append("svg:g")
          .append("svg:text")
              .attr("class", "ylabel")
              .text( speed_graph.ylabel)
              .style("text-anchor","middle")
              .attr("transform","translate(" + -40 + " " + speed_size.height/2+") rotate(-90)");
    }
  }
  speed_redraw()
}

function speed_redraw() {
  if (d3.event && d3.event.transform && isNaN(speed_downx) && isNaN(speed_downy)) {
      d3.event.transform(speed_x, speed_y);
  };
  
  var speed_fx = speed_x.tickFormat(5),
      speed_fy = speed_y.tickFormat(5);
  
  // Regenerate x-ticks…
  // var speed_gx = speed_vis.selectAll("g.x")
  //     .data(speed_x.ticks(5), String)
  //     .attr("transform", speed_tx);
  // 
  // speed_gx.select("text")
  //     .text(speed_fx);
  // 
  // var speed_gxe = speed_gx.enter().insert("svg:g", "a")
  //     .attr("class", "x")
  //     .attr("transform", speed_tx);
  // 
  // speed_gxe.append("svg:line")
  //     .attr("stroke", speed_stroke)
  //     .attr("y1", 0)
  //     .attr("y2", speed_size.height);
  // 
  //  speed_gxe.append("svg:text")
  //      .attr("y", speed_size.height)
  //      .attr("dy", "1em")
  //      .attr("text-anchor", "middle")
  //      .text(speed_fx)
  //      .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
  //      .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
  //      .on("mousedown", function(d) {
  //           var p = d3.svg.mouse(speed_vis[0][0]);
  //           speed_downx = speed_x.invert(p[0]);
  //           speed_downscalex = null;
  //           speed_downscalex = speed_x.copy();
  //           // d3.behavior.zoom().off("zoom", redraw);
  //      });
  // 
  // speed_gx.exit().remove();
  
  // Regenerate y-ticks…
  var speed_gy = speed_vis.selectAll("g.y")
      .data(speed_y.ticks(5), String)
      .attr("transform", speed_ty);
  
  speed_gy.select("text")
      .text(speed_fy);
  
  var speed_gye = speed_gy.enter().insert("svg:g", "a")
      .attr("class", "y")
      .attr("transform", speed_ty)
      .attr("background-fill", "#FFEEB6");
  
  speed_gye.append("svg:line")
      .attr("stroke", speed_stroke)
      .attr("x1", 0)
      .attr("x2", speed_size.width);
  
  speed_gye.append("svg:text")
      .attr("x", -3)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .text(speed_fy)
      .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
      .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
      .on("mousedown", function(d) {
           var p = d3.svg.mouse(speed_vis[0][0]);
           speed_downy = speed_y.invert(p[1]);
           speed_downscaley = speed_y.copy();
           // d3.behavior.zoom().off("zoom", redraw);
      });
  
  speed_gy.exit().remove();
  speed_update();

}

// ------------------------------------------------------------
//
// Draw the Speed Distribution
//
// ------------------------------------------------------------
function speed_update() {
  generate_speed_data();

  speed_kde = science.stats.kde().sample(speed_data);
  speed_x.domain([speed_graph.xmin, speed_graph.xmax]);
  speed_bins = d3.layout.histogram().frequency(true).bins(speed_x.ticks(60))(speed_data);

  speed_bar_width = (speed_size.width - speed_bins.length)/speed_bins.length;
  speed_line_step = (speed_graph.xmax - speed_graph.xmin)/speed_bins.length;
  speed_max  = d3.max(speed_bins, function(d) { return d.y });

  speed_vis.selectAll("g.bar").remove();

  speed_bars = speed_vis.selectAll("g.bar")
      .data(speed_bins);

  speed_bars.enter().append("svg:g")
      .attr("class", "bar")
      .attr("transform", function(d, i) {
        return "translate(" + speed_x(d.x) + "," + (speed_mh - speed_y(speed_y_max - d.y)) + ")";
      })
      .append("svg:rect")
        .attr("class", "bar")
        .attr("fill", "steelblue")
        .attr("width", speed_bar_width)
        .attr("height", function(d) { 
            return speed_y(speed_y_max - d.y); 
          });
}

// ------------------------------------------------------------
//
//   Molecular Model Setup
//
// ------------------------------------------------------------

var links = [],
    molecules,
    model;

function generate_molecules(num) {
  var radius = lj_graph.coefficients.rmin * mol_rmin_radius_factor,
      px, py, x, y, vx, vy, speed;
  speed_data = [];
  molecules = d3.range(num).map(function(i) { 
    px = Math.random() * mc_graph.xdomain * 0.8 + mc_graph.xdomain * 0.1, 
    py = Math.random() * mc_graph.ydomain * 0.8 + mc_graph.ydomain * 0.1,
    x  = px + Math.random() * temperature/100 - temperature/200, 
    y  = py + Math.random() * temperature/100 - temperature/200,
    vx = x - px,
    vy = y - py;
    speed = Math.sqrt(vx * vx + vy * vy);
    speed_data.push(speed);
    return { 
      index: i,
      radius: radius,
      px: px,
      py: py,
      x:  x,
      y:  y,
      vx: vx,
      vy: vy,
      speed: speed,
      ax: 0,
      ay: 0
    } 
  });
}

function update_molecule_radius() {
  var r = lj_graph.coefficients.rmin * mol_rmin_radius_factor;
  molecules.forEach(function(m) { m.radius = r });
  mc_container.selectAll("circle")
      .data(molecules)
    .attr("r",  function(d) { return mc_x(d.radius) });
  mc_container.selectAll("text")
    .attr("font-size", mc_x(r * 1.3) );
}

function modelSetup() {
  generate_molecules(mol_number);
  model = modeler.layout.model()
    .size([mc_graph.xdomain, mc_graph.ydomain])
    .ljforce(lennard_jones.force)
    .nodes(molecules)
    .initialize();
  ke_data = [model.ke()];
}

var particle, label, labelEnter, tail;

var molecule_div = d3.select("#viz").append("div")
    .attr("class", "tooltip")
    .style("opacity", 1e-6);

var molecule_div_pre = molecule_div.append("pre")

function setup_particles() {
  mc_container.selectAll("circle").remove();
  mc_container.selectAll("g").remove();

  var font_size = mc_x(lj_graph.coefficients.rmin * mol_rmin_radius_factor * 1.3);

  label = mc_container.selectAll("g.label")
        .data(molecules);

  labelEnter = label.enter().append("svg:g")
      .attr("class", "label")
      .attr("transform", function(d) {
        return "translate(" + mc_x(d.x) + "," + mc_y(d.y) + ")";
      });
  
  labelEnter.append("svg:text")
      .attr("class", "index")
      .attr("font-size", font_size)
      .attr("x", 0)
      .attr("y", "0.31em")
      .text(function(d) { return d.index; });

  particle = mc_container.selectAll("circle")
      .data(molecules)
    .enter().append("svg:circle")
      .attr("r",  function(d) { return mc_x(d.radius); })
      .attr("cx", function(d) { return mc_x(d.x); })
      .attr("cy", function(d) { return mc_y(d.y); })
      .style("fill", function(d, i) { return "#2ca02c"; })
      .on("mousedown", molecule_mousedown)
      .on("mouseout", molecule_mouseout);
}

function molecule_mouseover(d) {
  // molecule_div.transition()
  //       .duration(250)
  //       .style("opacity", 1);
}

function molecule_mousedown(d) {
  molecule_div
        .style("opacity", 1)
        .style("left", (d3.event.pageX + 6) + "px")
        .style("top", (d3.event.pageY - 30) + "px")
        .transition().duration(250);

  molecule_div_pre.text(
      "speed: " + d3.format("6.3f")(d.speed) + "\n" +
      "vx:    " + d3.format("6.3f")(d.vx)    + "\n" +
      "vy:    " + d3.format("6.3f")(d.vy)    + "\n"
    )
}

function molecule_mousemove(d) {
}

function molecule_mouseout() {
  molecule_div.style("opacity", 1e-6);
}

function modelController() {
  for(i = 0; i < this.elements.length; i++) {
      if (this.elements[i].checked) { run_mode = this.elements[i].value; }
  }
  switch(run_mode) {
    case "stop":
      modelStop();
      break;
    case "step":
      modelStep();
      break;
    case "go":
      modelGo();
      break;
    case "reset":
      modelReset();
      break;
  }
}

model_controls.onchange = modelController;

function modelStop() {
  model_stopped = true;
  model.stop();
  ke_graph.hide_canvas();
  // ke_graph.new_data(ke_data);
  model_controls_inputs[0].checked = true;
}

function modelStep() {
  model_stopped = true;
  model.stop();
  if (model.stepCounter() < maximum_model_steps) {
    model.stepForward();
    ke_graph.hide_canvas();
    model_controls_inputs[0].checked = true;
  } else {
    model_controls_inputs[0].checked = true
  }
}

function modelGo() {
  model_stopped = false;
  model.on("tick", model_listener);
  if (model.stepCounter() < maximum_model_steps) {
    ke_graph.show_canvas();
    model.resume();
    model_controls_inputs[2].checked = true;
  } else {
    model_controls_inputs[0].checked = true
  }
}

function modelStepBack() {
  modelStop();
  model.stepBack();
  ke_graph.new_data(ke_data);
}

function modelStepForward() {
  model_stopped = true;
  if (model.stepCounter() < maximum_model_steps) {
    model.stepForward();
  } else {
    model_controls_inputs[0].checked = true
  }
}

function modelReset() {
  modelStop();
  modelSetup();
  setup_particles();
  model.temperature(temperature);
  step_counter = model.stepCounter();
  displayStats();
  // ke_data = [model.ke()];
  ke_graph.new_data(ke_data);
  ke_graph.hide_canvas();
  model_controls_inputs[0].checked = true;
}

// ------------------------------------------------------------
//
// Display Model Statistics
//
// ------------------------------------------------------------

var stats = document.getElementById("stats");

function displayStats() {
  stats.textContent =
    "Time: "     + d3.format("5.2f")(model.stepCounter() * sample_time) + " (ns), " +
    "KE: "       + d3.format("7.1f")(model.ke()) + ", " +
    "Pressure: " + d3.format("6.3f")(model.pressure());
}

// ------------------------------------------------------------
//
// Finish screen layout, initialize and start model
//
// ------------------------------------------------------------

modelSetup()
setupScreen();
modelReset();

// ------------------------------------------------------------
//
// Main callback from model process
//
// Pass this function to be called by the model on every model step
//
// ------------------------------------------------------------

var model_listener = function(e) {
  var ke = model.ke(),
      step_counter = model.stepCounter(),
      total_steps = model.steps();
  
  speed_update();
  

  label.attr("transform", function(d) {
      return "translate(" + mc_x(d.x) + "," + mc_y(d.y) + ")";
    });

  particle.attr("cx", function(d) { return mc_x(d.x); })
          .attr("cy", function(d) { return mc_y(d.y); })
          .attr("r",  function(d) { return mc_x(d.radius) });

  if (model.isNewStep()) {
    ke_data.push(ke);
    if (model_stopped) {
      ke_graph.add_point(ke);
      ke_graph.update_canvas();
    } else {
      ke_graph.add_canvas_point(ke)
    }
  } else {
    ke_graph.update();
  }
  if (step_counter > 0.95 * ke_graph.xmax && ke_graph.xmax < maximum_model_steps) {
    ke_graph.change_xaxis(ke_graph.xmax * 2);
  }
  if (step_counter >= maximum_model_steps) { modelStop(); }
  displayStats();
}

// ------------------------------------------------------------
//
//  Wire up screen-resize handlers
//
// ------------------------------------------------------------

document.onwebkitfullscreenchange = setupScreen;
window.onresize = setupScreen;

// ------------------------------------------------------------
//
// Handle keyboard shortcuts for model operation
//
// ------------------------------------------------------------

function handleKeyboardForModel(evt) {
  evt = (evt) ? evt : ((window.event) ? event : null); 
  if (evt) {
    switch (evt.keyCode) {
      case 32:                // spacebar
      model_stopped ? modelGo() : modelStop(); 
      evt.preventDefault();
      break;
      case 13:                // return
      modelGo();
      evt.preventDefault();
      break;
      case 37:                // left-arrow
      modelStepBack();
      evt.preventDefault();
      break;
      case 39:                // right-arrow
      modelStepForward();
      evt.preventDefault();
      break;
    }
  }
}

document.onkeydown = handleKeyboardForModel;

// ------------------------------------------------------------
//
// Molecule Number Selector
//
// ------------------------------------------------------------

var select_molecule_number = document.getElementById("select-molecule-number");


function selectMoleculeNumberChange() {
  mol_number = +select_molecule_number.value;

  var ke_yxais_map = {
    2: 1,
    5: 5,
    10: 10,
    20: 20,
    50: 100,
    100: 500,
    200: 2000
  }
  
  ke_graph.change_yaxis(ke_yxais_map[mol_number])
  modelReset();
}

select_molecule_number.onchange = selectMoleculeNumberChange;

select_molecule_number.value = mol_number;

// ------------------------------------------------------------
//
// Temperature Selector
//
// ------------------------------------------------------------

var select_temperature = document.getElementById("select-temperature");

if (Modernizr['inputtypes']['range']) {
  var temp_range = document.createElement("input");
  temp_range.type = "range";
  temp_range.min = "0";
  temp_range.max = "10";
  temp_range.step = "0.5";
  temp_range.value = "5";
  select_temperature.parentNode.replaceChild(temp_range, select_temperature);
  temp_range.id = "select-temperature";
  select_temperature = temp_range;
  var select_temperature_display = document.createElement("span");
  select_temperature_display.id = "select-temperature-display"
  select_temperature_display.innerText = temperature;
  select_temperature.parentNode.appendChild(select_temperature_display);
}

function selectTemperatureChange() {
  temperature = +select_temperature.value;
  if (select_temperature.type === "range") {
    select_temperature_display.innerText = d3.format("4.1f")(temperature);
  }
  model.temperature(temperature);
}

select_temperature.onchange = selectTemperatureChange;

select_temperature.value = d3.format("4.1f")(temperature);
select_temperature_display.innerText = d3.format("4.1f")(temperature);

// ------------------------------------------------------------
//
// Benchmarks
//
// ------------------------------------------------------------

var start_benchmarks = document.getElementById("start-benchmarks");
var benchmarks_table = document.getElementById("benchmarks-table");

var benchmarks_to_run = [
  {
    name: "molecules",
    run: function() {
      return mol_number
    }
  },
  {
    name: "temperature",
    run: function() {
      return temperature
    }
  },
  {
    name: "100 Steps (steps/s)",
    run: function() {
      modelStop();
      var start = +Date.now();
      var i = -1;
      while (i++ < 100) {
        model.tick();
      }
      elapsed = Date.now() - start;
      return d3.format("5.1f")(100/elapsed*1000)
    }
  },
  {
    name: "100 Steps w/graphics",
    run: function() {
      modelStop();
      var start = +Date.now();
      var i = -1;
      while (i++ < 100) {
        model.tick();
        model_listener();
      }
      elapsed = Date.now() - start;
      return d3.format("5.1f")(100/elapsed*1000)
    }
  }
];

benchmarks_table.style.display = "none";

start_benchmarks.onclick = function() {
  benchmark.run(benchmarks_table, benchmarks_to_run)
};

// ------------------------------------------------------------
//
// Start the model after everything else ...
//
// ------------------------------------------------------------

modelGo();

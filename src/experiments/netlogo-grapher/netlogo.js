/*global Lab */

//     netlogo.js 0.1.0

(function() {

// Initial Setup
// -------------

// The top-level namespace. All public classes will be attached to netlogo.

var netlogo = {};
var root = this;

netlogo.VERSION = '0.1.0';

// netlogo.AppletGrapher
// -----------------

// Create a new grapher.
//
// Parameters:
//
// - **applet**: the actual java netlogo applet element
// - **container**: a div that contains the element referenced by the graph object
// - **graph**: a graph object to send data to
//   is being assigned to followed by '.JsListener()'.
// - **appletReadyCallback**: optional function to call when applet is ready
//
// Here's an example:
//
//     var a = document.getElementById("netlogo-applet");
//     var g =  document.getElementById("graph");
//     ag = new netlogo.AppletGrapher(a, g, st, "ag.JsListener()");

netlogo.AppletGrapher = function(applet, modelConfig, buttonList, graphList, globalsTable, worldState, appletReadyCallback) {
  this.modelConfig = modelConfig;
  this.applet = applet;
  this.graphList = graphList;
  this.graphs = this.createGraphs(modelConfig.graphs);
  this.buttonList = buttonList;
  this.additionalButtons = modelConfig.netLogoButtons;
  this.modelInitialization = modelConfig.modelInitialization;
  this.globalsTable = globalsTable;
  this.worldState = worldState;
  this.nlogo_elements = document.getElementsByClassName("nlogo");
  this.globals = [];
  this.time = 0;
  this.appletInitializationTimer = false;
  this.appletReadyCallback = appletReadyCallback;
  this.StartAppletInitializationTimer();
};

// Setup a timer to check every 250 ms to see if the Java applet
// has finished loading and is initialized.
netlogo.AppletGrapher.prototype.StartAppletInitializationTimer = function() {
  this.applet.ready = false;
  this.applet.checked_more_than_once = false;
  var self = this;
  window.setTimeout (function()  { self.isAppletReady(); }, 250);
};

//
// NetLogo Applet Loading Handler
//
// Wait until the applet is loaded and initialized before enabling buttons
// and creating JavaScript variables for Java objects in the applet.
//
netlogo.AppletGrapher.prototype.isAppletReady = function() {
  var self = this;
  try {
    self.applet.ready = self.applet.panel();
  } catch (e) {
    // Do nothing--we'll try again in the next timer interval.
  }
  if(self.applet.ready) {
    self.nl_setup_objects();
    if (this.modelInitialization) {
      self.nl_obj_panel.commandLater(this.modelInitialization);
    }
    self.update_globals_table();
    self.sw = new applet.Packages.java.io.StringWriter();
    self.pw = new applet.Packages.java.io.PrintWriter(self.sw);
    self.AddButtons();
    self.enable_nlogo_elements();
    if (typeof this.appletReadyCallback === 'function') {
      this.appletReadyCallback();
    }
    if(self.applet.checked_more_than_once) {
      clearInterval(self.applet.checked_more_than_once);
      self.applet.checked_more_than_once = false;
    }
  } else {
    if(!self.applet.checked_more_than_once) {
      self.applet.checked_more_than_once = window.setInterval(function() { self.isAppletReady(); }, 250);
    }
  }
};

netlogo.AppletGrapher.prototype.createGraphs = function(graphConfigs) {
  var i, gconfig, $chart, graph, graphs = [];
  $(this.graphList).empty();
  for (i=0; i < graphConfigs.length; i++) {
    gconfig = graphConfigs[i];
    $("#chart" + i).remove();
    $chart = $('<div />').addClass("chart").attr("id", "chart" + i);
    $chart.height((this.modelConfig.size.height+90)/graphConfigs.length);
    $(this.graphList).append($chart);
    graphs.push({
      "graph": Lab.grapher.graph("#chart" + i, gconfig.graphOptions),
      "dataArray": [],
      "graphVariables": gconfig.graphVariables
    });
  }
  return graphs;
};

//
// Create these JavaScript objects to provide access to the
// corresponding Java objects in NetLogo.
//
netlogo.AppletGrapher.prototype.nl_setup_objects = function() {
  this.nl_obj_panel     = this.applet.panel();                                           // org.nlogo.lite.Applet object
  this.nl_obj_workspace = this.nl_obj_panel.workspace();                                 // org.nlogo.lite.LiteWorkspace
  this.nl_obj_world     = this.nl_obj_workspace.org$nlogo$lite$LiteWorkspace$$world;     // org.nlogo.agent.World
  this.nl_obj_program   = this.nl_obj_world.program();                                   // org.nlogo.api.Program
  this.nl_obj_observer  = this.nl_obj_world.observer();
  this.nl_obj_globals   = this.nl_obj_program.globals();
};

//
// NetLogo command interface
//
netlogo.AppletGrapher.prototype.nl_cmd_start = function() {
  this.nl_obj_panel.commandLater("set done false while [not done] [ execute ]");
};

netlogo.AppletGrapher.prototype.nl_cmd_stop = function() {
  var i;
  this.nl_obj_panel.commandLater("set done true");
  while(this.nl_obj_workspace.jobManager.anyPrimaryJobs()) {
    for(i=0; i < 10; i++) {
      Math.sqrt(i);
    }
  }
};

netlogo.AppletGrapher.prototype.nl_cmd_execute = function(cmd) {
  this.nl_obj_panel.commandLater(cmd);
};

netlogo.AppletGrapher.prototype.nl_cmd_save_state = function() {
  this.nl_obj_world.exportWorld(pw, true);
  this.nl_obj_state = sw.toString();
};

netlogo.AppletGrapher.prototype.nl_cmd_restore_state = function() {
  if (this.nl_obj_state) {
    var sr = new applet.Packages.java.io.StringReader(nl_obj_state);
    this.nl_obj_workspace.importWorld(sr);
    this.nl_obj_panel.commandLater("display");
  }
};

netlogo.AppletGrapher.prototype.nl_cmd_reset = function() {
  this.nl_cmd_stop();
  this.nl_obj_panel.commandLater("startup");
};

//
// Managing the NetLogo data polling system
//
netlogo.AppletGrapher.prototype.startNLDataPoller = function() {
  var self = this;
  self.applet.data_poller = window.setInterval(function() { self.nlDataPoller(); }, 200);
};

netlogo.AppletGrapher.prototype.stopNLDataPoller = function() {
  if (this.applet.data_poller) {
    clearInterval(this.applet.data_poller);
    this.applet.data_poller = false;
  }
};

netlogo.AppletGrapher.prototype.nlDataPoller = function() {
  var i, j, graph, newDatum,
      self = this;
  for (i=0; i < self.graphs.length; i++) {
    graph = self.graphs[i];
    if (graph.graphVariables.length > 0) {
      if (graph.graphVariables.length > 1) {
        newDatum = [];
        for (j=0; j<graph.graphVariables.length; j++) {
          newDatum.push(self.nl_obj_observer.getVariable(graph.graphVariables[j]));
        }
      } else {
        newDatum = [graph.dataArray.length, self.nl_obj_observer.getVariable(graph.graphVariables[0])];
      }
      graph.dataArray.push(newDatum);
      graph.graph.add_data([newDatum]);
    }
  }
};

netlogo.AppletGrapher.prototype.resetGraphs = function() {
  var i, graph;
  for (i=0; i < this.graphs.length; i++) {
    graph = this.graphs[i];
    graph.dataArray.length = 0;
    graph.graph.data([]);
    graph.graph.reset();
  }
};

netlogo.AppletGrapher.prototype.update_globals_table = function() {
  var  i, tr, th, td;
  if (this.globalsTable.hasChildNodes()) {
    while (this.globalsTable.childNodes.length >= 1) {
      this.globalsTable.removeChild(this.globalsTable.firstChild);
    }
  }
  for(i = 0; i < this.nl_obj_globals.size(); i++) {
    this.globals[i] = this.nl_obj_globals.get(i);
    tr = document.createElement('tr');
    td = document.createElement('td');
    td.textContent = i;
    tr.appendChild(td);
    td = document.createElement('td');
    td.textContent = this.globals[i];
    tr.appendChild(td);
    td = document.createElement('td');
    td.classList.add("left");
    td.textContent = this.nl_obj_observer.getVariable(i);
    tr.appendChild(td);
    this.globalsTable.appendChild(tr);
  }
};

//
// add the css class "inactive" to all dom elements that include the class "nlogo"
//
netlogo.AppletGrapher.prototype.disable_nlogo_elements = function() {
  this.nlogo_elements = document.getElementsByClassName("nlogo");
  for (i=0; i < nlogo_elements.length; i++) {
    this.nlogo_elements[i].classList.add("inactive");
  }
};

//
// add the css class "active" to all dom elements that include the class "nlogo"
//
netlogo.AppletGrapher.prototype.enable_nlogo_elements = function() {
  this.nlogo_elements = document.getElementsByClassName("nlogo");
  for (i=0; i < this.nlogo_elements.length; i++) {
    this.nlogo_elements[i].classList.remove("inactive");
    this.nlogo_elements[i].classList.add("active");
  }
};

// watch_sunray_button.onclick = function() {
//   nl_cmd_execute("watch one-of sunrays with [ycor > (max-pycor / 2 ) and heading > 90 ]");
// };
//
// netlogo.AppletGrapher.prototype.update_globals_button.onclick = function() {
//   this.update_globals_table();
// };

//
// button/view helpers
//
netlogo.AppletGrapher.prototype.run_button_run = function() {
  this.nl_cmd_start();
  this.startNLDataPoller();
  this.runButton.textContent = "Stop";
};

netlogo.AppletGrapher.prototype.run_button_stop = function() {
  this.nl_cmd_stop();
  this.stopNLDataPoller();
  this.runButton.textContent = "Run";
};

// Add the **Run**, and **Reset** buttons.
netlogo.AppletGrapher.prototype.AddButtons = function() {
  var i;
  //
  // Run Button
  //
  this.runButton = document.createElement('button');
  this.AddButton(this.buttonList, this.runButton, 'Run');

  netlogo.AppletGrapher.prototype.runButtonHandler = function() {
    var self = this;
    return function() {
      if (self.runButton.textContent == "Run") {
        self.run_button_run();
      } else {
        self.run_button_stop();
      }
      return true;
    };
  };
  this.runButton.onclick = this.runButtonHandler();

  //
  // Reset Button
  //
  this.resetButton = document.createElement('button');
  this.AddButton(this.buttonList, this.resetButton, 'Reset');

  netlogo.AppletGrapher.prototype.resetButtonHandler = function() {
    var self = this;
    return function() {
      self.run_button_stop();
      self.nl_cmd_reset();
      self.resetGraphs();
      self.update_globals_table();
      return true;
    };
  };
  this.resetButton.onclick = this.resetButtonHandler();

  for(i = 0; i < this.additionalButtons.length; i++) {
    var b = this.additionalButtons[i];
    b.obj_panel = this.nl_obj_panel;
    this[b.name] = document.createElement('button');
    this.AddButton(this.buttonList, this[b.name], b.name);
    this[b.name].onclick = function() {
      var cmd = b.cmd,
          objPanel = b.obj_panel;
      objPanel.commandLater(cmd);
    };
  }
};

// Add a single button.
netlogo.AppletGrapher.prototype.AddButton = function(list, button, name) {
  li = document.createElement('li');
  list.appendChild(li);
  button.classname = 'nlogo';
  button.innerHTML = name;
  li.appendChild(button);
  return button;
};


// export namespace
if (root !== 'undefined') root.netlogo = netlogo;
})();

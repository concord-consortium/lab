/*global browser:true */

var applet                  = document.getElementById("applet"),
    world_state             = document.getElementById("world-state"),
    globals_table           = document.getElementById("globals-table"),
    save_state_button       = document.getElementById("save-state-button"),
    restore_state_button    = document.getElementById("restore-state-button"),
    update_globals_button   = document.getElementById("update-globals-button"),
    run_button              = document.getElementById("run-button"),
    reset_button            = document.getElementById("reset-button"),
    watch_sunray_button     = document.getElementById("watch-sunray-button"),
    nl_obj_panel,           // org.nlogo.lite.Applet object
    nl_obj_workspace,       // org.nlogo.lite.LiteWorkspace
    nl_obj_world,           // org.nlogo.agent.World
    nl_obj_program,         // org.nlogo.api.Program
    nl_obj_state, 
    nl_obj_observer, 
    nl_obj_globals, 
    sw, 
    pw, 
    nlogo_elements,
    globals = [], i,
    data_array = [],
    graph;

window.onload=function() {
  disable_nlogo_elements();
  appletLoadingStr = "NetLogo Applet Loading ...",
  graphOptions = {
    title: "Temperature of Atmosphere",
    xlabel:    "Time",
    xmin: 0, xmax: 300,
    ylabel:    "Temperature",
    ymin: 0, ymax: 20,
    points: [],
    circleRadius: false,
    dataChange: false
  };
  graph = grapher.graph("#chart", graphOptions);

  //
  // NetLogo Applet Loading Handler
  //
  // Wait until the applet is loaded and initialized before enabling buttons
  // and creating JavaScript variables for Java objects in the applet.
  //
  applet.ready = false;
  applet.checked_more_than_once = false;
  window.setTimeout (function()  { isAppletReady(); }, 250);

  function isAppletReady() {
    try {
      applet.ready = applet.panel();
    } catch (e) {
      // Do nothing--we'll try again in the next timer interval.
    }
    if(applet.ready) {
      nl_setup_objects();
      nl_obj_panel.commandLater("set done true");
      update_globals_table();
      sw = new applet.Packages.java.io.StringWriter();
      pw = new applet.Packages.java.io.PrintWriter(sw);
      enable_nlogo_elements();
      if(applet.checked_more_than_once) {
        clearInterval(applet.checked_more_than_once);
        applet.checked_more_than_once = false;
      }
    } else {
      if(!applet.checked_more_than_once) {
        applet.checked_more_than_once = window.setInterval(function() { isAppletReady(); }, 250);
      }
    }
  }

  //
  // Create these JavaScript objects to provide access to the
  // corresponding Java objects in NetLogo.
  //
  function nl_setup_objects() {
    nl_obj_panel     = applet.panel();
    nl_obj_workspace = nl_obj_panel.workspace();
    nl_obj_world     = nl_obj_workspace.org$nlogo$lite$LiteWorkspace$$world;
    nl_obj_program   = nl_obj_world.program();
    nl_obj_observer  = nl_obj_world.observer();
    nl_obj_globals   = nl_obj_program.globals();
  }
  //
  // NetLogo command interface
  //
  function nl_cmd_start() {
    nl_obj_panel.commandLater("set done false while [not done] [ execute ]");
  }

  function nl_cmd_stop() {
    var i;
    nl_obj_panel.commandLater("set done true");
    while(nl_obj_workspace.jobManager.anyPrimaryJobs()) {
      for(i=0; i < 10; i++) {
        Math.sqrt(i);
      }
    }
  }

  function nl_cmd_execute(cmd) {
    nl_obj_panel.commandLater(cmd);
  }

  function nl_cmd_save_state() {
    nl_obj_world.exportWorld(pw, true);
    nl_obj_state = sw.toString();
  }

  function nl_cmd_restore_state() {
    if (nl_obj_state) {
      var sr = new applet.Packages.java.io.StringReader(nl_obj_state);
      nl_obj_workspace.importWorld(sr);
      nl_obj_panel.commandLater("display");
    }
  }

  function nl_cmd_reset() {
    nl_cmd_stop();
    nl_obj_panel.commandLater("startup");
  }

  //
  // Managing the NetLogo data polling system
  //
  function startNLDataPoller() {
    applet.data_poller = window.setInterval(function() { nlDataPoller(); }, 200);
  }

  function stopNLDataPoller() {
    if (applet.data_poller) {
      clearInterval(applet.data_poller);
      applet.data_poller = false;
    }
  }

  function nlDataPoller() {
    var newDatum = nl_obj_observer.getVariable(3);
    data_array.push(newDatum);
    graph.add_data([data_array.length, newDatum]);
  }

  //
  // button handlers
  //
  run_button.onclick = function() {
    if  (run_button.textContent == "Run") {
      run_button_run();
    } else {
      run_button_stop();
    }
  };

  reset_button.onclick = function() {
    run_button_stop();
    nl_cmd_reset();
    data_array.length = 0;
    graph.reset({ "points": data_array });
    update_globals_table();
  };

  watch_sunray_button.onclick = function() {
    nl_cmd_execute("watch one-of sunrays with [ycor > (max-pycor / 2 ) and heading > 90 ]");
  };

  save_state_button.onclick = function() {
    run_button_stop();
    nl_cmd_save_state();
    world_state.textContent = nl_obj_state;
  };

  restore_state_button.onclick = function() {
    run_button_stop();
    nl_cmd_restore_state();
    update_globals_table();
  };

  update_globals_button.onclick = function() {
    update_globals_table();
  };

  //
  // button/view helpers
  //
  function run_button_run() {
    nl_cmd_start();
    startNLDataPoller();
    run_button.textContent = "Stop";
  }

  function run_button_stop() {
    nl_cmd_stop();
    stopNLDataPoller();
    run_button.textContent = "Run";
  }

  function update_globals_table() {
    var  i, tr, th, td;
    if (globals_table.hasChildNodes()) {
      while (globals_table.childNodes.length >= 1) {
        globals_table.removeChild(globals_table.firstChild);
      }
    }
    for(i = 0; i < nl_obj_globals.size(); i++) {
      globals[i] = nl_obj_globals.get(i);
      tr = document.createElement('tr');
      td = document.createElement('td');
      td.textContent = globals[i];
      tr.appendChild(td);
      td = document.createElement('td');
      td.classList.add("left");
      td.textContent = nl_obj_observer.getVariable(i);
      tr.appendChild(td);
      globals_table.appendChild(tr);
    }
  }

  //
  // add the css class "inactive" to all dom elements that include the class "nlogo"
  //
  function disable_nlogo_elements() {
    nlogo_elements = document.getElementsByClassName("nlogo");
    for (i=0; i < nlogo_elements.length; i++) {
      nlogo_elements[i].classList.add("inactive");
    }
  }

  //
  // add the css class "active" to all dom elements that include the class "nlogo"
  //
  function enable_nlogo_elements() {
    nlogo_elements = document.getElementsByClassName("nlogo");
    for (i=0; i < nlogo_elements.length; i++) {
      nlogo_elements[i].classList.remove("inactive");
      nlogo_elements[i].classList.add("active");
    }
  }
};

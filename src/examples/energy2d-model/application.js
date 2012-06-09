/*globals $ energy2d */
/*jshint boss:true */
// ------------------------------------------------------------
//
// Energy2D Demo
//
// ------------------------------------------------------------

(function() {
    var webgl = !!window.WebGLRenderingContext;
    // get DOM elements
    var canvas_temperature = document.getElementById("canvasTemperatureLayer");
    var canvas_parts = document.getElementById("canvasPartsLayer");
    var canvas_velocity = document.getElementById("canvasVelocityLayer");
    var canvas_debug = document.getElementById("canvasVelocityLenDestination");
    var tdata = document.getElementById("tdata");
    
    var choose_array_type = document.getElementById("choose-array-type");
    
    var sim_stop = document.getElementById("sim-stop");
    var sim_reset = document.getElementById("sim-reset");
    var sim_step = document.getElementById("sim-step");
    var sim_go = document.getElementById("sim-go");
    var steps_per_frame_element = document.getElementById("steps-per-frame");
    var step_count = document.getElementById("step-count");
    
    var show_visualization = document.getElementById("show-visualization");
    var show_velocity_arrows = document.getElementById("show-velocity-arrows");
    var show_velocity_len = document.getElementById("show-velocity-length");
    var show_data_table = document.getElementById("show-temp-data-table");
    var use_hq_smoothing = document.getElementById("hq-smoothing");
    var hq_smoothing_grid = document.getElementById("hq-smoothing-grid");
    
    var models_select = document.getElementById("models-select");
     
    if (webgl) {
        choose_array_type.elements[1].disabled = false;
    }
    
    // fill initial states menu (and sort)
    // names_array = [];
    // for (var name in models_index) 
        // names_array.push(name);
    // names_array.sort();
    // var option_element, name_node;
    // var size = 1;
    // for (var i = 0; i < names_array.length; i++) {
        // option_element = document.createElement("option");
        // name_node = document.createTextNode(names_array[i]);
        // option_element.appendChild(name_node);
        // models_select.appendChild(option_element);
        // size++;
    // }
    // models_select.size = size <= 30 ? size : 30;
    
    // setup simulation
    var model;
    var model_name = undefined;
    loadModelState(model_name);
    var steps_per_frame = getStepsPerFrame(); 
    
    // setup rendering
    model2d.setupRGBAColorTables(); 
    setupRendering();
          
    // display initial state
    step_count.innerHTML = 'frame: ' + model.indexOfStep;

    // timing variables
    var one_before_that_sample_time = new Date();
    var last_sample_time = new Date();
    var sample_time = new Date();
    var average_sample_time_ms = sample_time - last_sample_time;

    window.onhashchange = loadModelFromLocationHash;

    loadModelFromLocationHash();

    function loadModelFromLocationHash() {
      var hash_match = document.location.hash.match(/#(.*$)/)
      if (hash_match && hash_match.length > 1) {
        model_name = hash_match[1];
        loadModelState(model_name);
        models_select.value = model_name;
      }
    }

    // setup callbacks
    // model
    models_select.onchange = function() {
        var opt = models_select.options[models_select.selectedIndex];
        model_name = opt.value || opt.text;
        loadModelState(model_name);
        document.location.hash = "#" + model_name;
    };
    choose_array_type.onchange = function() {
        loadModelState(model_name);
    };

    steps_per_frame_element.onchange = function() {
        steps_per_frame = getStepsPerFrame();
    }
    
    sim_go.onchange = function() {
        if (this.checked) {
            paintInterval = setInterval("renderModelStep()", 0);
        }
    };
    sim_step.onchange = function() {
        if (this.checked) {
          window.clearInterval(window.paintInterval);
          renderModelStep();
          sim_stop.checked = true;
        }
    };
    sim_reset.onchange = function() {
        if (this.checked) {
          window.clearInterval(window.paintInterval);
          loadModelState(model_name);
          sim_stop.checked = true;
        }
    };
    sim_stop.onchange = function() {
        if (this.checked) {
            window.clearInterval(paintInterval);
        }
    }
    
    // rendering
    show_velocity_arrows.onchange = function() {
        if (!this.checked)
            // clear arrows when velocity rendering is disabled
            model2d.initCanvas(canvas_velocity, canvas_velocity.clientWidth, canvas_velocity.clientHeight);
    };
    
    use_hq_smoothing.onchange = function() {
        setupRendering();
    };
    
    hq_smoothing_grid.onchange = function() {
        if (use_hq_smoothing.checked) {
            var grid_dim = getSmoothingGridDim();
            model2d.initCanvas(canvas_temperature, grid_dim, grid_dim);
            displayTemperatureFunc(canvas_temperature, model);
        }
    };
            
    // simulation
    window.renderModelStep = function() {
        sample_time = new Date();
        for (var i = 0; i < steps_per_frame; i++)
            model.nextStep();
        average_sample_time_ms = (average_sample_time_ms * 1.75 + (last_sample_time - one_before_that_sample_time) * 0.25) / 2;
        one_before_that_sample_time = last_sample_time;
        last_sample_time = sample_time;
        step_count.innerHTML = 'step: ' + model.getIndexOfStep() + ', model step rate: ' + (steps_per_frame/average_sample_time_ms * 1000).toFixed(2) + ' fps';
        if (show_visualization.checked)
            displayTemperatureFunc(canvas_temperature, model);
        if (show_velocity_arrows.checked)
            model2d.displayVectorField(canvas_velocity, model.getUVelocityArray(), model.getVVelocityArray(), model.getGridWidth(), model.getGridHeight(), 4);
        if (show_velocity_len.checked)
            model2d.displayVelocityLengthCanvas(canvas_debug, model);
        if (show_data_table.checked) 
            model2d.displayTemperatureTable(tdata, model);
    }
    
    // utils
    function setupModel(options) {
        if (choose_array_type.elements[0].checked) {
            array_selection = "regular";
        } else {
            array_selection = "typed";
        }
        var model = energy2d.modeler.makeModeler(options, array_selection);
        return model;
    }
    
    function getStepsPerFrame() {
        return steps_per_frame_element.selectedIndex + 1;
    }
    
    function setupRendering() {
        if (use_hq_smoothing.checked){
            displayTemperatureFunc = model2d.displayTemperatureCanvasWithSmoothing;
            var grid_dim = getSmoothingGridDim();
            model2d.initCanvas(canvas_temperature, grid_dim, grid_dim);
        }
        else {
            displayTemperatureFunc = model2d.displayTemperatureCanvas;
            model2d.initCanvas(canvas_temperature, model.getGridWidth(), model.getGridHeight());
        }
        displayTemperatureFunc(canvas_temperature, model);
        
        model2d.initCanvas(canvas_parts, canvas_parts.clientWidth, canvas_parts.clientHeight);
        model2d.displayParts(canvas_parts, model.getPartsArray(), model.getWidth(), model.getHeight());
        
        model2d.initCanvas(canvas_velocity, canvas_velocity.clientWidth, canvas_velocity.clientHeight);
        if (show_velocity_arrows.checked)
            model2d.displayVectorField(canvas_velocity, model.getUVelocityArray(), model.getVVelocityArray(), model.getGridWidth(), model.getGridHeight(), 4);
        
        model2d.initCanvas(canvas_debug, model.getGridWidth(), model.getGridHeight());
        if (show_velocity_len.checked)
            model2d.displayVelocityLengthCanvas(canvas_debug, model);
    }
    
    function getSmoothingGridDim() {
        return (hq_smoothing_grid.selectedIndex + 1) * 100; // so, first option is 100, next 200, etc.
    }
    
    function loadModelState(state_name) {
        if (!state_name || state_name == "default") {
            model = setupModel();
            setupRendering();
        }
        else if (models_library[state_name]) {
            // if model is already loaded, use it
            model = setupModel(models_library[state_name]);
            setupRendering();
        }
        // else {
          // // require and try to load again 
          // myRequire("conversions/" + models_index[state_name], function() {
              // loadModelState(state_name);    
          // });
        // }
    }

}());

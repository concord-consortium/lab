// ------------------------------------------------------------
//
// Temperature Selector
//
// ------------------------------------------------------------


var select_temperature = document.getElementById("select-temperature");
var select_temperature_display = document.createElement("span");
if (select_temperature == null) {
  layout.setupTemperature = function() {};
}
else {
  layout.setupTemperature = function() {
    if (Modernizr['inputtypes']['range']) {
      var temp_range = document.createElement("input");
      temp_range.type = "range";
      temp_range.min = "0";
      temp_range.max = "25";
      temp_range.step = "0.5";
      temp_range.value = +select_temperature.value;
      select_temperature.parentNode.replaceChild(temp_range, select_temperature);
      temp_range.id = "select-temperature";
      select_temperature = temp_range;
      select_temperature_display.id = "select-temperature-display";
      select_temperature_display.innerText = model.temperature();
      select_temperature.parentNode.appendChild(select_temperature_display);
      select_temperature = document.getElementById("select-temperature");
    }
    select_temperature.onchange = selectTemperatureChange;
  }

  function selectTemperatureChange() {
    var temperature = +select_temperature.value;
    if (select_temperature.type === "range") {
      select_temperature_display.innerText = d3.format("4.1f")(temperature);
    }
    model.temperature(temperature);
  }

  if (select_temperature.type === "range") {
    var temperature = model.temperature();
    select_temperature.value =  model.temperature();
    select_temperature_display.innerText = d3.format("4.1f")(temperature);
  }

  // ------------------------------------------------------------
  //
  // Temperature Control
  //
  // ------------------------------------------------------------

  layout.temperature_control_checkbox = document.getElementById("temperature-control-checkbox");

  function temperatureControlHandler() {
      if (layout.temperature_control_checkbox.checked) {
        model.set_temperature_control(true);
      } else {
        model.set_temperature_control(false);
      };
  };

  layout.temperature_control_checkbox.onchange = temperatureControlHandler;
}

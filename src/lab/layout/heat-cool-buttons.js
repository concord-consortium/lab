layout.heatCoolButtons = function(heat_elem_id, cool_elem_id, min, max) {
  var heat_button = new ButtonComponent(heat_elem_id, 'circlesmall-plus');
  var cool_button = new ButtonComponent(cool_elem_id, 'circlesmall-minus');

  heat_button.add_action(function() {
    var t = model.temperature();
    if (t < max) {
      $(heat_elem_id).removeClass('inactive');
      $(cool_elem_id).removeClass('inactive');
      t = Math.floor((t * 2))/2 + 0.5;
      model.temperature(t);
    } else {
      $(heat_elem_id).addClass('inactive');
    }
  });

  cool_button.add_action(function() {
    var t = model.temperature();
    if (t > min) {
      $(heat_elem_id).removeClass('inactive');
      $(cool_elem_id).removeClass('inactive');
      t = Math.floor((t * 2))/2 - 0.5;
      model.temperature(t);
    } else {
      $(cool_elem_id).addClass('inactive');
    }
  });

}

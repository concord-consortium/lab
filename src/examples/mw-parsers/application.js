$(function() {
  $('#convert').click(function(){
    var mml     = $('#input').val(),
        parsed  = MWHelpers.parseMML(mml);

    if (parsed.errors) {
      alert("errors!");
    } else {
      $('#output').val(parsed.json);
    }

  });
})
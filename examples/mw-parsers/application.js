var jsonModel,
    timer;

$(function() {
  $('#convert').click(function(){
    var mml     = $('#input').val(),
        parsed  = MWHelpers.parseMML(mml);

    if (parsed.errors) {
      // not using this yet
    } else {
      jsonModel = parsed.json;
      $('#output').val(jsonModel);
    }

  });

  $('#save-button').click(function() {
    var req;

    req = $.ajax('/model-configs', {
      type: 'POST',
      contentType: 'application/json',
      data: jsonModel
    }).done(function(data) {
      var loc  = req.getResponseHeader('Location'),
          id = /\/model-config\/(.*)$/.exec(loc)[1];
          location = document.location,
          host = location.protocol + '//' + location.host,
          jsonLoc = '/couchdb/_utils/document.html?models/'+id
          modelLoc = '/examples/complex-atoms-model/complex-atoms-model.html#'+id;

      $('#flash').
        removeClass().
        addClass('informational-message').
        html('<p>Saved to <a href="' + host + jsonLoc + '">' + jsonLoc + '</a></p>' +
            '<p>Find the model at <a href="' + host + modelLoc + '">'+ modelLoc + '</a></p>');
    }).fail(function() {
      $('#flash').
        removeClass().
        addClass('error-message').
        html('<p>Could not save model.</p>');
    }).always(function() {
      clearTimeout(timer);
      // add .fade-out after a delay so CSS transitions notice a change.
      timer = setTimeout(function() {
        $('#flash').addClass('fade-out');
      }, 100);
    });
  });
});
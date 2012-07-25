/*globals defineClass extendClass */

if (typeof ISImporter === 'undefined') ISImporter = {};

ISImporter.sensors = {

  distance: new ISImporter.GoIOApplet({
    otmlPath: '/distance.otml',
    listenerPath: 'ISImporter.sensors.distance',
    appletId: 'distance-sensor'
  }),

  temperature: new ISImporter.GoIOApplet({
    otmlPath: '/temperature.otml',
    listenerPath: 'ISImporter.sensors.temperature',
    appletId: 'temperature-sensor'
  }),

  light: new ISImporter.GoIOApplet({
    otmlPath: '/light.otml',
    listenerPath: 'ISImporter.sensors.light',
    appletId: 'light-sensor'
  })
};

ISImporter.main = function() {

  var $sel = $('#sensor-selector'),
      $data = $('#data'),
      key,
      applet;

  function disableButtons() {
    $('button').attr('disabled', true);
  }

  function enableStartButton() {
    $('#start').attr('disabled', false);
  }

  function disableStartButton() {
    $('#start').attr('disabled', true);
  }

  function enableStopButton() {
    $('#stop').attr('disabled', false);
  }

  function disableStopButton() {
    $('#stop').attr('disabled', true);
  }

  function enableResetButtons() {
    $('#reset').attr('disabled', false);
    $('#export').attr('disabled', false);
  }

  function disableResetButtons() {
    $('#reset').attr('disabled', true);
    $('#export').attr('disabled', true);
  }

  function start() {
    disableStartButton();
    enableStopButton();
    enableResetButtons();
    applet.start();
  }

  function stop() {
    enableStartButton();
    disableStopButton();
    enableResetButtons();
    applet.stop();
  }

  disableButtons();

  for (key in ISImporter.sensors) {
    if (ISImporter.sensors.hasOwnProperty(key)) {
      $sel.append('<option value="' + key + '">' + key + '</option>');
    }
  }

  $sel.change(function() {
    var choice = $(this).val();
    if (ISImporter.sensors[choice] && ISImporter.sensors[choice] !== applet) {
      disableButtons();

      if (applet) applet.remove();

      applet = ISImporter.sensors[choice];
      applet.append();

      applet.on('sensorReady', function() {
        console.log('sensor ready');
        enableStartButton();
      });

      applet.on('data', function(d) {
        $data.text(Math.round(d*10)/10);
      });

    }
  });

  $('#start').click(function() {
    start();
  });

  $('#stop').click(function() {
    stop();
  });

  $('#reset').click(function() {
    stop();
    $data.text('');
  });

  $('#export').click(function() {
    stop();
  });

};


$(document).ready(function() {
  ISImporter.main();
});

/*globals $ controllers model alert */
/*jshint boss:true */
// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

(function() {

  var modelConfig = {
        mol_number          : 50,
        temperature         : 3,
        epsilon             : -0.1,
        sigma               : 0.34,
        lennard_jones_forces: true,
        coulomb_forces      : false,
        width               : 10,
        height              : 10
      },

      playerConfig = {
        layoutStyle        : 'simple-iframe',
        autostart          : false,
        maximum_model_steps: Infinity,
        lj_epsilon_min     : -0.4,
        lj_epsilon_max     : -0.01034
      },
      controller;


  $(window).load(function() {
    controller = controllers.simpleModelController('#molecule-container', modelConfig, playerConfig);

    var aec = new ArduinoEthernetCom({
      frequency: 2
    });

    aec.addObserver(function(pinValues) {
      var pin0 = pinValues.A0,
          voltage = ((pin0 * 5.0) / 1024.0),
          temperatureC = (voltage - 0.5) * 100; //TMP36

      // scale temperature so that 20-30 is 0-10
      var scaledTemp = temperatureC - 20;
      scaledTemp = Math.max(Math.min(scaledTemp, 10), 0);

      model.set({temperature: scaledTemp})
      var roundedTemp = Math.floor(temperatureC * 100) / 100
      document.getElementById('temp').innerHTML = roundedTemp;
    });

    $('#runButton').click(function(){
      console.log('starting')
      aec.start();
    });
  });


}());

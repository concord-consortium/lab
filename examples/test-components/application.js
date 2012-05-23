(function() {
  var _this = this;

  $(document).ready(function() {
    var a, b, button_bar, c, d, e, ff_button, jslider, pause, play, play_pause, playable, player, reset, simple_player, simple_slider, simple_vertical_slider, slider, toggle_button;
    console.log("ready");
    simple_slider = new SliderComponent("#simple_slider");
    simple_vertical_slider = new SliderComponent("#simple_vertical_slider");
    slider = new SliderComponent("#slider");
    jslider = new JSliderComponent("#jslider");
    ff_button = new ButtonComponent("#button1", 'pause');
    ff_button.add_action(function() {
      return alert("You pressed the pause button");
    });
    a = new ButtonComponent(null, 'play');
    b = new ButtonComponent(null, 'pause');
    c = new ButtonComponent(null, 'reset');
    d = new ButtonComponent(null, 'forward');
    e = new ButtonComponent(null, 'back');
    toggle_button = new ToggleButtonComponent("#toggle_button", [a, b, c, d, e]);
    play = new ButtonComponent(null, 'play');
    play.add_action(function() {
      return console.log(" -- PLAY -- ");
    });
    pause = new ButtonComponent(null, 'pause');
    pause.add_action(function() {
      return console.log(" -- PAUSE --");
    });
    play_pause = new ToggleButtonComponent(null, [play, pause]);
    reset = new ButtonComponent(null, 'reset');
    reset.add_action(function() {
      return console.log(" -- RESET --");
    });
    button_bar = new ButtonBarComponent("#button_bar", [reset, play_pause]);
    window.toggle = toggle_button;
    window.bar = button_bar;
    playable = {
      play: function() {
        return console.log("PLAY");
      },
      stop: function() {
        return console.log("STOP");
      },
      seek: function(num) {
        return console.log("SEEK " + num);
      },
      back: function() {
        return console.log("BACK");
      },
      forward: function() {
        return console.log("FORWARD");
      }
    };
    simple_player = new PlaybackBarComponent("#simple_player", playable, true);
    return player = new PlaybackBarComponent("#player", playable, false);
  });

}).call(this);

$(document).ready =>
  console.log "ready"

  ff_button = new ButtonComponent("#button1",'pause')
  ff_button.add_action =>
    alert "You pressed the pause button"

  a = new ButtonComponent(null, 'play')
  b = new ButtonComponent(null, 'pause')
  c = new ButtonComponent(null, 'reset')
  d = new ButtonComponent(null, 'forward')
  e = new ButtonComponent(null, 'back')

  toggle_button = new ToggleButtonComponent("#toggle_button", [a,b,c,d,e])

  play  = new ButtonComponent(null,'play')
  play.add_action =>
    console.log " -- PLAY -- "

  pause = new ButtonComponent(null,'pause')
  pause.add_action =>
    console.log " -- PAUSE --"

  play_pause =  new ToggleButtonComponent(null,[play,pause])

  reset = new ButtonComponent(null,'reset')
  reset.add_action =>
    console.log " -- RESET --"
  button_bar =    new ButtonBarComponent("#button_bar",[reset, play_pause])

  window.toggle = toggle_button
  window.bar = button_bar

  playable = 
    play: ->
      console.log "PLAY"
    stop: ->
      console.log "STOP"
    seek: (num) ->
      console.log "SEEK #{num}"
    back: ->
      console.log "BACK"
    forward: ->
      console.log "FORWARD"
  simple_player = new PlaybackBarComponent("#simple_player",playable,true)
  player = new PlaybackBarComponent("#player",playable,false)

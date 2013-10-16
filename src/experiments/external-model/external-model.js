var direction = "right",
    rightTarget = "250px",
    leftTarget = "50px";
function moveBox(){
  var target;
  if(direction == "right") {
    direction = "left";
    target = rightTarget;
  } else {
    direction = "right";
    target = leftTarget;
  }
  $(".block").animate({"left": target}, "slow", "swing",moveBox);
}
function start(){
  moveBox();
  parentMessageController.post({type:'play.iframe-model'});
}

function stop(){
  $(".block").stop();
  parentMessageController.post({type:'stop.iframe-model'});
}
parentMessageController.initialize();
parentMessageController.addListener('play', start);
parentMessageController.addListener('stop', stop);
// we are also going to get a listenForDispatchEvent message to add a listener for:
//   'play.iframe-model', 'stop.iframe-model'
// for now we aren't handling addDispatchListener,
// we just send off hard coded the notification of the events.

$("#start").click(start);
$("#stop").click(stop);

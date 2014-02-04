/* global iframePhone */
var direction = "right",
    rightTarget = "250px",
    leftTarget = "50px";

var iframeEndpoint = iframePhone.getIFrameEndpoint();

function moveBox() {
  var target;
  if(direction === "right") {
    direction = "left";
    target = rightTarget;
  } else {
    direction = "right";
    target = leftTarget;
  }
  $(".block").animate({"left": target}, "slow", "swing",moveBox);
}

function start() {
  moveBox();
  iframeEndpoint.post({type:'play.iframe-model'});
}

function stop() {
  $(".block").stop();
  iframeEndpoint.post({type:'stop.iframe-model'});
}

iframeEndpoint.initialize();
iframeEndpoint.addListener('play', start);
iframeEndpoint.addListener('stop', stop);
// we are also going to get a listenForDispatchEvent message to add a listener for:
//   'play.iframe-model', 'stop.iframe-model'
// for now we aren't handling addDispatchListener,
// we just send off hard coded the notification of the events.

$("#start").click(start);
$("#stop").click(stop);

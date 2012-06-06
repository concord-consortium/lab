
graph = grapher.graph('#chart');

selectSize = document.getElementById('select-size');

function selectSizeHandler() {
  switch(selectSize.value) {
    case "large":
    graph.resize(1280, 666);
    break;

    case "medium":
    graph.resize(960, 500);
    break;

    case "small":
    graph.resize(480, 250);
    break;
  }
}

selectSize.onchange = selectSizeHandler;
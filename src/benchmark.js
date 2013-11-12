/*global Lab, Fingerprint, alert*/

$(function () {
  var categories = null;
  var interactivesJSON = null;

  var benchamrkEnabled = false;
  var interactiveID = 0;
  var interactives = [];

  var $info = $("#info");
  var $iframe = $("#iframe-interactive");
  var iframePhone;
  var fingerprint = new Fingerprint().get();

  function start() {
    interactiveID = 0;
    benchamrkEnabled = true;
    interactives = [];
    readCategories();
    $("#start").prop("disabled", true);
    $("#stop").prop("disabled", false);
    $(".category").prop("disabled", true);
    info("");
    nextInteractive();
  }

  function stop() {
    benchamrkEnabled = false;
    $("#stop").prop("disabled", true);
    $("#start").prop("disabled", false);
    $(".category").prop("disabled", false);
    info("Benchmark stopped (the test that is currently running won't be canceled).");
  }

  function readCategories() {
    categories = {};
    $(".category").each(function() {
      var $checkbox = $(this);
      if ($checkbox.prop("checked")) {
        categories[$checkbox.val()] = true;
      }
    }).prop("disabled", true);
    processInteractivesJSON(interactivesJSON);
  }

  function processInteractivesJSON(result) {
    var interactivesDesc = result.interactives;
    var groups = result.groups;
    var MD2DOnly = categories["MD2D_only"];
    var groupKeyAllowed = {};

    groups.forEach(function (g) {
      if (g.category in categories) {
        groupKeyAllowed[g.path] = true;
      }
    });

    function modelTypeCheck(i) {
      // Metadata doesn't contain information about model type, so do some ugly tests.
      if (MD2DOnly) {
        var k = i.groupKey;
        if (k.indexOf("solar-system") === -1 && k.indexOf("energy2d") === -1) {
          return true;
        } else {
          return false;
        }
      }
      return true;
    }

    interactivesDesc.forEach(function (i) {
      if (i.groupKey in groupKeyAllowed && i.publicationStatus !== "draft" && modelTypeCheck(i)) {
        interactives.push(i.path);
      }
    });
  }

  function info(msg) {
    $info.text(msg);
  }

  function nextInteractive() {
    if (!interactives[interactiveID]) {
      stop();
      info("Benchmark has finished, all interactives have been tested.");
      return;
    }
    console.log("Loading a new interactive");
    info("Testing " + (interactiveID + 1) + "/" + interactives.length + ": " + interactives[interactiveID]);
    var newPath = "/embeddable.html#" + interactives[interactiveID];
    if ($iframe.attr("src") === newPath) {
      // Reload iframe to trigger interactiveLoaded callback.
      $iframe[0].contentWindow.location.reload(true);
    } else {
      $iframe.attr("src", newPath);
    }
    interactiveID++;
  }

  function interactiveLoaded() {
    console.log("Interactive loaded");
    $("#run-benchmark").prop("disabled", false);
    if (benchamrkEnabled) {
      console.log("Starting benchmark");
      iframePhone.post({ type: "runBenchmarks" });
    }
  }

  function benchmarkResultsReceived(message) {
    var data = {
      "browser id": fingerprint
    };
    message.results.forEach(function (arr) {
      var key = arr[0];
      var val = arr[1];
      if (key === "commit") {
        // Special case for commit result, which is provided as a HTML link.
        val = $(val).text();
      }
      data[key] = val;
    });
    console.log("Sending results:\n", data);
    $.ajax({
      type: "POST",
      url: Lab.config.benchmarkAPIurl,
      data: data
    });
    // Automatically switch to a new interactive if benchmark is running.
    if (benchamrkEnabled) {
      nextInteractive();
    }
  }

  // 1. Setup start / stop buttons.
  $("#start").on("click", start).prop("disabled", true);
  $("#stop").on("click", stop).prop("disabled", true);

  // 2. Download interactives.json (interactives list + short description) and connect
  // to the iframe using Lab.IFramePhone.
  $.get('interactives.json').done(function(results) {
    if (typeof results === 'string') {
      results = JSON.parse(results);
    }
    interactivesJSON = results;
    // It would be nice if the line below isn't necessary. Unfortunately, we can't connect
    // to empty "embeddable.html" page to load desired interactive later. So, initialize random
    // interactive to establish iframe communication.
    $iframe.attr("src", "/embeddable.html#interactives/samples/1-oil-and-water-shake.json");
    iframePhone = new Lab.IFramePhone($iframe[0], interactiveLoaded);
    iframePhone.addListener("returnBenchmarks", benchmarkResultsReceived);
    // Let user start benchmark.
    $("#start").prop("disabled", false);
  }).fail(function(){
    var mesg = "Failed to retrieve interactives.json";
    mesg += "\n";
    mesg += "\nNote: Some browser prevent loading content directly";
    mesg += "\nfrom the file system.";
    mesg += "\n";
    mesg += "\nOne solution is to start a simple local web";
    mesg += "\nserver using Python in the same directory where";
    mesg += "\nthe static resources are located";
    mesg += "\n";
    mesg += "\n    python -m SimpleHTTPServer";
    mesg += "\n";
    mesg += "\nNow open this page in your browser:";
    mesg += "\n";
    mesg += "\n    http://localhost:8000/benchmark.html";
    mesg += "\n";
    console.log(mesg);
    alert(mesg);
  });
});

/*global Lab, Fingerprint, alert*/

$(function () {
  var ALLOWED_CATEGORIES = null;
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
    info("Benchmark stopped by user.");
  }

  function readCategories() {
    ALLOWED_CATEGORIES = {};
    $(".category").each(function() {
      var $checkbox = $(this);
      if ($checkbox.prop("checked")) {
        ALLOWED_CATEGORIES[$checkbox.val()] = true;
      }
    }).prop("disabled", true);
    processInteractivesJSON(interactivesJSON);
  }

  function processInteractivesJSON(result) {
    var interactivesDesc = result.interactives;
    var groups = result.groups;
    var groupKeyAllowed = {};

    groups.forEach(function (g) {
      if (g.category in ALLOWED_CATEGORIES) {
        groupKeyAllowed[g.path] = true;
      }
    });
    interactivesDesc.forEach(function (i) {
      if (i.groupKey in groupKeyAllowed && i.publicationStatus !== "draft") {
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
    info("Testing: " + interactives[interactiveID]);
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
    console.log("Connected to Lab iframe");
    $("#run-benchmark").prop("disabled", false);
    if (benchamrkEnabled) {
      console.log("Starting benchmark...");
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

    // Automatically switch to a new interactive if benchmark is running.
    if (benchamrkEnabled) {
      console.log("Requesting a new interactive");
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

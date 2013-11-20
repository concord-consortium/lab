/*global Lab, Fingerprint, alert*/

/**
 * IMPORTANT: to test a specific Lab version, you have to ensure that interactives.json file
 * from that version is available at [current host]/version/x.y.z/interactives.json!
 * We can't just use lab.concord.org/version/x.y.z/interactives.json due to CORS issues.
 * On the lab.dev sever these files were put in the right directory manually. If you want to test
 * versions other than current locally, you have to do the same. E.g.:
 * curl lab.concord.org/version/0.5.12/interactives.json >> public/version/0.5.12/interactives.json
 */
$(function () {
  var PRODUCTION_SERV = "http://lab.concord.org";
  var root = null;
  var interactivesJSONRoot = null;
  var categories = null;

  var benchamrkEnabled = false;
  var interactiveID = 0;
  var interactives = [];

  var $info = $("#info");
  var $iframe = $("#iframe-interactive");
  var iframePhone;
  var fingerprint = new Fingerprint().get();

  var resultsKeys = (function () {
    var keys = [];
    $("#results th").each(function() {
      keys.push($(this).text());
    });
    return keys;
  }());

  function start() {
    readHost();
    // Download interactives.json (interactives list + short description) and connect
    // to the iframe using Lab.IFramePhone.
    $.get(interactivesJSONRoot + "interactives.json").done(function(results) {
      if (typeof results === 'string') {
        results = JSON.parse(results);
      }
      // Reset state.
      interactiveID = 0;
      benchamrkEnabled = true;
      interactives = [];
      // Process options.
      readCategories();
      processInteractivesJSON(results);
      // Setup UI.
      $("#start").prop("disabled", true);
      $("#stop").prop("disabled", false);
      $("#results tbody").empty();
      info("");
      // Load the first interactive to test.
      nextInteractive();
    }).fail(function () {
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
  }

  function stop() {
    benchamrkEnabled = false;
    $("#stop").prop("disabled", true);
    $("#start").prop("disabled", false);
    $(".category, .host").prop("disabled", false);
    info("Benchmark stopped (the test that is currently running won't be canceled).");
  }

  function readHost() {
    var version = $("input[name=host]:checked").val();
    if (version === "current") {
      root = interactivesJSONRoot = "/";
    } else {
      root = PRODUCTION_SERV + "/version/" + version + "/";
      interactivesJSONRoot = "/version/" + version + "/";
    }
    $(".host").prop("disabled", true);
  }

  function readCategories() {
    categories = {};
    $(".category").each(function() {
      var $checkbox = $(this);
      if ($checkbox.prop("checked")) {
        categories[$checkbox.val()] = true;
      }
    }).prop("disabled", true);
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

    function publicationStatusCheck(i) {
      if (i.publicationStatus === "public" || i.publicationStatus === "sample") {
        return true;
      }
      return false;
    }

    interactivesDesc.forEach(function (i) {
      if (i.groupKey in groupKeyAllowed && publicationStatusCheck(i) && modelTypeCheck(i)) {
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
    var newPath = root + "embeddable.html#" + interactives[interactiveID];
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
    // Put results into table.
    var $row = $("<tr>").appendTo("#results tbody");
    resultsKeys.forEach(function(key) {
      var val = data[key];
      if (key === "interactive") {
        // Make interactive name shorter.
        val = val.substr(val.lastIndexOf("/") + 1);
      }
      $row.append("<td>" + val + "</td>");
    });
    // Automatically switch to a new interactive if benchmark is running.
    if (benchamrkEnabled) {
      nextInteractive();
    }
  }

  // 1. Setup start / stop buttons.
  $("#start").on("click", start);
  $("#stop").on("click", stop).prop("disabled", true);
  // 2. Setup IFramePhone. Note that we have to do it just once.
  iframePhone = new Lab.IFramePhone($iframe[0], interactiveLoaded);
  iframePhone.addListener("returnBenchmarks", benchmarkResultsReceived);
});

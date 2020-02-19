const fs = require("fs");
import interactive from "../src/lab/common/controllers/interactive-metadata";
import md2d from "../src/lab/models/md2d/models/metadata";
import energy2d from "../src/lab/models/energy2d/metadata";
import sensor from "../src/lab/models/sensor/metadata";
import signalGenerator from "../src/lab/models/signal-generator/metadata";
import iframeModel from "../src/lab/models/iframe/metadata";

var labMetaData = {
  interactive,
  models: {
    md2d,
    energy2d,
    sensor,
    "signal-generator": signalGenerator,
    "iframe-model": iframeModel
  }
};

fs.writeFile("public/lab/lab.json", JSON.stringify(labMetaData, null, 2), function (err) {
  if (err) {
    console.log(err);
  } else {
    console.log("generated: public/lab/lab.json");
  }
});

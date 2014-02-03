var requirejs = require('requirejs'),
    fs = require('fs');

requirejs.config({baseUrl: "src/lab"});

var labMetaData = {
      interactive: requirejs('common/controllers/interactive-metadata'),
      models: {
        "md2d":             requirejs('models/md2d/models/metadata'),
        "energy2d":         requirejs('models/energy2d/metadata'),
        "sensor":           requirejs('models/sensor/metadata'),
        "signal-generator": requirejs('models/signal-generator/metadata'),
        "iframe-model":     requirejs('iframe-model/metadata'),
        "solar-system":     requirejs('models/solar-system/models/metadata')
      }
    };

fs.writeFile("public/lab/lab.json", JSON.stringify(labMetaData, null, 2), function(err) {
    if(err) {
        console.log(err);
    } else {
        console.log("generated: public/lab/lab.json");
    }
});

// this file is generated during build process by: ./script/generate-js-version.rb
define(function (require) {
  return {
    "repo": {
      "branch": "master",
      "commit": {
        "sha":           "8f59c315ea565bd7b4dd3498c1e06ed6a68f4976",
        "short_sha":      "8f59c315",
        "url":            "https://github.com/concord-consortium/lab/commit/8f59c315",
        "author":        "Sam Fentress",
        "email":         "sfentress@concord.org",
        "date":          "2013-03-12 19:59:33 -0400",
        "short_message": "Fix relative reference to &quot;/resources&quot; in image urls.",
        "message":       "Fix relative reference to &quot;/resources&quot; in image urls.\n\nUse Lab.config.actualRoot to get actual root, and use\nmore specific &quot;{resources}/&quot; pattern to specify files\nlocated in public/resources, so we don&#x27;t break any models\nwith a nested resources directory.\n\nNot sure why &quot;Lab&quot; may be undefined in Mocha tests."
      },
      "dirty": false
    }
  };
});

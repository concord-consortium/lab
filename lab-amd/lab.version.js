// this file is generated during build process by: ./script/generate-js-version.rb
define(function (require) {
  return {
    "repo": {
      "branch": "master",
      "commit": {
        "sha":           "d623c37886b37b4f7d1b90c6412d233418b8a039",
        "short_sha":      "d623c378",
        "url":            "https://github.com/concord-consortium/lab/commit/d623c378",
        "author":        "Stephen Bannasch",
        "email":         "stephen.bannasch@gmail.com",
        "date":          "2013-04-06 04:00:33 -0400",
        "short_message": "Revert &quot;canvas zIndex needs to be 2 so realtime graphs show the data lines&quot;",
        "message":       "Revert &quot;canvas zIndex needs to be 2 so realtime graphs show the data lines&quot;\n\nThis reverts commit c9c7c678ad126c181b685cb0012c853e0859a041.\n\nThe canvas has to be under the SVG plot rect so the plot rect\ncan catch pointer-events in IE9 and IE10.\n\nThe plot rect needs to be transparent to be able to see the\nplotted lines in the Canvas element."
      },
      "dirty": false
    }
  };
});

// this file is generated during build process by: ./script/generate-js-version.rb
define(function (require) {
  return {
    "repo": {
      "branch": "master",
      "commit": {
        "sha":           "52a7418deb34c0339ab30ec1a86294217edf7fb9",
        "short_sha":      "52a7418d",
        "url":            "https://github.com/concord-consortium/lab/commit/52a7418d",
        "author":        "Stephen Bannasch",
        "email":         "stephen.bannasch@gmail.com",
        "date":          "2013-02-14 17:15:53 -0500",
        "short_message": "use correct form of regex string for RegExp()",
        "message":       "use correct form of regex string for RegExp()\n\nIS [#44317763]\n\nWhen using the RexExp() function the string arg should\n*not* have the enclosing &quot;/&quot; characters used to define\na regex expression in-line \n\n*And* &#x27;\&#x27; chars must be escaped twice, once in the regex\nitself and a second time because of the string parsing."
      },
      "dirty": false
    }
  };
});

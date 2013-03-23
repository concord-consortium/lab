// this file is generated during build process by: ./script/generate-js-version.rb
define(function (require) {
  return {
    "repo": {
      "branch": "master",
      "commit": {
        "sha":           "71d0e13b62d6e93b82bbd742d92b1f4f502f5057",
        "short_sha":      "71d0e13b",
        "url":            "https://github.com/concord-consortium/lab/commit/71d0e13b",
        "author":        "Stephen Bannasch",
        "email":         "stephen.bannasch@gmail.com",
        "date":          "2013-03-23 09:51:59 -0400",
        "short_message": "server/public/fonts/Font-Awesome: remove .git folder",
        "message":       "server/public/fonts/Font-Awesome: remove .git folder\n\n[#46761159]\n\nWhen copying resources to server/public make sure that\nthe .git modulars that deify the original folder as a\ngit submodule do not end up in server/public.\n\nNot only does it add unnecessarily to the static distribution size\nthe presence of the .git folder prevents the gh-pages.rb script\nfrom completing when it tries to add the new files to the gh-pages\nbranch:\n\n$ git add .\nfatal: Not a git repository: vendor/fonts/Font-Awesome/../../../../.git/modules/src/vendor/fonts/Font-Awesome\n\nproblem introduced in: 643b854d"
      },
      "dirty": false
    }
  };
});

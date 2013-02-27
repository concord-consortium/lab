// this file is generated during build process by: ./script/generate-js-version.rb
define(function (require) {
  return {
    "repo": {
      "branch": "master",
      "commit": {
        "sha":           "bd72db10ec4067362e44d838ac342659eaee36a2",
        "short_sha":      "bd72db10",
        "url":            "https://github.com/concord-consortium/lab/commit/bd72db10",
        "author":        "Sam Fentress",
        "email":         "sfentress@concord.org",
        "date":          "2013-02-27 14:05:34 -0500",
        "short_message": "Trigger dragend when mouse leaves interactive container.",
        "message":       "Trigger dragend when mouse leaves interactive container.\n\nWe check the target of the drag event and see whether\nit is either an svg element or a dom element contained\nwithin the #interactive-container. If it isn&#x27;t, fire\na mouseup event to trigger d3&#x27;s dragend event.\n\nThis has been tested in Chrome, FF and Safari.\n\nNote this hard-codes the selector &quot;#interactive-container&quot;.\nThis same selector is being hard-coded in the semantic-\nlayout (which doesn&#x27;t appear to use the selector passed in\nby application.js to the interactive controller).\nTODO: Use the selector passed in by application.js and\nmake it a variable that&#x27;s accessible in other parts of\nthe code."
      },
      "dirty": false
    }
  };
});

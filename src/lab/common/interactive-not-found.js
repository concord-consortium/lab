define(function (require) {

  return function interactiveNotFound(interactiveUrl) {
    return {
      "title": "Interactive not found",
      "subtitle": "Couldn't load Interactive definition",
      "about": [
        "Problem loading: [" + interactiveUrl + "](" + interactiveUrl + ")",
        "Either the definition for this Interactive has moved, been deleted or there have been network problems.",
        "It would be good to report this issue"
      ],
      "publicationStatus": "broken",
      "fontScale": 1.3,
      "models": [
      ],
      "components": [
        {
          "type": "text",
          "id": "interactive-not-found",
          "text": [
            "##Oops!",
            "",
            "####We couldn't find the Interactive you are looking for:",
            "[" + interactiveUrl + "](" + interactiveUrl + ")",
            "",
            "It may have moved (without leaving a forwarding address).",
            "Try searching our [Next-Generation Molecular Workbench Activities page](http://mw.concord.org/nextgen/interactives/)."
          ]
        }
      ],
      "layout": {
        "error": [ "interactive-not-found" ]
      },
      "template": [
        {
          "id": "error",
          "width": "interactive.width",
          "padding-top": "1em",
          "padding-bottom": "0.5em",
          "padding-right": "1em",
          "padding-left": "1em"
        }
      ]
    };
  };
});

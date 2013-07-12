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
        {
          "type": "md2d",
          "id": "empty-model",
          "model": {
            "type": "md2d",
            "width": 5,
            "height": 3
          },
          "viewOptions": {
            "controlButtons": "",
            "backgroundColor": "rgba(245,200,200,255)",
            "showClock": false
          }
        }
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
          "id": "top",
          "bottom": "model.top",
          "height": "1em"
        },
        {
          "id": "bottom",
          "top": "model.bottom",
          "height": "1em"
        },
        {
          "id": "right",
          "left": "model.right",
          "width": "1em"
        },
        {
          "id": "left",
          "right": "model.left",
          "width": "1em"
        },
        {
          "id": "error",
          "top": "model.top",
          "left": "model.left",
          "height": "model.height",
          "width": "model.width",
          "padding-top": "0.5em",
          "padding-bottom": "0.5em",
          "padding-right": "1em",
          "padding-left": "1em"
        }
      ]
    };
  };
});

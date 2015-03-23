/*global define*/
define(function () {
  return {
    "model-only": [],
    "simple": [
      {
        "id": "top",
        "bottom": "model.top",
        "width": "interactive.width"
      },
      {
        "id": "right",
        "top": "model.top",
        "left": "model.right",
        "height": "model.height",
        "padding-left": "1em",
        "padding-right": "0.5em"
      },
      {
        "id": "bottom",
        "top": "model.bottom",
        "width": "interactive.width",
        "padding-top": "0.5em"
      }
    ],
    "narrow-right": [
      {
        "id": "top",
        "bottom": "model.top",
        "width": "interactive.width"
      },
      {
        "id": "right",
        "top": "model.top",
        "left": "model.right",
        "height": "model.height",
        "padding-left": "1em",
        "padding-right": "0.5em",
        "width": "model.width / 4",
        "min-width": "6em"
      },
      {
        "id": "bottom",
        "top": "model.bottom",
        "width": "interactive.width",
        "padding-top": "0.5em"
      }
    ],
    "wide-right": [
      {
        "id": "top",
        "bottom": "model.top",
        "width": "interactive.width"
      },
      {
        "id": "right",
        "top": "model.top",
        "left": "model.right",
        "height": "model.height",
        "padding-left": "1em",
        "padding-right": "0.5em",
        "width": "model.width",
        "min-width": "6em"
      },
      {
        "id": "bottom",
        "top": "model.bottom",
        "width": "interactive.width",
        "padding-top": "0.5em"
      }
    ],
    "left-right-bottom": [
      {
        "id": "left",
        "top": "model.top",
        "height": "model.height",
        "right": "model.left",
        "padding-right": "0.5em"
      },
      {
        "id": "right",
        "top": "model.top",
        "height": "model.height",
        "left": "model.right",
        "padding-left": "1em",
        "padding-right": "0.5em"
      },
      {
        "id": "bottom",
        "top": "model.bottom",
        "left": "model.left",
        "width": "model.width"
      }
    ]
  };
});

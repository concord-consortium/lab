/*global define*/
define(function () {
  return {
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
        "padding-left": "1em"
      },
      {
        "id": "bottom",
        "top": "model.bottom",
        "width": "interactive.width",
        "padding-bottom": "1em"
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
        "width": "model.width / 4",
        "min-width": "6em"
      },
      {
        "id": "bottom",
        "top": "model.bottom",
        "width": "interactive.width",
        "padding-bottom": "1em"
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
        "width": "model.width",
        "min-width": "6em"
      },
      {
        "id": "bottom",
        "top": "model.bottom",
        "width": "interactive.width",
        "padding-bottom": "1em"
      }
    ]
  };
});

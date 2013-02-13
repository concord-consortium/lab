/*global define*/
define(function () {
  return {
    "simple": [
      {
        "id": "top",
        "bottom": "model.top"
      },
      {
        "id": "right",
        "left": "model.right",
        "height": "model.height",
        "padding-left": "1em"
      },
      {
        "id": "bottom",
        "top": "model.bottom",
        "width": "model.width + right.width",
        "padding-bottom": "1em"
      }
    ],
    "narrow-right": [
      {
        "id": "top",
        "bottom": "model.top"
      },
      {
        "id": "right",
        "left": "model.right",
        "height": "model.height",
        "padding-left": "1em",
        "width": "model.width / 4",
        "min-width": "6em"
      },
      {
        "id": "bottom",
        "top": "model.bottom",
        "width": "model.width + right.width",
        "padding-bottom": "1em"
      }
    ],
    "split-right": [
      {
        "id": "top",
        "bottom": "model.top"
      },
      {
        "id": "right-top",
        "left": "model.right",
        "height": "model.height/2",
        "padding-left": "1em"
      },
      {
        "id": "right-bottom",
        "left": "model.right",
        "top": "model.top + model.height/2",
        "height": "model.height/2",
        "padding-left": "1em"
      },
      {
        "id": "bottom",
        "top": "model.bottom",
        "width": "model.width + right-top.width",
        "padding-top": "1em"
      }
    ],
    "big-top": [
      {
        "id": "top",
        "bottom": "model.top",
        "height": "model.height/3",
        "width": "model.width + right.width",
        "padding-bottom": "1em"
      },
      {
        "id": "right",
        "left": "model.right",
        "height": "model.height",
        "padding-left": "1em"
      },
      {
        "id": "bottom",
        "top": "model.bottom",
        "width": "model.width + right.width",
        "padding-top": "1em"
      }
    ]
  };
});

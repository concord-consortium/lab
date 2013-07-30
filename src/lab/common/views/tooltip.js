/*global define: false, $: false */

/**
  * Lab-compatible tooltips based on jQuery-UI tooltips. The custom styling is used and tooltips
  * scale themselves according to the font-size of #responsive-content div.
  */
define(function (require) {

  var markdownToHTML = require("common/markdown-to-html"),

      getID = (function () {
        var id = 0;
        return function () {
          return id++;
        };
      }());

  return function tooltip($target, content, openNow, interactiveController) {
    var $rc = $("#responsive-content"),
        $tooltip = null;

    function position() {
      // Update font-size using #responsive-content div font-size.
      // Lab Interactives scaling is based on the font-size of this div.
      var fontSize = $rc.css("font-size");
      $tooltip.css("font-size", fontSize);
      // Font-size of the top container changes also dimensions of various elements
      // that are defined in ems, so calculate correct position for tooltip.
      $tooltip.position({
        of: $target,
        collision: "flipfit flipfit",
        // Arrow's height depends on font-size (as it's defined in ems).
        my: "center top+" + parseFloat(fontSize) * 1.2,
        at: "center bottom",
        using: function(position, feedback) {
          $(this).css(position);
          // Add arrow for nicer look & feel.
          $("<div>")
            .addClass("ui-tooltip-arrow")
            .addClass(feedback.vertical)
            .addClass(feedback.horizontal)
            .appendTo(this);
        }
      });
    }

    $target.attr("data-lab-tooltip", true);
    $target.tooltip({
      items: "[data-lab-tooltip]",
      content: markdownToHTML(content),
      open: function (event, ui) {
        $tooltip = ui.tooltip;
        position();
      },
      close: function () {
        $tooltip = null;
      }
    });
    if (openNow) {
      $target.tooltip("open");
    }
    if (interactiveController) {
      interactiveController.on("layoutUpdated.tooltip-" + getID(), function () {
        // If tooltip is visible position it again.
        if ($tooltip) position();
      });
    }
  };
});

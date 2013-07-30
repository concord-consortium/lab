/*global define: false, $: false */

/**
  * Lab-compatible tooltips based on jQuery-UI tooltips. The custom styling is used and tooltips
  * scale themselves according to the font-size of #responsive-content div.
  */
define(function () {

  var getID = (function () {
    var id = 0;
    return function () {
      return id++;
    };
  }());

  return function tooltip($target, content, openNow, interactiveController) {
    var $rc = $("#responsive-content"),
        visible = false;
    $target.attr("title", content);
    $target.tooltip({
      open: function (event, ui) {
        var fontSize = $rc.css("font-size");
        // Update font-size using #responsive-content div font-size.
        // Lab Interactives scaling is based on the font-size of this div.
        ui.tooltip.css("font-size", fontSize);
        // Position tooltip again, as its dimensions have changed due to line above.
        ui.tooltip.position({
          of: $target,
          collision: "flipfit",
          my: "center top+" + fontSize, // arrow's height depends on font-size (defined in ems).
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
        visible = true;
      },
      close: function () {
        visible = false;
      }
    });
    if (openNow) {
      $target.tooltip("open");
    }
    if (interactiveController) {
      interactiveController.on("layoutUpdated.tooltip-" + getID(), function () {
        if (visible) {
          // Close and open tooltip to reposition it as font-size and components dimensions could
          // have been changed.
          $target.tooltip("close");
          $target.tooltip("open");
        }
      });
    }
  };
});

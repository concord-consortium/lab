/*global define, $ */
define(function (require) {

  var markdownToHTML  = require("common/markdown-to-html"),
      DispatchSupport = require("common/dispatch-support"),

      OVERLAY_MY = [
        "center bottom",
        "left center",
        "center top",
        "right center"
      ],

      OVERLAY_AT = [
        "center top-5",
        "right+5 center",
        "center bottom+5",
        "left-5 center"
      ];

  return function HelpSystem(helpTips, $container) {
    var api,
        dispatch = new DispatchSupport("start", "stop"),
        isActive = false,
        tipIdx = 0,
        $tip,
        $instructions,
        overlays = [];

    function showTip() {
      var def = helpTips[tipIdx],
          $component,
          overlayHeight,
          offset;
      // Update content.
      $tip.html(markdownToHTML(def.text));
      // Position.
      if (def.component) {
        $component = $("#" + def.component).closest(".component");
        overlayHeight = $component.outerHeight() + 10; // + 5+ 5 => take a loot at OVERLAY_AT values.
        offset = parseFloat($tip.css("font-size"));
        $tip.position({
          of: $component,
          collision: "flipfit flipfit",
          // Arrow's height depends on font-size (as it's defined in ems).
          my: "left-" + (offset * 4) + " top+" + offset,
          at: "right bottom",
          using: function(position, feedback) {
            $(this).css(position);
            // Add arrow for nicer look & feel.
            $("<div>")
              .addClass("lab-help-arrow")
              .addClass(feedback.vertical)
              .addClass(feedback.horizontal)
              .appendTo(this);
          }
        });
        overlays.forEach(function ($overlay, idx) {
          // Set custom height of left and right overlays.
          if (idx === 1 || idx === 3) $overlay.css("height", overlayHeight);
          $overlay.position({
            of: $component,
            collision: "none none",
            my: OVERLAY_MY[idx],
            at: OVERLAY_AT[idx]
          });
        });
      } else {
        $tip.position({
          of: $container,
          collision: "flipfit flipfit",
          my: "center center",
          at: "center center"
        });
        overlays.forEach(function ($overlay, idx) {
          $overlay.position({
            of: $container,
            collision: "none none",
            // Position all overlays outside the container except from one (avoid alpha channel
            // summing).
            my: idx ? "left top" : "center center",
            at: idx ? "right bottom" : "center center"
          });
        });
      }
    }

    api = {
      start: function () {
        for (var i = 0; i < 4; i++) {
          overlays.push($('<div class="lab-help-overlay"></div>').appendTo($container));
        }
        $instructions = $('<div class="lab-help-instructions">' +
                          'Click overlay to see next help tip</div>').appendTo($container);
        $container.on("click.lab-help-overlay",
                      ".lab-help-overlay, .lab-help-tip, .lab-help-instructions", api.next);
        $tip = $('<div class="lab-help-tip"></div>').appendTo($container);
        tipIdx = 0;
        isActive = true;
        api.next();
        dispatch.start();
      },

      stop: function () {
        $tip.remove();
        $instructions.remove();
        overlays.forEach(function ($overlay) {
          $overlay.remove();
        });
        overlays.length = 0;
        $container.off("click.lab-help-overlay",
                       ".lab-help-overlay, .lab-help-tip, .lab-help-instructions");
        isActive = false;
        dispatch.stop();
      },

      next: function () {
        if (tipIdx >= helpTips.length) {
          api.stop();
          return;
        }
        showTip();
        tipIdx++;
      },

      isActive: function () {
        return isActive;
      }
    };

    dispatch.mixInto(api);

    return api;
  };
});

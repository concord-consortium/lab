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
        tipIdx = -1,
        $tip,
        $instructions,
        overlays = [];

    function showTip() {
      var def = helpTips[tipIdx],
          $component,
          overlayHeight,
          offset;
      if (!def) return;
      // Make sure that focus is active so keyboard handlers work fine.
      $tip.focus();
      // Update content.
      $tip.html(markdownToHTML(def.text));
      // Position.
      if (def.component) {
        $component = def.component === "model" ?
                     $("#model-container") : $("#" + def.component).closest(".component");
        overlayHeight = $component.outerHeight() + 10; // + 5+ 5 => take a loot at OVERLAY_AT values.
        offset = parseFloat($tip.css("font-size"));
        $tip.position({
          of: $component,
          collision: "flipfit flipfit",
          within: $container,
          // Arrow's height depends on font-size (as it's defined in ems).
          my: "left-" + (offset * 4) + " top+" + offset,
          at: "right bottom",
          using: function(position, feedback) {
            var eLeft  = feedback.element.left,
                eWidth = feedback.element.width,
                tLeft  = feedback.target.left,
                tWidth = feedback.target.width,
                $arrow, leftOffset;
            $(this).css(position);
            $arrow = $("<div>")
              .addClass("lab-help-arrow")
              .addClass(feedback.vertical)
              .appendTo(this);
            if (tLeft > eLeft) {
              leftOffset = tLeft - eLeft + tWidth / 2;
              leftOffset = Math.max(eWidth * 0.1, Math.min(eWidth * 0.9, leftOffset));
              $arrow.css("left", leftOffset);
            }
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
          within: $container,
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
      start: function (startIdx, single) {
        if (isActive) {
          api.stop();
          return;
        }
        for (var i = 0; i < 4; i++) {
          overlays.push($('<div class="lab-help-overlay lab-help-next"></div>').appendTo($container));
        }
        $tip = $('<div class="lab-help-tip lab-help-next" tabindex="-1"></div>').appendTo($container);
        if (single) {
          $instructions = $('<div class="lab-help-instructions">' +
                            '<span class="lab-help-next">Click overlay to hide help tip</span>' +
                            '</div>').appendTo($container);
          $container.on("click.lab-help-next", ".lab-help-next", api.stop);
        } else {
          $instructions = $('<div class="lab-help-instructions">' +
                            '<span class="lab-help-prev btn"><</span>' +
                            '<span class="lab-help-next">Click overlay to see next help tip</span>' +
                            '<span class="lab-help-next btn">></span>' +
                            '</div>').appendTo($container);
          $container.on("click.lab-help-next", ".lab-help-next", api.next);
          $container.on("click.lab-help-prev", ".lab-help-prev", api.prev);
          $tip.on('keydown.lab-help', function(event) {
            switch(event.keycode || event.which) {
              case 37: // left-arrow
                api.prev();
                break;
              case 39: // right-arrow
                api.next();
                break;
            }
            event.preventDefault();
            event.stopPropagation();
          });
        }
        isActive = true;
        tipIdx = startIdx != null ? startIdx : 0;
        showTip();
        dispatch.start();
      },

      showSingle: function (componentName) {
        for(var i = 0; i < helpTips.length; i++) {
          if (helpTips[i].component === componentName) {
            api.start(i, true);
            return;
          }
        }
      },

      stop: function () {
        $tip.remove();
        $instructions.remove();
        overlays.forEach(function ($overlay) {
          $overlay.remove();
        });
        overlays.length = 0;
        $container.off("click.lab-help-next", ".lab-help-next");
        $container.off("click.lab-help-prev", ".lab-help-prev");
        isActive = false;
        dispatch.stop();
      },

      next: function () {
        tipIdx++;
        // Skip help tips that have showcase property set to false.
        while(tipIdx < helpTips.length && !helpTips[tipIdx].showcase) {
          tipIdx++;
        }
        if (tipIdx >= helpTips.length) {
          api.stop();
          return;
        }
        showTip();
      },

      prev: function () {
        tipIdx--;
        // Skip help tips that have showcase property set to false.
        while(!tipIdx >= 0 && helpTips[tipIdx].showcase) {
          tipIdx--;
        }
        if (tipIdx < 0) {
          api.stop();
          return;
        }
        showTip();
      },

      isActive: function () {
        return isActive;
      }
    };

    dispatch.mixInto(api);

    return api;
  };
});

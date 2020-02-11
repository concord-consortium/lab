/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
/*
Simple module which provides context menu for amino acids. It allows
to dynamically change type of amino acids in a convenient way.
It uses jQuery.contextMenu plug-in.

CSS style definition: sass/lab/_context-menu.sass
*/
import $__models_md_d_models_aminoacids_helper from 'models/md2d/models/aminoacids-helper';

const aminoacids = $__models_md_d_models_aminoacids_helper;

// Classes for styling. Note that CSS is used for styling, see header.
const MENU_CLASS = "aminoacids-menu";
const HYDROPHOBIC_CLASS = "hydrophobic";
const HYDROPHOBIC_CAT_CLASS = "hydrophobic-category";
const HYDROPHILIC_CLASS = "hydrophilic";
const HYDROPHILIC_CAT_CLASS = "hydrophilic-category";
const POS_CHARGE_CLASS = "pos-charge";
const NEG_CHARGE_CLASS = "neg-charge";
const MARKED_CLASS = "marked";

// Shows given category.
const showCategory = function(type, animate) {
  const func = {
    show: animate ? "slideDown" : "show",
    hide: animate ? "slideUp" : "hide"
  };
  if (type === "hydrophobic") {
    $(`.${HYDROPHOBIC_CLASS}`)[func.show]();
    $(`.${HYDROPHILIC_CLASS}`)[func.hide]();
    $(`.${HYDROPHOBIC_CAT_CLASS}`).addClass("expanded");
    return $(`.${HYDROPHILIC_CAT_CLASS}`).removeClass("expanded");
  } else {
    $(`.${HYDROPHOBIC_CLASS}`)[func.hide]();
    $(`.${HYDROPHILIC_CLASS}`)[func.show]();
    $(`.${HYDROPHOBIC_CAT_CLASS}`).removeClass("expanded");
    return $(`.${HYDROPHILIC_CAT_CLASS}`).addClass("expanded");
  }
};

export default {
  /*
  Register context menu for DOM elements defined by @selector.
  @model, @view are associated model and view, used to set
  properties and redraw view. @getClickedAtom should return data
  of the clicked atom.
  */
  register(model, view, selector, getClickedAtom) {
    const {
      i18n
    } = view;
    // Unregister the same menu first.
    $.contextMenu("destroy", selector);
    // Register new one.
    $.contextMenu({
      // Selector defines DOM elements which can trigger this menu.
      selector,
      // Append to ".lab-responsive-content" to enable dynamic font-scaling.
      appendTo: ".lab-responsive-content",
        // Class of the menu.
        className: MENU_CLASS,
        // Disable animation of the whole menu. Use standard show/hide instead
        // of slideDown/slideUp.
        animation: {
          show: "show",
          hide: "hide"
        },
        // Left click.
        trigger: "left",
        // Default callback for every item.
        callback(key, options) {
          // Get properties of atom representing amino acid.
          const props = getClickedAtom();
          // Remove current selection. It won't be handled by events.#hide callback defined below,
          // because we modify element property. Also, do not setup new selection, as it makes
          // no sense - after click the menu is hidden.
          const marked = aminoacids.getAminoAcidByElement(props.element).abbreviation;
          options.items[marked].$node.removeClass(MARKED_CLASS);
          // Translate abbreviation to element ID.
          const elemId = aminoacids.abbrToElement(key);
          // Set amino acid type.
          model.setAtomProperties(props.idx, {
            element: elemId
          });
          // Redraw view.
          // TODO: model should dispatch appropriate event, which should trigger repaint automatically.
          return view.repaint();
        },

        // Note that this function is almost the same as the default implementation
        // in jQuery.contextMenu. However, there is a small fix. Very often the height of menu was
        // reported incorrectly what was causing incorrect positioning.
        // For example menu was rendered at the bottom of the screen and truncated or scrollbars were needed,
        // when there was a lot of free place above.
        position(opt, x, y) {
          let offset;
          const $win = $(window);
          // determine contextMenu position
          if (!x && !y) {
            opt.determinePosition.call(this, opt.$menu);
            return;
          } else if ((x === "maintain") && (y === "maintain")) {
            // x and y must not be changed (after re-show on command click)
            offset = opt.$menu.position();
          } else {
            // x and y are given (by mouse event)
            const triggerIsFixed = opt.$trigger.parents().andSelf()
              .filter(function() {
                return $(this).css('position') === "fixed";
              }).length;

            if (triggerIsFixed) {
              y -= $win.scrollTop();
              x -= $win.scrollLeft();
            }

            offset = {
              top: y,
              left: x
            };
          }

          // correct offset if viewport demands it
          const bottom = $win.scrollTop() + $win.height();
          const right = $win.scrollLeft() + $win.width();

          /*
          !!! Workaround for the correct positioning:
          Use scrollHeight / scrollWidth as these functions return correct height / width
          in contrast to opt.$menu.height() / opt.$menu.width().
          */
          const height = opt.$menu[0].scrollHeight;
          const width = opt.$menu[0].scrollWidth;

          if ((offset.top + height) > bottom) {
            offset.top -= height;
          }

          if ((offset.left + width) > right) {
            offset.left -= width;
          }

          // Increase offset to prevent accidental clicks.
          offset.left += 1;
          return opt.$menu.css(offset);
        },

        events: {
          // Mark currently selected AA type.
          show(options) {
              const atom = getClickedAtom();
              const aminoAcidProps = atom && aminoacids.getAminoAcidByElement(atom.element);
              if (!atom || !aminoAcidProps) {
                return false;
              }

              const key = aminoAcidProps.abbreviation;
              const {
                $node
              } = options.items[key];
              $node.addClass(MARKED_CLASS);
              if ($node.hasClass(HYDROPHOBIC_CLASS)) {
                showCategory("hydrophobic");
              } else {
                showCategory("hydrophilic");
              }
              // Ensure that this callback returns true (required to show menu).
              return true;
            },

            // Remove marker added above.
            hide(options) {
              const props = getClickedAtom();
              const key = aminoacids.getAminoAcidByElement(props.element).abbreviation;
              options.items[key].$node.removeClass(MARKED_CLASS);
              // Ensure that this callback returns true (required to hide menu).
              return true;
            }
        },

        items: {
          // Category header.
          "Hydrophobic": {
            name: i18n.t("md2d.aminoacid_menu.hydrophobic"),
            className: `${HYDROPHOBIC_CAT_CLASS}`,
            callback() {
              showCategory("hydrophobic", true);
              // Return false to prevent menu from being hidden.
              return false;
            }
          },
          // Items below use default callback.
          "Gly": {
            name: i18n.t("md2d.aminoacid_menu.glycine"),
            className: `${HYDROPHOBIC_CLASS}`
          },
          "Ala": {
            name: i18n.t("md2d.aminoacid_menu.alanine"),
            className: `${HYDROPHOBIC_CLASS}`
          },
          "Val": {
            name: i18n.t("md2d.aminoacid_menu.valine"),
            className: `${HYDROPHOBIC_CLASS}`
          },
          "Leu": {
            name: i18n.t("md2d.aminoacid_menu.leucine"),
            className: `${HYDROPHOBIC_CLASS}`
          },
          "Ile": {
            name: i18n.t("md2d.aminoacid_menu.isoleucine"),
            className: `${HYDROPHOBIC_CLASS}`
          },
          "Phe": {
            name: i18n.t("md2d.aminoacid_menu.phenylalanine"),
            className: `${HYDROPHOBIC_CLASS}`
          },
          "Pro": {
            name: i18n.t("md2d.aminoacid_menu.proline"),
            className: `${HYDROPHOBIC_CLASS}`
          },
          "Trp": {
            name: i18n.t("md2d.aminoacid_menu.tryptophan"),
            className: `${HYDROPHOBIC_CLASS}`
          },
          "Met": {
            name: i18n.t("md2d.aminoacid_menu.methionine"),
            className: `${HYDROPHOBIC_CLASS}`
          },
          "Cys": {
            name: i18n.t("md2d.aminoacid_menu.cysteine"),
            className: `${HYDROPHOBIC_CLASS}`
          },
          "Tyr": {
            name: i18n.t("md2d.aminoacid_menu.tyrosine"),
            className: `${HYDROPHOBIC_CLASS}`
          },
          // Category header.
          "Hydrophilic": {
            name: i18n.t("md2d.aminoacid_menu.hydrophilic"),
            className: `${HYDROPHILIC_CAT_CLASS}`,
            callback() {
              showCategory("hydrophilic", true);
              // Return false to prevent menu from being hidden.
              return false;
            }
          },
          // Items below use default callback.
          "Asn": {
            name: i18n.t("md2d.aminoacid_menu.asparagine"),
            className: `${HYDROPHILIC_CLASS}`
          },
          "Gln": {
            name: i18n.t("md2d.aminoacid_menu.glutamine"),
            className: `${HYDROPHILIC_CLASS}`
          },
          "Ser": {
            name: i18n.t("md2d.aminoacid_menu.serine"),
            className: `${HYDROPHILIC_CLASS}`
          },
          "Thr": {
            name: i18n.t("md2d.aminoacid_menu.threonine"),
            className: `${HYDROPHILIC_CLASS}`
          },
          "Asp": {
            name: i18n.t("md2d.aminoacid_menu.asparticacid"),
            className: `${HYDROPHILIC_CLASS} ${NEG_CHARGE_CLASS}`
          },
          "Glu": {
            name: i18n.t("md2d.aminoacid_menu.glutamicacid"),
            className: `${HYDROPHILIC_CLASS} ${NEG_CHARGE_CLASS}`
          },
          "Lys": {
            name: i18n.t("md2d.aminoacid_menu.lysine"),
            className: `${HYDROPHILIC_CLASS} ${POS_CHARGE_CLASS}`
          },
          "Arg": {
            name: i18n.t("md2d.aminoacid_menu.arginine"),
            className: `${HYDROPHILIC_CLASS} ${POS_CHARGE_CLASS}`
          },
          "His": {
            name: i18n.t("md2d.aminoacid_menu.histidine"),
            className: `${HYDROPHILIC_CLASS} ${POS_CHARGE_CLASS}`
          }
        }
    });

    // Initially show only one category (longer) to ensure that menu has a real-life height.
    // It can be useful for determining of position.
    return showCategory("hydrophobic");
  }
};

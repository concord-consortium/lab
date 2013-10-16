/*global define, d3 */

define(function (require) {
  var nucleotides             = require('models/md2d/views/nucleotides'),
      GeneticElementsRenderer = require('models/md2d/views/genetic-elements-renderer'),
      GeneticAnimStates       = require('models/md2d/views/genetic-anim-states'),
      mutationsContextMenu    = require('cs!models/md2d/views/mutations-context-menu'),

      OBJECT_NAMES = GeneticElementsRenderer.OBJECT_NAMES;

  // Implement .interrupt() method that cancels all currently scheduled
  // transitions. Based on Mike's idea:
  // https://github.com/mbostock/d3/issues/1410#issuecomment-21251284
  d3.selection.prototype.interrupt = function() {
    return this.each(function() {
      var lock = this.__transition__;
      if (lock) {
        var active = -1;
        for (var id in lock) if ((id = +id) > active) active = id;
        lock.active = active + 1;
      }
    });
  };

  function GeneticRenderer(modelView, model) {
    var api,
        node = modelView.node,
        model2px = modelView.model2px,
        model2pxInv = modelView.model2pxInv,
        viewportG = d3.select(node).select(".svg-viewport.below-atoms"),

        g = null,
        currentTrans = null,
        state = null,
        prevAnimState = null,
        prevAnimStep = null,
        suppressViewport = false,
        transitionInProgress = false,
        animStateInProgress = null,

        stateMgr = new GeneticAnimStates(model),
        objectRenderer = new GeneticElementsRenderer(node, model2px, model2pxInv, model),

        transitionFunction;

    function init() {
      // Redraw DNA / mRNA when DNA state is changed.
      model.geneticEngine().on("change", render);
      // Play animation when there is a "transition" event.
      model.geneticEngine().on("transition", transition);

      // When DNAMutations is changed, cleanup & render again.
      model.addPropertiesListener(["DNAMutations"], setup);

      // When viewPortX is changed render DNA and mRNA again. Also center
      // protein while in 'translation-end' state.
      model.addPropertiesListener(["viewPortX"], function() {
        // state.name === "transcription" && transitionInProgress is an icky
        // workaround for the problem with transitions when new nucleotide is
        // entering. Rendering performed by this function breaks the
        // animation. However, when state === "transcription", we actually doesn't
        // have to render DNA and mRNA, as it will be rendered anyway.
        if (!g || !model.get("DNA") || (state.name === "transcription" && transitionInProgress)) return;

        // state.name values are subset of all animation states. We define
        // more animation states than we publish for author / users
        // (animations with -s0, -s1, (...) suffixes).
        var data = stateMgr.getState(animStateInProgress || state.name);

        objectRenderer.mrna(g, data, true);
        objectRenderer.dna(g, data, true);
        objectRenderer.dnaComp(g, data, true);

        if (!transitionInProgress &&
            state.name === "translation-end" &&
            model.getNumberOfAtoms() > 0) {
          model.geneticEngine().centerProtein();
        }
      });

      // Register mutation menus for DNA and DNA complement. Note that
      // jQuery.contextMenu uses event delegation, so it's fully enough to
      // register this menu only once, even before these elements exists.
      mutationsContextMenu.register('[class~="dna"] [class~="clickable-nucleo"]', model, false);
      mutationsContextMenu.register('[class~="dna-comp"] [class~="clickable-nucleo"]', model, true);
    }

    /**
     * Setups genetic renderer. It will be called when new parent view is created
     * or reseted.
     *
     * @private
     */
    function setup() {
      state = model.geneticEngine().state();

      // Cleanup.
      cancelTransitions();
      viewportG.selectAll("g.genetics").remove();
      g = null;

      if (!model.get("DNA")) {
        // When DNA is not defined (=== "", undefined or null) genetic
        // renderer has nothing to do.
        return;
      }

      // Create a new container.
      g = viewportG.insert("g", ".image-container-below").attr("class", "genetics");
      g.append("g").attr("class", "background-layer");
      g.append("g").attr("class", "under-dna-layer");
      g.append("g").attr("class", "dna-layer");
      g.append("g").attr("class", "over-dna-layer");
      g.append("g").attr("class", "top-layer");

      render();
    }

    /**
     * Renders DNA-related graphics using "DNA" and "DNAState"
     * options of the model.
     */
    function render(suppressViewportUpdate) {
      suppressViewport = suppressViewportUpdate;

      // Update DNA state.
      state = model.geneticEngine().state();

      cancelTransitions();

      // Force rendering of all objects when render was called before previous
      // transition ended. This means that we can be somewhere between states
      // and it's impossible to detect which objects should be rendered using
      // previous and current animation state.
      renderState(g, state.name, null, transitionInProgress);

      transitionInProgress = false;
    }

    /**
     * Renders animation state. It updates all objects from previous and new state.
     *
     * You can pass d3.selection or d3.transition as "parent" argument to decide whether
     * new state should be rendered immediately or using transition.
     *
     * @private
     * @param {d3.selection OR d3.transition} parent d3.selection or d3.transition object.
     * @param {String} animState  animation state name.
     * @param {function} onStartCallback callback executed at the beginning of transition
     *                                   or immediately if parent isn't a transition (optional).
     * @param {boolean} forceAll forces re-rendering of all scene objects (optional).
     */
    function renderState(parent, animState, onStartCallback, forceAll) {
      var data = stateMgr.getState(animState),
          prevAnimStateData = prevAnimState ? stateMgr.getState(prevAnimState) : null;

      // TODO: make it simpler.
      function shouldRenderObj(name) {
        var inData     = !!data[name].length,
            inPrevData = !!(prevAnimStateData && prevAnimStateData[name].length);

        if (suppressViewport && name === "viewPort") {
          // Viewport update can be disabled using special variable.
          return false;
        } else if (forceAll || inData || inPrevData) {
          // Render all objects from current and previous states.
          return true;
        }
        return false;
      }

      function render() {
        parent.each(function() {
          var parent = d3.select(this);
          OBJECT_NAMES.forEach(function (name) {
            if (shouldRenderObj(name)) {
              objectRenderer[name](parent, data);
            }
          });
        });
        if (onStartCallback) onStartCallback(parent);
      }

      if (parent.duration) {
        // Transition.
        parent.each("start.transition-name", function () {
          animStateInProgress = animState;
          render();
        });
        parent.each("end.transition-name", function () {
          animStateInProgress = null;
        });
      } else {
        render();
      }

      prevAnimState = animState;
      prevAnimStep = state.step || 0; // when undefined or NaN
    }

    /**
     * Returns a new, chained transition.
     * This transition will be executed when previous one ends.
     *
     * @private
     * @return {d3 transtion} d3 transtion object.
     */
    function nextTrans() {
      var newTrans;
      // TODO: this first check is a workaround.
      // Ideal scenario would be to call always:
      // currentTrans[name] = currentTrans[name].transition();
      // but it seems to fail when transition has already ended.
      if (currentTrans && currentTrans.node().__transition__) {
        // Some transition is currently in progress, chain a new transition.
        newTrans = currentTrans.transition();
      } else {
        // All transitions ended, just create a new one.
        newTrans = g.transition();
      }
      currentTrans = newTrans;
      return newTrans;
    }

    function cancelTransitions() {
      var d3node = d3.select(node);
      var g = d3node.select("g.genetics");
      if (!g.empty() && g.node().__transition__) {
       // Note that some transitions can be applied to elements that live outside g.genetics
       // element, e.g. background. So, it isn't enough to use d3.selectAll("g.genetics *").
        d3node.selectAll("g.genetics, g.genetics *").interrupt();
        d3node.select(".container-background").interrupt(); // background changes
        currentTrans = null;
        animStateInProgress = null;
      }
    }

    /**
     * Triggers animation state transition.
     */
    function transition(transitionName, suppressViewportUpdate) {
      transitionInProgress = true;
      suppressViewport = suppressViewportUpdate;

      // Update DNA state.
      state = model.geneticEngine().state();

      if (Number(transitionName.split(":")[1]) > 0) {
        // e.g. translation:5 or transcription:7
        // We have one common transition function for all "transcription:1" to
        // "transcription:N" transitions called "transcription", as well as
        // one common transition function for all "translation:1" to
        // "translation:N" transitions called "translation".
        transitionName = transitionName.split(":")[0];
      }

      transitionFunction[transitionName]();

      currentTrans.each("end.trans-end", function() {
        transitionInProgress = false;
        // Notify engine that transition has ended.
        model.geneticEngine().transitionEnded();
      });
    }

    /**
     * Definition of all transition functions.
     * @private
     * @type {Object}
     */
    transitionFunction = {
      "dna-updated": function dnaUpdated() {
        // Special state - render current animation state again,
        // as model was updated.
        var t = nextTrans().ease("cubic-in-out").duration(800);
        renderState(t, state.name, null, true);
      },

      "intro-zoom1": function introZoom1() {
        var t = nextTrans().ease("cubic").duration(3000);
        renderState(t, "intro-zoom1");
      },

      "intro-zoom2": function introZoom2() {
        var t = nextTrans().ease("linear").duration(3000);
        renderState(t, "intro-zoom2");
      },

      "intro-zoom3": function introZoom3() {
        var t = nextTrans().ease("linear").duration(2000);
        renderState(t, "intro-zoom3-s0");

        t = nextTrans().ease("quad-out").duration(3300);
        renderState(t, "intro-zoom3");
      },

      "intro-polymerase": function introPolymerase() {
        var t = nextTrans().ease("quad-out").duration(3000);
        renderState(t, "intro-polymerase-s0");

        t = nextTrans().ease("cubic-in-out").duration(1000);
        renderState(t, "intro-polymerase");
      },

      "dna": function dna() {
        var t = nextTrans().duration(2000);
        renderState(t, "dna-s0");


        t = nextTrans().duration(1000);
        renderState(t, "dna", function (t) {
          // Make some transitions almost immediate.
          t.selectAll(".nucleotide").duration(5);
          t.selectAll(".container-background").duration(5);
        });
      },

      "transcription:0": function transcription0() {
        var t = nextTrans().duration(1500);
        renderState(t, "transcription", function(t) {
          // Reselect bonds transition, change duration to 250.
          t.selectAll(".bonds").duration(250);
        });
      },

      "transcription": function transcription() {
        var t = nextTrans().duration(500);
        renderState(t, "transcription", function (t) {
          // Reselect bonds transition, change duration to ease to cubic.
          t.selectAll(".bonds").ease("cubic");
        });
      },

      "transcription-end": function transcriptionEnd() {
        var t = nextTrans().duration(500);
        renderState(t, "transcription-end", function (t) {
          // Reselect bonds transition, change duration to ease to cubic.
          t.selectAll(".bonds").ease("cubic");
        });
      },

      "after-transcription": function afterTranscription() {
        var t = nextTrans().ease("cubic-in-out").duration(700);
        renderState(t, "after-transcription");
      },

      "before-translation": function beforeTranslation() {
        var t = nextTrans().ease("cubic-in-out").duration(1000);
        renderState(t, "before-translation-s0", function (t) {
          t.selectAll(".container-background").duration(1);
        });

        t = nextTrans().ease("cubic-in-out").duration(1500);
        renderState(t, "before-translation-s1");

        t = nextTrans().ease("cubic-in-out").duration(1500);
        renderState(t, "before-translation-s2");

        t = nextTrans().ease("cubic").duration(1000);
        renderState(t, "before-translation-s3", function (t) {
          t.selectAll(".bonds").duration(250);
          t.selectAll(".container-background").duration(1);
        });

        t = nextTrans().ease("cubic-out").duration(1000);
        renderState(t, "before-translation-s4");

        t = nextTrans().ease("cubic-out").duration(500);
        renderState(t, "before-translation");
      },

      "translation:0": function translation0() {
        var t = nextTrans().ease("cubic-in-out").duration(1000);
        renderState(t, "translation-s0");

        t = nextTrans().ease("cubic-in-out").duration(1000);
        renderState(t, "translation-s1");

        t = nextTrans().ease("cubic-in-out").duration(500);
        renderState(t, "translation");
      },

      "translation": function translation() {
        var geneticEngine = model.geneticEngine(),
            codonIdx = state.step - 1,
            newAADuration = 1000,
            shiftDuration = 500,
            t;

        t = nextTrans().duration(newAADuration);
        renderState(t, "translation-step0", function (t) {
          t.selectAll(".bonds").ease("cubic");
          geneticEngine.translationStepStarted(codonIdx, 1.45 + codonIdx * 3 * nucleotides.WIDTH, 3.95,
              0.53 + codonIdx * 3 * nucleotides.WIDTH, 1.57, newAADuration);
        });

        t = nextTrans().duration(shiftDuration);
        renderState(t, "translation-step1", function (t) {
          t.selectAll(".trna-neck").duration(150);
          geneticEngine.shiftAminoAcids(codonIdx, 2 * nucleotides.WIDTH, shiftDuration);
        });
        t.each("end", function () {
          geneticEngine.connectAminoAcid(codonIdx);
        });

        // This will remove 3rd tRNA.
        if (codonIdx > 0) {
          t = nextTrans().duration(900);
          renderState(t, "translation", function (t) {
            t.selectAll(".bonds").duration(150);
          });
        }
      },

      "translation-end": function translationEnd() {
        var geneticEngine = model.geneticEngine(),
            aaCount = model.getNumberOfAtoms(),
            t;

        if (aaCount >= 1) {
          t = nextTrans().duration(150);
          renderState(t, "translation-end-s0");
          t.each("end.anim", function () {
            geneticEngine.translationCompleted();
          });

          t = nextTrans().duration(800);
          renderState(t, "translation-end-s1", function (t) {
            t.selectAll(".bonds").duration(150);
          });

          t = nextTrans().duration(800);
          renderState(t, "translation-end-s2", function (t) {
            t.selectAll(".bonds").duration(150);
          });
        }

        t = nextTrans().duration(500);
        renderState(t, "translation-end-s3");

        t = nextTrans().duration(300);
        renderState(t, "translation-end-s4");

        t = nextTrans().duration(1000);
        renderState(t, "translation-end-s5");

        t = nextTrans().duration(700);
        renderState(t, "translation-end", function () {
          geneticEngine.centerProtein(700);
        });
      }
    };

    api = {
      setup: setup,
      render: render
    };

    init();
    return api;
  }

  return GeneticRenderer;
});

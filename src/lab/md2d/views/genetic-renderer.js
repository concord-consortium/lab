/*global define, d3 */

define(function (require) {
  var nucleotides             = require('md2d/views/nucleotides'),
      GeneticElementsRenderer = require('md2d/views/genetic-elements-renderer'),
      StateManager            = require('common/views/state-manager'),
      mutationsContextMenu    = require('cs!md2d/views/mutations-context-menu'),

      H = GeneticElementsRenderer.H;

  function GeneticRenderer(svg, parent, model) {
    var api,
        viewportG = svg.select(".viewport"),
        model2px = parent.model2px,
        model2pxInv = parent.model2pxInv,

        g = null,
        currentTrans = null,
        state = null,
        prevAnimState = null,
        prevAnimStep = null,
        suppressViewport = false,
        transitionInProgress = false,

        objectNames = [
          "viewPort", "background",
          "cells", "dna1", "dna2", "dna3",
          "polymeraseUnder", "polymeraseOver",
          "polymeraseUnder", "polymeraseOver",
          "dna", "dnaComp", "mrna", "nucleus",
          "ribosomeBottom", "ribosomeTop",
          "ribosomeUnder", "ribosomeOver",
          "trna"
        ],
        stateMgr = new StateManager(objectNames),
        objectRenderer = new GeneticElementsRenderer(svg, model2px, model2pxInv, model),

        transitionFunction;

    function init() {
      // Redraw DNA / mRNA when DNA state is changed.
      model.geneticEngine().on("change", render);
      // Play animation when there is a "transition" event.
      model.geneticEngine().on("transition", transition);

      // When DNAMutations is changed, cleanup & render again.
      model.addPropertiesListener(["DNAMutations"], setup);

      // Register mutation menus for DNA and DNA complement. Note that
      // jQuery.contextMenu uses event delegation, so it's fully enough to
      // register this menu only once, even before these elements exists.
      mutationsContextMenu.register('[class~="dna"] [class~="clickable-nucleo"]', model, false);
      mutationsContextMenu.register('[class~="dna-comp"] [class~="clickable-nucleo"]', model, true);

      // Define animation states.
      defineStates();
    }

    /**
     * Defines all animations states.
     * @private
     */
    function defineStates() {
      var viewPortWidth  = model.get("viewPortWidth"),
          viewPortHeight = model.get("viewPortHeight"),
          vx = viewPortWidth * 0.5,
          vy = viewPortHeight * 0.5,

          lastStep;
      function getStep() {
        if (state.name === "translation-end") {
          return model.geneticEngine().lastTranslationStep();
        }
        var step = state.step;
        lastStep = !isNaN(step) ? step : lastStep;
        return lastStep;
      }
      function ribosomeX() {
        return (1.65 + Math.max(0, getStep() - 2) * 3) * nucleotides.WIDTH;
      }
      function trnaX() {
        return this.index() * 3 * nucleotides.WIDTH;
      }

      stateMgr.newState("intro-cells", {
        cells: [{
          translateX: vx + 0.33,
          translateY: vy,
          scale: 1
        }],
        dna1: [{
          translateX: vx + 0.33,
          translateY: vy,
          scale: 0.13,
          opacity: 0
        }],
        viewPort: [{
          position: 0,
          ease: "cubic-in-out",
          drag: false
        }],
        background: [{
          color: "#8492ef"
        }]
      });
      stateMgr.extendLastState("intro-zoom1", {
        cells: [{
          translateX: vx,
          scale: 6
        }],
        dna1: [{
          translateX: vx,
          scale: 0.78,
          opacity: 5
        }],
        dna2: [{
          translateX: vx,
          translateY: vy,
          scale: 0.5,
          opacity: 0
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("intro-zoom2", {
        cells: [{
          scale: 24
        }],
        dna1: [{
          scale: 3.12,
          opacity: 0
        }],
        dna2: [{
          scale: 2,
          opacity: 1
        }],
        dna3: [{
          translateX: vx,
          translateY: vy,
          scale: 0.2,
          opacity: 0
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("intro-zoom3-s0", {
        cells: [{}],
        dna2: [{
          scale: 3.8,
          opacity: 0
        }],
        dna3: [{
          scale: 0.4,
          opacity: 1
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("intro-zoom3", {
        cells: [{}],
        dna3: [{
          scale: 0.6
        }],
        polymeraseUnder: [{
          scale: 0.2,
          translateX: -2,
          translateY: 4,
          opacity: 1
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("intro-polymerase-s0", {
        cells: [{}],
        dna3: [{}],
        polymeraseUnder: [{
          scale: 0.8,
          translateX: vx,
          translateY: vy,
          opacity: 1
        }],
        polymeraseOver: [{
          translateX: vx,
          translateY: vy,
          scale: 0.8,
          opacity: 0
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("intro-polymerase", {
        cells: [{}],
        dna3: [{}],
        polymeraseUnder: [{
          scale: 1,
        }],
        polymeraseOver: [{
          scale: 1,
          opacity: 1
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("dna-s0", {
        cells: [{
          opacity: 0
        }],
        dna3: [{
          scale: 1.5
        }],
        polymeraseUnder: [{
          scale: 2.5
        }],
        polymeraseOver: [{
          scale: 2.5
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("dna", {
        polymeraseUnder: [{
          opacity: 0
        }],
        polymeraseOver: [{
          opacity: 0
        }],
        dna3: [{
          opacity: 0
        }],
        dna: [{
          translateY: viewPortHeight / 2 + nucleotides.HEIGHT,
          bonds: 1
        }],
        dnaComp: [{
          translateY: viewPortHeight / 2 - nucleotides.HEIGHT,
          bonds: 1
        }],
        viewPort: [{
          position: -2,
          drag: true
        }],
        background: [{
          color: "url(#transcription-bg)"
        }]
      });
      stateMgr.extendLastState("transcription", {
        dna: [{
          translateY: viewPortHeight / 2 + 2.5 * nucleotides.HEIGHT,
          bonds: 0
        }],
        dnaComp: [{
          translateY: viewPortHeight / 2 - 2.5 * nucleotides.HEIGHT,
          bonds: function () {
            var limit = getStep();
            return function (d) {
              return d.coding && d.idx < limit ? 1 : 0;
            };
          }
        }],
        mrna: [{
          translateY: viewPortHeight / 2 - 0.5 * nucleotides.HEIGHT,
          bonds: 1,
          direction: 1
        }],
        viewPort: [{
          position: function () {
            return Math.max(0, Math.min(model.get("DNA").length - 10, getStep() - 6)) - 2;
          },
          ease: "linear"
        }],
        background: [{}]
      });
      stateMgr.extendLastState("transcription-end", {
        dna: [{}],
        dnaComp: [{
          bonds: function () {
            return function (d) {
              return d.coding ? 1 : 0;
            };
          }
        }],
        mrna: [{}],
        polymeraseUnder: [{
          translateX: function () { return model.get("DNA").length * nucleotides.WIDTH; },
          translateY: 0.5 * viewPortHeight,
          scale: 3.5,
          opacity: 0
        }],
        polymeraseOver: [{
          translateX: function () { return model.get("DNA").length * nucleotides.WIDTH; },
          translateY: 0.5 * viewPortHeight,
          scale: 3.5,
          opacity: 0
        }],
        viewPort: [{
          position: function () { return Math.max(0, model.get("DNA").length - 10) - 2; }
        }],
        background: [{}]
      });
      stateMgr.extendLastState("after-transcription", {
        dna: [{}],
        dnaComp: [{}],
        mrna: [{}],
        polymeraseUnder: [{
          opacity: 1
        }],
        polymeraseOver: [{
          opacity: 1
        }],
        viewPort: [{}],
        background: [{
          color: "#8492ef"
        }]
      });
      stateMgr.extendLastState("before-translation-s0", {
        dna: [{}],
        dnaComp: [{}],
        mrna: [{}],
        polymeraseUnder: [{
          scale: 1.4
        }],
        polymeraseOver: [{
          scale: 1.4,
          opacity: 0
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("before-translation-s1", {
        dna: [{}],
        dnaComp: [{}],
        mrna: [{}],
        polymeraseUnder: [{
          translateX: function () { return model.get("viewPortX") + 0.5 * viewPortWidth + 5; }, // + 5!
          translateY: 0.5 * viewPortHeight - 2,
          scale: 0.7
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("before-translation-s2", {
        dna: [{}],
        dnaComp: [{}],
        mrna: [{}],
        nucleus: [{
          translateX: 0.5 * viewPortWidth - 2 * nucleotides.WIDTH,
          translateY: 0.5 * viewPortHeight
        }],
        viewPort: [{
          position: -2,
          ease: "cubic-in-out"
        }],
        background: [{}]
      });
      stateMgr.extendLastState("before-translation-s3", {
        dna: [{
          translateY: 4 * nucleotides.HEIGHT
        }],
        dnaComp: [{
          translateY: 2 * nucleotides.HEIGHT,
          bonds: 0
        }],
        mrna: [{
          bonds: 0
        }],
        nucleus: [{
          translateY: 0
        }],
        viewPort: [{}],
        background: [{
          color: function() { return model.get("backgroundColor"); }
        }]
      });
      stateMgr.extendLastState("before-translation-s4", {
        dna: [{
          translateY: -1 * nucleotides.HEIGHT
        }],
        dnaComp: [{
          translateY: -3 * nucleotides.HEIGHT,
        }],
        mrna: [{
          translateY: 2.5 * nucleotides.HEIGHT
        }],
        nucleus: [{
          translateY: H.NUCLEUS * -0.5
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("before-translation", {
        mrna: [{
          translateY: 1.5 * nucleotides.HEIGHT,
          direction: 2,
          bonds: 0
        }],
        ribosomeBottom: [{
          translateX: -3,
          translateY: vy,
          opacity: 0
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("translation-s0", {
        mrna: [{}],
        ribosomeBottom: [{
          translateX: ribosomeX,
          translateY: 1.75 * nucleotides.HEIGHT,
          opacity: 1
        }],
        ribosomeTop: [{
          translateX: -3,
          translateY: 6,
          opacity: 0
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("translation-s1", {
        mrna: [{}],
        ribosomeBottom: [{}],
        ribosomeTop: [{
          translateX: ribosomeX,
          translateY: 4.52 * nucleotides.HEIGHT,
          opacity: 1
        }],
        ribosomeUnder: [{
          translateX: ribosomeX,
          translateY: 3.7 * nucleotides.HEIGHT,
          opacity: 0
        }],
        ribosomeOver: [{
          translateX: ribosomeX,
          translateY: 3.7 * nucleotides.HEIGHT,
          opacity: 0
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("translation", {
        mrna: [{
          bonds: function () {
            var step = getStep();
            return function (d, i) {
              return i < 3 * (step - 2) || i >= 3 * step ? 0 : 1;
            };
          }
        }],
        ribosomeUnder: [{
          opacity: 1
        }],
        ribosomeOver: [{
          opacity: 1
        }],
        trna: [
          {
            index: function () { return getStep() - 2; },
            translateX: trnaX,
            translateY: 2.5 * nucleotides.HEIGHT,
            neck: 0
          },
          {
            index: function () { return getStep() - 1; },
            translateX: trnaX,
            translateY: 2.5 * nucleotides.HEIGHT,
            neck: 1
          }
        ],
        viewPort: [{
          position: function () { return Math.max(0, 3 * (getStep() - 3)) - 2; },
          ease: "linear"
        }],
        background: [{}]
      });
      stateMgr.extendLastState("translation-step0", {
        mrna: [{
          bonds: function () {
            var step = getStep();
            return function (d, i) {
              return i < 3 * (step - 3) || i >= 3 * step ? 0 : 1;
            };
          }
        }],
        ribosomeUnder: [{}],
        ribosomeOver: [{}],
        trna: [
          {
            index: function () { return getStep() - 3; },
          },
          {
            index: function () { return getStep() - 2; },
          },
          {
            index: function () { return getStep() - 1; },
            translateX: trnaX,
            translateY: 2.5 * nucleotides.HEIGHT,
            neck: 1
          }
        ],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("translation-step1", {
        mrna: [{}],
        ribosomeUnder: [{}],
        ribosomeOver: [{}],
        trna: [
          {},
          {
            neck: 0
          },
          {}
        ],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("translation-end-s0", {
        mrna: [{}],
        ribosomeUnder: [{}],
        ribosomeOver: [{}],
        trna: [
          {
            index: function () { return getStep() - 2; }
          },
          {
            index: function () { return getStep() - 1; },
            neck: 0
          }
        ],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("translation-end-s1", {
        mrna: [{
          bonds: function () {
            var step = getStep();
            return function (d, i) {
              return i < 3 * (step - 1) || i >= 3 * step ? 0 : 1;
            };
          }
        }],
        ribosomeUnder: [{}],
        ribosomeOver: [{}],
        trna: [{
          index: function () { return getStep() - 1; },
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("translation-end-s2", {
        mrna: [{
          bonds: 0
        }],
        ribosomeUnder: [{}],
        ribosomeOver: [{}],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("translation-end-s3", {
        mrna: [{}],
        ribosomeBottom: [{
          translateX: ribosomeX,
          translateY: 1.75 * nucleotides.HEIGHT,
          opacity: 1
        }],
        ribosomeTop: [{
          translateX: ribosomeX,
          translateY: 4.52 * nucleotides.HEIGHT,
          opacity: 1
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("translation-end-s4", {
        mrna: [{}],
        ribosomeBottom: [{
          translateY: 1.75 * nucleotides.HEIGHT - 0.3,
        }],
        ribosomeTop: [{
          translateY: 4.52 * nucleotides.HEIGHT + 0.5,
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("translation-end-s5", {
        mrna: [{}],
        ribosomeBottom: [{
          translateX: function () { return ribosomeX() + 8; },
          translateY: 1.75 * nucleotides.HEIGHT - 0.5,
        }],
        ribosomeTop: [{
          translateX: function () { return ribosomeX() + 8; },
          translateY: 4.52 * nucleotides.HEIGHT + 5,
        }],
        viewPort: [{}],
        background: [{}]
      });
      stateMgr.extendLastState("translation-end", {
        mrna: [{}],
        viewPort: [{}],
        background: [{}]
      });
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
      renderState(g, state.name, transitionInProgress);

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
     * @param {boolean} forceAll forces re-rendering of all scene objects.
     */
    function renderState(parent, animState, forceAll) {
      var data = stateMgr.getState(animState),
          prevAnimStateData = prevAnimState ? stateMgr.getState(prevAnimState) : null;

      // TODO: make it simpler.
      function shouldRenderObj(name) {
        var inData     = !!data[name].length,
            inPrevData = !!(prevAnimStateData && prevAnimStateData[name].length);

        if (suppressViewport && name === "viewPort") {
          // Viewport updat can be disabled using special variable.
          return false;
        } else if (inData || inPrevData) {
          // Render all objects from current and previous states.
          return true;
        }
        return false;
      }

      parent.each(function() {
        var parent = d3.select(this);
        objectNames.forEach(function (name) {
          if (forceAll || shouldRenderObj(name)) {
            objectRenderer[name](parent, data);
          }
        });
      });

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

    /**
     * Trick to cancel all current transitions. It isn't possible explicitly
     * so we have to start new, fake transitions, which will cancel previous
     * ones. Note that some transitions can be applied to elements that live
     * outside g.genetics element, e.g. viewport and background. So, it isn't
     * enough to use d3.selectAll("g.genetics *").
     *
     * @private
     */
    function cancelTransitions() {
      var g = svg.select("g.genetics");
      if (!g.empty() && g.node().__transition__) {
        svg.selectAll("g.genetics, g.genetics *").transition().delay(0);
        svg.select(".plot").transition().delay(0); // background changes
        viewportG.transition().delay(0);           // viewport scrolling
        currentTrans = null;
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
        renderState(t, state.name);
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
        renderState(t, "dna");
        // Enter transition connected with new nucleotides,
        // we don't want it this time.
        t.selectAll(".nucleotide").duration(15);
        t.selectAll(".plot").duration(15);
      },

      "transcription:0": function transcription0() {
        var t = nextTrans().duration(1500);
        renderState(t, "transcription");
        // Reselect bonds transition, change duration to 250.
        t.selectAll(".bonds").duration(250);
      },

      "transcription": function transcription() {
        var t = nextTrans().duration(500);
        renderState(t, "transcription");
        // Reselect bonds transition, change duration to ease to cubic.
        t.selectAll(".bonds").ease("cubic");
      },

      "transcription-end": function transcriptionEnd() {
        var t = nextTrans().duration(500);
        renderState(t, "transcription-end");
        // Reselect bonds transition, change duration to ease to cubic.
        t.selectAll(".bonds").ease("cubic");
      },

      "after-transcription": function afterTranscription() {
        var t = nextTrans().ease("cubic-in-out").duration(700);
        renderState(t, "after-transcription");
      },

      "before-translation": function beforeTranslation() {
        var t = nextTrans().ease("cubic-in-out").duration(1000);
        renderState(t, "before-translation-s0");
        t.selectAll(".plot").duration(5);

        t = nextTrans().ease("cubic-in-out").duration(1500);
        renderState(t, "before-translation-s1");

        t = nextTrans().ease("cubic-in-out").duration(1500);
        renderState(t, "before-translation-s2");

        t = nextTrans().ease("cubic").duration(1000);
        renderState(t, "before-translation-s3");
        t.selectAll(".bonds").duration(250);
        t.selectAll(".plot").duration(1);

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
        renderState(t, "translation-step0");
        t.selectAll(".bonds").ease("cubic");
        t.each("start", function () {
          geneticEngine.translationStepStarted(codonIdx, 1.45 + codonIdx * 3 * nucleotides.WIDTH, 3.95,
              0.53 + codonIdx * 3 * nucleotides.WIDTH, 1.57, newAADuration);
        });

        t = nextTrans().duration(shiftDuration);
        renderState(t, "translation-step1");
        t.selectAll(".trna-neck").duration(150);
        t.each("start", function () {
          geneticEngine.shiftAminoAcids(codonIdx, 2 * nucleotides.WIDTH, shiftDuration);
        });
        t.each("end", function () {
          geneticEngine.connectAminoAcid(codonIdx);
        });

        // This will remove 3rd tRNA.
        if (codonIdx > 0) {
          t = nextTrans().duration(900);
          renderState(t, "translation");
          t.selectAll(".bonds").duration(150);
        }
      },

      "translation-end": function translationEnd() {
        var geneticEngine = model.geneticEngine(),
            aaCount = model.getNumberOfAtoms(),
            t;

        if (aaCount >= 1) {
          t = nextTrans().duration(150);
          renderState(t, "translation-end-s0");
          t.each("end", function () {
            geneticEngine.translationCompleted();
          });

          t = nextTrans().duration(800);
          renderState(t, "translation-end-s1");
          t.selectAll(".bonds").duration(150);

          t = nextTrans().duration(800);
          t.selectAll(".bonds").duration(150);
          renderState(t, "translation-end-s2");
        }

        t = nextTrans().duration(500);
        renderState(t, "translation-end-s3");

        t = nextTrans().duration(300);
        renderState(t, "translation-end-s4");

        t = nextTrans().duration(1000);
        renderState(t, "translation-end-s5");

        t = nextTrans().duration(700);
        renderState(t, "translation-end");
        t.each("start", function () {
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

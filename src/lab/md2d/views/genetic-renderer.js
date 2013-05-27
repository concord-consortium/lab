/*global define, $, d3 */

define(function (require) {
  var console      = require('common/console'),
      nucleotides  = require('md2d/views/nucleotides'),
      GeneticElementsRenderer = require('md2d/views/genetic-elements-renderer'),
      StateManager = require('common/views/state-manager'),

      W = GeneticElementsRenderer.W,
      H = GeneticElementsRenderer.H;

  function GeneticRenderer(container, parent, model) {
    var api,
        model2px = parent.model2px,
        model2pxInv = parent.model2pxInv,

        g = null,
        trnaG = null,
        currentTrans = null,
        state = null,
        prevState = null,

        objectNames = [
          // Note that it's very important that "viewPort" is first here. This
          // array also defines order of rendering. Some states define their
          // properties using current viewport position. So, it has to updated
          // before these functions are evaluated!
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

        objectRenderer = new GeneticElementsRenderer(model, model2px, model2pxInv);

    function init() {
      // Redraw DNA / mRNA when genetic engine state is changed.
      model.geneticEngine().on("change", render);
      // Play animation when there is a "transition" event.
      model.geneticEngine().on("transition", stateTransition);

      defineStates();
    }

    function defineStates() {
      var viewPortWidth  = model.get("viewPortWidth"),
          viewPortHeight = model.get("viewPortHeight"),
          vx = viewPortWidth * 0.5,
          vy = viewPortHeight * 0.5,

          lastStep;
      function getStep() {
        var step = state.step;
        lastStep = !isNaN(step) ? step : lastStep;
        return lastStep;
      }
      function ribosomeX() {
        return (2 + Math.max(0, getStep() - 2) * 3) * nucleotides.WIDTH;
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
          ease: "cubic-in-out"
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
          position: -2
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
            var mrnaLen = model.get("mRNA").length;
            return function (d, i) {
              return i < mrnaLen ? 1 : 0;
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
            return Math.min(model.get("DNA").length - 10, Math.max(0, getStep() - 6)) - 2;
          },
          ease: "linear"
        }],
        background: [{}]
      });
      stateMgr.extendLastState("transcription-end", {
        dna: [{}],
        dnaComp: [{}],
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
        background: [{}]
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
        background: [{
          color: "#8492ef"
        }]
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
        mrna: [{
          translateX: function () { return -(model.get("mRNA").length + 8) * nucleotides.WIDTH; }
        }],
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
        viewPort: [{
          xy: function () {
            var cm = model.geneticEngine().proteinCenterOfMass() || {x: vx, y: vy};
            return [cm.x - vx, cm.y - vy];
          },
          ease: "cubic-in-out"
        }],
        background: [{}]
      });
    }

    function stateTransition() {
      state = model.geneticEngine().state();

      switch(state.name) {
        case "intro-zoom1":
          introZoom1();
          break;
        case "intro-zoom2":
          introZoom2();
          break;
        case "intro-zoom3":
          introZoom3();
          break;
        case "intro-polymerase":
          introPolymerase();
          break;
        case "dna":
          dna();
          break;
        case "transcription":
          if (state.step === 0) {
            transcription0();
          } else {
            transcription();
          }
          break;
        case "transcription-end":
          transcriptionEnd();
          break;
        case "after-transcription":
          afterTranscription();
          break;
        case "before-translation":
          beforeTranslation();
          break;
        case "translation":
          if (state.step === 0) {
            translation0();
          } else {
            translation();
          }
          break;
        case "translation-end":
          translationEnd();
          break;
      }

      currentTrans.each("end.trans-end", function() {
        // Notify engine that transition has ended.
        model.geneticEngine().transitionEnded();
      });
    }

    /**
     * Renders DNA-related graphics using "DNA" and "geneticEngineState"
     * options of the model.
     */
    function render() {
      state = model.geneticEngine().state();

      cancelTransitions();
      smartRender(g, state.name);
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
      // Trick to cancel all current transitions. It isn't possible explicitly
      // so we have to start new, fake transitions, which will cancel previous
      // ones. Note that some transitions can be applied to elements that live
      // outside g.genetics element, e.g. viewport and background. So, it isn't
      // enough to use d3.selectAll("g.genetics *").
      var g = d3.select("g.genetics");
      if (!g.empty() && g.node().__transition__) {
        d3.selectAll("g.genetics, g.genetics *").transition().delay(0);
        d3.select(".viewport").transition().delay(0);
        d3.select(".plot").transition().delay(0);     // background
        currentTrans = null;
      }
    }

    function setup() {
      state = model.geneticEngine().state();

      // Cleanup.
      cancelTransitions();
      container.selectAll("g.genetics").remove();

      if (!model.get("DNA") || state.name === "translation-end") {
        // When DNA is not defined (=== "", undefined or null) or
        // translation is ended, genetic renderer doesn't have to do
        // anything.
        return;
      }

      // Create a new container.
      g = container.append("g").attr("class", "genetics");
      g.append("g").attr("class", "background-layer");
      g.append("g").attr("class", "under-dna-layer");
      g.append("g").attr("class", "dna-layer");
      g.append("g").attr("class", "over-dna-layer");
      g.append("g").attr("class", "top-layer");

      render();
    }

    function smartRender(parent, state) {
      var data = stateMgr.getState(state),
          prevStateData = prevState ? stateMgr.getState(prevState) : null;
      parent.each(function() {
        var parent = d3.select(this);
        objectNames.forEach(function (name) {
          if (data[name].length || (prevStateData && prevStateData[name].length)) {
            objectRenderer[name](parent, data);
          }
        });
      });
      prevState = state;
    }

    function transitionTo(t, state) {
      smartRender(t, state);
    }

    function introZoom1() {
      var t = nextTrans().ease("cubic").duration(3000);
      transitionTo(t, "intro-zoom1");
    }

    function introZoom2() {
      var t = nextTrans().ease("linear").duration(3000);
      transitionTo(t, "intro-zoom2");
    }

    function introZoom3() {
      var t = nextTrans().ease("linear").duration(2000);
      transitionTo(t, "intro-zoom3-s0");

      t = nextTrans().ease("quad-out").duration(3300);
      transitionTo(t, "intro-zoom3");
    }

    function introPolymerase() {
      var t = nextTrans().ease("quad-out").duration(3000);
      transitionTo(t, "intro-polymerase-s0");

      t = nextTrans().ease("cubic-in-out").duration(1000);
      transitionTo(t, "intro-polymerase");
    }

    function dna() {
      var t = nextTrans().duration(2000);
      transitionTo(t, "dna-s0");


      t = nextTrans().duration(1000);
      transitionTo(t, "dna");
      // Enter transition connected with new nucleotides,
      // we don't want it this time.
      t.selectAll(".nucleotide").duration(15);
      t.selectAll(".plot").duration(15);
    }

    function transcription0() {
      var t = nextTrans().duration(1500);
      transitionTo(t, "transcription");
      // Reselect bonds transition, change duration to 250.
      t.selectAll(".bonds").duration(250);
    }

    function transcription() {
      var t = nextTrans().duration(500);
      transitionTo(t, "transcription");
      // Reselect bonds transition, change duration to ease to cubic.
      t.selectAll(".bonds").ease("cubic");
    }

    function transcriptionEnd() {
      var t = nextTrans().duration(500);
      transitionTo(t, "transcription-end");
      // Reselect bonds transition, change duration to ease to cubic.
      t.selectAll(".bonds").ease("cubic");
    }

    function afterTranscription() {
      var t = nextTrans().ease("cubic-in-out").duration(700);
      transitionTo(t, "after-transcription");
    }

    function beforeTranslation() {
      var t = nextTrans().ease("cubic-in-out").duration(1000);
      transitionTo(t, "before-translation-s0");
      t.selectAll(".plot").duration(5);

      t = nextTrans().ease("cubic-in-out").duration(1500);
      transitionTo(t, "before-translation-s1");

      t = nextTrans().ease("cubic-in-out").duration(1500);
      transitionTo(t, "before-translation-s2");

      t = nextTrans().ease("cubic").duration(1000);
      transitionTo(t, "before-translation-s3");
      t.selectAll(".bonds").duration(250);
      t.selectAll(".plot").duration(1);

      t = nextTrans().ease("cubic-out").duration(1000);
      transitionTo(t, "before-translation-s4");

      t = nextTrans().ease("cubic-out").duration(500);
      transitionTo(t, "before-translation");
    }

    function translation0() {
      var t = nextTrans().ease("cubic-in-out").duration(1000);
      transitionTo(t, "translation-s0");

      t = nextTrans().ease("cubic-in-out").duration(1000);
      transitionTo(t, "translation-s1");

      t = nextTrans().ease("cubic-in-out").duration(500);
      transitionTo(t, "translation");
    }

    function translation() {
      var geneticEngine = model.geneticEngine(),
          codonIdx = state.step - 1,
          newAADuration = 1000,
          shiftDuration = 500,
          t;

      t = nextTrans().duration(newAADuration);
      transitionTo(t, "translation-step0");
      t.selectAll(".bonds").ease("cubic");
      t.each("start", function () {
        geneticEngine.translationStepStarted(codonIdx, 1.45 + codonIdx * 3 * nucleotides.WIDTH, 3.95,
            0.53 + codonIdx * 3 * nucleotides.WIDTH, 1.57, newAADuration);
      });

      t = nextTrans().duration(shiftDuration);
      transitionTo(t, "translation-step1");
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
        transitionTo(t, "translation");
        t.selectAll(".bonds").duration(150);
      }
    }


    function translationEnd() {
      var geneticEngine = model.geneticEngine(),
          aaCount = model.getNumberOfAtoms(),
          t;

      if (aaCount >= 1) {
        t = nextTrans().duration(150);
        transitionTo(t, "translation-end-s0");
        t.each("end", function () {
          geneticEngine.translationCompleted();
        });

        t = nextTrans().duration(800);
        transitionTo(t, "translation-end-s1");
        t.selectAll(".bonds").duration(150);

        t = nextTrans().duration(800);
        t.selectAll(".bonds").duration(150);
        transitionTo(t, "translation-end-s2");
      }

      t = nextTrans().duration(500);
      transitionTo(t, "translation-end-s3");

      t = nextTrans().duration(300);
      transitionTo(t, "translation-end-s4");

      t = nextTrans().duration(1000);
      transitionTo(t, "translation-end-s5");

      t = nextTrans().duration(700);
      transitionTo(t, "translation-end");
    }


    function renderTranslationElementsOLD(step) {
      var mRNA       = model.get("mRNA"),
          stopCodons = model.geneticEngine().stopCodonsHash();

      mrnaG.call(nucleotides().model2px(model2px).sequence(mRNA).direction(2).backbone("RNA").stopCodonsHash(stopCodons));
      mrnaG.selectAll(".nucleotide .bonds").style("opacity", function (d, i) {
        // Show bonds only of 6 nucleotides with tRNAs above them.
        return i < 3 * (step - 2) || i >= 3 * step ? 0 : 1;
      });

      mrnaG.attr("transform", "translate(0, " + model2pxInv(1.5 * nucleotides.HEIGHT) + ")");
      appendRibosome();

      moveRibosome(step, true);

      // Note that order of these if statement is important.
      // It ensures that tRNA on the left is the first child,
      // while the second tRNA is the last child.
      if (step > 1) {
        appendTRNA(step - 2);
        // Hide tRNA neck of the first tRNA (there are two visible only).
        trnaG.select(".trna:first-child .trna-neck").style("opacity", 0);
      }
      if (step > 0) {
        appendTRNA(step - 1);
      }
    }

    /******************************************************
     *                Transition methods                  *
     ******************************************************
     * They are called from .stateTransition() method and
     * are used to transition from one state to another
     * using animations.
     */


    function attachRibosome() {
      var t;
      // Ribosome fade in.
      t = nextTrans().ease("cubic-in-out").duration(1000);
      t.each("start", function () {
        g.selectAll(".ribosome-top, .ribosome-bottom")
          .style("opacity", 1);
      });
      t.select(".ribosome-bottom")
        .attr("transform", ribosomeBottomPos(0));
      t = nextTrans().ease("cubic-in-out").duration(1000);
      t.select(".ribosome-top")
        .attr("transform", ribosomeTopPos(0));


      t = nextTrans().ease("cubic-in-out").duration(500);
      t.selectAll(".ribosome-top, .ribosome-bottom")
        .style("opacity", 0);
      t.selectAll(".ribosome-under, .ribosome-over")
        .style("opacity", 1);
    }

    function translateStep(step) {
      var codonIdx = step - 1,
          geneticEngine = model.geneticEngine(),
          newAADuration = 1000,
          shiftDuration = 400,
          t;

      appendTRNA(codonIdx);
      trnaG.select(".trna:last-child")
        .attr("transform", "translate(" + model2px(nucleotides.HEIGHT * 2) + ", " + model2px(-2.78) + ")")
          .select(".rot")
            .attr("transform", "rotate(30)")
            // Bonds subselection.
            .selectAll(".bonds")
              .style("opacity", 0);

      t = nextTrans().duration(newAADuration);
      t.each("start", function () {
        geneticEngine.translationStepStarted(codonIdx, 1.45 + codonIdx * 3 * nucleotides.WIDTH, 3.95,
            0.53 + codonIdx * 3 * nucleotides.WIDTH, 1.57, newAADuration);
      });

      t.select(".trna-cont .trna:last-child")
        .attr("transform", "translate(0, 0)")
          // Rotation g element subselection.
          .select(".rot")
            .attr("transform", "")
            // Bonds subselection.
            .selectAll(".bonds").ease("cubic")
              .style("opacity", 1);

      t.selectAll(".mrna .nucleotide:nth-child(" + (3 * codonIdx + 1) + ") .bonds, " +
                  ".mrna .nucleotide:nth-child(" + (3 * codonIdx + 2) + ") .bonds, " +
                  ".mrna .nucleotide:nth-child(" + (3 * codonIdx + 3) + ") .bonds")
        .ease("cubic")
        .style("opacity", 1);

      moveRibosome(step);

      if (step > 1) {
        t = nextTrans().duration(100);
        t.select(".trna-cont .trna:nth-child(" + (step === 2 ? 1 : 2) + ") .trna-neck")
          .style("opacity", 0);

        t = nextTrans().duration(shiftDuration);
        t.each("start", function () {
          geneticEngine.shiftAminoAcids(codonIdx, 2 * nucleotides.WIDTH, shiftDuration);
        });
        t.each("end", function () {
          geneticEngine.connectAminoAcid(codonIdx);
        });
        // Empty translation. Reserve some time for the protein folding, as D3
        // animations are slowing down simulation significantly.
        // t = nextTrans().duration(600);
      }

      if (step > 2) {
        removeTRNA(step - 3);
      }
    }

    function finishTranslation() {
      var geneticEngine = model.geneticEngine(),
          aaCount = model.getNumberOfAtoms(),
          dnaLen = model.get("DNA").length,
          cm, viewBox, t;

      if (aaCount >= 2) {
        removeTRNA(aaCount - 2);
      }
      if (aaCount >= 1) {
        t = nextTrans().duration(100);
        t.select(".trna-cont .trna:last-child .trna-neck").style("opacity", 0);
        currentTrans.each("end", function () {
          geneticEngine.translationCompleted();
        });
        removeTRNA(aaCount - 1);
      }

      // Ensure that aaCount is >= 2, due to some assumptions used below.
      aaCount = Math.max(2, aaCount);

      // Show top-over.
      t = nextTrans().duration(500);
      t.each("start", function () {
        // Move top-bottom into a correct position.
        d3.select(".ribosome-top")
          .attr("transform", ribosomeTopPos(aaCount));
        d3.select(".ribosome-bottom")
          .attr("transform", ribosomeBottomPos(aaCount));
      });
      t.selectAll(".ribosome-top, .ribosome-bottom").style("opacity", 1);
      t.selectAll(".ribosome-under, .ribosome-over").style("opacity", 0);

      // Detach two parts of ribosome.
      t = nextTrans().duration(300);
      t.select(".ribosome-top")
        .attr("transform", ribosomeTopPos(aaCount, 0, 0.5));
      t.select(".ribosome-bottom")
        .attr("transform", ribosomeBottomPos(aaCount, 0, -0.3));

      // Move ribosome away.
      t = nextTrans().duration(1000);
      t.select(".ribosome-top")
        .attr("transform", ribosomeTopPos(aaCount, 8, 5));
      t.select(".ribosome-bottom")
        .attr("transform", ribosomeBottomPos(aaCount, 8, -0.5));

      // Slide out mRNA.
      t.select(".mrna")
        .attr("transform", "translate(" + model2px(-(dnaLen + 4) * nucleotides.WIDTH) + ", " + model2pxInv(1.5 * nucleotides.HEIGHT) + ")");

      // Center viewport at protein's center of mass.
      t = nextTrans().duration(700);
      t.each("start", function () {
        cm = geneticEngine.proteinCenterOfMass();
        if (cm) { // null when there are no proteins.
          viewBox = d3.select(".viewport").attr("viewBox").split(" ");
          viewBox[0] = model2px(cm.x - 0.5 * model.get("viewPortWidth"));
          // Note that there is + instead of -, as native viewBox attribute uses
          // *top*-left cordner of a viewBox to define its position. Only our
          // model property "viewPortY" defines bottom Y coordinate to be
          // consistent with the general coordinate system used in MD2D.
          viewBox[1] = model2pxInv(cm.y + 0.5 * model.get("viewPortHeight"));
          t.select(".viewport").attr("viewBox", viewBox.join(" "));
        }
      });
      // Update model description of the viewport when animation ends.
      t.each("end", function () {
        if (cm) {
          model.set("viewPortX", cm.x - 0.5 * model.get("viewPortWidth"));
          model.set("viewPortY", cm.y - 0.5 * model.get("viewPortHeight"));
        }
      });

      t.each("end", function () {
        // Nothing will be rendered, but this will simply cleanup everything, as
        // DNA animation is completed.
        render();
      });
    }


    /******************************************************
     *                   Helper methods                   *
     ******************************************************
     * They provide some common functionality, which can be
     * used both during static rendering or transition.
     * Sometimes they accept suppressAnimation argument.
     */

    function appendRibosome() {
      var cy = model2pxInv(model.get("viewPortHeight") * 0.5);
      // Ribosome top-bottom.
      g.append("image").attr({
        "class": "ribosome-bottom",
        "x": model2px(W.RIBO_BOTTOM * -0.5),
        "y": model2px(H.RIBO_BOTTOM * -0.5),
        "width": model2px(W.RIBO_BOTTOM),
        "height": model2px(H.RIBO_BOTTOM),
        "preserveAspectRatio": "none",
        "transform": "translate(" + model2px(-3) + ", " + cy + ")",
        "xlink:href": "resources/dna/Ribosome_bottom1.svg"
      }).style("opacity", 0);

      g.append("image").attr({
        "class": "ribosome-top",
        "x": model2px(W.RIBO_TOP * -0.5),
        "y": model2px(H.RIBO_TOP * -0.5),
        "width": model2px(W.RIBO_TOP),
        "height": model2px(H.RIBO_TOP),
        "preserveAspectRatio": "none",
        "transform": "translate(" + model2px(-3) + ", " + model2pxInv(6) + ")",
        "xlink:href": "resources/dna/Ribosome_top1.svg"
      }).style("opacity", 0);

      g.insert("image", ".mrna").attr({
        "class": "ribosome-under",
        "x": model2px(W.RIBO_UNDER * -0.5),
        "y": model2pxInv(3.7 * nucleotides.HEIGHT + 0.5 * H.RIBO_UNDER),
        "width": model2px(W.RIBO_UNDER),
        "height": model2px(H.RIBO_UNDER),
        "preserveAspectRatio": "none",
        "transform": ribosomeUnderOverPos(0),
        "xlink:href": "resources/dna/Ribosome_under.svg"
      });

      g.append("image").attr({
        "class": "ribosome-over",
        "x": model2px(W.RIBO_OVER * -0.5),
        "y": model2pxInv(3.7 * nucleotides.HEIGHT + 0.5 * H.RIBO_UNDER),
        "width": model2px(W.RIBO_OVER),
        "height": model2px(H.RIBO_OVER),
        "preserveAspectRatio": "none",
        "transform": ribosomeUnderOverPos(0),
        "xlink:href": "resources/dna/Ribosome_over.svg"
      });
    }

    function ribosomeTopPos(step, xShift, yShift) {
      step = Math.max(0, step - 2);
      xShift = xShift || 0;
      yShift = yShift || 0;
      return "translate(" + model2px((2 + step * 3) * nucleotides.WIDTH + xShift) + ", " +
                            model2pxInv(4.52 * nucleotides.HEIGHT + yShift) + ")";
    }

    function ribosomeBottomPos(step, xShift, yShift) {
      step = Math.max(0, step - 2);
      xShift = xShift || 0;
      yShift = yShift || 0;
      return "translate(" + model2px((1.95 + step * 3) * nucleotides.WIDTH + xShift) + ", " +
                            model2pxInv(1.75 * nucleotides.HEIGHT + yShift) + ")";
    }

    function ribosomeUnderOverPos(step) {
      step = Math.max(0, step - 2);
      return "translate(" + model2px((2 + step * 3) * nucleotides.WIDTH) + ")";
    }

    function moveRibosome(pos, suppressAnimation) {
      (suppressAnimation ? g : currentTrans)
        .selectAll(".ribosome-under, .ribosome-over")
          .attr("transform", ribosomeUnderOverPos(pos));
    }

    function appendTRNA(index) {
          // The most outer container can be used to set easily position offset.
          // While the inner g elements provides translation for "ideal" tRNA position
          // close to the mRNA and optional rotation.
      var trnaPosG = trnaG.append("g").attr("class", "trna").append("g"),
          trna = trnaPosG.append("g").attr("class", "rot"),
          type = model.geneticEngine().codonComplement(index),

          m2px    = model2px,
          m2pxInv = model2pxInv,

          codonWidth = 3 * nucleotides.WIDTH,
          offset = (codonWidth - W.TRNA) * 0.55;

      trna.append("g")
        .attr("transform", "translate(0, " + m2px(-H.A) + ")")
        .call(nucleotides().model2px(model2px).sequence(type).backbone(false));

      trna.append("use").attr({
        "class": "trna-neck",
        "x": m2px(0.52 * (codonWidth - W.TRNA_NECK)),
        "y": m2px(-H.TRNA_NECK -H.TRNA * 0.95 - H.A * 0.92),
        "width": m2px(W.TRNA_NECK),
        "height": m2px(H.TRNA_NECK),
        "xlink:href": "#trna-neck-img"
      });

      trna.append("use").attr({
        "class": "trna-base",
        "x": m2px(offset),
        "y": m2px(-H.TRNA - H.A * 0.92),
        "width": m2px(W.TRNA),
        "height": m2px(H.TRNA),
        "xlink:href": "#trna-base-img"
      });

      trnaPosG.attr("transform", "translate(" + m2px(index * codonWidth) + ", " + m2pxInv(2.5 * nucleotides.HEIGHT) + ")");
    }

    /**
     * Removes nth tRNA during DNA translation.
     *
     * @privatef
     * @param  {[type]} i tRNA index (starting from 0).
     */
    function removeTRNA(i, suppressAnimation) {
      var bondsSelString = ".trna-cont .trna:first-child .bonds, " +      // tRNA bonds
                           ".mrna .nucleotide:nth-child(" + (3 * i + 1) + ") .bonds, " + // mRNA bonds
                           ".mrna .nucleotide:nth-child(" + (3 * i + 2) + ") .bonds, " +
                           ".mrna .nucleotide:nth-child(" + (3 * i + 3) + ") .bonds",
          t;

      if (!suppressAnimation) {
        t = nextTrans().duration(900);
        // Remove the first tRNA.
        // Note that due to the fact that we use relative ("first") selector,
        // it has to be inside "start" callback, as only at the beginning of this
        // transition given tRNA will be first one. Otherwise, when you called _removeTRNA
        // twice, both transition would be applied to the same tRNA.
        t.each("start", function () {
          t.select(".trna-cont .trna:first-child")
            .attr("transform", "translate(" + model2px(nucleotides.HEIGHT * -5) + ", " + model2px(nucleotides.HEIGHT * -4) + ")")
            .style("opacity", 0)
              .select(".rot")
                .attr("transform", "rotate(-30)");
          // Hide tRNA and mRNA bonds.
          t.selectAll(bondsSelString).duration(200).style("opacity", 0);
        });
        t.each("end", function () {
          d3.select(".trna-cont .trna:first-child").remove();
        });
      } else {
        g.selectAll(bondsSelString).style("opacity", 0);
        g.select(".trna-cont .trna:first-child").remove();
      }
    }

    api = {
      setup: setup,
      render: render
    };

    init();
    return api;
  }

  return GeneticRenderer;
});

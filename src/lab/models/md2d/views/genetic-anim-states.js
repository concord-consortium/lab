
import nucleotides from 'models/md2d/views/nucleotides';
import GeneticElementsRenderer from 'models/md2d/views/genetic-elements-renderer';
import StateManager from 'common/views/state-manager';
var H = GeneticElementsRenderer.H,
  OBJECT_NAMES = GeneticElementsRenderer.OBJECT_NAMES;

/**
 * Returns StateManager with definitions of DNA / genetic animations states.
 */
export default function geneticAnimStates(model) {
  var stateMgr = new StateManager(OBJECT_NAMES),
    geneticEngine = model.geneticEngine(),
    // Viewport dimensions are immutable, so save them once.
    viewPortWidth = model.get("viewPortWidth"),
    viewPortHeight = model.get("viewPortHeight"),
    vx = viewPortWidth * 0.5,
    vy = viewPortHeight * 0.5,

    lastStep;

  function getStep() {
    var state = geneticEngine.state();
    if (state.name === "translation-end") {
      return model.geneticEngine().lastTranslationStep();
    }
    lastStep = !isNaN(state.step) ? state.step : lastStep;
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
      color: "#55b7b2"
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
      translateX: -model.geneticEngine().PRECODING_LEN * nucleotides.WIDTH,
      translateY: viewPortHeight / 2 + nucleotides.HEIGHT,
      bonds: 1
    }],
    dnaComp: [{
      translateX: -model.geneticEngine().PRECODING_LEN * nucleotides.WIDTH,
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
      bonds: function() {
        var limit = getStep() + model.geneticEngine().PRECODING_LEN;
        return function(d) {
          return d.region === "c" && d.idx < limit ? 1 : 0;
        };
      }
    }],
    mrna: [{
      translateY: viewPortHeight / 2 - 0.5 * nucleotides.HEIGHT,
      bonds: 1,
      direction: 1
    }],
    viewPort: [{
      position: function() {
        return Math.max(0, Math.min(model.get("DNA").length - 10, getStep() - 6)) - 2;
      },
      ease: "linear"
    }],
    background: [{}]
  });
  stateMgr.extendLastState("transcription-end", {
    dna: [{}],
    dnaComp: [{
      bonds: function() {
        return function(d) {
          return d.region === "c" ? 1 : 0;
        };
      }
    }],
    mrna: [{}],
    polymeraseUnder: [{
      translateX: function() {
        return model.get("DNA").length * nucleotides.WIDTH;
      },
      translateY: 0.5 * viewPortHeight,
      scale: 3.5,
      opacity: 0
    }],
    polymeraseOver: [{
      translateX: function() {
        return model.get("DNA").length * nucleotides.WIDTH;
      },
      translateY: 0.5 * viewPortHeight,
      scale: 3.5,
      opacity: 0
    }],
    viewPort: [{
      position: function() {
        return Math.max(0, model.get("DNA").length - 10) - 2;
      }
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
      color: "#55b7b2"
    }]
  });
  stateMgr.extendLastState("before-translation-s1", {
    dna: [{}],
    dnaComp: [{}],
    mrna: [{}],
    polymeraseUnder: [{
      translateX: function() {
        return model.get("viewPortX") + 0.5 * viewPortWidth + 5;
      }, // + 5!
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
      color: function() {
        return model.get("backgroundColor");
      }
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
      bonds: function() {
        var step = getStep();
        return function(d) {
          return d.idx < 3 * (step - 2) || d.idx >= 3 * step ? 0 : 1;
        };
      }
    }],
    ribosomeUnder: [{
      opacity: 1
    }],
    ribosomeOver: [{
      opacity: 1
    }],
    trna: [{
      index: function() {
        return getStep() - 2;
      },
      translateX: trnaX,
      translateY: 2.5 * nucleotides.HEIGHT,
      neck: 0
    }, {
      index: function() {
        return getStep() - 1;
      },
      translateX: trnaX,
      translateY: 2.5 * nucleotides.HEIGHT,
      neck: 1
    }],
    viewPort: [{
      position: function() {
        return Math.max(0, 3 * (getStep() - 3)) - 2;
      },
      ease: "linear"
    }],
    background: [{}]
  });
  stateMgr.extendLastState("translation-step0", {
    mrna: [{
      bonds: function() {
        var step = getStep();
        return function(d) {
          return d.idx < 3 * (step - 3) || d.idx >= 3 * step ? 0 : 1;
        };
      }
    }],
    ribosomeUnder: [{}],
    ribosomeOver: [{}],
    trna: [{
      index: function() {
        return getStep() - 3;
      },
    }, {
      index: function() {
        return getStep() - 2;
      },
    }, {
      index: function() {
        return getStep() - 1;
      },
      translateX: trnaX,
      translateY: 2.5 * nucleotides.HEIGHT,
      neck: 1
    }],
    viewPort: [{}],
    background: [{}]
  });
  stateMgr.extendLastState("translation-step1", {
    mrna: [{}],
    ribosomeUnder: [{}],
    ribosomeOver: [{}],
    trna: [{}, {
      neck: 0
    }, {}],
    viewPort: [{}],
    background: [{}]
  });
  stateMgr.extendLastState("translation-end-s0", {
    mrna: [{}],
    ribosomeUnder: [{}],
    ribosomeOver: [{}],
    trna: [{
      index: function() {
        return getStep() - 2;
      }
    }, {
      index: function() {
        return getStep() - 1;
      },
      neck: 0
    }],
    viewPort: [{}],
    background: [{}]
  });
  stateMgr.extendLastState("translation-end-s1", {
    mrna: [{
      bonds: function() {
        var step = getStep();
        return function(d) {
          return d.idx < 3 * (step - 1) || d.idx >= 3 * step ? 0 : 1;
        };
      }
    }],
    ribosomeUnder: [{}],
    ribosomeOver: [{}],
    trna: [{
      index: function() {
        return getStep() - 1;
      },
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
      translateX: function() {
        return ribosomeX() + 8;
      },
      translateY: 1.75 * nucleotides.HEIGHT - 0.5,
    }],
    ribosomeTop: [{
      translateX: function() {
        return ribosomeX() + 8;
      },
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

  return stateMgr;
};

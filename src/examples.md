# Model-type examples and more

The Lab framework supports embedding multiple model-types into the Lab Interactive form.
Each of the examples below also has an **embeddable** form that fluidly scales to the browser
window it is rendered in and is designed to be easily embedded using an iframe.

_Note: these demo links do not resolve properly at
[github.com/concord-consortium/lab](https://github.com/concord-consortium/lab).
A live version of the readme where these links work is always available here:
[lab.dev.concord.org/readme.html](http://lab.dev.concord.org/readme.html)._

## MD2D model-type: 2D molecular modeling

### MD2D: Basic 2D molecular modeling

1. [Oil and water](interactives.html#interactives/samples/1-oil-and-water-shake.json), _([embeddable](embeddable.html#interactives/samples/1-oil-and-water-shake.json))_
2. [Charged and neutral atoms](interactives.html#interactives/samples/3-100-atoms.json), _([embeddable](embeddable.html#interactives/samples/3-100-atoms.json))_
3. [The volume-pressure relationship](interactives.html#interactives/sam/gas-laws/3-volume-pressure-relationship.json), _([embeddable](embeddable.html#interactives/sam/gas-laws/3-volume-pressure-relationship.json))_
4. [The temperature-volume relationship](interactives.html#interactives/sam/gas-laws/4-temperature-volume-relationship.json), _([embeddable](embeddable.html#interactives/sam/gas-laws/4-temperature-volume-relationship.json))_
5. [Phase changes with two bar graphs](interactives.html#interactives/sam/phase-change/6-phase-changes-caused-by-energy-input-two-bar-graphs.json), _([embeddable](embeddable.html#interactives/sam/phase-change/6-phase-changes-caused-by-energy-input-two-bar-graphs.json))_
6. [Diffusion and temperature](interactives.html#interactives/sam/diffusion/2-temperature.json), _([embeddable](embeddable.html#interactives/sam/diffusion/2-temperature.json))_
7. [Force and deformation in a metal-like material](interactives.html#interactives/visual/recycling/2-metalforces.json), _([embeddable](embeddable.html#interactives/visual/recycling/2-metalforces.json))_
8. [Force and deformation in a ceramic-like material](interactives.html#interactives/visual/recycling/1-ceramicforces.json), _([embeddable](embeddable.html#interactives/visual/recycling/1-ceramicforces.json))_
9. [Force and deformation in a plastic-like material](interactives.html#interactives/visual/recycling/3-plasticforces.json), _([embeddable](embeddable.html#interactives/visual/recycling/3-plasticforces.json))_

### MD2D: Using macroscopic units with the molecular modeling engine

Normally MD2D uses units of femtoseconds and nanometers however it is also possible
to use the same engine with MKS macroscopic units. In the models listed below modeling
Coulomb forces is turned off and the Lennard-Jones force modeling has no effect.

1. [Pendulum](interactives.html#interactives/inquiry-space/pendulum/1-pendulum.json), _([embeddable](embeddable.html#interactives/inquiry-space/pendulum/1-pendulum.json))_
2. [Spring](interactives.html#interactives/inquiry-space/pendulum/2-spring.json), _([embeddable](embeddable.html#interactives/inquiry-space/pendulum/2-spring.json))_
3. [Springy pendulum](interactives.html#interactives/inquiry-space/pendulum/3-springy-pendulum.json), _([embeddable](embeddable.html#interactives/inquiry-space/pendulum/3-springy-pendulum.json))_

### MD2D: Protein and DNA

_Currently in early development._

1. [Protein folding](interactives.html#interactives/samples/5-amino-acids.json), _([embeddable](embeddable.html#interactives/samples/5-amino-acids.json))_
2. [DNA transcription and translation folding](interactives.html#interactives/sam/DNA-to-proteins/3-modeling-translation.json), _([embeddable](embeddable.html#interactives/sam/DNA-to-proteins/3-modeling-translation.json))_

### MD2D: Light and Matter (simple quantum dymanics)

A plugin for MD2D.

_Currently in early development._

1. [Quantum collision](interactives.html#interactives/conversion-tests/quantum-collision.json), _([embeddable](embeddable.html#interactives/conversion-tests/quantum-collision.json))_
2. [Quantum emission](interactives.html#interactives/conversion-tests/quantum-emission.json), _([embeddable](embeddable.html#interactives/conversion-tests/quantum-emission.json))_

## Solar System model-type

_Currently in early development._

- [Earth in orbit](interactives.html#interactives/solar-system/earth.json), _([embeddable](embeddable.html#interactives/solar-system/earth.json))_

## Signal generator model-type

_Currently in early development._

The signal-generator is a very simple model-type that was developed as a scaffold for building a sensor model-type.

- [Signal generator](interactives.html#interactives/signal-generator/signal-generator.json), _([embeddable](embeddable.html#interactives/signal-generator/signal-generator.json))_

## Probeware (sensor) model-type

_Currently in early development._

NOTE: this interactive uses an invisible Java applet to connect to a
[Vernier GoMotion](http://www.vernier.com/products/sensors/motion-detectors/go-mot/)
sonar ranger.

- [Sensor: Vernier GoMotion](interactives.html#interactives/sensor/sensor.json), _([embeddable](embeddable.html#interactives/sensor/sensor.json))_

# Additional examples

## Graphing examples

1. [Line graphs](examples/grapher/grapher.html)
2. [Bar graphs](examples/grapher-bar-graph/bar-graph.html)

**Experimental**

- [Digital signal processing graphs](experiments/dsp/dsp.html)

## Probeware

NOTE: this interactive uses an invisible Java applet to connect to a number of different
commercial probeware inerfaces from [Vernier](http://www.vernier.com/).

1. [Vernier GoLink](http://www.vernier.com/products/interfaces/go-link/)
2. [Vernier GoTemp](http://www.vernier.com/products/sensors/temperature-sensors/go-temp/)
3. [Vernier GoMotion](http://www.vernier.com/products/sensors/motion-detectors/go-mot/)
4. [Vernier LabQuest](http://www.vernier.com/products/interfaces/lq-mini/)

[Vernier Sensor Grapher](experiments/goio-sensor-grapher/index.html) _(only works on web-server)_

## Energy2D: thermal simulation

NOTE: The Energy2D thermal simulation models are not yet integrated into the Lab Interactive form.

- [Energy2D Models](examples/energy2d-model/energy2d-model.html)
- [Energy2D Models (WebGL physics solvers)](examples/energy2d-gpu-model/energy2d-model.html#interactives/vortex-street100.json)

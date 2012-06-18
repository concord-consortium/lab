###
  Implementation of "Complex Atoms Model" with layout & model initialization redone from scratch as
  much as possible.
###

# a temporary pattern for isolating Lab-defined global vars
mitigateGlobals = ({namespace}) ->
  globals = ['modeler']

  for g in globals
    namespace[g] = window[g]
    delete window[g]
  null

###
  Main
###

window.Lab = {}
mitigateGlobals namespace: Lab

model = Lab.modeler.model
  model_listener: null
  temperature: 300
  lennard_jones_forces: true
  coulomb_forces: false
  temperature_control: false
  width: 512
  height: 512

model.createNewAtoms
  num: 100
  relax: true

Lab.model = model


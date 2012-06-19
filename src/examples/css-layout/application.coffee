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

# these are in nm
width = 10
height = 5

numAtoms = 100

mitigateGlobals namespace: Lab

model = Lab.modeler.model
  temperature: 300
  lennard_jones_forces: true
  coulomb_forces: false
  temperature_control: false
  width: width
  height: height

model.createNewAtoms
  relax: true
  num: numAtoms

# temporarily publish 'model' in Lab namespace
Lab.model = model

$(document).ready ->

  Lab.moleculesView '#molecules', model,
    model_time_label: true
    grid_lines: true
    xunits: true
    yunits: true

  # start ticks
  model.resume()

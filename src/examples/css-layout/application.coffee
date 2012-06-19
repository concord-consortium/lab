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

  container = Lab.moleculesView '#molecules', model,
    playback_controller:  false
    play_only_controller: false
    model_time_label:     true
    grid_lines:           true
    xunits:               true
    yunits:               true
    atom_mubers:          false
    get_nodes:            -> model.get_nodes()
    get_num_atoms:        -> model.get_num_atoms()

  container.setup_particles()
  model.setModelListener -> container.update_molecule_positions()

  # start ticks
  model.resume()

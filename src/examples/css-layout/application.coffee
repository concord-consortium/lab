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
height = 10

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

container = Lab.moleculeContainer '#molecule-container', model,
  title:                "Molecules"
  xlabel:               "X position (nm)"
  ylabel:               "Y position (nm)"
  playback_controller:  false
  play_only_controller: false
  model_time_label:     true
  grid_lines:           true
  xunits:               true
  yunits:               true
  atom_mubers:          false
  xmin:                 0
  xmax:                 model.size[0]
  ymin:                 0
  ymax:                 model.size[1]
  get_nodes:            -> model.get_nodes()
  get_num_atoms:        -> model.get_num_atoms()

container.setup_particles()
model.setModelListener -> container.update_molecule_positions()

# start ticks
model.resume()

# temporarily publish 'model' in Lab namespace
Lab.model = model

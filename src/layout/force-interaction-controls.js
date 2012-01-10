// ------------------------------------------------------------
//
// Force Interaction Controls
//
// ------------------------------------------------------------

layout.lennard_jones_forces_checkbox = document.getElementById("lennard-jones-forces-checkbox");

function lennardJonesInteractionHandler() {
    if (layout.lennard_jones_forces_checkbox.checked) {
      model.set_lennard_jones_forces(true);
    } else {
      model.set_lennard_jones_forces(false);
    };
};

layout.lennard_jones_forces_checkbox.onchange = lennardJonesInteractionHandler;

layout.coulomb_forces_checkbox = document.getElementById("coulomb-forces-checkbox");

function coulombForcesInteractionHandler() {
    if (layout.coulomb_forces_checkbox.checked) {
      model.set_coulomb_forces(true);
    } else {
      model.set_coulomb_forces(false);
    };
    layout.setup_particles()
};

layout.coulomb_forces_checkbox.onchange = coulombForcesInteractionHandler;

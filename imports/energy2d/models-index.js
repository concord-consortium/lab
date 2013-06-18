var models_library = {};
var models_index = {
adient_in_house": {
    "name": "Vertical Temperature Gradient In House",
    "path": "models-json/vertical-temperature-gradient-in-house.json"
  },
  "heat_concentration": {
    "name": "Heat Concentration",
    "path": "models-json/heat-concentration.json"
  },
  "dirichlet": {
    "name": "Dirichlet",
    "path": "models-json/dirichlet.json"
  },
  "solar_heating_convection": {
    "name": "Solar Heating Convection",
    "path": "models-json/solar-heating-convection.json"
  },
  "series_circuit_analogy": {
    "name": "Series Circuit Analogy*",
    "path": "models-json/series-circuit-analogy.json"
  },
  "two_blocks": {
    "name": "Two Blocks",
    "path": "models-json/two-blocks.json"
  },
  "heat_storage": {
    "name": "Heat Storage",
    "path": "models-json/heat-storage.json"
  },
  "reynolds": {
    "name": "Reynolds",
    "path": "models-json/reynolds.json"
  },
  "skillion_solar": {
    "name": "Skillion Solar*",
    "path": "models-json/skillion-solar.json"
  },
  "prandtl": {
    "name": "Prandtl",
    "path": "models-json/prandtl.json"
  },
  "different_density1": {
    "name": "Different Density1*",
    "path": "models-json/different-density1.json"
  },
  "streamlines": {
    "name": "Streamlines",
    "path": "models-json/streamlines.json"
  },
  "eee_conduction1": {
    "name": "Eee Conduction1*",
    "path": "models-json/eee-conduction1.json"
  },
  "gable_solar": {
    "name": "Gable Solar*",
    "path": "models-json/gable-solar.json"
  },
  "ht1": {
    "name": "Ht1",
    "path": "models-json/ht1.json"
  },
  "parallel_conductors": {
    "name": "Parallel Conductors",
    "path": "models-json/parallel-conductors.json"
  },
  "intro1": {
    "name": "Intro1",
    "path": "models-json/intro1.json"
  },
  "conduction2": {
    "name": "Conduction2",
    "path": "models-json/conduction2.json"
  },
  "conduction3": {
    "name": "Conduction3",
    "path": "models-json/conduction3.json"
  },
  "hot_water_cup_thickness": {
    "name": "Hot Water Cup Thickness",
    "path": "models-json/hot-water-cup-thickness.json"
  },
  "forced_convection2": {
    "name": "Forced Convection2",
    "path": "models-json/forced-convection2.json"
  },
  "vortex_street_viscosity": {
    "name": "Vortex Street Viscosity",
    "path": "models-json/vortex-street-viscosity.json"
  },
  "forced_convection3": {
    "name": "Forced Convection3",
    "path": "models-json/forced-convection3.json"
  },
  "plume": {
    "name": "Plume*",
    "path": "models-json/plume.json"
  },
  "wind_effect": {
    "name": "Wind Effect*",
    "path": "models-json/wind-effect.json"
  },
  "hot_plate_in_air": {
    "name": "Hot Plate In Air",
    "path": "models-json/hot-plate-in-air.json"
  },
  "compare_conductivity": {
    "name": "Compare Conductivity",
    "path": "models-json/compare-conductivity.json"
  },
  "constant_power_sources": {
    "name": "Constant Power Sources",
    "path": "models-json/constant-power-sources.json"
  },
  "natural_convection2": {
    "name": "Natural Convection2",
    "path": "models-json/natural-convection2.json"
  },
  "power_energy": {
    "name": "Power Energy",
    "path": "models-json/power-energy.json"
  },
  "ray_optics": {
    "name": "Ray Optics*",
    "path": "models-json/ray-optics.json"
  },
  "thermos": {
    "name": "Thermos",
    "path": "models-json/thermos.json"
  },
  "energy_audit": {
    "name": "Energy Audit",
    "path": "models-json/energy-audit.json"
  },
  "different_conductivity": {
    "name": "Different Conductivity*",
    "path": "models-json/different-conductivity.json"
  },
  "natural_convection1": {
    "name": "Natural Convection1",
    "path": "models-json/natural-convection1.json"
  },
  "forced_convection4": {
    "name": "Forced Convection4",
    "path": "models-json/forced-convection4.json"
  },
  "temperature_radiation": {
    "name": "Temperature Radiation*",
    "path": "models-json/temperature-radiation.json"
  },
  "skylight": {
    "name": "Skylight",
    "path": "models-json/skylight.json"
  },
  "internal_heater": {
    "name": "Internal Heater*",
    "path": "models-json/internal-heater.json"
  },
  "compare_convection_conduction": {
    "name": "Compare Convection Conduction*",
    "path": "models-json/compare-convection-conduction.json"
  },
  "vortex_street": {
    "name": "Vortex Street",
    "path": "models-json/vortex-street.json"
  },
  "solar_heating_gable_roof": {
    "name": "Solar Heating Gable Roof*",
    "path": "models-json/solar-heating-gable-roof.json"
  },
  "smoke_in_wind": {
    "name": "Smoke In Wind*",
    "path": "models-json/smoke-in-wind.json"
  },
  "double_cavities": {
    "name": "Double Cavities",
    "path": "models-json/double-cavities.json"
  },
  "conduction4": {
    "name": "Conduction4",
    "path": "models-json/conduction4.json"
  },
  "conduction1": {
    "name": "Conduction1",
    "path": "models-json/conduction1.json"
  },
  "natural_convection_temperature": {
    "name": "Natural Convection Temperature*",
    "path": "models-json/natural-convection-temperature.json"
  },
  "heatshield": {
    "name": "Heatshield",
    "path": "models-json/heatshield.json"
  },
  "solar_radiation": {
    "name": "Solar Radiation",
    "path": "models-json/solar-radiation.json"
  },
  "different_specific_heat2": {
    "name": "Different Specific Heat2*",
    "path": "models-json/different-specific-heat2.json"
  },
  "ray_tracing": {
    "name": "Ray Tracing",
    "path": "models-json/ray-tracing.json"
  },
  "viscosity_turbulence": {
    "name": "Viscosity Turbulence",
    "path": "models-json/viscosity-turbulence.json"
  },
  "regulation": {
    "name": "Regulation",
    "path": "models-json/regulation.json"
  },
  "lid_driven_cavity": {
    "name": "Lid Driven Cavity",
    "path": "models-json/lid-driven-cavity.json"
  },
  "infiltration": {
    "name": "Infiltration",
    "path": "models-json/infiltration.json"
  },
  "projection": {
    "name": "Projection*",
    "path": "models-json/projection.json"
  },
  "conduction5": {
    "name": "Conduction5",
    "path": "models-json/conduction5.json"
  },
  "projection_effect": {
    "name": "Projection Effect",
    "path": "models-json/projection-effect.json"
  },
  "benard_cell": {
    "name": "Benard Cell",
    "path": "models-json/benard-cell.json"
  },
  "compare_capacity": {
    "name": "Compare Capacity",
    "path": "models-json/compare-capacity.json"
  },
  "parallel_circuit_analogy": {
    "name": "Parallel Circuit Analogy*",
    "path": "models-json/parallel-circuit-analogy.json"
  },
  "laminar_turbulent": {
    "name": "Laminar Turbulent*",
    "path": "models-json/laminar-turbulent.json"
  },
  "neumann": {
    "name": "Neumann",
    "path": "models-json/neumann.json"
  },
  "different_density2": {
    "name": "Different Density2*",
    "path": "models-json/different-density2.json"
  },
  "series_conductors": {
    "name": "Series Conductors",
    "path": "models-json/series-conductors.json"
  },
  "fixed_flux_boundary": {
    "name": "Fixed Flux Boundary*",
    "path": "models-json/fixed-flux-boundary.json"
  },
  "hot_water_cup_open_vs_closed_10m": {
    "name": "Hot Water Cup Open Vs Closed 10m*",
    "path": "models-json/hot-water-cup-open-vs-closed-10m.json"
  },
  "solar_heating_two_story": {
    "name": "Solar Heating Two Story*",
    "path": "models-json/solar-heating-two-story.json"
  },
  "forced_convection": {
    "name": "Forced Convection*",
    "path": "models-json/forced-convection.json"
  },
  "fixed_temperature_boundary": {
    "name": "Fixed Temperature Boundary",
    "path": "models-json/fixed-temperature-boundary.json"
  },
  "hot_water_cup_conductivity": {
    "name": "Hot Water Cup Conductivity",
    "path": "models-json/hot-water-cup-conductivity.json"
  },
  "natural_convection": {
    "name": "Natural Convection*",
    "path": "models-json/natural-convection.json"
  },
  "constant_temperature_sources": {
    "name": "Constant Temperature Sources",
    "path": "models-json/constant-temperature-sources.json"
  },
  "insulation_effect": {
    "name": "Insulation Effect",
    "path": "models-json/insulation-effect.json"
  },
  "hot_water_cup_open_vs_closed": {
    "name": "Hot Water Cup Open Vs Closed",
    "path": "models-json/hot-water-cup-open-vs-closed.json"
  },
  "radiation": {
    "name": "Radiation",
    "path": "models-json/radiation.json"
  },
  "convection_exploration": {
    "name": "Convection Exploration",
    "path": "models-json/convection-exploration.json"
  },
  "identical_heat_capacity": {
    "name": "Identical Heat Capacity*",
    "path": "models-json/identical-heat-capacity.json"
  },
  "house_ceiling": {
    "name": "House Ceiling",
    "path": "models-json/house-ceiling.json"
  },
  "solar_heating_skillion_roof": {
    "name": "Solar Heating Skillion Roof*",
    "path": "models-json/solar-heating-skillion-roof.json"
  },
  "conduction_plate": {
    "name": "Conduction Plate*",
    "path": "models-json/conduction_plate.json"
  },
  "forced_convection1": {
    "name": "Forced Convection1",
    "path": "models-json/forced-convection1.json"
  },
  "different_specific_heat1": {
    "name": "Different Specific Heat1*",
    "path": "models-json/different-specific-heat1.json"
  }
};

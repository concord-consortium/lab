# Physical constants and units

The core of the molecular dynamics engine performs computations using dimensioned quantities; we do
not nondimensionalize to reduced units.  The units used internally are:

- femtoseconds
- nanometers
- Dalton (atomic mass units)
- elementary charges
- Kelvin

(Note that we will shortly switch to representing time in picoseconds rather than femtoseconds.)

The above implies that the 'natural' unit of energy within the application is the "Dalton nm^2 /
fs^2", and the natural unit of force is the "Dalton nm / fs^2". We call these "MW Energy Units" and
"MW Force Units" respectively; however, externally-facing methods accept and report energies in
electron volts, rather than "MW Units".

The molecular dynamics engine in `src/md-engine` contains a submodule, defined in `src/md-
engine/constants/` which defines physical useful constants and allows one to perform some unit
conversions in a mnemonic way.

Once you have `require()`d the constants module appropriately, you can access the constants, 2
converter methods, and an object that defines the various units. For the following, assume the
`constants` module has been `require()`d into the variable `constants`.

## Units

The various units are available as properties of the object `constants.unit`, and are named
appropriately. The units themselves are objects, but their properties are not external API; rather,
the unit objects are expected to be passed as arguments to conversion methods which return numeric
values. Units are named in the singular and are written as all-uppercase (they are constants).

Some example units are:

- `constants.unit.JOULE` constants.unit.MW_ENERGY_UNIT` (Dalton nm^2 / fs^2, see above)
- `constants.unit.METERS_PER_FARAD`

## Physical Constants

The various constants are defined as properties of the `constants` object. However, these do not
have numerical values; instead, they each contain a single method, `as`, which accepts a unit (see
above) and returns the numerical value of that constant in terms of that unit. This is intended to
be a convenience for the programmer and to reduce the likelihood that he or she will forget to keep
track of the units in which a value is stored.

For example,

- `constants.BOLTZMANN_CONSTANT.as(constants.unit.JOULES_PER_KELVIN)` (== 1.380658e-23)
- `constants.PERMITTIVITY_OF_FREE_SPACE.as(constants.unit.FARADS_PER_METER)` (== 8.854187e-12)

## Unit conversions

The `constants` module does not attempt to do dimensional analysis (for example, converting kg m/s^2
into Newtons). However, it can convert a value between two different units that measure the same
type of quantity, and it can supply conversion ratios that make it easier to do dimensional analysis
carefully in your own code.


### Converting a value between two unit types:

To convert the value 1kg into Daltons (aka atomic mass units), use the `convert` method:

`constants.convert(1, { from: constants.unit.KILOGRAM, to: constants.unit.DALTON })` (==
6.022137376997844e+26)

### Finding the ratio between two unit types and rolling your own unit conversions:

To find the number of atomic masses in 1 kg, use the `ratio` method with the `per` argument:

`constants.ratio(constants.unit.DALTON, { per: constants.unit.KILOGRAM })`
(== 6.022137376997844e+26)

This form of ratio is especially useful for unit conversion, and the "per" is intended as a
mnemonic. The number reported above, for example, is easily understood to be "6.022 x 10^26 Dalton
per kilogram" and can therefore be used as a factor that "cancels" kilograms and replaces them with
Daltons in a compound unit such as "kg m/s".

However, sometimes you want the value of a Dalton expressed as kilograms. Although you *could*
reverse the units in the above function call, or divide 1 by the result above, it is better to use
the mnemonic `as` form of `ratio`:

`constants.ratio(constants.unit.DALTON, { as: constants.unit.KILOGRAM })` (== 1.66054e-27)

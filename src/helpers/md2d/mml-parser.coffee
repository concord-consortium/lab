cheerio   = require 'cheerio'
constants = require '../../lab/md2d/models/engine/constants'
md2dAPI   = require '../../helpers/md2d/md2d-node-api'
unit      = constants.unit

# Create properties validator
metadata  = md2dAPI.metadata
validator = md2dAPI.validator

# Used throughout Classic MW to convert energy gradient values measured in units of eV/0.1Å to
# the equivalent forces measured in units of 120 amu * 0.1Å / fs^2 (Classic's "natural" unit system
# used to compute position updates)
GF_CONVERSION_CONSTANT = 0.008

# converts gravitation field value from Classic to an acceleration in nm/fs^2
CLASSIC_TO_NEXTGEN_GRAVITATION_RATIO = 0.01 * GF_CONVERSION_CONSTANT

# converts a 'friction' value from Classic to units of amu/fs
CLASSIC_TO_NEXTGEN_FRICTION_RATIO = 120 * GF_CONVERSION_CONSTANT

VDWLinesRatioMap =
  1.33: "short"
  1.67: "medium"
  2.0:  "long"

# window.MWHelpers = {};

###
  Parses an mml file and returns an object containing the stringified JSON

  @return
    json: jsonString of the model
    error: error encountered
###
parseMML = (mmlString) ->

  #try
    ### perform any pre-processing on the string ###

    # MML classes have periods or $ in them, which is not valid in DOM
    mmlString = mmlString.replace /class=".*"/g, (match) ->
      match.replace /[\.$]/g, "-"

    ### load the string into Cheerio ###
    $mml = cheerio.load mmlString

    getNode = ($entity) ->
      # a node may be an object, or it may be a reference to another object. It should
      # be treated the same in either case
      if $entity.attr("idref")
        return $mml("##{$entity.attr("idref")}")
      $entity

    getProperty = ($node, propertyName, additionalSelector) ->
      additionalSelector = '' if not additionalSelector?
      $node.find("[property=#{propertyName}] #{additionalSelector}").text()

    parseBoolean = (str, defaultOption) ->
      bool = str.replace(/^\s+|\s+$/g, '')
      if defaultOption
        ! (bool == "false")
      else
        bool == "true"

    # Return parsed float property or 'undefined' if property is not found.
    getFloatProperty = ($node, propertyName, additionalSelector) ->
      prop = getProperty $node, propertyName, additionalSelector
      # Property found, so parse it.
      return parseFloat prop if prop.length
      # Property not found, so return undefined.
      return undefined

    # Return parsed int property or 'undefined' if property is not found. additional Selector
    getIntProperty = ($node, propertyName, additionalSelector) ->
      prop = getProperty $node, propertyName, additionalSelector
      # Property found, so parse it.
      return parseInt prop, 10 if prop.length
      # Property not found, so return undefined.
      return undefined

    getBooleanProperty = ($node, propertyName, additionalSelector) ->
      prop = getProperty $node, propertyName, additionalSelector
      # Property found, so parse it.
      return parseBoolean prop if prop.length
      # Property not found, so return undefined.
      return undefined

    # Unit conversion performed on undefined values can convert them to NaN.
    # Revert back all NaNs to undefined, when we do not expect any NaN
    # as property. Undefined values will be replaced by default values by validator.
    removeNaNProperties = (props) ->
      for own prop of props
        delete props[prop] if isNaN props[prop]

    ### Convert a cheerio node whose text is a number, to an actual number ###
    toNumber = ($node, {defaultValue}) ->
      val = $node.text()
      if val? then parseFloat(val) else defaultValue

    ### Scale MML length units to nextgen length units ###
    toNextgenLengths = (ls...) -> l/100 for l in ls

    ### Transform an (x,y) coordinate pair from MML frame to nextgen frame ###
    toNextgenCoordinates = (x, y) ->
      # MW 0,0 is top left, NGMW 0,0 is bottom left
      y = viewPortHeight - y

      # if there is a view-port, x and y are actually in view-port coords... map to model coords
      x = x - viewPortX
      y = y - viewPortY

      toNextgenLengths x, y

    ### Find and parse mml nodes representing obstacles ###
    parseObstacles = ->
      obstacles = []
      obstacleNodes = $mml "[property=obstacles] .org-concord-mw2d-models-RectangularObstacle-Delegate"
      for node in obstacleNodes
        $node = getNode cheerio node

        height     = getFloatProperty $node, 'height'
        width      = getFloatProperty $node, 'width'
        x          = getFloatProperty $node, 'x'
        y          = getFloatProperty $node, 'y'
        vx         = getFloatProperty $node, 'vx'
        vy         = getFloatProperty $node, 'vy'
        externalFx = getFloatProperty $node, 'externalFx'
        externalFy = getFloatProperty $node, 'externalFy'
        friction   = getFloatProperty $node, 'friction'
        density    = getFloatProperty $node, 'density'
        westProbe  = getBooleanProperty $node, 'westProbe'
        northProbe = getBooleanProperty $node, 'northProbe'
        eastProbe  = getBooleanProperty $node, 'eastProbe'
        southProbe = getBooleanProperty $node, 'southProbe'
        visible    = getBooleanProperty $node, 'visible'

        colorDef  = $node.find ".java-awt-Color>int"
        if colorDef and colorDef.length > 0
          colorR = parseInt cheerio(colorDef[0]).text()
          colorG = parseInt cheerio(colorDef[1]).text()
          colorB = parseInt cheerio(colorDef[2]).text()

        # Unit conversion.
        [x, y]          = toNextgenCoordinates x, y
        [height, width] = toNextgenLengths height, width
        y               = y - height     # flip to lower-left coordinate system

        # 100 m/s is 0.01 in MML and should be 0.0001 nm/fs
        vx = vx / 100
        vy = -vy / 100

        # Divide by 120, as friction for obstacles is defined *per mass unit*!
        # CLASSIC_TO_NEXTGEN_FRICTION_RATIO includes mass conversion,
        # which is unnecessary when value is defined *per mass unit*.
        friction *= CLASSIC_TO_NEXTGEN_FRICTION_RATIO / 120

        # External forces are specified per mass unit. So, in fact it's acceleration.
        # Convert from units of 0.1Å/fs^2 to units of nm/fs^2
        # Conversion: 1 0.1Å/fs^2 * 0.01 nm/0.1Å = 0.01 nm/fs^2
        externalFx *= 0.01
        externalFy *= 0.01

        # Mimic Classic MW behavior. When obstacle density is bigger than
        # 500 [120amu/0.1A^2], it is considered to be fixed
        # (in Next Gen MW 'Infinity' mass is expected). It is important as it affects
        # kinetic energy calculations (temperature), particles bouncing etc.
        if (density >= 500)
          density = Infinity

        # Classic MW saves density in units of 120amu / (0.1Å)^2
        # (As usual, the claim its user interface makes regarding units is spurious.)
        # Convert to units of amu/nm^2 (aka Dalton/nm^2)
        # Conversion: 1 120amu / (0.1Å)^2 * 120 amu/120amu * (100 0.1Å/nm)^2 = 1.2e6 amu/nm^2
        # Note that the constants module ought to be extended to do this conversion for us; see
        # https://github.com/concord-consortium/lab/issues/9
        density *= 1.2e6

        if density isnt density     # if NaN
          density = Infinity

        # Calculate mass. Next Gen MW uses *only* mass, density isn't stored anywhere.
        mass = density * height * width

        # JSON doesn't accept Infinity numeric value, use string instead.
        mass = "Infinity" if mass == Infinity

        rawData = {
          x, y,
          height, width,
          vx, vy,
          externalFx, externalFy,
          friction,
          mass,
          westProbe, northProbe, eastProbe, southProbe,
          colorR, colorB, colorG,
          visible
        }

        # Unit conversion performed on undefined values can convert them to NaN.
        # Revert back all NaNs to undefined, as we do not expect any NaN
        # as property. Undefined values will be replaced by default values by validator.
        removeNaNProperties rawData

        # Validate all properties and provides default values for undefined values.
        validatedData = validator.validateCompleteness metadata.obstacle, rawData

        # Change colorR, colorB, colorG to array...
        # TODO: ugly, use just one convention. colorR/G/B should be easier.
        validatedData.color = []
        validatedData.color[0] = validatedData.colorR
        validatedData.color[1] = validatedData.colorG
        validatedData.color[2] = validatedData.colorB

        obstacles.push validatedData

      obstacles

    ###
      Find the container size
    ###
    viewProps = $mml(".org-concord-mw2d-models-RectangularBoundary-Delegate")
    width  = getIntProperty viewProps, "width", "double"
    height = getIntProperty viewProps, "height", "double"

    ###
      Find the view-port size. Do it at the beginning, as view-port dimensions
      are used during conversion of other objects.
    ###
    viewPort = viewProps.find("[property=viewSize] .java-awt-Dimension int")
    if (viewPort)
      viewPortWidth  = parseInt viewPort[0].children[0].data
      viewPortHeight = parseInt viewPort[1].children[0].data
      viewPortX = parseInt viewProps.find("[property=x] double").text() || 0
      viewPortY = parseInt viewProps.find("[property=y] double").text() || 0
    else
      viewPortWidth  = width
      viewPortHeight = height
      viewPortX = viewPortY = 0

    # scale from MML units to Lab's units
    [height, width] = toNextgenLengths height, width

    ###
      Find the force interaction booleans
    ###
    coulombForces = getBooleanProperty $mml.root(), "interCoulomb", "boolean"

    ###
      Find the dielectric constant
    ###
    dielectricConstant = getFloatProperty $mml.root(), "dielectricConstant", "float"

    ###
      Find the background color
    ###
    bgColors = (cheerio(n).text() for n in $mml "[property=background] > .java-awt-Color > int")
    # If array of RGBA values is found, use it. Otherwise, left 'backgroundColor' undefined, so default value will be used.
    backgroundColor = "rgba(#{bgColors[0]},#{bgColors[1]},#{bgColors[2]},#{bgColors[3]})" if bgColors.length == 4
    # A tiny "hack" - replace background color of water or oil used in Classic MW to one used in Next Gen MW.
    if backgroundColor == "rgba(134,187,246,255)"
      backgroundColor = new md2dAPI.Solvent("water").color
    if backgroundColor == "rgba(240, 244, 57, 255"
      backgroundColor = new md2dAPI.Solvent("oil").color

    ###
      Find the solvent force type.
      In Classic MW it's a type of solvent. However, to avoid confusion in Next Gen MW
      it's named 'solventForceType', as it affects force driving amino acids. We do not
      store solvent name explicitly as it's redundant information. The solvent specifies
      'solventForceType', 'dielectricConstant' and 'backgroundColor'. See:
      md2d/models/solvent.coffee and md2d/models/modeler.#setSolvent(solventName)
    ###
    $solvent = $mml "[property=solvent] .org-concord-mw2d-models-Solvent"
    solventForceType = getIntProperty $solvent, "type", "short"

    ###
      Find the chargeShading
    ###
    chargeShading = getBooleanProperty $mml.root(), "chargeShading", "boolean"

    ###
      Find the showChargeSymbols
    ###
    showChargeSymbols = getBooleanProperty $mml.root(), "drawCharge", "boolean"

    ###
      Find the KE Shading
    ###
    keShading = getBooleanProperty $mml.root(), "shading", "boolean"

    ###
      Show VDW Lines?
    ###
    showVDWLines = getBooleanProperty $mml.root(), "showVDWLines", "boolean"
    VDWLinesRatio = getFloatProperty $mml.root(), "VDWLinesRatio", "float"
    # if VDWLinesRatio is undefined, VDWLinesCutoff will also be undefined and
    # finally replaced by default value.
    VDWLinesCutoff = VDWLinesRatioMap[VDWLinesRatio]

    ###
      Viscosity
    ###
    universeProps = $mml(".org-concord-mw2d-models-Universe")
    viscosity = getFloatProperty universeProps, "viscosity", "float"

    ###
      viewRefreshInterval
    ###
    viewRefreshInterval = getFloatProperty $mml.root(), "viewRefreshInterval", "int"

    ###
      timeStep
    ###
    timeStep = getFloatProperty $mml.root(), "timeStep", "double"

    ###
      Show Clock
    ###
    showClock = getBooleanProperty $mml.root(), "showClock", "boolean"

    ###
      Show velocity vectors
    ###
    showVelocityVectors = getBooleanProperty $mml.root(), "showVVectors", "boolean"

    velocityVectorProps = $mml("[property=velocityFlavor]")
    if velocityVectorProps.length > 0
      velocityVectorWidth   = getFloatProperty velocityVectorProps, "width", "float"
      velocityVectorLength  = getIntProperty velocityVectorProps, "length", "int"
      velocityVectorLength /= 100
      [velocityVectorWidth] = toNextgenLengths velocityVectorWidth
      velocityColorDef  = velocityVectorProps.find ".java-awt-Color>int"
      if velocityColorDef and velocityColorDef.length > 0
        velocityVectorColor    = "rgb("
        velocityVectorColor   += parseInt(cheerio(velocityColorDef[0]).text()) + ","
        velocityVectorColor   += parseInt(cheerio(velocityColorDef[1]).text()) + ","
        velocityVectorColor   += parseInt(cheerio(velocityColorDef[2]).text()) + ")"

    ###
      Show force vectors
    ###
    showForceVectors = getBooleanProperty $mml.root(), "showFVectors", "boolean"

    forceVectorProps = $mml("[property=forceFlavor]")
    if forceVectorProps.length > 0
      forceVectorWidth   = getFloatProperty forceVectorProps, "width", "float"
      forceVectorLength  = getIntProperty forceVectorProps, "length", "int"
      forceVectorLength /= 1000
      [forceVectorWidth] = toNextgenLengths forceVectorWidth
      forceColorDef  = forceVectorProps.find ".java-awt-Color>int"
      if forceColorDef and forceColorDef.length > 0
        forceVectorColor    = "rgb("
        forceVectorColor   += parseInt(cheerio(forceColorDef[0]).text()) + ","
        forceVectorColor   += parseInt(cheerio(forceColorDef[1]).text()) + ","
        forceVectorColor   += parseInt(cheerio(forceColorDef[2]).text()) + ")"
      if forceVectorColor is "rgb(255,0,255)" then forceVectorColor = undefined

    ###
      GravitationalField
    ###
    gravitationalProps = $mml(".org-concord-mw2d-models-GravitationalField")
    if gravitationalProps.length > 0
      # Some default value must be provided, as this is MML-specific case.
      # If we left gravitationalField undefined, it would be set to its "main" default value.
      gravitationalField = getFloatProperty(gravitationalProps, "intensity", "double") || 0.010

      gravitationalField *= CLASSIC_TO_NEXTGEN_GRAVITATION_RATIO
    else
      # Use "main" default value provided by validator.
      gravitationalField = undefined

    ###
      Object image Properties
      Find all object images. Results in:
      [
        {
          imageUri: imageUri,
          imageHostIndex: imageHostIndex,
          imageHostType: imageHostType
          imageLayer: imageLayer
          imageX: imageX
          imageY: imageY
        },
        { ...
      ]
    ###
    imageProps = $mml("[property=images] array")
    imageBlock = imageProps.find("object.org-concord-mw2d-models-ImageComponent-Delegate")
    images = [];
    if imageProps.length > 0
      for image in imageBlock
        $image = getNode(cheerio(image))
        imageUri = $image.find("[property=URI] string").text()
        imageHostIndex = parseInt $image.find("[property=hostIndex] int").text()
        if (isNaN(imageHostIndex))
          imageHostIndex = 0
        imageHostType = $image.find("[property=hostType] string").text()
        imageHostType = imageHostType.slice(imageHostType.lastIndexOf(".")+1)
        imageLayer = parseInt $image.find("[property=layer] int").text()
        imageX = parseFloat $image.find("[property=x] double").text()
        imageY = parseFloat $image.find("[property=y] double").text()
        [imageX, imageY] = toNextgenCoordinates imageX, imageY
        images.push {imageUri: imageUri, imageHostIndex: imageHostIndex, imageHostType: imageHostType, imageLayer: imageLayer, imageX: imageX, imageY: imageY }

    ###
      Text boxes. TODO: factor out pattern common to MML parsing of images and text boxes
    ###
    wrapTextBoxText = (t) ->
      (line.replace(/^\s+|\s+$/g, '') for line in t.split('\n')).join(' ')

    parseTextBoxNode = (textBoxNode) ->
      $textBoxNode = getNode cheerio textBoxNode
      text = wrapTextBoxText $textBoxNode.find("[property=text] string").text()
      $x = parseFloat $textBoxNode.find("[property=x] double").text()
      $y = parseFloat $textBoxNode.find("[property=y] double").text()
      layer = parseInt($textBoxNode.find("[property=layer] int").text()) || 1
      borderType = parseInt($textBoxNode.find("[property=borderType] int").text()) || 0
      frame = switch borderType
        when 0 then ""
        when 1 then "rectangle"
        when 2 then "rounded rectangle"

      [x, y] = toNextgenCoordinates $x, $y

      textBox = { text, x, y, layer }
      textBox.frame = frame if frame
      textBox

    $textBoxesArray = $mml "[property=textBoxes] array"
    if $textBoxesArray.length > 0
      $textBoxNodes = $textBoxesArray.find "object.org-concord-mw2d-models-TextBoxComponent-Delegate"
      textBoxes = (parseTextBoxNode(node) for node in $textBoxNodes)
    else
      textBoxes = []

    ###
      Find obstacles
    ###
    obstacles = parseObstacles()

    ###
      Find all elements. Results in:
      [
        {
          name: name,
          mass: num,
          sigma: num
          epsilon: []
        },
        { ...
      ]
      Elements are sometimes referred to in MML files by the order they are defined in,
      instead of by name, so we put these in an array instead of a hash so we can get both
    ###
    typesArr = $mml(".org-concord-mw2d-models-Element")
    elemTypes = []

    for type in typesArr
      name  = type.attribs.id
      $type = cheerio(type)
      id    = getIntProperty $type, 'ID', 'int'
      mass  = getFloatProperty $type, 'mass', 'double'
      sigma =  getFloatProperty $type, 'sigma', 'double'
      epsilon = getFloatProperty $type, 'epsilon', 'double'

      # scale sigma to nm
      [sigma] = toNextgenLengths sigma
      # epsilon's sign appears to be flipped between MW and Lab
      epsilon = -epsilon

      # scale to NextGen units
      mass *= 120         #convert to mass in Daltons

      elementRawData = { id, mass, sigma, epsilon }

      # Unit conversion performed on undefined values can convert them to NaN.
      # Revert back all NaNs to undefined, as we do not expect any NaN
      # as property. Undefined values will be replaced by default values by validator.
      removeNaNProperties elementRawData

      # Validate all properties and provides default values for undefined values.
      elementValidatedData = validator.validateCompleteness metadata.element, elementRawData

      elemTypes[elementValidatedData.id] = elementValidatedData

    ###
      Find all custom pairwise LJ properties (sigma and epsilon).
    ###
    pairwiseLJProperties = []

    # This set defines whether mean values are used for pair (so lbMixing is true) or custom (lbMixing is false).
    lbMixingProps = $mml ".org-concord-mw2d-models-Affinity [property=lbMixing]>[method=put]"

    # Custom values for sigma and epsilon.
    epsilonProps = $mml ".org-concord-mw2d-models-Affinity [property=epsilon]"
    sigmaProps = $mml ".org-concord-mw2d-models-Affinity [property=sigma]"

    # Iterate over lbMixing properties first.
    for prop in lbMixingProps
      $prop = getNode cheerio prop
      # Continue only when custom properties should be used.
      if $prop.find("boolean").text() == "false"
        # Use custom values of LJ properties.
        # First, get pair of elements.
        $pair = getNode $prop.find "object"
        pairID = $pair.attr("id")
        element1 = parseInt getNode($pair.find("[property=element1]>object")).find("[property=ID]>int").text()
        element2 = parseInt getNode($pair.find("[property=element2]>object")).find("[property=ID]>int").text()

        # Then find sigma and epsilon values.
        epsilon = epsilonProps.find("object[idref=#{pairID}], object[id=#{pairID}]").next().text()
        sigma = sigmaProps.find("object[idref=#{pairID}], object[id=#{pairID}]").next().text()

        # Scale sigma to nm.
        [sigma] = toNextgenLengths sigma
        # Epsilon's sign appears to be flipped between MW and Lab.
        epsilon = -epsilon

        ljProps = { element1, element2, sigma, epsilon }

        # Unit conversion performed on undefined values can convert them to NaN.
        # Revert back all NaNs to undefined, as we do not expect any NaN
        # as property. Undefined values will be replaced by default values by validator.
        removeNaNProperties ljProps

        # Validate all properties and provides default values for undefined values.
        ljProps = validator.validateCompleteness metadata.pairwiseLJProperties, ljProps

        pairwiseLJProperties.push ljProps

    ###
      Find all atoms. We end up with:
        [
          {
            element: num,
            x: num,
            y: num,
            vx: num,
            vy: num,
            charge: num
          },
          {...
        ]
    ###

    parseAtoms = ->
      atoms = []
      restraints = []

      atomNodes = $mml(".org-concord-mw2d-models-Atom")

      for node in atomNodes
        $node = getNode(cheerio(node))

        element = getIntProperty $node, 'ID', 'int' # selector = "[property=ID] int"
        x       = getFloatProperty $node, 'rx'
        y       = getFloatProperty $node, 'ry'
        vx      = getFloatProperty $node, 'vx'
        vy      = getFloatProperty $node, 'vy'
        charge  = getFloatProperty $node, 'charge'
        friction  = getFloatProperty $node, 'friction'
        visible   = getBooleanProperty $node, 'visible'
        marked    = getBooleanProperty $node, 'marked'
        movable   = getBooleanProperty $node, 'movable'
        # userField is *not* a boolean property. If it exists, assume that
        # atom is draggable. Otherwise, use default value.
        draggable = if getProperty $node, 'userField' then 1 else undefined

        # Classic MW uses movable, while Next Gen MW uses pinned property. Convert.
        pinned  = if movable? then not movable else undefined

        # Change all Boolean values to 0/1.
        pinned    = Number pinned if pinned?
        visible   = Number visible if visible?
        marked    = Number marked if marked?

        # unit conversions
        [x, y] = toNextgenCoordinates x, y
        friction = friction * CLASSIC_TO_NEXTGEN_FRICTION_RATIO
        vx = vx / 100     # 100 m/s is 0.01 in MML and should be 0.0001 nm/fs
        vy = -vy / 100

        restraint = $node.find '[property=restraint]'
        if restraint.length > 0
          $restraint = cheerio restraint

          atomIndex = atoms.length
          k         = getFloatProperty $restraint, 'k'
          x0        = getFloatProperty $restraint, 'x0'
          y0        = getFloatProperty $restraint, 'y0'

          [x0, y0] = toNextgenCoordinates x0, y0

          # MML reports spring constant strength in units of eV per 0.01 nm. Convert to eV/nm ???
          k *= 100

          restraintRawData = { atomIndex, k, x0, y0 }

          # Unit conversion performed on undefined values can convert them to NaN.
          # Revert back all NaNs to undefined, as we do not expect any NaN
          # as property. Undefined values will be replaced by default values by validator.
          removeNaNProperties restraintRawData

          # Validate all properties and provides default values for undefined values.
          restraintValidatedData = validator.validateCompleteness metadata.restraint, restraintRawData

          restraints.push restraintValidatedData


        atomRawData = { element, x, y, vx, vy, charge, friction, pinned, marked, visible, draggable }

        # Unit conversion performed on undefined values can convert them to NaN.
        # Revert back all NaNs to undefined, as we do not expect any NaN
        # as property. Undefined values will be replaced by default values by validator.
        removeNaNProperties atomRawData

        # Validate all properties and provides default values for undefined values.
        atomValidatedData = validator.validateCompleteness metadata.atom, atomRawData

        atoms.push atomValidatedData

      [atoms, restraints]

    ###
      radial bonds
    ###
    radialBonds = []
    radialBondNodes = $mml('.org-concord-mw2d-models-RadialBond-Delegate')
    for node in radialBondNodes
      $node = getNode cheerio node

      # It appears from an inspection of MW's AtomicModel.encode(java.beans.XMLEncoder out) method
      # that atoms are written to the MML file in ascending order. Therefore 'atom1 = 1' means
      # the second atom in the order atoms are found in the file. The atom[1|2] property is NOT
      # written to the file at all if it has the default value 0.

      atom1    = getIntProperty $node, 'atom1'
      atom2    = getIntProperty $node, 'atom2'
      length   = getFloatProperty $node, 'bondLength'
      strength = getFloatProperty $node, 'bondStrength'
      # In Next Gen MW we change style to type. This is the more generic approach,
      # as type can define both visual and physical properties of the radial bond.
      type     = getIntProperty $node, 'style', 'byte'

      # convert from MML units to Lab units.

      # MML reports bondStrength in units of eV per 0.01 nm. Convert to eV/nm
      strength *= 1e4

      # MML reports bondLength in units of 0.01 nm. Convert to nm.
      length *= 0.01

      radialBondRawData = { atom1, atom2, length, strength, type }

      # Unit conversion performed on undefined values can convert them to NaN.
      # Revert back all NaNs to undefined, as we do not expect any NaN
      # as property. Undefined values will be replaced by default values by validator.
      removeNaNProperties radialBondRawData

      # Validate all properties and provides default values for undefined values.
      radialBondValidatedData = validator.validateCompleteness metadata.radialBond, radialBondRawData

      radialBonds.push radialBondValidatedData

    ###
      angular bonds
    ###
    angularBonds = []
    angularBondNodes = $mml('.org-concord-mw2d-models-AngularBond-Delegate')
    for node in angularBondNodes
      $node = getNode cheerio node

      # It appears from an inspection of MW's AtomicModel.encode(java.beans.XMLEncoder out) method
      # that atoms are written to the MML file in ascending order. Therefore 'atom1 = 1' means
      # the second atom in the order atoms are found in the file. The atom[1|2] property is NOT
      # written to the file at all if it has the default value 0.

      atom1    = getIntProperty $node, 'atom1'
      atom2    = getIntProperty $node, 'atom2'
      atom3    = getIntProperty $node, 'atom3'
      # unit: radian
      angle    = getFloatProperty $node, 'bondAngle'
      # unit: eV/radian^2
      strength = getFloatProperty $node, 'bondStrength'
      # Unit conversion is unnecessary.

      angularBondRawData = { atom1, atom2, atom3, angle, strength }

       # Validate all properties and provides default values for undefined values.
      angularBondValidatedData = validator.validateCompleteness metadata.angularBond, angularBondRawData

      angularBonds.push angularBondValidatedData

    ###
      heatBath settings
    ###
    heatBath = $mml(".org-concord-mw2d-models-HeatBath").find("[property=expectedTemperature]")
    if heatBath.length > 0
      targetTemperature = parseFloat heatBath.find("double").text()

    ### Put everything together into Lab's JSON format ###
    results = parseAtoms()
    atoms = results[0]
    restraints = results[1]

    x  = (atom.x for atom in atoms)
    y  = (atom.y for atom in atoms)
    vx = (atom.vx for atom in atoms)
    vy = (atom.vy for atom in atoms)
    charge = (atom.charge for atom in atoms)
    friction = (atom.friction for atom in atoms)
    element = (atom.element for atom in atoms)
    pinned = (atom.pinned for atom in atoms)
    marked = (atom.marked for atom in atoms)
    visible = (atom.visible for atom in atoms)
    draggable = (atom.draggable for atom in atoms)

    id = atoms[0]?.element || 0

    ### Convert array of hashes to a hash of arrays, for use by MD2D ###
    unroll = (array, props...) ->
      unrolled = {}
      for prop in props
        unrolled[prop] = (item[prop] for item in array)
      unrolled

    # Main properties of the model.
    json =
      coulombForces       : coulombForces
      temperatureControl  : !!targetTemperature
      targetTemperature   : targetTemperature
      width               : width
      height              : height
      viscosity           : viscosity
      gravitationalField  : gravitationalField
      viewRefreshInterval : viewRefreshInterval
      timeStep            : timeStep
      dielectricConstant  : dielectricConstant
      solventForceType    : solventForceType

    # Unit conversion performed on undefined values can convert them to NaN.
    # Revert back all NaNs to undefined, as they will be replaced by default values.
    removeNaNProperties json
    # Validate all properties and provides default values for undefined values.
    json = validator.validateCompleteness metadata.mainProperties, json

    # Properties which are managed by model, but they define view.
    # Model handles them, as they are e.g. stored in the history.
    modelViewProperties =
      backgroundColor     : backgroundColor
      keShading           : keShading
      chargeShading       : chargeShading
      showChargeSymbols   : showChargeSymbols
      showVDWLines        : showVDWLines
      VDWLinesCutoff      : VDWLinesCutoff
      showClock           : showClock
      showVelocityVectors : showVelocityVectors
      showForceVectors    : showForceVectors

    # Validate all properties and provides default values for undefined values.
    modelViewProperties = validator.validateCompleteness metadata.modelViewProperties, modelViewProperties

    json.viewOptions = modelViewProperties
    json.elements = elemTypes
    json.pairwiseLJProperties = pairwiseLJProperties
    json.atoms =
      x : x
      y : y
      vx: vx
      vy: vy
      charge: charge
      friction: friction
      element: element
      pinned: pinned
      marked: marked
      visible: visible
      draggable: draggable

    if radialBonds.length > 0
      json.radialBonds = unroll radialBonds, 'atom1', 'atom2', 'length', 'strength',  'type'

    if angularBonds.length > 0
      json.angularBonds = unroll angularBonds, 'atom1', 'atom2', 'atom3', 'angle', 'strength'

    if restraints.length > 0
      json.restraints = unroll restraints, 'atomIndex', 'k', 'x0', 'y0'

    if imageProps.length > 0
      json.images = images

    if obstacles.length > 0
      json.obstacles = unroll obstacles, 'x', 'y', 'vx', 'vy', 'externalFx', 'externalFy', 'friction',
        'height', 'width', 'mass', 'westProbe', 'northProbe', 'eastProbe', 'southProbe', 'color', 'visible'

    if textBoxes.length > 0
      json.textBoxes = textBoxes

    # Additional view-only options (which are *not* managed by model).
    if velocityVectorLength or velocityVectorWidth or velocityVectorColor
      json.viewOptions.velocityVectors = vOpts = {}
      vOpts.length = velocityVectorLength if velocityVectorLength
      vOpts.width  = velocityVectorWidth  if velocityVectorWidth
      vOpts.color  = velocityVectorColor  if velocityVectorColor

    if forceVectorLength or forceVectorWidth or forceVectorColor
      json.viewOptions.forceVectors = vOpts = {}
      vOpts.length = forceVectorLength if forceVectorLength
      vOpts.width  = forceVectorWidth  if forceVectorWidth
      vOpts.color  = forceVectorColor  if forceVectorColor

    # Remove some properties from the final serialized model.
    removeArrayIfDefault = (name, array, defaultVal) ->
      delete json.atoms[name] if array.every (i)-> i is defaultVal

    # Arrays which has only default values.
    removeArrayIfDefault("marked", marked, metadata.atom.marked.defaultValue)
    removeArrayIfDefault("visible", visible, metadata.atom.visible.defaultValue)
    removeArrayIfDefault("draggable", draggable, metadata.atom.draggable.defaultValue)

    # Remove targetTemperature when heat-bath is disabled.
    delete json.targetTemperature if not json.temperatureControl
    # Remove atomTraceId when atom tracing is disabled.
    delete json.viewOptions.atomTraceId if not json.viewOptions.showAtomTrace

    # Remove modelSampleRate as this is Next Gen MW specific option.
    delete json.modelSampleRate

    return json: json
  # catch e
  #   return error: e.toString()

exports.parseMML = parseMML
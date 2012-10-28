cheerio   = require 'cheerio'
constants = require '../../lab/md2d/models/engine/constants'
unit      = constants.unit

# Used throughout Classic MW to convert energy gradient values measured in units of eV/0.1Å to
# the equivalent forces measured in units of 120 amu * 0.1Å / fs^2 (Classic's "natural" unit system
# used to compute position updates)
GF_CONVERSION_CONSTANT = 0.008

# converts gravitation field value from Classic to an acceleration in nm/fs^2
CLASSIC_TO_NEXTGEN_GRAVITATION_RATIO = 0.01 * GF_CONVERSION_CONSTANT

# converts a 'friction' value from Classic to units of amu/fs
CLASSIC_TO_NEXTGEN_FRICTION_RATIO = 120 * GF_CONVERSION_CONSTANT

# JAVA MW RadialBond style codes
RADIAL_BOND_STANDARD_STICK_STYLE = 101
RADIAL_BOND_LONG_SPRING_STYLE = 102
RADIAL_BOND_SOLID_LINE_STYLE = 103
RADIAL_BOND_GHOST_STYLE = 104
RADIAL_BOND_UNICOLOR_STICK_STYLE = 105
RADIAL_BOND_SHORT_SPRING_STYLE = 106
RADIAL_BOND_DOUBLE_BOND_STYLE = 107
RADIAL_BOND_TRIPLE_BOND_STYLE = 108

RadialBondStyleDefault = RADIAL_BOND_STANDARD_STICK_STYLE

# window.MWHelpers = {};

###
  Parses an mml file and returns an object containing the stringified JSON

  @return
    json: jsonString of the model
    error: error encountered
###
parseMML = (mmlString) ->

  try
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

    getProperty = ($node, propertyName) ->
      $node.find("[property=#{propertyName}]").text()

    parseBoolean = (str, defaultOption) ->
      bool = str.replace(/^\s+|\s+$/g, '')
      if defaultOption
        ! (bool == "false")
      else
        bool == "true"

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

        height     = parseFloat getProperty $node, 'height'
        width      = parseFloat getProperty $node, 'width'
        x          = parseFloat getProperty $node, 'x'
        y          = parseFloat getProperty $node, 'y'
        vx         = parseFloat (getProperty $node, 'vx') || 0
        vy         = parseFloat (getProperty $node, 'vy') || 0
        externalFx = parseFloat (getProperty $node, 'externalFx') || 0
        externalFy = parseFloat (getProperty $node, 'externalFy') || 0
        friction   = parseFloat (getProperty $node, 'friction') || 0
        density    = parseFloat getProperty $node, 'density'
        westProbe  = parseBoolean (getProperty $node, 'westProbe'), false
        northProbe = parseBoolean (getProperty $node, 'northProbe'), false
        eastProbe  = parseBoolean (getProperty $node, 'eastProbe'), false
        southProbe = parseBoolean (getProperty $node, 'southProbe'), false
        visible    = parseBoolean (getProperty $node, 'visible'), true

        # Unit conversion.
        vx = vx / 100     # 100 m/s is 0.01 in MML and should be 0.0001 nm/fs
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

        # Classic MW saves density in units of 120amu / (0.1Å)^2
        # (As usual, the claim its user interface makes regarding units is spurious.)
        # Convert to units of amu/nm^2 (aka Dalton/nm^2)
        # Conversion: 1 120amu / (0.1Å)^2 * 120 amu/120amu * (100 0.1Å/nm)^2 = 1.2e6 amu/nm^2
        # Note that the constants module ought to be extended to do this conversion for us; see
        # https://github.com/concord-consortium/lab/issues/9
        density *= 1.2e6

        if density isnt density     # if NaN
          density = "Infinity"

        color  = null
        colorDef  = $node.find ".java-awt-Color>int"
        if colorDef and colorDef.length > 0
          color    = []
          color[0] = parseInt cheerio(colorDef[0]).text()
          color[1] = parseInt cheerio(colorDef[1]).text()
          color[2] = parseInt cheerio(colorDef[2]).text()
        else
          color    = [128, 128, 128]

        [x, y]          = toNextgenCoordinates x, y
        [height, width] = toNextgenLengths height, width
        y               = y - height     # flip to lower-left coordinate system

        obstacles.push {
          x, y,
          height, width,
          vx, vy,
          externalFx, externalFy,
          friction,
          density,
          westProbe, northProbe, eastProbe, southProbe,
          color, visible
        }

      obstacles


    ###
      Find the container size
    ###
    viewProps = $mml(".org-concord-mw2d-models-RectangularBoundary-Delegate")
    width  = parseInt viewProps.find("[property=width] double").text()
    height = parseInt viewProps.find("[property=height] double").text()

    ###
      Find the force interaction booleans
    ###
    lennardJonesForces  = parseBoolean($mml("[property=LJBetweenBondPairs] boolean").text(), true)
    coulombForces       = parseBoolean($mml("[property=interCoulomb] boolean").text(), true)

    ###
      Find the chargeShading
    ###
    viewChargeShadingProps = $mml(".java-beans-XMLDecoder")
    chargeShading  = viewChargeShadingProps.find("[property=chargeShading] boolean").text()

    ###
      Find the KE Shading
    ###
    keShading = parseBoolean($mml("[property=shading] boolean").text(), false)

    ###
      Show VDW Lines?
    ###
    showVDWLines = parseBoolean($mml("[property=showVDWLines] boolean").text(), false)
    VDWLinesRatio = $mml("[property=VDWLinesRatio] float")
    VDWLinesRatio = if VDWLinesRatio.length != 0 then parseFloat(VDWLinesRatio.text()) else 2

    ###
      Viscosity
    ###
    universeProps = $mml(".org-concord-mw2d-models-Universe")
    # Viscosity default value, not stored in MML, is 1.
    viscosity = parseFloat universeProps.find("[property=viscosity] float").text() || 1

    ###
      viewRefreshInterval
    ###
    viewRefreshInterval = parseFloat($mml("[property=viewRefreshInterval] int").text() || 50)

    ###
      timeStep
    ###
    timeStep = parseFloat($mml("[property=timeStep] double").text() || 1.0)

    ###
      Show Clock
    ###
    showClock = parseBoolean($mml("[property=showClock] boolean").text(), true)

    ###
      GravitationalField
    ###
    gravitationalProps = $mml(".org-concord-mw2d-models-GravitationalField")
    if gravitationalProps.length > 0
      gravitationalField = parseFloat gravitationalProps.find("[property=intensity] double").text() || 0.010
      gravitationalField *= CLASSIC_TO_NEXTGEN_GRAVITATION_RATIO
    else
      gravitationalField = false

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
        images.push {imageUri: imageUri, imageHostIndex: imageHostIndex, imageHostType: imageHostType, imageLayer: imageLayer, imageX: imageX, imageY: imageY }

    ###
      Text boxes. TODO: factor out pattern common to MML parsing of images and text boxes
    ###
    wrapTextBoxText = (t) ->
      ("<p>#{line.replace(/^\s+|\s+$/g, '')}</p>" for line in t.split('\n')).join('\n')

    parseTextBoxNode = (textBoxNode) ->
      $textBoxNode = getNode cheerio textBoxNode
      text = wrapTextBoxText $textBoxNode.find("[property=text] string").text()
      $x = $textBoxNode.find("[property=x] double")
      $y = $textBoxNode.find("[property=y] double")

      [x] = toNextgenLengths toNumber $x, defaultValue: 0
      [y] = toNextgenLengths toNumber $y, defaultValue: 0

      { text, x, y }

    $textBoxesArray = $mml "[property=textBoxes] array"
    if $textBoxesArray.length > 0
      $textBoxNodes = $textBoxesArray.find "object.org-concord-mw2d-models-TextBoxComponent-Delegate"
      textBoxes = (parseTextBoxNode(node) for node in $textBoxNodes)
    else
      textBoxes = []

    ###
      Find the view-port size
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
      id    = parseFloat $type.find("[property=ID] int").text() || 0
      mass  = parseFloat $type.find("[property=mass] double").text() || 1
      sigma = parseFloat $type.find("[property=sigma] double").text() || 30
      epsilon = parseFloat $type.find("[property=epsilon] double").text() || 0.1

      # scale sigma to nm
      [sigma] = toNextgenLengths sigma
      # epsilon's sign appears to be flipped between MW and Lab
      epsilon = -epsilon

      # scale to NextGen units
      mass *= 120         #convert to mass in Daltons

      elemTypes[id] = id: id, mass: mass, sigma: sigma, epsilon: epsilon

    ###
      Find all the epsilon forces between elements. Add the properties to the elementTypes
      array so that we get:
      [
        {
          name: name,
          mass: num,
          sigma: num,
          epsilon: [
            num0,
            num1,
            num2...
          ]
        },
        { ...
      ]
      where num0 is the epsilon between this first element and the second, num1 is the epsilon between
      this first element and the third, etc.
    ###
    #epsilonPairs = $mml(".org-concord-mw2d-models-Affinity [property=epsilon]>[method=put]")
    #for pair in epsilonPairs
    #  $pair = getNode($(pair))
    #  elem1 = parseInt getNode($pair.find("[property=element1]>object")).find("[property=ID]>int").text() || 0
    #  elem2 = parseInt getNode($pair.find("[property=element2]>object")).find("[property=ID]>int").text() || 0
    #  value = $pair.find(">double").text()
    #  elemTypes[elem1].epsilon[elem2] = value
    #  elemTypes[elem2].epsilon[elem1] = value   # set mirror value for e from elem2 to elem1

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

        elemId = parseInt   $node.find("[property=ID] int").text() || 0
        x      = parseFloat $node.find("[property=rx]").text()
        y      = parseFloat $node.find("[property=ry]").text()
        vx     = parseFloat $node.find("[property=vx]").text() || 0
        vy     = parseFloat $node.find("[property=vy]").text() || 0
        charge = parseFloat $node.find("[property=charge]").text() || 0
        friction  = parseFloat $node.find("[property=friction]").text() || 0
        visible   = if (parseBoolean (getProperty $node, 'visible'), true) then 1 else 0
        pinned    = if $node.find("[property=movable]").text() then 1 else 0
        marked    = if $node.find("[property=marked]").text() then 1 else 0
        draggable = if $node.find("[property=userField]").text() then 1 else 0

        # unit conversions
        [x, y] = toNextgenCoordinates x, y
        friction = friction * CLASSIC_TO_NEXTGEN_FRICTION_RATIO
        vx = vx / 100     # 100 m/s is 0.01 in MML and should be 0.0001 nm/fs
        vy = -vy / 100

        restraint = $node.find '[property=restraint]'
        if restraint.length > 0
          $restraint = cheerio restraint

          atomIndex = atoms.length
          k         = parseFloat $restraint.find('[property=k]').text() || 20
          x0        = parseFloat $restraint.find('[property=x0]').text() || 0
          y0        = parseFloat $restraint.find('[property=y0]').text() || 0

          [x0, y0] = toNextgenCoordinates x0, y0

          # MML reports spring constant strength in units of eV per 0.01 nm. Convert to eV/nm ???
          k *= 100
          restraints.push { atomIndex, k, x0, y0 }

        atoms.push { elemId, x, y, vx, vy, charge, friction, pinned, marked, visible, draggable }

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

      atom1Index    = parseInt($node.find('[property=atom1]').text(), 10) || 0
      atom2Index    = parseInt($node.find('[property=atom2]').text(), 10) || 0
      bondLength    = parseFloat $node.find('[property=bondLength]').text()
      bondStrength  = parseFloat $node.find('[property=bondStrength]').text()
      bondStyle     = parseInt($node.find('[property=style] byte').text()) || RadialBondStyleDefault

      # convert from MML units to Lab units.

      # MML reports bondStrength in units of eV per 0.01 nm. Convert to eV/nm
      bondStrength *= 1e4

      # MML reports bondLength in units of 0.01 nm. Convert to nm.
      bondLength *= 0.01

      radialBonds.push { atom1Index, atom2Index, bondLength, bondStrength, bondStyle }

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

      atom1Index   = parseInt($node.find('[property=atom1]').text(), 10) || 0
      atom2Index   = parseInt($node.find('[property=atom2]').text(), 10) || 0
      atom3Index   = parseInt($node.find('[property=atom3]').text(), 10) || 0
      # unit: radian
      bondAngle    = parseFloat $node.find('[property=bondAngle]').text()
      # unit: eV/radian^2
      bondStrength = parseFloat $node.find('[property=bondStrength]').text()
      # Unit conversion is unnecessary.

      angularBonds.push { atom1Index, atom2Index, atom3Index, bondAngle, bondStrength }

    ###
      heatBath settings
    ###
    heatBath = $mml(".org-concord-mw2d-models-HeatBath").find("[property=expectedTemperature]")
    if heatBath.length > 0
      temperature = parseFloat heatBath.find("double").text()

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
    element = (atom.elemId for atom in atoms)
    pinned = (atom.pinned for atom in atoms)
    marked = (atom.marked for atom in atoms)
    visible = (atom.visible for atom in atoms)
    draggable = (atom.draggable for atom in atoms)

    id = atoms[0]?.elemId || 0

    ### Convert array of hashes to a hash of arrays, for use by MD2D ###
    unroll = (array, props...) ->
      unrolled = {}
      for prop in props
        unrolled[prop] = (item[prop] for item in array)
      unrolled

    json =
      lennardJonesForces  : lennardJonesForces
      coulombForces       : coulombForces
      temperature_control : !!temperature
      width               : width
      height              : height
      viscosity           : viscosity
      keShading           : keShading
      chargeShading       : !!chargeShading
      showVDWLines        : !!showVDWLines
      VDWLinesRatio       : VDWLinesRatio
      gravitationalField  : gravitationalField
      showClock           : showClock
      viewRefreshInterval : viewRefreshInterval
      timeStep            : timeStep
      elements            : elemTypes
      atoms :
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

    removeArrayIfDefault = (name, array, defaultVal) ->
      delete json.atoms[name] if array.every (i)-> i is defaultVal

    removeArrayIfDefault("marked", marked, 0)
    removeArrayIfDefault("visible", visible, 1)
    removeArrayIfDefault("draggable", draggable, 0)

    if radialBonds.length > 0
      json.radialBonds = unroll radialBonds, 'atom1Index', 'atom2Index', 'bondLength', 'bondStrength',  'bondStyle'

    if angularBonds.length > 0
      json.angularBonds = unroll angularBonds, 'atom1Index', 'atom2Index', 'atom3Index', 'bondAngle', 'bondStrength'

    if restraints.length > 0
      json.restraints = unroll restraints, 'atomIndex', 'k', 'x0', 'y0'

    if imageProps.length > 0
      json.images = images

    # Temporarily remove text boxes from converted models; see
    # https://www.pivotaltracker.com/story/show/37081141
    # if textBoxes.length > 0
    #   json.textBoxes = textBoxes

    if obstacles.length > 0
      json.obstacles = unroll obstacles, 'x', 'y', 'vx', 'vy', 'externalFx', 'externalFy', 'friction',
        'height', 'width', 'density', 'westProbe', 'northProbe', 'eastProbe', 'southProbe', 'color', 'visible'

    json.temperature = temperature if temperature

    return json: json
  catch e
    return error: e.toString()

exports.parseMML = parseMML
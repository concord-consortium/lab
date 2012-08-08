cheerio   = require 'cheerio'
constants = require '../lab/models/md2d/engine/constants'
unit      = constants.unit

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
      # an node may be an object, or it may be a reference to another object. It should
      # be treated the same in either case
      if $entity.attr("idref")
        return $mml("##{$entity.attr("idref")}")
      $entity

    getProperty = ($node, propertyName) ->
      $node.find("[property=#{propertyName}]").text()

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

        height = parseFloat getProperty $node, 'height'
        width  = parseFloat getProperty $node, 'width'
        x      = parseFloat getProperty $node, 'x'
        y      = parseFloat getProperty $node, 'y'

        density = parseFloat getProperty $node, 'density'

        # authors in MW specify Kg/(mol*A^2), but this gets saved as 100Kg/(mol*A^2)
        # (e.g. 20 Kg/(mol*A^2) is saved as 0.2)

        # First convert back to Kg/(mol*A^2)
        density = density * 100
        # convert to Daltons/nm^2, 1000 Dal = 1 Kg/mol, 100 A^2 = 1 nm^2
        density = density * 1000 * 100

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

        obstacles.push { x, y, height, width, density, color }

      obstacles


    ###
      Find the container size
    ###
    viewProps = $mml(".org-concord-mw2d-models-RectangularBoundary-Delegate")
    width  = parseInt viewProps.find("[property=width] double").text()
    height = parseInt viewProps.find("[property=height] double").text()

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
      atomNodes = $mml(".org-concord-mw2d-models-Atom")

      for node in atomNodes
        $node = getNode(cheerio(node))

        elemId = parseInt   $node.find("[property=ID] int").text() || 0
        x      = parseFloat $node.find("[property=rx]").text()
        y      = parseFloat $node.find("[property=ry]").text()
        vx     = parseFloat $node.find("[property=vx]").text() || 0
        vy     = parseFloat $node.find("[property=vy]").text() || 0
        charge = parseFloat $node.find("[property=charge]").text() || 0

        [x, y] = toNextgenCoordinates x, y

        vx = vx / 100     # 100 m/s is 0.01 in MML and should be 0.0001 nm/fs
        vy = -vy / 100

        atoms.push { elemId, x, y, vx, vy, charge }

      atoms

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

      atom1Index   = parseInt($node.find('[property=atom1]').text(), 10) || 0
      atom2Index   = parseInt($node.find('[property=atom2]').text(), 10) || 0
      bondLength   = parseFloat $node.find('[property=bondLength]').text()
      bondStrength = parseFloat $node.find('[property=bondStrength]').text()

      # convert from MML units to Lab units.

      # MML reports bondStrength in units of eV per 0.01 nm. Convert to eV/nm
      bondStrength *= 1e4

      # MML reports bondLength in units of 0.01 nm. Convert to nm.
      bondLength *= 0.01

      radialBonds.push { atom1Index, atom2Index, bondLength, bondStrength }

    ###
      heatBath settings
    ###
    heatBath = $mml(".org-concord-mw2d-models-HeatBath").find("[property=expectedTemperature]")
    if heatBath.size() > 0
      temperature = parseFloat heatBath.find("double").text()

    ### Put everything together into Lab's JSON format ###
    atoms = parseAtoms()

    x  = (atom.x for atom in atoms)
    y  = (atom.y for atom in atoms)
    vx = (atom.vx for atom in atoms)
    vy = (atom.vy for atom in atoms)
    charge = (atom.charge for atom in atoms)
    element = (atom.elemId for atom in atoms)

    id = atoms[0]?.elemId || 0

    ### Convert array of hashes to a hash of arrays, for use by MD2D ###
    unroll = (array, props...) ->
      unrolled = {}
      for prop in props
        unrolled[prop] = (item[prop] for item in array)
      unrolled

    json =
      temperature_control : !!temperature
      width               : width
      height              : height
      elements            : elemTypes
      atoms :
        X : x
        Y : y
        VX: vx
        VY: vy
        CHARGE: charge
        ELEMENT: element

    if radialBonds.length > 0
      json.radialBonds = unroll radialBonds, 'atom1Index', 'atom2Index', 'bondLength', 'bondStrength'

    if obstacles.length > 0
      json.obstacles = unroll obstacles, 'x', 'y', 'height', 'width', 'density', 'color'

    json.temperature = temperature if temperature

    return json: json
  catch e
    return error: e.toString()

exports.parseMML = parseMML
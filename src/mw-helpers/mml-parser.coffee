cheerio = require('cheerio');

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
      id    = $type.find("[property=ID] int").text() || 0
      mass  = $type.find("[property=mass] double").text()
      sigma = $type.find("[property=sigma] double").text()
      epsilon = $type.find("[property=epsilon] double").text()

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
    atoms = []
    atomNodes = $mml(".org-concord-mw2d-models-Atom")
    for node in atomNodes
      $node = getNode(cheerio(node))
      elemId = parseInt $node.find("[property=ID] int").text() || 0
      x  = parseFloat $node.find("[property=rx]").text()
      y  = parseFloat $node.find("[property=ry]").text()
      vx = parseFloat $node.find("[property=vx]").text() || 0
      vy = parseFloat $node.find("[property=vy]").text() || 0

      # MW 0,0 is top left, NGMW 0,0 is bottom left
      y = viewPortHeight - y
      vy = -vy

      # if there is a view-port, x and y are actually in view-port coords... map to model coords
      x = x - viewPortX
      y = y - viewPortY

      # scale from MML units to Lab's units
      x  = x / 100      # 100 pixels per nm
      y  = y / 100
      vx = vx / 100     # 100 m/s is 0.01 in MML and should be 0.0001 nm/fs
      vy = vy / 100

      atoms.push elemId: elemId, x: x, y: y, vx: vx, vy: vy, charge: 0

    # scale from MML units to Lab's units
    width  = width / 100      # 100 pixels per nm
    height = height / 100

    ### Put everything together into Lab's JSON format ###
    x  = (atom.x for atom in atoms)
    y  = (atom.y for atom in atoms)
    vx = (atom.vx for atom in atoms)
    vy = (atom.vy for atom in atoms)
    charge = (atom.charge for atom in atoms)
    element = (atom.elemId for atom in atoms)

    id = atoms[0]?.elemId || 0
    # for now, just use the first atom's element epsilon
    epsilon = elemTypes[id].epsilon
    # for now use first atom's element sigma; scale to nm
    sigma   = elemTypes[id].sigma / 100

    # epsilon's sign appears to be flipped between MW and Lab
    epsilon = -epsilon

    jsonObj =
      temperature_control : false
      epsilon             : epsilon
      sigma               : sigma
      lennard_jones_forces: true
      coulomb_forces      : false
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

    json = JSON.stringify(jsonObj, null, 2)

    return json: json
  catch e
    return error: e.toString()

exports.parseMML = parseMML
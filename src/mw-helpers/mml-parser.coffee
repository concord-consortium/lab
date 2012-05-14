window.MWHelpers = {};

###
  Parses an mml file and returns an object containing the stringified JSON

  @return
    json: jsonString of the model
    errors: array of errors encountered
###
MWHelpers.parseMML = (mmlString) ->

  ### perform any pre-processing on the string ###

  # MML classes have periods or $ in them, which is not valid in DOM
  mmlString = mmlString.replace /class=".*"/g, (match) ->
    match.replace /[\.$]/g, "-"

  ### parse the string into XML Document using jQuery and get a jQuery object ###
  $mml = $($.parseXML(mmlString))

  getNode = ($entity) ->
    # an node may be an object, or it may be a reference to another object. It should
    # be treated the same in either case
    if $entity.attr("idref")
      return $mml.find("##{$entity.attr("idref")}")
    $entity

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
  typesArr = $mml.find(".org-concord-mw2d-models-Element")
  elemTypes = []
  for type in typesArr
    $type = $(type)
    name  = $type.attr('id')
    id    = $type.find("[property=ID]>int")[0]?.textContent || 0
    mass  = $type.find("[property=mass]>double")[0]?.textContent
    sigma = $type.find("[property=sigma]>double")[0]?.textContent
    elemTypes[id] = name: id, mass: mass, sigma: sigma, epsilon: []

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
  epsilonPairs = $mml.find(".org-concord-mw2d-models-Affinity [property=epsilon]>[method=put]")
  for pair in epsilonPairs
    $pair = getNode($(pair))
    elem1 = parseInt getNode($pair.find("[property=element1]>object")).find("[property=ID]>int").text() || 0
    elem2 = parseInt getNode($pair.find("[property=element2]>object")).find("[property=ID]>int").text() || 0
    value = $pair.find(">double").text()
    elemTypes[elem1].epsilon[elem2] = value
    elemTypes[elem2].epsilon[elem1] = value   # set mirror value for e from elem2 to elem1

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
  atomNodes = $mml.find(".org-concord-mw2d-models-Atom")
  for node in atomNodes
    $node = getNode($(node))
    elemId = parseInt $node.find("[property=ID]")[0]?.textContent || 0
    x  = parseFloat $node.find("[property=rx]").text()
    y  = parseFloat $node.find("[property=ry]").text()
    vx = parseFloat $node.find("[property=vx]").text() || 0
    vy = parseFloat $node.find("[property=vy]").text() || 0

    # scale from MML units to Lab's units
    x  = x / 100      # 100 pixels per nm
    y  = y / 100
    vx = vx / 100     # 100 m/s is 0.01 in MML and should be 0.0001 nm/fs
    vy = vy / 100

    atoms.push element: elemId, x: x, y: y, vx: vx, vy: vy, charge: 0

  ###
    Find the container size
  ###
  width  = parseInt $mml.find(".org-concord-mw2d-models-RectangularBoundary-Delegate>[property=width]").find(">double").text()
  height = parseInt $mml.find(".org-concord-mw2d-models-RectangularBoundary-Delegate>[property=height]").find(">double").text()

  # scale from MML units to Lab's units
  width  = width / 100      # 100 pixels per nm
  height = height / 100

  ### Put everything together into Lab's JSON format ###
  x  = (atom.x for atom in atoms)
  y  = (atom.y for atom in atoms)
  vx = (atom.vx for atom in atoms)
  vy = (atom.vy for atom in atoms)
  charge = (atom.charge for atom in atoms)

  # for now, just use set epsilon to the e between the first element and the second
  epsilon = elemTypes[0].epsilon[1]
  sigma   = elemTypes[0].sigma

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
    atoms :
      X : x
      Y : y
      VX: vx
      VY: vy
      CHARGE: charge

  json = JSON.stringify(jsonObj, null, 2)

  return json: json
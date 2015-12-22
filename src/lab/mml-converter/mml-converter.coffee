define (require) ->

  cheerio   = require 'browserified-cheerio'
  constants = require 'models/md2d/models/engine/constants/index'
  unit      = constants.unit
  validator = require 'common/validator'
  metadata  = require 'models/md2d/models/metadata'
  Solvent   = require 'cs!models/md2d/models/solvent'

  # Used throughout Classic MW to convert energy gradient values measured in units of eV/0.1Å to
  # the equivalent forces measured in units of 120 amu * 0.1Å / fs^2 (Classic's "natural" unit system
  # used to compute position updates)
  GF_CONVERSION_CONSTANT = 0.008

  # converts gravitation field value from Classic to an acceleration in nm/fs^2
  CLASSIC_TO_NEXTGEN_GRAVITATION_RATIO = 0.01 * GF_CONVERSION_CONSTANT

  # converts a 'friction' value from Classic to units of amu/fs
  CLASSIC_TO_NEXTGEN_FRICTION_RATIO = 120 * GF_CONVERSION_CONSTANT

  # convert Classic MW numeric constants defining direction to north, east, south or west
  VEC_ORIENTATION =
      3001: "N"
      3002: "E"
      3003: "S"
      3004: "W"

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
      mmlString = mmlString.replace /class=".*"|id=".*"|idref=".*"/g, (match) ->
        match.replace /[\.$]/g, "-"

      ### load the string into Cheerio ###
      $mml = cheerio.load mmlString, { xmlMode: true }

      getNode = ($entity) ->
        # a node may be an object, or it may be a reference to another object. It should
        # be treated the same in either case
        if $entity.attr("idref")
          return $mml("##{$entity.attr("idref").replace(/[\.$]/g,'-')}")
        $entity

      getProperty = ($node, propertyName, additionalSelector) ->
        if additionalSelector
          $node.find("[property=#{propertyName}]>#{additionalSelector}").text()
        else
          $node.find("[property=#{propertyName}]").text()

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
          if typeof props[prop] == 'number' && isNaN props[prop]
            delete props[prop]
          else if typeof props[prop] == 'object'
            removeNaNProperties props[prop]

      removeNullProperties = (props) ->
        for own prop of props
          delete props[prop] if !props[prop]?

      ### Convert a cheerio node whose text is a number, to an actual number ###
      toNumber = ($node, {defaultValue}) ->
        val = $node.text()
        if val? then parseFloat(val) else defaultValue

      ### Scale MML length units to nextgen length units ###
      toNextgenLengths = (ls...) -> l/100 for l in ls

      ### Transform an (x,y) coordinate pair from MML frame to nextgen frame ###
      toNextgenCoordinates = (x, y) ->
        # MW 0,0 is top left, NGMW 0,0 is bottom left
        y = originalViewPortHeight - y

        # if there is a view-port, x and y are actually in view-port coords... map to model coords
        x = x - originalViewPortX
        y = y - originalViewPortY

        toNextgenLengths x, y

      ### Converts a stroke dash number into nexgen stroke dash style ###
      convertLineDashes = (lineStyle) ->
        return switch
          when lineStyle is 1 then "2,2"
          when lineStyle is 2 then "4,4"
          when lineStyle is 3 then "6,6"
          when lineStyle is 4 then "2,4,8,4"
          else 'none'

      ### Converts an arrowhead number into nexgen arrowhead style ###
      convertArrowHead = (arrowStyle, reverse) ->
        return switch
          when arrowStyle is 1
            if reverse
              "M 0 0 L 10 5 L 0 10 z"
            else
              "M 10 0 L 0 5 L 10 10 z"
          when arrowStyle is 2
            if reverse
              "M 0 0 L 10 5 L 0 10"
            else
              "M 10 0 L 0 5 L 10 10"
          when arrowStyle is 3
            if reverse
              "M 0 0 L 10 5 L 0 10 L 3 5 z"
            else
              "M 10 0 L 0 5 L 10 10 L 7 5 z"
          when arrowStyle is 4 then "M 0 5 L 5 10 L 10 5 L 5 0 z"
          when arrowStyle is 5 then "M 0 5 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0 z"
          else 'none'

      ### Extracts a java-awt-Color into a core color  ###
      getColorProperty = ($node, alpha) ->
        colorNodes = $node.find "int"
        if colorNodes && colorNodes.length>0
          corecolor = (parseInt cheerio(colorNodes[0]).text())+","+
                      (parseInt cheerio(colorNodes[1]).text())+","+
                      (parseInt cheerio(colorNodes[2]).text())
          if alpha?
            return "rgba(#{corecolor},#{alpha/255})"
          else
            return "rgb(#{corecolor})"
        else
          return NaN

      ### Extracts or finds the fill color from a given node and document ###
      getFillColor = ($node, alpha) ->
        fillNode = $node.find("[property=fillMode]")
        fillColor = getNode fillNode.children("object")
        if fillColor and fillColor.length
          if fillColor.is ".org-concord-modeler-draw-FillMode-ColorFill"
            return getColorProperty (getNode fillColor.find "[property=color]>object"), alpha
          else if fillColor.is ".org-concord-modeler-draw-FillMode-GradientFill"
            color1  = getColorProperty (getNode fillColor.find "[property=color1]>object"), alpha
            color2  = getColorProperty (getNode fillColor.find "[property=color2]>object"), alpha
            # Sometimes color can't be found due to problems with ID references. See:
            # https://www.pivotaltracker.com/story/show/55563212
            # Use white color as a fallback value.
            if not color1
              color1 = if alpha? then "rgba(255,255,255,#{alpha/255})" else "#fff"
            if not color2
              color2 = if alpha? then "rgba(255,255,255,#{alpha/255})" else "#fff"
            style   = getIntProperty fillColor, "style"
            variant = getIntProperty fillColor, "variant"
            if style is 1036
              if variant is 1041
                return "radial #{color1} 0% #{color2} 100%"
              else if variant is 1042
                return "radial #{color2} 0% #{color1} 100%"
            else
              stops = switch variant
                when 1041 then "#{color1} 0% #{color2} 100%"
                when 1042 then "#{color2} 0% #{color1} 100%"
                when 1043 then "#{color1} 0% #{color2} 50% #{color1} 100%"
                when 1044 then "#{color2} 0% #{color1} 50% #{color2} 100%"
              if not stops?
                return NaN
              direction = switch style
                when 1031 then 90
                when 1032 then 0
                when 1033 then 45
                when 1034 then 315
              if not direction?
                return NaN
              return "linear #{direction}deg #{stops}"
        return NaN

      ### Extracts or finds the line color from a given node and document ###
      getLineColor = ($node) ->
        lineNode = $node.find("[property=lineColor]")
        lineColor = getNode lineNode.children("object")
        if lineColor and lineColor.length
          return getColorProperty lineColor
        return NaN

      ### Find and parse mml nodes representing obstacles ###
      parseObstacles = ->
        obstacles = []
        obstacleNodes = $mml "void[property=obstacles] .org-concord-mw2d-models-RectangularObstacle-Delegate"
        for node in obstacleNodes
          $node = getNode cheerio node

          height     = getFloatProperty $node, 'height'
          width      = getFloatProperty $node, 'width'
          x          = getFloatProperty $node, 'x'
          # in mml, y is left unspecified if y = 0 in the model
          y          = getFloatProperty( $node, 'y' ) || 0
          vx         = getFloatProperty $node, 'vx'
          vy         = getFloatProperty $node, 'vy'
          externalAx = getFloatProperty $node, 'externalFx'
          externalAy = getFloatProperty $node, 'externalFy'
          friction   = getFloatProperty $node, 'friction'
          density    = getFloatProperty $node, 'density'
          westProbe  = getBooleanProperty $node, 'westProbe'
          northProbe = getBooleanProperty $node, 'northProbe'
          eastProbe  = getBooleanProperty $node, 'eastProbe'
          southProbe = getBooleanProperty $node, 'southProbe'
          visible    = getBooleanProperty $node, 'visible'
          color      = getFillColor $node

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
          externalAx *= 0.01
          externalAy *= 0.01

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
            externalAx, externalAy,
            friction,
            mass,
            westProbe, northProbe, eastProbe, southProbe,
            color,
            visible
          }

          # Unit conversion performed on undefined values can convert them to NaN.
          # Revert back all NaNs to undefined, as we do not expect any NaN
          # as property. Undefined values will be replaced by default values by validator.
          removeNaNProperties rawData

          # Validate all properties and provides default values for undefined values.
          validatedData = validator.validateCompleteness metadata.obstacle, rawData, { includeOnlySerializedProperties: true }

          obstacles.push validatedData

        obstacles

      ### Find and parse mml nodes representing rectangles ###
      parseRectangles = ->
        rectangles = []
        rectangleNodes = $mml "void[property=rectangles] object.org-concord-mw2d-models-RectangleComponent-Delegate"
        for node, idx in rectangleNodes
          $node = getNode cheerio node

          type          = 'rectangle'
          height        = getFloatProperty $node, 'height'
          width         = getFloatProperty $node, 'width'
          x             = getFloatProperty $node, 'x'
          y             = getFloatProperty $node, 'y'
          lineDashes    = convertLineDashes getFloatProperty $node, 'lineStyle'
          lineWeight    = getFloatProperty $node, 'lineWeight'
          layer         = getFloatProperty $node, 'layer'
          layerPosition = getFloatProperty $node, 'layerPosition'
          alpha         = getFloatProperty $node, 'alpha'
          visible       = getBooleanProperty $node, 'visible'
          fence         = getBooleanProperty $node, 'reflection'
          color         = getFillColor $node,alpha
          lineColor     = getLineColor $node

          # Change all Boolean values to 0/1.
          visible = Number visible if visible?
          fence   = Number fence if fence?

          if not x?
            x=20
          if not y?
            y=20
          # Unit conversion.
          [x, y]          = toNextgenCoordinates x, y
          [height, width] = toNextgenLengths height, width
          y               = y - height     # flip to lower-left coordinate system

          rawData = {
            type,
            x, y,
            height, width,
            fence,
            color,lineColor,
            lineWeight,lineDashes,
            layer,layerPosition,
            visible
          }

          # Unit conversion performed on undefined values can convert them to NaN.
          # Revert back all NaNs to undefined, as we do not expect any NaN
          # as property. Undefined values will be replaced by default values by validator.
          removeNaNProperties rawData

          # Validate all properties and provides default values for undefined values.
          validatedData = validator.validateCompleteness metadata.shape, rawData, { includeOnlySerializedProperties: true }

          rectangles.push validatedData

          # <void property="vectorField">
          #  <object class="org.concord.mw2d.models.ElectricField">
          #   <void property="frequency">
          #    <double>0.06911503837897545</double>
          #   </void>
          #   <void property="intensity">
          #    <double>0.10000000149011612</double>
          #   </void>
          #   <void property="local">
          #    <boolean>true</boolean>
          #   </void>
          #  </object>
          # </void>

          # Shape can also specify electric field.
          $elField = $node.find "[property=vectorField]>object.org-concord-mw2d-models-ElectricField"
          if $elField.length > 0
            parsedElField = parseElectricField $elField
            parsedElField.shapeIdx = idx
            electricFields.push parsedElField

        rectangles

      ### Find and parse mml nodes representing ellipses ###
      parseEllipses = ->
        ellipses = []
        ellipseNodes = $mml "void[property=ellipses] object.org-concord-mw2d-models-EllipseComponent-Delegate"
        for node, idx in ellipseNodes
          $node = getNode cheerio node

          type          = 'ellipse'
          height        = getFloatProperty $node, 'height'
          width         = getFloatProperty $node, 'width'
          x             = getFloatProperty $node, 'x'
          y             = getFloatProperty $node, 'y'
          lineDashes    = convertLineDashes getFloatProperty $node, 'lineStyle'
          lineWeight    = getFloatProperty $node, 'lineWeight'
          layer         = getFloatProperty $node, 'layer'
          layerPosition = getFloatProperty $node, 'layerPosition'
          alpha         = getFloatProperty $node, 'alpha'
          visible       = getBooleanProperty $node, 'visible'
          fence         = getBooleanProperty $node, 'reflection'
          color         = getFillColor $node,alpha
          lineColor     = getLineColor $node
          alphaAtCenter = getFloatProperty $node, 'alphaAtCenter'
          alphaAtEdge   = getFloatProperty $node, 'alphaAtEdge'

          # Support additional alphaAtCenter/Edge properties. They were separate properties in
          # Classic MW, however in MW just merge them into gradient definition.
          if alphaAtCenter? and color.indexOf 'radial' == 0
            color = color.replace /rgba?(\(\d+,\d+,\d+)[\d,\.]*(\) 0%)/, "rgba$1,#{alphaAtCenter/255}$2"
          if alphaAtEdge? and color.indexOf 'radial' == 0
            color = color.replace /rgba?(\(\d+,\d+,\d+)[\d,\.]*(\) 100%)/, "rgba$1,#{alphaAtEdge/255}$2"
          # Change all Boolean values to 0/1.
          visible = Number visible if visible?
          fence   = Number fence if fence?

          if not x?
            x=20
          if not y?
            y=20
          # Unit conversion.
          [x, y]          = toNextgenCoordinates x, y
          [height, width] = toNextgenLengths height, width
          y               = y - height     # flip to lower-left coordinate system

          rawData = {
            type,
            x, y,
            height, width,
            fence,
            color,lineColor,
            lineWeight,lineDashes,
            layer,layerPosition,
            visible
          }

          # Unit conversion performed on undefined values can convert them to NaN.
          # Revert back all NaNs to undefined, as we do not expect any NaN
          # as property. Undefined values will be replaced by default values by validator.
          removeNaNProperties rawData

          # Validate all properties and provides default values for undefined values.
          validatedData = validator.validateCompleteness metadata.shape, rawData, { includeOnlySerializedProperties: true }

          ellipses.push validatedData

          # Shape can also specify electric field.
          $elField = $node.find "object.org-concord-mw2d-models-ElectricField"
          if $elField.length > 0
            parsedElField = parseElectricField $elField
            parsedElField.shapeIdx = idx
            electricFields.push parsedElField

        ellipses

      parseLines = ->
        lines = []
        lineNodes = $mml "void[property=lines] object.org-concord-mw2d-models-LineComponent-Delegate"
        for node, idx in lineNodes
          $node = getNode cheerio node

          x             = getFloatProperty $node, 'x'
          y             = getFloatProperty $node, 'y'
          x12           = getFloatProperty $node, 'x12'
          y12           = getFloatProperty $node, 'y12'
          beginStyle    = convertArrowHead getFloatProperty $node, 'beginStyle'
          endStyle      = convertArrowHead (getFloatProperty $node, 'endStyle'), true
          lineDashes    = convertLineDashes getFloatProperty $node, 'style'
          lineWeight    = getFloatProperty $node, 'weight'
          layer         = getFloatProperty $node, 'layer'
          layerPosition = getFloatProperty $node, 'layerPosition'
          visible       = getBooleanProperty $node, 'visible'
          fence         = getBooleanProperty $node, 'reflector'
          lineColor     = getColorProperty getNode $node.find "[property=color]>object"

          # Change all Boolean values to 0/1.
          visible = Number visible if visible?
          fence   = Number fence if fence?

          if not x?
            x = 20
          if not y?
            y = 20
          if not x12?
            x12 = 0
          if not y12?
            y12 = 0

          # Convert x,y and x12, y12 into x1, y1 and x2, y2
          x1 = x + x12 / 2
          y1 = y + y12 / 2
          x2 = x - x12 / 2
          y2 = y - y12 / 2

          # Unit conversion.
          [x1, y1]          = toNextgenCoordinates x1, y1
          [x2, y2]          = toNextgenCoordinates x2, y2

          rawData = {
            x1, y1,
            x2, y2,
            beginStyle,
            endStyle,
            fence,
            lineColor,
            lineWeight,lineDashes,
            layer,layerPosition,
            visible
          }

          # Unit conversion performed on undefined values can convert them to NaN.
          # Revert back all NaNs to undefined, as we do not expect any NaN
          # as property. Undefined values will be replaced by default values by validator.
          removeNaNProperties rawData

          # Validate all properties and provides default values for undefined values.
          validatedData = validator.validateCompleteness metadata.line, rawData, { includeOnlySerializedProperties: true }

          lines.push validatedData

        lines

      ###
        Find the container size
      ###
      viewProps = $mml(".org-concord-mw2d-models-RectangularBoundary-Delegate")
      width  = getIntProperty viewProps, "width", "double"
      height = getIntProperty viewProps, "height", "double"

      ###
        Find the view-port size. Do it at the beginning, as view-port X and Y dimensions
        are used during conversion of other objects.
      ###
      viewPort = viewProps.find("[property=viewSize]>.java-awt-Dimension>int")
      if (viewPort.length)
        originalViewPortWidth  = parseInt viewPort[0].children[0].data
        originalViewPortHeight = parseInt viewPort[1].children[0].data
        originalViewPortX = parseInt viewProps.find("[property=x]>double").text() || 0
        originalViewPortY = parseInt viewProps.find("[property=y]>double").text() || 0
      else
        originalViewPortWidth  = width
        originalViewPortHeight = height
        originalViewPortX = originalViewPortY = 0

      # scale from MML units to Lab's units
      [height, width] = toNextgenLengths height, width
      [viewPortHeight, viewPortWidth] = toNextgenLengths originalViewPortHeight, originalViewPortWidth
      [viewPortY, viewPortX] = toNextgenLengths -originalViewPortY, -originalViewPortX

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
      bgColors = (cheerio(n).text() for n in $mml "void[property=background] > .java-awt-Color > int")
      # If array of RGBA values is found, use it. Otherwise, left 'backgroundColor' undefined, so default value will be used.
      backgroundColor = "rgba(#{bgColors[0]},#{bgColors[1]},#{bgColors[2]},#{bgColors[3]})" if bgColors.length == 4
      # A tiny "hack" - replace background color of water or oil used in Classic MW to one used in Next Gen MW.
      if backgroundColor == "rgba(134,187,246,255)"
        backgroundColor = new Solvent("water").color
      if backgroundColor == "rgba(240, 244, 57, 255"
        backgroundColor = new Solvent("oil").color

      ###
        Find mark color
      ###
      markColor = getIntProperty $mml.root(), "markColor", "int"
      # Convert signedInt value used in Classic MW to hex color definition.
      markColor = "#" + (markColor + Math.pow(2, 24)).toString 16 if markColor?

      ###
        Find the solvent force type.
        In Classic MW it's a type of solvent. However, to avoid confusion in Next Gen MW
        it's named 'solventForceType', as it affects force driving amino acids. We do not
        store solvent name explicitly as it's redundant information. The solvent specifies
        'solventForceType', 'dielectricConstant' and 'backgroundColor'. See:
        md2d/models/solvent.coffee and md2d/models/modeler.#setSolvent(solventName)
      ###
      $solvent = $mml "[property=solvent]>.org-concord-mw2d-models-Solvent"
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
        Find the electric field visualization options.
      ###
      showElectricField = getBooleanProperty $mml.root(), "showEFieldLines", "boolean"
      electricFieldDensity = do () ->
        EFCellSize = getIntProperty $mml.root(), "EFCellSize", "int"
        [EFCellSize] = toNextgenLengths EFCellSize
        if EFCellSize < 10 && EFCellSize >= 0
          Math.round width / EFCellSize
        else
          # Quite often in Classic MW cell size equal to 100 was used to disable
          # electric field completely. Instead of using density 0, use default
          # density + set showElectricField to false.
          #
          # In rare cases (e.g. maze game), EFCellSize = -1 or 1000 was also
          # used to disable electric field.
          showElectricField = false
          return undefined

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
        timeStepsPerTick
      ###
      timeStepsPerTick = getFloatProperty $mml.root(), "viewRefreshInterval", "int"

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
            imageLayerPosition: imageLayerPosition
            imageX: imageX
            imageY: imageY
          },
          { ...
        ]
      ###
      imageProps = $mml("[property=images]>array")
      imageBlock = imageProps.find("object.org-concord-mw2d-models-ImageComponent-Delegate")
      images = [];
      if imageProps.length > 0
        for image in imageBlock
          $image = getNode(cheerio(image))
          imageUri = $image.find("[property=URI]>string").text()
          imageHostIndex = parseInt $image.find("[property=hostIndex]>int").text()
          if (isNaN(imageHostIndex))
            imageHostIndex = 0
          imageHostType = $image.find("[property=hostType]>string").text()
          imageHostType = imageHostType.slice(imageHostType.lastIndexOf(".")+1)
          imageLayer = parseInt $image.find("[property=layer]>int").text()
          imageLayerPosition = parseInt $image.find("[property=layerPosition]>byte").text()
          imageX = parseFloat $image.find("[property=x]>double").text()
          imageY = parseFloat $image.find("[property=y]>double").text()
          [imageX, imageY] = toNextgenCoordinates imageX, imageY
          imageVisible = parseBoolean($image.find("[property=visible]>boolean").text(), true)
          images.push {imageUri: imageUri, imageHostIndex: imageHostIndex, imageHostType: imageHostType, imageLayer: imageLayer, imageLayerPosition: imageLayerPosition, imageX: imageX, imageY: imageY, visible: imageVisible }

      ###
        Text boxes. TODO: factor out pattern common to MML parsing of images and text boxes
      ###
      wrapTextBoxText = (t) ->
        t = t.replace(/^\s+|\s+$/g, '')
        t.replace(/\n\s+/g, "\n")

      parseTextBoxNode = (textBoxNode) ->
        $textBoxNode = getNode cheerio textBoxNode
        text = wrapTextBoxText $textBoxNode.find("[property=text]>string").text()
        $x = parseFloat $textBoxNode.find("[property=x]>double").text() || 0.001
        $y = parseFloat $textBoxNode.find("[property=y]>double").text() || 0
        layer = parseInt($textBoxNode.find("[property=layer]>int").text()) || 1
        angle = parseFloat $textBoxNode.find("[property=angle]>float").text() || 0
        if angle < 0
          angle = 360 - (Math.abs(angle) % 360)
        textHostIndex = parseInt $textBoxNode.find("[property=hostIndex]>int").text()
        if (isNaN(textHostIndex))
          textHostIndex = 0
        textHostType = $textBoxNode.find("[property=hostType]>string").text()
        textHostType = textHostType.slice(textHostType.lastIndexOf(".")+1)
        # textboxes using referenced colors do not use class .java-awt-color, but still have a child
        # object to specify the referenced color
        colorDef = getNode($textBoxNode.find("void[property=foregroundColor]>object")).find(">int")
        if colorDef and colorDef.length > 0
          fontColor    = "rgb("
          fontColor   += parseInt(cheerio(colorDef[0]).text()) + ","
          fontColor   += parseInt(cheerio(colorDef[1]).text()) + ","
          fontColor   += parseInt(cheerio(colorDef[2]).text()) + ")"
        backgroundColorDef = $textBoxNode.find "void[property=fillMode] .java-awt-Color>int"
        if backgroundColorDef and backgroundColorDef.length > 0
          backgroundTextColor    = "rgb("
          backgroundTextColor   += parseInt(cheerio(backgroundColorDef[0]).text()) + ","
          backgroundTextColor   += parseInt(cheerio(backgroundColorDef[1]).text()) + ","
          backgroundTextColor   += parseInt(cheerio(backgroundColorDef[2]).text()) + ")"
        borderType = parseInt($textBoxNode.find("[property=borderType]>int").text()) || 0
        frame = switch borderType
          when 0 then ""
          when 1 then "rectangle"
          when 2 then "rounded rectangle"
        callout = parseBoolean($textBoxNode.find("[property=callOut]>boolean").text()) || false
        calloutPointDef = $textBoxNode.find "void[property=callOutPoint] .java-awt-Point>int"
        if callout and calloutPointDef and calloutPointDef.length > 1
          calloutPoint = (parseInt(cheerio(el).text()) for el in calloutPointDef)
        $font = getNode $textBoxNode.find "[property=font] > object"
        fontSize = $font.children().eq(2).text() or 12

        [x, y] = toNextgenCoordinates $x, $y
        [fontSize] = toNextgenLengths fontSize

        textBox = { text, x, y, layer }
        textBox.frame = frame if frame
        textBox.color = fontColor if fontColor
        textBox.fontSize = fontSize
        if calloutPoint
          textBox.calloutPoint = toNextgenCoordinates calloutPoint[0], calloutPoint[1]
        if textHostType
          textBox.hostType = textHostType
          textBox.hostIndex = textHostIndex
        textBox.backgroundColor = backgroundTextColor if backgroundTextColor

        # default anchor is upper-left when importing from Java MW
        textBox.anchor = "upper-left"
        textBox.rotate = angle if angle != 0
        textBox

      $textBoxesArray = $mml "[property=textBoxes]>array"
      if $textBoxesArray.length > 0
        $textBoxNodes = $textBoxesArray.find "object.org-concord-mw2d-models-TextBoxComponent-Delegate"
        textBoxes = (parseTextBoxNode(node) for node in $textBoxNodes)
      else
        textBoxes = []


      ###
        Find electric fields.
      ###
      parseElectricField = (node) ->
        $node = getNode cheerio node
        intensity   = getFloatProperty $node, 'intensity', 'double'
        orientation = getIntProperty $node, 'orientation', 'int'

        intensity *= GF_CONVERSION_CONSTANT
        orientation = VEC_ORIENTATION[orientation]

        rawData = { intensity, orientation }

        # Unit conversion performed on undefined values can convert them to NaN.
        # Revert back all NaNs to undefined, as we do not expect any NaN
        # as property. Undefined values will be replaced by default values by validator.
        removeNaNProperties rawData

        # Validate all properties and provides default values for undefined values.
        props = validator.validateCompleteness metadata.electricField, rawData, { includeOnlySerializedProperties: true }

        # Classic MW does weird things when it comes to intensity and orientation.
        # We can implement conversions that are used in Classic MW and simplify logic
        # in Next Gen MW. See:
        # https://github.com/concord-consortium/mw/blob/9d9ec6dd5c00ad5d2dd8f112e3b36e200f22e559/src/org/concord/mw2d/models/ElectricField.java#L92-L111
        if props.intensity < 0
          props.intensity *= -1
          switch props.orientation
            when "S" then props.orientation = "N"
            when "E" then props.orientation = "W"
        else
          switch props.orientation
            when "N" then props.orientation = "S"
            when "W" then props.orientation = "E"

        return props

      # <void property="fields">
      #  <void method="add">
      #   <object class="org.concord.mw2d.models.ElectricField">
      #    <void property="frequency">
      #     <double>0.006283185307179587</double>
      #    </void>
      #    <void property="intensity">
      #     <double>0.07000000029802322</double>
      #    </void>
      #    <void property="orientation">
      #     <int>3003</int>
      #    </void>
      #   </object>
      #  </void>
      # </void>

      $fields = $mml "[method=add]>object.org-concord-mw2d-models-ElectricField"
      if $fields.length > 0
        electricFields = (parseElectricField(node) for node in $fields)
      else
        electricFields = []

      ###
        Find obstacles
      ###
      obstacles = parseObstacles()

      ###
        Find shapes
      ###
      shapes = parseRectangles().concat parseEllipses()

      ###
        Find lines
      ###
      lines = parseLines()

      ###
        Find all elements. Results in:
        "elements": {
          "mass": [
            20,
            40,
            60,
            80,
            600
          ],
          "sigma": [
            0.07,
            0.14,
            0.21,
            0.28,
            0.3
          ],
          "epsilon": [
            -0.1,
            -0.1,
            -0.1,
            -0.1,
            -5
          ]
        }
        Elements are sometimes referred to in MML files by the order they are defined in,
        instead of by name, so we put these in an array instead of a hash so we can get both
      ###

      # Default element colors from Java MW converted into
      # signed Integer form used by custom elementColors
      #
      # >> "f2f2f2".to_i(16) - 2**24
      # => -855310
      # >> "75a643".to_i(16) - 2**24
      # => -9066941
      # >> "7543a6".to_i(16) - 2**24
      # => -9092186
      # >> "D941E0".to_i(16) - 2**24
      # => -2539040

      elementColors = [-855310, -9066941, -9092186, -2539040]

      elementColorNodes = $mml("void[property=elementColors] > void")
      for node in elementColorNodes
        $node = getNode(cheerio(node))
        index = $node.attr("index")
        color = +$node.text()
        elementColors[index] = color

      elements = []

      elementNodes = $mml(".org-concord-mw2d-models-Element")
      colorIndex = 0
      for node in elementNodes
        $node = getNode(cheerio(node))
        mass  = getFloatProperty $node, 'mass', 'double'
        sigma =  getFloatProperty $node, 'sigma', 'double'
        epsilon = getFloatProperty $node, 'epsilon', 'double'

        # scale sigma to nm
        [sigma] = toNextgenLengths sigma

        # epsilon's sign appears to be flipped between MW and Lab
        epsilon = -epsilon

        # scale to NextGen units
        mass *= 120         #convert to mass in Daltons

        # elementColor
        color = elementColors[colorIndex]
        colorIndex++

        elementRawData = { mass, sigma, epsilon, color }

        # Unit conversion performed on undefined values can convert them to NaN.
        # Revert back all NaNs to undefined, as we do not expect any NaN
        # as property. Undefined values will be replaced by default values by validator.
        removeNaNProperties elementRawData

        # Validate all properties and provides default values for undefined values.
        elementValidatedData = validator.validateCompleteness metadata.element, elementRawData, { includeOnlySerializedProperties: true }

        elements.push elementValidatedData

      ###
        Find all custom pairwise LJ properties (sigma and epsilon).
      ###
      pairwiseLJProperties = []

      # This set defines whether mean values are used for pair (so lbMixing is true) or custom (lbMixing is false).
      lbMixingProps = $mml ".org-concord-mw2d-models-Affinity>[property=lbMixing]>[method=put]"

      # Custom values for sigma and epsilon.
      epsilonProps = $mml ".org-concord-mw2d-models-Affinity>[property=epsilon]"
      sigmaProps = $mml ".org-concord-mw2d-models-Affinity>[property=sigma]"

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
          ljProps = validator.validateCompleteness metadata.pairwiseLJProperties, ljProps, { includeOnlySerializedProperties: true }

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

          element   = getIntProperty $node, 'ID', 'int' # selector = "void[property=ID] int"
          x         = getFloatProperty $node, 'rx'
          y         = getFloatProperty $node, 'ry'
          vx        = getFloatProperty $node, 'vx'
          vy        = getFloatProperty $node, 'vy'
          charge    = getFloatProperty $node, 'charge'
          friction  = getFloatProperty $node, 'friction'
          radical   = getBooleanProperty $node, 'radical'
          visible   = getBooleanProperty $node, 'visible'
          marked    = getBooleanProperty $node, 'marked'
          movable   = getBooleanProperty $node, 'movable'
          draggableWhenStopped = getBooleanProperty $node, 'draggable'
          # userField is *not* a boolean property. If it exists, assume that
          # atom is draggable. Otherwise, use default value.
          draggable = if getProperty $node, 'userField' then 1 else undefined

          # Classic MW uses movable, while Next Gen MW uses pinned property. Convert.
          pinned  = if movable? then not movable else undefined

          # Change all Boolean values to 0/1.
          radical   = Number radical if radical?
          pinned    = Number pinned if pinned?
          visible   = Number visible if visible?
          marked    = Number marked if marked?
          draggableWhenStopped = Number draggableWhenStopped if draggableWhenStopped?

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
            restraintValidatedData = validator.validateCompleteness metadata.restraint, restraintRawData, { includeOnlySerializedProperties: true }

            restraints.push restraintValidatedData


          atomRawData = { element, x, y, vx, vy, charge, friction, radical, pinned, marked, visible, draggable, draggableWhenStopped }

          # Unit conversion performed on undefined values can convert them to NaN.
          # Revert back all NaNs to undefined, as we do not expect any NaN
          # as property. Undefined values will be replaced by default values by validator.
          removeNaNProperties atomRawData

          # Validate all properties and provides default values for undefined values.
          atomValidatedData = validator.validateCompleteness metadata.atom, atomRawData, { includeOnlySerializedProperties: true }

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
        radialBondValidatedData = validator.validateCompleteness metadata.radialBond, radialBondRawData, { includeOnlySerializedProperties: true }

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
        angularBondValidatedData = validator.validateCompleteness metadata.angularBond, angularBondRawData, { includeOnlySerializedProperties: true }

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
      radical = (atom.radical for atom in atoms)
      element = (atom.element for atom in atoms)
      pinned = (atom.pinned for atom in atoms)
      marked = (atom.marked for atom in atoms)
      visible = (atom.visible for atom in atoms)
      draggable = (atom.draggable for atom in atoms)
      draggableWhenStopped = (atom.draggableWhenStopped for atom in atoms)

      id = atoms[0]?.element || 0

      ###
        Chemical Reactions
        Reaction Types/Parameters
         nA__An
           VAA
           VBB
           VCC
           VDD
           VAB
           VAC
           VAD
           VBC
           VBD
           VCD
         A2_B2__2AB
           VAA
           VBB
           VAB
           VAB2
           VA2B
         O2_2H2__2H2O
           VHH
           VOO
           VHO
           VHO2
           VOH2
         A2_B2_C__2AB_C
           VAA
           VBB
           VCC
           VAB
           VAC
           VBC
           VAB2
           VBA2
           VCA2
           VCB2
           VABC
           VBAC
      ###

      $reactionObj = $mml('[class*="org-concord-mw2d-models-Reaction"]')

      useChemicalReactions = $reactionObj.length > 0

      if useChemicalReactions
        parameters = $reactionObj.find("[method=put]")
        reaction = {}

        # Do not convert reaction parameters now. Default values from metadata will be used. We will
        # have to implement conversion from Classic to NextGen format.
        # reactionParameters = {}
        # for prop in parameters
        #   $node = cheerio(prop)
        #   key = $node.find('string').text()
        #   value = parseFloat($node.find('double').text())
        #   reactionParameters[key] = value
        #
        # reaction.parameters = reactionParameters

        reaction = validator.validateCompleteness metadata.chemicalReactions, reaction, { includeOnlySerializedProperties: true }

      ###
        Quantum Dynamics
      ###
      excitationStates = $mml("void[property=excitedStates] void[method=put]")
      $lightSource = $mml("void[property=lightSource]")
      # Use quantum dynamics engine if excitation states are defined or there is an active light source.
      useQuantumDynamics = excitationStates.length > 0 ||
                           $lightSource.length > 0 && getBooleanProperty($lightSource, "on")

      if useQuantumDynamics

        getEnergyLevels = (elementNode) ->
          ###
            <!-- Form 1 -->

            <void property="electronicStructure">
              <void property="energyLevels">
                <void method="clear"/>
                <void method="add">
                  <object class="org.concord.mw2d.models.EnergyLevel">
                    <void property="energy">
                      <float>-4.0</float>
                    </void>
                  </object>
                </void>
                <void method="add">
                  <object class="org.concord.mw2d.models.EnergyLevel">
                    <void property="energy">
                      <float>-3.3</float>
                    </void>
                  </object>
                </void>
              </void>
            </void>


            <!-- Form 2 -->

            <void property="electronicStructure">
              <void property="energyLevels">
                <void index="1">
                  <void property="energy">
                    <float>-3.65</float>
                  </void>
                </void>
                <void index="2">
                  <void property="energy">
                    <float>-1.2</float>
                  </void>
                </void>
              </void>
            </void>
          ###

          # default energy levels; see:
          # https://github.com/concord-consortium/mw/blob/d3f621ba87825888737257a6cb9ac9e4e4f63f77/src/org/concord/mw2d/models/ElectronicStructure.java#L41-L47
          # applied to every element; see:
          # https://github.com/concord-consortium/mw/blob/d3f621ba87825888737257a6cb9ac9e4e4f63f77/src/org/concord/mw2d/models/Element.java#L183-L185
          energyLevels = [-4, -1, -0.5]

          $elementNode = getNode(cheerio(elementNode))

          for node in $elementNode.find 'void[property=energyLevels] > void'
            $node = getNode(cheerio(node))
            if $node.attr('method') is 'clear'
              energyLevels = []
            else if $node.attr('method') is 'add'
              energyLevels.push getFloatProperty($node, 'energy', 'float')
            else if $node.attr('index')
              index = parseInt $node.attr('index'), 10
              energyLevels[index] = getFloatProperty($node, 'energy', 'float')

          convert = (energy) -> constants.convert energy,
            from: constants.unit.EV,
            to:   constants.unit.MW_ENERGY_UNIT

          return (convert(energy) for energy in energyLevels)


        if excitationStates.length > 0
          for atom in excitationStates
            $node = getNode cheerio atom
            atomIndex = parseInt cheerio($node.find("int")[0]).text()
            excitation = parseInt $node.find("void[index=1] int").text()
            excitation = 0 if isNaN excitation
            atoms[atomIndex].excitation = excitation

          excitation = (atom.excitation for atom in atoms)
          elementEnergyLevels = (getEnergyLevels(elementNode) for elementNode in elementNodes)

        # default value which can be overridden by an explicit quantumRule found below:
        radiationlessEmissionProbability = 1

        quantumRule = $mml(".org-concord-mw2d-models-QuantumRule")
        if quantumRule.length
          probabilityMap = quantumRule.find "void[property=probabilityMap]>[method=put]"
          for put in probabilityMap
            $node = getNode(cheerio(put))
            key = parseInt $node.find("int").text()
            val = parseFloat $node.find("float").text()

            # key values are ints hard-coded in classic mw
            if key is 11
              radiationlessEmissionProbability = val

        lightSource = {}
        $lightSource = $mml("void[property=lightSource]")
        if $lightSource.length > 0
          lightSource = {}
          lightSource.on               = getBooleanProperty( $lightSource, "on"  ) || false
          lightSource.frequency        = getFloatProperty    $lightSource, "frequency"
          lightSource.monochromatic    = getBooleanProperty  $lightSource, "monochromatic"
          lightSource.radiationPeriod  = getIntProperty      $lightSource, "radiationPeriod"
          lightSource.numberOfBeams    = getIntProperty      $lightSource, "numberOfBeams"
          lightSource.angleOfIncidence = getFloatProperty    $lightSource, "angleOfIncidence"
          lightSource.radiationPeriod  = lightSource.radiationPeriod / 2 if lightSource.radiationPeriod
          lightSource.angleOfIncidence = -lightSource.angleOfIncidence if lightSource.angleOfIncidence

        removeNullProperties lightSource

        lightSource = undefined if !lightSource.frequency?

        quantumDynamics = validator.validateCompleteness metadata.quantumDynamics, {
          elementEnergyLevels
          radiationlessEmissionProbability
          lightSource
        }, { includeOnlySerializedProperties: true }


      ### Convert array of hashes to a hash of arrays, for use by MD2D ###
      unroll = (array, props...) ->
        unrolled = {}
        for prop in props
          unrolled[prop] = (item[prop] for item in array)
        unrolled

      # Main properties of the model.
      json =
        coulombForces             : coulombForces
        temperatureControl        : !!targetTemperature
        targetTemperature         : targetTemperature
        width                     : width
        height                    : height
        viscosity                 : viscosity
        gravitationalField        : gravitationalField
        timeStepsPerTick          : timeStepsPerTick
        timeStep                  : timeStep
        dielectricConstant        : dielectricConstant
        solventForceType          : solventForceType

      # Unit conversion performed on undefined values can convert them to NaN.
      # Revert back all NaNs to undefined, as they will be replaced by default values.
      removeNaNProperties json
      # Validate all properties and provides default values for undefined values.
      json = validator.validateCompleteness metadata.mainProperties, json, { includeOnlySerializedProperties: true }

      # Properties which are managed by model, but they define view.
      # Model handles them, as they are e.g. stored in the history.
      viewOptions =
        viewPortWidth       : viewPortWidth
        viewPortHeight      : viewPortHeight
        viewPortX           : viewPortX
        viewPortY           : viewPortY
        backgroundColor     : backgroundColor
        markColor           : markColor
        keShading           : keShading
        chargeShading       : chargeShading
        showChargeSymbols   : showChargeSymbols
        showVDWLines        : showVDWLines
        VDWLinesCutoff      : VDWLinesCutoff
        showClock           : showClock
        showVelocityVectors : showVelocityVectors
        showForceVectors    : showForceVectors
        showElectricField   : showElectricField
        electricFieldDensity: electricFieldDensity
        images              : images
        textBoxes           : textBoxes
        velocityVectors     :
          length: velocityVectorLength
          width: velocityVectorWidth
          color: velocityVectorColor
        forceVectors        :
          length: forceVectorLength
          width: forceVectorWidth
          color: forceVectorColor

      # Unit conversion performed on undefined values can convert them to NaN.
      # Revert back all NaNs to undefined, as they will be replaced by default values.
      removeNaNProperties viewOptions
      # Validate all properties and provides default values for undefined values.
      viewOptions = validator.validateCompleteness metadata.viewOptions, viewOptions, { includeOnlySerializedProperties: true }

      # remove properties that aren't to be serialzed:
      for own option of viewOptions
        delete viewOptions[option] if metadata.viewOptions[option].serialize is false

      json.viewOptions = viewOptions

      json.pairwiseLJProperties = pairwiseLJProperties

      json.elements = unroll elements, 'mass', 'sigma', 'epsilon', 'color'

      json.atoms =
        x : x
        y : y
        vx: vx
        vy: vy
        charge: charge
        friction: friction
        radical: radical
        element: element
        pinned: pinned
        marked: marked
        visible: visible
        draggable: draggable
        draggableWhenStopped: draggableWhenStopped
        excitation: excitation

      if radialBonds.length > 0
        json.radialBonds = unroll radialBonds, 'atom1', 'atom2', 'length', 'strength',  'type'

      if angularBonds.length > 0
        json.angularBonds = unroll angularBonds, 'atom1', 'atom2', 'atom3', 'angle', 'strength'

      if restraints.length > 0
        json.restraints = unroll restraints, 'atomIndex', 'k', 'x0', 'y0'

      if obstacles.length > 0
        json.obstacles = unroll obstacles, 'x', 'y', 'vx', 'vy', 'externalAx', 'externalAy', 'displayExternalAcceleration', 'friction',
          'height', 'width', 'mass', 'westProbe', 'northProbe', 'eastProbe', 'southProbe', 'color', 'visible'

      if shapes.length > 0
        json.shapes = unroll shapes, 'type', 'x', 'y', 'height', 'width', 'fence',
          'color', 'lineColor', 'lineWeight', 'lineDashes',
          'layer', 'layerPosition', 'visible'

      if electricFields.length > 0
        json.electricFields = unroll electricFields, 'intensity', 'orientation', 'shapeIdx'

      if lines.length > 0
        json.lines = unroll lines, 'x1', 'y1', 'x2', 'y2', 'beginStyle', 'endStyle', 'fence', 'lineColor', 'lineWeight', 'lineDashes',
          'layer', 'layerPosition', 'visible'

      if useQuantumDynamics
        json.quantumDynamics = quantumDynamics
        json.useQuantumDynamics = true

      if useChemicalReactions
        json.chemicalReactions = reaction
        json.useChemicalReactions = true

      # Remove some properties from the final serialized model.
      removeArrayIfDefault = (name, array, defaultVal) ->
        delete json.atoms[name] if array.every (i)-> i is defaultVal

      # Arrays which has only default values.
      removeDefaultArraysFor = (props...) ->
        removeArrayIfDefault(prop, json.atoms[prop], metadata.atom[prop].defaultValue) for prop in props
        null

      removeDefaultArraysFor 'marked', 'visible', 'draggable', 'draggableWhenStopped'

      # Remove targetTemperature when heat-bath is disabled.
      delete json.targetTemperature if not json.temperatureControl
      # Remove atomTraceId when atom tracing is disabled.
      delete json.viewOptions.atomTraceId if not json.viewOptions.showAtomTrace
      # Remove excitation if not using quantum dynamics
      delete json.atoms.excitation if not useQuantumDynamics
      # Remove radicals if not using chemical reactions
      delete json.atoms.radical if not useChemicalReactions

      # Remove modelSampleRate as this is Next Gen MW specific option.
      delete json.modelSampleRate

      # Remove minX, minYm, maxX, maxY, in MD2D these are derived from model width and height
      delete json.minX
      delete json.minY
      delete json.maxX
      delete json.maxY

      return json: json
    # catch e
    #   return error: e.toString()

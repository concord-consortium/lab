/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import $__browserified_cheerio from "browserified-cheerio";
import $__models_md_d_models_engine_constants_index from "models/md2d/models/engine/constants/index";
import $__common_validator from "common/validator";
import $__models_md_d_models_metadata from "models/md2d/models/metadata";
import $__models_md_d_models_solvent from "models/md2d/models/solvent";

let parseMML;
const cheerio = $__browserified_cheerio;
const constants = $__models_md_d_models_engine_constants_index;
const {
  unit
} = constants;
const validator = $__common_validator;
const metadata = $__models_md_d_models_metadata;
const Solvent = $__models_md_d_models_solvent;

// Used throughout Classic MW to convert energy gradient values measured in units of eV/0.1Å to
// the equivalent forces measured in units of 120 amu * 0.1Å / fs^2 (Classic's "natural" unit system
// used to compute position updates)
const GF_CONVERSION_CONSTANT = 0.008;

// converts gravitation field value from Classic to an acceleration in nm/fs^2
const CLASSIC_TO_NEXTGEN_GRAVITATION_RATIO = 0.01 * GF_CONVERSION_CONSTANT;

// converts a 'friction' value from Classic to units of amu/fs
const CLASSIC_TO_NEXTGEN_FRICTION_RATIO = 120 * GF_CONVERSION_CONSTANT;

// convert Classic MW numeric constants defining direction to north, east, south or west
const VEC_ORIENTATION = {
  3001: "N",
  3002: "E",
  3003: "S",
  3004: "W"
};

const VDWLinesRatioMap = {
  1.33: "short",
  1.67: "medium",
  2.0: "long"
};

// window.MWHelpers = {};

/*
  Parses an mml file and returns an object containing the stringified JSON

  @return
    json: jsonString of the model
    error: error encountered
*/
export default parseMML = function(mmlString) {

  //try
  /* perform any pre-processing on the string */

  // MML classes have periods or $ in them, which is not valid in DOM
  let $node, atom1, atom2, backgroundColor, color, electricFields, epsilon, excitation, forceVectorColor, forceVectorLength, forceVectorWidth,
    gravitationalField, index, length, originalViewPortHeight, originalViewPortWidth, originalViewPortX, originalViewPortY, prop, quantumDynamics, reaction,
    sigma, strength, targetTemperature, textBoxes, velocityVectorColor, velocityVectorLength, velocityVectorWidth, visible;
  let node, atom, elementNode;
  mmlString = mmlString.replace(/class=".*"|id=".*"|idref=".*"/g, match => match.replace(/[\.$]/g, "-"));

  /* load the string into Cheerio */
  const $mml = cheerio.load(mmlString, {
    xmlMode: true
  });

  const getNode = function($entity) {
    // a node may be an object, or it may be a reference to another object. It should
    // be treated the same in either case
    if ($entity.attr("idref")) {
      return $mml(`#${$entity.attr("idref").replace(/[\.$]/g, "-")}`);
    }
    return $entity;
  };

  const getProperty = function($node, propertyName, additionalSelector) {
    if (additionalSelector) {
      return $node.find(`[property=${propertyName}]>${additionalSelector}`).text();
    } else {
      return $node.find(`[property=${propertyName}]`).text();
    }
  };

  const parseBoolean = function(str, defaultOption) {
    const bool = str.replace(/^\s+|\s+$/g, "");
    if (defaultOption) {
      return !(bool === "false");
    } else {
      return bool === "true";
    }
  };

  // Return parsed float property or 'undefined' if property is not found.
  const getFloatProperty = function($node, propertyName, additionalSelector) {
    const prop = getProperty($node, propertyName, additionalSelector);
    // Property found, so parse it.
    if (prop.length) {
      return parseFloat(prop);
    }
    // Property not found, so return undefined.
    return undefined;
  };

  // Return parsed int property or 'undefined' if property is not found. additional Selector
  const getIntProperty = function($node, propertyName, additionalSelector) {
    const prop = getProperty($node, propertyName, additionalSelector);
    // Property found, so parse it.
    if (prop.length) {
      return parseInt(prop, 10);
    }
    // Property not found, so return undefined.
    return undefined;
  };

  const getBooleanProperty = function($node, propertyName, additionalSelector) {
    const prop = getProperty($node, propertyName, additionalSelector);
    // Property found, so parse it.
    if (prop.length) {
      return parseBoolean(prop);
    }
    // Property not found, so return undefined.
    return undefined;
  };

  // Unit conversion performed on undefined values can convert them to NaN.
  // Revert back all NaNs to undefined, when we do not expect any NaN
  // as property. Undefined values will be replaced by default values by validator.
  var removeNaNProperties = props => (() => {
    const result = [];
    for (let prop of Object.keys(props || {})) {
      if ((typeof props[prop] === "number") && isNaN(props[prop])) {
        result.push(delete props[prop]);
      } else if (typeof props[prop] === "object") {
        result.push(removeNaNProperties(props[prop]));
      } else {
        result.push(undefined);
      }
    }
    return result;
  })();

  const removeNullProperties = props => (() => {
    const result = [];
    for (let prop of Object.keys(props || {})) {
      if ((props[prop] == null)) {
        result.push(delete props[prop]);
      } else {
        result.push(undefined);
      }
    }
    return result;
  })();

  /* Convert a cheerio node whose text is a number, to an actual number */
  const toNumber = function($node, {
    defaultValue
  }) {
    const val = $node.text();
    if (val != null) {
      return parseFloat(val);
    } else {
      return defaultValue;
    }
  };

  /* Scale MML length units to nextgen length units */
  const toNextgenLengths = (...ls) => Array.from(ls).map((l) => l / 100);

  /* Transform an (x,y) coordinate pair from MML frame to nextgen frame */
  const toNextgenCoordinates = function(x, y) {
    // MW 0,0 is top left, NGMW 0,0 is bottom left
    y = originalViewPortHeight - y;

    // if there is a view-port, x and y are actually in view-port coords... map to model coords
    x = x - originalViewPortX;
    y = y - originalViewPortY;

    return toNextgenLengths(x, y);
  };

  /* Converts a stroke dash number into nexgen stroke dash style */
  const convertLineDashes = function(lineStyle) {
    switch (false) {
      case lineStyle !== 1:
        return "2,2";
      case lineStyle !== 2:
        return "4,4";
      case lineStyle !== 3:
        return "6,6";
      case lineStyle !== 4:
        return "2,4,8,4";
      default:
        return "none";
    }
  };

  /* Converts an arrowhead number into nexgen arrowhead style */
  const convertArrowHead = function(arrowStyle, reverse) {
    switch (false) {
      case arrowStyle !== 1:
        if (reverse) {
          return "M 0 0 L 10 5 L 0 10 z";
        } else {
          return "M 10 0 L 0 5 L 10 10 z";
        }
      case arrowStyle !== 2:
        if (reverse) {
          return "M 0 0 L 10 5 L 0 10";
        } else {
          return "M 10 0 L 0 5 L 10 10";
        }
      case arrowStyle !== 3:
        if (reverse) {
          return "M 0 0 L 10 5 L 0 10 L 3 5 z";
        } else {
          return "M 10 0 L 0 5 L 10 10 L 7 5 z";
        }
      case arrowStyle !== 4:
        return "M 0 5 L 5 10 L 10 5 L 5 0 z";
      case arrowStyle !== 5:
        return "M 0 5 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0 z";
      default:
        return "none";
    }
  };

  /* Extracts a java-awt-Color into a core color  */
  const getColorProperty = function($node, alpha) {
    const colorNodes = $node.find("int");
    if (colorNodes && (colorNodes.length > 0)) {
      const corecolor = (parseInt(cheerio(colorNodes[0]).text())) + "," +
        (parseInt(cheerio(colorNodes[1]).text())) + "," +
        (parseInt(cheerio(colorNodes[2]).text()));
      if (alpha != null) {
        return `rgba(${corecolor},${alpha / 255})`;
      } else {
        return `rgb(${corecolor})`;
      }
    } else {
      return NaN;
    }
  };

  /* Extracts or finds the fill color from a given node and document */
  const getFillColor = function($node, alpha) {
    const fillNode = $node.find("[property=fillMode]");
    const fillColor = getNode(fillNode.children("object"));
    if (fillColor && fillColor.length) {
      if (fillColor.is(".org-concord-modeler-draw-FillMode-ColorFill")) {
        return getColorProperty((getNode(fillColor.find("[property=color]>object"))), alpha);
      } else if (fillColor.is(".org-concord-modeler-draw-FillMode-GradientFill")) {
        let color1 = getColorProperty((getNode(fillColor.find("[property=color1]>object"))), alpha);
        let color2 = getColorProperty((getNode(fillColor.find("[property=color2]>object"))), alpha);
        // Sometimes color can't be found due to problems with ID references. See:
        // https://www.pivotaltracker.com/story/show/55563212
        // Use white color as a fallback value.
        if (!color1) {
          color1 = (alpha != null) ? `rgba(255,255,255,${alpha / 255})` : "#fff";
        }
        if (!color2) {
          color2 = (alpha != null) ? `rgba(255,255,255,${alpha / 255})` : "#fff";
        }
        const style = getIntProperty(fillColor, "style");
        const variant = getIntProperty(fillColor, "variant");
        if (style === 1036) {
          if (variant === 1041) {
            return `radial ${color1} 0% ${color2} 100%`;
          } else if (variant === 1042) {
            return `radial ${color2} 0% ${color1} 100%`;
          }
        } else {
          const stops = (() => {
            switch (variant) {
              case 1041:
                return `${color1} 0% ${color2} 100%`;
              case 1042:
                return `${color2} 0% ${color1} 100%`;
              case 1043:
                return `${color1} 0% ${color2} 50% ${color1} 100%`;
              case 1044:
                return `${color2} 0% ${color1} 50% ${color2} 100%`;
            }
          })();
          if ((stops == null)) {
            return NaN;
          }
          const direction = (() => {
            switch (style) {
              case 1031:
                return 90;
              case 1032:
                return 0;
              case 1033:
                return 45;
              case 1034:
                return 315;
            }
          })();
          if ((direction == null)) {
            return NaN;
          }
          return `linear ${direction}deg ${stops}`;
        }
      }
    }
    return NaN;
  };

  /* Extracts or finds the line color from a given node and document */
  const getLineColor = function($node) {
    const lineNode = $node.find("[property=lineColor]");
    const lineColor = getNode(lineNode.children("object"));
    if (lineColor && lineColor.length) {
      return getColorProperty(lineColor);
    }
    return NaN;
  };

  /* Find and parse mml nodes representing obstacles */
  const parseObstacles = function() {
    const obstacles = [];
    const obstacleNodes = $mml("void[property=obstacles] .org-concord-mw2d-models-RectangularObstacle-Delegate");
    for (node of Array.from(obstacleNodes)) {
      const $node = getNode(cheerio(node));

      let height = getFloatProperty($node, "height");
      let width = getFloatProperty($node, "width");
      let x = getFloatProperty($node, "x");
      // in mml, y is left unspecified if y = 0 in the model
      let y = getFloatProperty($node, "y") || 0;
      let vx = getFloatProperty($node, "vx");
      let vy = getFloatProperty($node, "vy");
      let externalAx = getFloatProperty($node, "externalFx");
      let externalAy = getFloatProperty($node, "externalFy");
      let friction = getFloatProperty($node, "friction");
      let density = getFloatProperty($node, "density");
      const westProbe = getBooleanProperty($node, "westProbe");
      const northProbe = getBooleanProperty($node, "northProbe");
      const eastProbe = getBooleanProperty($node, "eastProbe");
      const southProbe = getBooleanProperty($node, "southProbe");
      const visible = getBooleanProperty($node, "visible");
      const color = getFillColor($node);

      // Unit conversion.
      [x, y] = Array.from(toNextgenCoordinates(x, y));
      [height, width] = Array.from(toNextgenLengths(height, width));
      y = y - height; // flip to lower-left coordinate system

      // 100 m/s is 0.01 in MML and should be 0.0001 nm/fs
      vx = vx / 100;
      vy = -vy / 100;

      // Divide by 120, as friction for obstacles is defined *per mass unit*!
      // CLASSIC_TO_NEXTGEN_FRICTION_RATIO includes mass conversion,
      // which is unnecessary when value is defined *per mass unit*.
      friction *= CLASSIC_TO_NEXTGEN_FRICTION_RATIO / 120;

      // External forces are specified per mass unit. So, in fact it's acceleration.
      // Convert from units of 0.1Å/fs^2 to units of nm/fs^2
      // Conversion: 1 0.1Å/fs^2 * 0.01 nm/0.1Å = 0.01 nm/fs^2
      externalAx *= 0.01;
      externalAy *= 0.01;

      // Mimic Classic MW behavior. When obstacle density is bigger than
      // 500 [120amu/0.1A^2], it is considered to be fixed
      // (in Next Gen MW 'Infinity' mass is expected). It is important as it affects
      // kinetic energy calculations (temperature), particles bouncing etc.
      if (density >= 500) {
        density = Infinity;
      }

      // Classic MW saves density in units of 120amu / (0.1Å)^2
      // (As usual, the claim its user interface makes regarding units is spurious.)
      // Convert to units of amu/nm^2 (aka Dalton/nm^2)
      // Conversion: 1 120amu / (0.1Å)^2 * 120 amu/120amu * (100 0.1Å/nm)^2 = 1.2e6 amu/nm^2
      // Note that the constants module ought to be extended to do this conversion for us; see
      // https://github.com/concord-consortium/lab/issues/9
      density *= 1.2e6;

      if (density !== density) { // if NaN
        density = Infinity;
      }

      // Calculate mass. Next Gen MW uses *only* mass, density isn't stored anywhere.
      let mass = density * height * width;

      // JSON doesn't accept Infinity numeric value, use string instead.
      if (mass === Infinity) {
        mass = "Infinity";
      }

      const rawData = {
        x, y,
        height, width,
        vx, vy,
        externalAx, externalAy,
        friction,
        mass,
        westProbe, northProbe, eastProbe, southProbe,
        color,
        visible
      };

      // Unit conversion performed on undefined values can convert them to NaN.
      // Revert back all NaNs to undefined, as we do not expect any NaN
      // as property. Undefined values will be replaced by default values by validator.
      removeNaNProperties(rawData);

      // Validate all properties and provides default values for undefined values.
      const validatedData = validator.validateCompleteness(metadata.obstacle, rawData, {
        includeOnlySerializedProperties: true
      });

      obstacles.push(validatedData);
    }

    return obstacles;
  };

  /* Find and parse mml nodes representing rectangles */
  const parseRectangles = function() {
    const rectangles = [];
    const rectangleNodes = $mml("void[property=rectangles] object.org-concord-mw2d-models-RectangleComponent-Delegate");
    for (let idx = 0; idx < rectangleNodes.length; idx++) {
      node = rectangleNodes[idx];
      const $node = getNode(cheerio(node));

      const type = "rectangle";
      let height = getFloatProperty($node, "height");
      let width = getFloatProperty($node, "width");
      let x = getFloatProperty($node, "x");
      let y = getFloatProperty($node, "y");
      const lineDashes = convertLineDashes(getFloatProperty($node, "lineStyle"));
      const lineWeight = getFloatProperty($node, "lineWeight");
      const layer = getFloatProperty($node, "layer");
      const layerPosition = getFloatProperty($node, "layerPosition");
      const alpha = getFloatProperty($node, "alpha");
      let visible = getBooleanProperty($node, "visible");
      let fence = getBooleanProperty($node, "reflection");
      const color = getFillColor($node, alpha);
      const lineColor = getLineColor($node);

      // Change all Boolean values to 0/1.
      if (visible != null) {
        visible = Number(visible);
      }
      if (fence != null) {
        fence = Number(fence);
      }

      if ((x == null)) {
        x = 20;
      }
      if ((y == null)) {
        y = 20;
      }
      // Unit conversion.
      [x, y] = Array.from(toNextgenCoordinates(x, y));
      [height, width] = Array.from(toNextgenLengths(height, width));
      y = y - height; // flip to lower-left coordinate system

      const rawData = {
        type,
        x, y,
        height, width,
        fence,
        color, lineColor,
        lineWeight, lineDashes,
        layer, layerPosition,
        visible
      };

      // Unit conversion performed on undefined values can convert them to NaN.
      // Revert back all NaNs to undefined, as we do not expect any NaN
      // as property. Undefined values will be replaced by default values by validator.
      removeNaNProperties(rawData);

      // Validate all properties and provides default values for undefined values.
      const validatedData = validator.validateCompleteness(metadata.shape, rawData, {
        includeOnlySerializedProperties: true
      });

      rectangles.push(validatedData);

      // <void property="vectorField">
      //  <object class="org.concord.mw2d.models.ElectricField">
      //   <void property="frequency">
      //    <double>0.06911503837897545</double>
      //   </void>
      //   <void property="intensity">
      //    <double>0.10000000149011612</double>
      //   </void>
      //   <void property="local">
      //    <boolean>true</boolean>
      //   </void>
      //  </object>
      // </void>

      // Shape can also specify electric field.
      const $elField = $node.find("[property=vectorField]>object.org-concord-mw2d-models-ElectricField");
      if ($elField.length > 0) {
        const parsedElField = parseElectricField($elField);
        parsedElField.shapeIdx = idx;
        electricFields.push(parsedElField);
      }
    }

    return rectangles;
  };

  /* Find and parse mml nodes representing ellipses */
  const parseEllipses = function() {
    const ellipses = [];
    const ellipseNodes = $mml("void[property=ellipses] object.org-concord-mw2d-models-EllipseComponent-Delegate");
    for (let idx = 0; idx < ellipseNodes.length; idx++) {
      node = ellipseNodes[idx];
      const $node = getNode(cheerio(node));

      const type = "ellipse";
      let height = getFloatProperty($node, "height");
      let width = getFloatProperty($node, "width");
      let x = getFloatProperty($node, "x");
      let y = getFloatProperty($node, "y");
      const lineDashes = convertLineDashes(getFloatProperty($node, "lineStyle"));
      const lineWeight = getFloatProperty($node, "lineWeight");
      const layer = getFloatProperty($node, "layer");
      const layerPosition = getFloatProperty($node, "layerPosition");
      const alpha = getFloatProperty($node, "alpha");
      let visible = getBooleanProperty($node, "visible");
      let fence = getBooleanProperty($node, "reflection");
      let color = getFillColor($node, alpha);
      const lineColor = getLineColor($node);
      const alphaAtCenter = getFloatProperty($node, "alphaAtCenter");
      const alphaAtEdge = getFloatProperty($node, "alphaAtEdge");

      // Support additional alphaAtCenter/Edge properties. They were separate properties in
      // Classic MW, however in MW just merge them into gradient definition.
      if ((alphaAtCenter != null) && color.indexOf("radial" === 0)) {
        color = color.replace(/rgba?(\(\d+,\d+,\d+)[\d,\.]*(\) 0%)/, `rgba$1,${alphaAtCenter / 255}$2`);
      }
      if ((alphaAtEdge != null) && color.indexOf("radial" === 0)) {
        color = color.replace(/rgba?(\(\d+,\d+,\d+)[\d,\.]*(\) 100%)/, `rgba$1,${alphaAtEdge / 255}$2`);
      }
      // Change all Boolean values to 0/1.
      if (visible != null) {
        visible = Number(visible);
      }
      if (fence != null) {
        fence = Number(fence);
      }

      if ((x == null)) {
        x = 20;
      }
      if ((y == null)) {
        y = 20;
      }
      // Unit conversion.
      [x, y] = Array.from(toNextgenCoordinates(x, y));
      [height, width] = Array.from(toNextgenLengths(height, width));
      y = y - height; // flip to lower-left coordinate system

      const rawData = {
        type,
        x, y,
        height, width,
        fence,
        color, lineColor,
        lineWeight, lineDashes,
        layer, layerPosition,
        visible
      };

      // Unit conversion performed on undefined values can convert them to NaN.
      // Revert back all NaNs to undefined, as we do not expect any NaN
      // as property. Undefined values will be replaced by default values by validator.
      removeNaNProperties(rawData);

      // Validate all properties and provides default values for undefined values.
      const validatedData = validator.validateCompleteness(metadata.shape, rawData, {
        includeOnlySerializedProperties: true
      });

      ellipses.push(validatedData);

      // Shape can also specify electric field.
      const $elField = $node.find("object.org-concord-mw2d-models-ElectricField");
      if ($elField.length > 0) {
        const parsedElField = parseElectricField($elField);
        parsedElField.shapeIdx = idx;
        electricFields.push(parsedElField);
      }
    }

    return ellipses;
  };

  const parseLines = function() {
    const lines = [];
    const lineNodes = $mml("void[property=lines] object.org-concord-mw2d-models-LineComponent-Delegate");
    for (let idx = 0; idx < lineNodes.length; idx++) {
      node = lineNodes[idx];
      const $node = getNode(cheerio(node));

      let x = getFloatProperty($node, "x");
      let y = getFloatProperty($node, "y");
      let x12 = getFloatProperty($node, "x12");
      let y12 = getFloatProperty($node, "y12");
      const beginStyle = convertArrowHead(getFloatProperty($node, "beginStyle"));
      const endStyle = convertArrowHead((getFloatProperty($node, "endStyle")), true);
      const lineDashes = convertLineDashes(getFloatProperty($node, "style"));
      const lineWeight = getFloatProperty($node, "weight");
      const layer = getFloatProperty($node, "layer");
      const layerPosition = getFloatProperty($node, "layerPosition");
      let visible = getBooleanProperty($node, "visible");
      let fence = getBooleanProperty($node, "reflector");
      const lineColor = getColorProperty(getNode($node.find("[property=color]>object")));

      // Change all Boolean values to 0/1.
      if (visible != null) {
        visible = Number(visible);
      }
      if (fence != null) {
        fence = Number(fence);
      }

      if ((x == null)) {
        x = 20;
      }
      if ((y == null)) {
        y = 20;
      }
      if ((x12 == null)) {
        x12 = 0;
      }
      if ((y12 == null)) {
        y12 = 0;
      }

      // Convert x,y and x12, y12 into x1, y1 and x2, y2
      let x1 = x + (x12 / 2);
      let y1 = y + (y12 / 2);
      let x2 = x - (x12 / 2);
      let y2 = y - (y12 / 2);

      // Unit conversion.
      [x1, y1] = Array.from(toNextgenCoordinates(x1, y1));
      [x2, y2] = Array.from(toNextgenCoordinates(x2, y2));

      const rawData = {
        x1, y1,
        x2, y2,
        beginStyle,
        endStyle,
        fence,
        lineColor,
        lineWeight, lineDashes,
        layer, layerPosition,
        visible
      };

      // Unit conversion performed on undefined values can convert them to NaN.
      // Revert back all NaNs to undefined, as we do not expect any NaN
      // as property. Undefined values will be replaced by default values by validator.
      removeNaNProperties(rawData);

      // Validate all properties and provides default values for undefined values.
      const validatedData = validator.validateCompleteness(metadata.line, rawData, {
        includeOnlySerializedProperties: true
      });

      lines.push(validatedData);
    }

    return lines;
  };

  /*
    Find the container size
  */
  const viewProps = $mml(".org-concord-mw2d-models-RectangularBoundary-Delegate");
  let width = getIntProperty(viewProps, "width", "double");
  let height = getIntProperty(viewProps, "height", "double");

  /*
    Find the view-port size. Do it at the beginning, as view-port X and Y dimensions
    are used during conversion of other objects.
  */
  const viewPort = viewProps.find("[property=viewSize]>.java-awt-Dimension>int");
  if (viewPort.length) {
    originalViewPortWidth = parseInt(viewPort[0].children[0].data);
    originalViewPortHeight = parseInt(viewPort[1].children[0].data);
    originalViewPortX = parseInt(viewProps.find("[property=x]>double").text() || 0);
    originalViewPortY = parseInt(viewProps.find("[property=y]>double").text() || 0);
  } else {
    originalViewPortWidth = width;
    originalViewPortHeight = height;
    originalViewPortX = (originalViewPortY = 0);
  }

  // scale from MML units to Lab's units
  [height, width] = Array.from(toNextgenLengths(height, width));
  const [viewPortHeight, viewPortWidth] = Array.from(toNextgenLengths(originalViewPortHeight, originalViewPortWidth));
  const [viewPortY, viewPortX] = Array.from(toNextgenLengths(-originalViewPortY, -originalViewPortX));

  /*
    Find the force interaction booleans
  */
  const coulombForces = getBooleanProperty($mml.root(), "interCoulomb", "boolean");

  /*
    Find the dielectric constant
  */
  const dielectricConstant = getFloatProperty($mml.root(), "dielectricConstant", "float");

  /*
    Find the background color
  */
  const bgColors = (Array.from($mml("void[property=background] > .java-awt-Color > int")).map((n) => cheerio(n).text()));
  // If array of RGBA values is found, use it. Otherwise, left 'backgroundColor' undefined, so default value will be used.
  if (bgColors.length === 4) {
    backgroundColor = `rgba(${bgColors[0]},${bgColors[1]},${bgColors[2]},${bgColors[3]})`;
  }
  // A tiny "hack" - replace background color of water or oil used in Classic MW to one used in Next Gen MW.
  if (backgroundColor === "rgba(134,187,246,255)") {
    backgroundColor = new Solvent("water").color;
  }
  if (backgroundColor === "rgba(240, 244, 57, 255") {
    backgroundColor = new Solvent("oil").color;
  }

  /*
    Find mark color
  */
  let markColor = getIntProperty($mml.root(), "markColor", "int");
  // Convert signedInt value used in Classic MW to hex color definition.
  if (markColor != null) {
    markColor = "#" + (markColor + Math.pow(2, 24)).toString(16);
  }

  /*
    Find the solvent force type.
    In Classic MW it's a type of solvent. However, to avoid confusion in Next Gen MW
    it's named 'solventForceType', as it affects force driving amino acids. We do not
    store solvent name explicitly as it's redundant information. The solvent specifies
    'solventForceType', 'dielectricConstant' and 'backgroundColor'. See:
    md2d/models/solvent.coffee and md2d/models/modeler.#setSolvent(solventName)
  */
  const $solvent = $mml("[property=solvent]>.org-concord-mw2d-models-Solvent");
  const solventForceType = getIntProperty($solvent, "type", "short");

  /*
    Find the chargeShading
  */
  const chargeShading = getBooleanProperty($mml.root(), "chargeShading", "boolean");

  /*
    Find the showChargeSymbols
  */
  const showChargeSymbols = getBooleanProperty($mml.root(), "drawCharge", "boolean");

  /*
    Find the electric field visualization options.
  */
  let showElectricField = getBooleanProperty($mml.root(), "showEFieldLines", "boolean");
  const electricFieldDensity = (function() {
    let EFCellSize = getIntProperty($mml.root(), "EFCellSize", "int");
    [EFCellSize] = Array.from(toNextgenLengths(EFCellSize));
    if ((EFCellSize < 10) && (EFCellSize >= 0)) {
      return Math.round(width / EFCellSize);
    } else {
      // Quite often in Classic MW cell size equal to 100 was used to disable
      // electric field completely. Instead of using density 0, use default
      // density + set showElectricField to false.
      //
      // In rare cases (e.g. maze game), EFCellSize = -1 or 1000 was also
      // used to disable electric field.
      showElectricField = false;
      return undefined;
    }
  })();

  /*
    Find the KE Shading
  */
  const keShading = getBooleanProperty($mml.root(), "shading", "boolean");

  /*
    Show VDW Lines?
  */
  const showVDWLines = getBooleanProperty($mml.root(), "showVDWLines", "boolean");
  const VDWLinesRatio = getFloatProperty($mml.root(), "VDWLinesRatio", "float");
  // if VDWLinesRatio is undefined, VDWLinesCutoff will also be undefined and
  // finally replaced by default value.
  const VDWLinesCutoff = VDWLinesRatioMap[VDWLinesRatio];

  /*
    Viscosity
  */
  const universeProps = $mml(".org-concord-mw2d-models-Universe");
  const viscosity = getFloatProperty(universeProps, "viscosity", "float");

  /*
    timeStepsPerTick
  */
  const timeStepsPerTick = getFloatProperty($mml.root(), "viewRefreshInterval", "int");

  /*
    timeStep
  */
  const timeStep = getFloatProperty($mml.root(), "timeStep", "double");

  /*
    Show Clock
  */
  const showClock = getBooleanProperty($mml.root(), "showClock", "boolean");

  /*
    Show velocity vectors
  */
  const showVelocityVectors = getBooleanProperty($mml.root(), "showVVectors", "boolean");

  const velocityVectorProps = $mml("[property=velocityFlavor]");
  if (velocityVectorProps.length > 0) {
    velocityVectorWidth = getFloatProperty(velocityVectorProps, "width", "float");
    velocityVectorLength = getIntProperty(velocityVectorProps, "length", "int");
    velocityVectorLength /= 100;
    [velocityVectorWidth] = Array.from(toNextgenLengths(velocityVectorWidth));
    const velocityColorDef = velocityVectorProps.find(".java-awt-Color>int");
    if (velocityColorDef && (velocityColorDef.length > 0)) {
      velocityVectorColor = "rgb(";
      velocityVectorColor += parseInt(cheerio(velocityColorDef[0]).text()) + ",";
      velocityVectorColor += parseInt(cheerio(velocityColorDef[1]).text()) + ",";
      velocityVectorColor += parseInt(cheerio(velocityColorDef[2]).text()) + ")";
    }
  }

  /*
    Show force vectors
  */
  const showForceVectors = getBooleanProperty($mml.root(), "showFVectors", "boolean");

  const forceVectorProps = $mml("[property=forceFlavor]");
  if (forceVectorProps.length > 0) {
    forceVectorWidth = getFloatProperty(forceVectorProps, "width", "float");
    forceVectorLength = getIntProperty(forceVectorProps, "length", "int");
    forceVectorLength /= 1000;
    [forceVectorWidth] = Array.from(toNextgenLengths(forceVectorWidth));
    const forceColorDef = forceVectorProps.find(".java-awt-Color>int");
    if (forceColorDef && (forceColorDef.length > 0)) {
      forceVectorColor = "rgb(";
      forceVectorColor += parseInt(cheerio(forceColorDef[0]).text()) + ",";
      forceVectorColor += parseInt(cheerio(forceColorDef[1]).text()) + ",";
      forceVectorColor += parseInt(cheerio(forceColorDef[2]).text()) + ")";
    }
    if (forceVectorColor === "rgb(255,0,255)") {
      forceVectorColor = undefined;
    }
  }

  /*
    GravitationalField
  */
  const gravitationalProps = $mml(".org-concord-mw2d-models-GravitationalField");
  if (gravitationalProps.length > 0) {
    // Some default value must be provided, as this is MML-specific case.
    // If we left gravitationalField undefined, it would be set to its "main" default value.
    gravitationalField = getFloatProperty(gravitationalProps, "intensity", "double") || 0.010;

    gravitationalField *= CLASSIC_TO_NEXTGEN_GRAVITATION_RATIO;
  } else {
    // Use "main" default value provided by validator.
    gravitationalField = undefined;
  }

  /*
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
  */
  const imageProps = $mml("[property=images]>array");
  const imageBlock = imageProps.find("object.org-concord-mw2d-models-ImageComponent-Delegate");
  const images = [];
  if (imageProps.length > 0) {
    for (let image of Array.from(imageBlock)) {
      const $image = getNode(cheerio(image));
      const imageUri = $image.find("[property=URI]>string").text();
      let imageHostIndex = parseInt($image.find("[property=hostIndex]>int").text());
      if (isNaN(imageHostIndex)) {
        imageHostIndex = 0;
      }
      let imageHostType = $image.find("[property=hostType]>string").text();
      imageHostType = imageHostType.slice(imageHostType.lastIndexOf(".") + 1);
      const imageLayer = parseInt($image.find("[property=layer]>int").text());
      const imageLayerPosition = parseInt($image.find("[property=layerPosition]>byte").text());
      visible = parseBoolean($image.find("[property=visible]>boolean").text(), true);
      let imageX = parseFloat($image.find("[property=x]>double").text());
      let imageY = parseFloat($image.find("[property=y]>double").text());
      let rotation = parseFloat($image.find("[property=offsetAngle]>float").text());
      [imageX, imageY] = Array.from(toNextgenCoordinates(imageX, imageY));
      // Convert angle to Next Gen format. We use an opposite sign and degrees instead of radians.
      rotation = (-1 * rotation * 180) / Math.PI;
      // Scale is a NextGen-only property, ClassicMW always uses 1 pixel == 0.1 Angstrom (0.01 nm) conversion.
      const scale = 1;
      images.push({
        imageUri, imageHostIndex, imageHostType, imageLayer, imageLayerPosition, imageX, imageY, rotation, scale, visible
      });
    }
  }

  /*
    Text boxes. TODO: factor out pattern common to MML parsing of images and text boxes
  */
  const wrapTextBoxText = function(t) {
    t = t.replace(/^\s+|\s+$/g, "");
    return t.replace(/\n\s+/g, "\n");
  };

  const parseTextBoxNode = function(textBoxNode) {
    let backgroundTextColor, calloutPoint, fontColor;
    const $textBoxNode = getNode(cheerio(textBoxNode));
    const text = wrapTextBoxText($textBoxNode.find("[property=text]>string").text());
    const $x = parseFloat($textBoxNode.find("[property=x]>double").text() || 0.001);
    const $y = parseFloat($textBoxNode.find("[property=y]>double").text() || 0);
    const layer = parseInt($textBoxNode.find("[property=layer]>int").text()) || 1;
    let angle = parseFloat($textBoxNode.find("[property=angle]>float").text() || 0);
    if (angle < 0) {
      angle = 360 - (Math.abs(angle) % 360);
    }
    let textHostIndex = parseInt($textBoxNode.find("[property=hostIndex]>int").text());
    if (isNaN(textHostIndex)) {
      textHostIndex = 0;
    }
    let textHostType = $textBoxNode.find("[property=hostType]>string").text();
    textHostType = textHostType.slice(textHostType.lastIndexOf(".") + 1);
    // textboxes using referenced colors do not use class .java-awt-color, but still have a child
    // object to specify the referenced color
    const colorDef = getNode($textBoxNode.find("void[property=foregroundColor]>object")).find(">int");
    if (colorDef && (colorDef.length > 0)) {
      fontColor = "rgb(";
      fontColor += parseInt(cheerio(colorDef[0]).text()) + ",";
      fontColor += parseInt(cheerio(colorDef[1]).text()) + ",";
      fontColor += parseInt(cheerio(colorDef[2]).text()) + ")";
    }
    const backgroundColorDef = $textBoxNode.find("void[property=fillMode] .java-awt-Color>int");
    if (backgroundColorDef && (backgroundColorDef.length > 0)) {
      backgroundTextColor = "rgb(";
      backgroundTextColor += parseInt(cheerio(backgroundColorDef[0]).text()) + ",";
      backgroundTextColor += parseInt(cheerio(backgroundColorDef[1]).text()) + ",";
      backgroundTextColor += parseInt(cheerio(backgroundColorDef[2]).text()) + ")";
    }
    const borderType = parseInt($textBoxNode.find("[property=borderType]>int").text()) || 0;
    const frame = (() => {
      switch (borderType) {
        case 0:
          return "";
        case 1:
          return "rectangle";
        case 2:
          return "rounded rectangle";
      }
    })();
    const callout = parseBoolean($textBoxNode.find("[property=callOut]>boolean").text()) || false;
    const calloutPointDef = $textBoxNode.find("void[property=callOutPoint] .java-awt-Point>int");
    if (callout && calloutPointDef && (calloutPointDef.length > 1)) {
      calloutPoint = (Array.from(calloutPointDef).map((el) => parseInt(cheerio(el).text())));
    }
    const $font = getNode($textBoxNode.find("[property=font] > object"));
    let fontSize = $font.children().eq(2).text() || 12;

    const [x, y] = Array.from(toNextgenCoordinates($x, $y));
    [fontSize] = Array.from(toNextgenLengths(fontSize));

    const textBox = {
      text, x, y, layer
    };
    if (frame) {
      textBox.frame = frame;
    }
    if (fontColor) {
      textBox.color = fontColor;
    }
    textBox.fontSize = fontSize;
    if (calloutPoint) {
      textBox.calloutPoint = toNextgenCoordinates(calloutPoint[0], calloutPoint[1]);
    }
    if (textHostType) {
      textBox.hostType = textHostType;
      textBox.hostIndex = textHostIndex;
    }
    if (backgroundTextColor) {
      textBox.backgroundColor = backgroundTextColor;
    }

    // default anchor is upper-left when importing from Java MW
    textBox.anchor = "upper-left";
    if (angle !== 0) {
      textBox.rotate = angle;
    }
    return textBox;
  };

  const $textBoxesArray = $mml("[property=textBoxes]>array");
  if ($textBoxesArray.length > 0) {
    const $textBoxNodes = $textBoxesArray.find("object.org-concord-mw2d-models-TextBoxComponent-Delegate");
    textBoxes = ((() => {
      const result = [];
      for (node of Array.from($textBoxNodes)) {
        result.push(parseTextBoxNode(node));
      }
      return result;
    })());
  } else {
    textBoxes = [];
  }


  /*
    Find electric fields.
  */
  var parseElectricField = function(node) {
    const $node = getNode(cheerio(node));
    let intensity = getFloatProperty($node, "intensity", "double");
    let orientation = getIntProperty($node, "orientation", "int");

    intensity *= GF_CONVERSION_CONSTANT;
    orientation = VEC_ORIENTATION[orientation];

    const rawData = {
      intensity, orientation
    };

    // Unit conversion performed on undefined values can convert them to NaN.
    // Revert back all NaNs to undefined, as we do not expect any NaN
    // as property. Undefined values will be replaced by default values by validator.
    removeNaNProperties(rawData);

    // Validate all properties and provides default values for undefined values.
    const props = validator.validateCompleteness(metadata.electricField, rawData, {
      includeOnlySerializedProperties: true
    });

    // Classic MW does weird things when it comes to intensity and orientation.
    // We can implement conversions that are used in Classic MW and simplify logic
    // in Next Gen MW. See:
    // https://github.com/concord-consortium/mw/blob/9d9ec6dd5c00ad5d2dd8f112e3b36e200f22e559/src/org/concord/mw2d/models/ElectricField.java#L92-L111
    if (props.intensity < 0) {
      props.intensity *= -1;
      switch (props.orientation) {
        case "S":
          props.orientation = "N";
          break;
        case "E":
          props.orientation = "W";
          break;
      }
    } else {
      switch (props.orientation) {
        case "N":
          props.orientation = "S";
          break;
        case "W":
          props.orientation = "E";
          break;
      }
    }

    return props;
  };

  // <void property="fields">
  //  <void method="add">
  //   <object class="org.concord.mw2d.models.ElectricField">
  //    <void property="frequency">
  //     <double>0.006283185307179587</double>
  //    </void>
  //    <void property="intensity">
  //     <double>0.07000000029802322</double>
  //    </void>
  //    <void property="orientation">
  //     <int>3003</int>
  //    </void>
  //   </object>
  //  </void>
  // </void>

  const $fields = $mml("[method=add]>object.org-concord-mw2d-models-ElectricField");
  if ($fields.length > 0) {
    electricFields = ((() => {
      const result1 = [];
      for (node of Array.from($fields)) {
        result1.push(parseElectricField(node));
      }
      return result1;
    })());
  } else {
    electricFields = [];
  }

  /*
    Find obstacles
  */
  const obstacles = parseObstacles();

  /*
    Find shapes
  */
  const shapes = parseRectangles().concat(parseEllipses());

  /*
    Find lines
  */
  const lines = parseLines();

  /*
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
  */

  // Default element colors from Java MW converted into
  // signed Integer form used by custom elementColors
  //
  // >> "f2f2f2".to_i(16) - 2**24
  // => -855310
  // >> "75a643".to_i(16) - 2**24
  // => -9066941
  // >> "7543a6".to_i(16) - 2**24
  // => -9092186
  // >> "D941E0".to_i(16) - 2**24
  // => -2539040

  const elementColors = [-855310, -9066941, -9092186, -2539040];

  const elementColorNodes = $mml("void[property=elementColors] > void");
  for (node of Array.from(elementColorNodes)) {
    $node = getNode(cheerio(node));
    index = $node.attr("index");
    color = +$node.text();
    elementColors[index] = color;
  }

  const elements = [];

  const elementNodes = $mml(".org-concord-mw2d-models-Element");
  let colorIndex = 0;
  for (node of Array.from(elementNodes)) {
    $node = getNode(cheerio(node));
    let mass = getFloatProperty($node, "mass", "double");
    sigma = getFloatProperty($node, "sigma", "double");
    epsilon = getFloatProperty($node, "epsilon", "double");

    // scale sigma to nm
    [sigma] = Array.from(toNextgenLengths(sigma));

    // epsilon's sign appears to be flipped between MW and Lab
    epsilon = -epsilon;

    // scale to NextGen units
    mass *= 120; //convert to mass in Daltons

    // elementColor
    color = elementColors[colorIndex];
    colorIndex++;

    const elementRawData = {
      mass, sigma, epsilon, color
    };

    // Unit conversion performed on undefined values can convert them to NaN.
    // Revert back all NaNs to undefined, as we do not expect any NaN
    // as property. Undefined values will be replaced by default values by validator.
    removeNaNProperties(elementRawData);

    // Validate all properties and provides default values for undefined values.
    const elementValidatedData = validator.validateCompleteness(metadata.element, elementRawData, {
      includeOnlySerializedProperties: true
    });

    elements.push(elementValidatedData);
  }

  /*
    Find all custom pairwise LJ properties (sigma and epsilon).
  */
  const pairwiseLJProperties = [];

  // This set defines whether mean values are used for pair (so lbMixing is true) or custom (lbMixing is false).
  const lbMixingProps = $mml(".org-concord-mw2d-models-Affinity>[property=lbMixing]>[method=put]");

  // Custom values for sigma and epsilon.
  const epsilonProps = $mml(".org-concord-mw2d-models-Affinity>[property=epsilon]");
  const sigmaProps = $mml(".org-concord-mw2d-models-Affinity>[property=sigma]");

  // Iterate over lbMixing properties first.
  for (prop of Array.from(lbMixingProps)) {
    const $prop = getNode(cheerio(prop));
    // Continue only when custom properties should be used.
    if ($prop.find("boolean").text() === "false") {
      // Use custom values of LJ properties.
      // First, get pair of elements.
      const $pair = getNode($prop.find("object"));
      const pairID = $pair.attr("id");
      const element1 = parseInt(getNode($pair.find("[property=element1]>object")).find("[property=ID]>int").text());
      const element2 = parseInt(getNode($pair.find("[property=element2]>object")).find("[property=ID]>int").text());

      // Then find sigma and epsilon values.
      epsilon = epsilonProps.find(`object[idref=${pairID}], object[id=${pairID}]`).next().text();
      sigma = sigmaProps.find(`object[idref=${pairID}], object[id=${pairID}]`).next().text();

      // Scale sigma to nm.
      [sigma] = Array.from(toNextgenLengths(sigma));
      // Epsilon's sign appears to be flipped between MW and Lab.
      epsilon = -epsilon;

      let ljProps = {
        element1, element2, sigma, epsilon
      };

      // Unit conversion performed on undefined values can convert them to NaN.
      // Revert back all NaNs to undefined, as we do not expect any NaN
      // as property. Undefined values will be replaced by default values by validator.
      removeNaNProperties(ljProps);

      // Validate all properties and provides default values for undefined values.
      ljProps = validator.validateCompleteness(metadata.pairwiseLJProperties, ljProps, {
        includeOnlySerializedProperties: true
      });

      pairwiseLJProperties.push(ljProps);
    }
  }

  /*
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
  */

  const parseAtoms = function() {
    const atoms = [];
    const restraints = [];

    const atomNodes = $mml(".org-concord-mw2d-models-Atom");

    for (node of Array.from(atomNodes)) {
      $node = getNode(cheerio(node));

      const element = getIntProperty($node, "ID", "int"); // selector = "void[property=ID] int"
      let x = getFloatProperty($node, "rx");
      let y = getFloatProperty($node, "ry");
      let vx = getFloatProperty($node, "vx");
      let vy = getFloatProperty($node, "vy");
      const charge = getFloatProperty($node, "charge");
      let friction = getFloatProperty($node, "friction");
      let radical = getBooleanProperty($node, "radical");
      visible = getBooleanProperty($node, "visible");
      let marked = getBooleanProperty($node, "marked");
      const movable = getBooleanProperty($node, "movable");
      let draggableWhenStopped = getBooleanProperty($node, "draggable");
      // userField is *not* a boolean property. If it exists, assume that
      // atom is draggable. Otherwise, use default value.
      const draggable = getProperty($node, "userField") ? 1 : undefined;

      // Classic MW uses movable, while Next Gen MW uses pinned property. Convert.
      let pinned = (movable != null) ? !movable : undefined;

      // Change all Boolean values to 0/1.
      if (radical != null) {
        radical = Number(radical);
      }
      if (pinned != null) {
        pinned = Number(pinned);
      }
      if (visible != null) {
        visible = Number(visible);
      }
      if (marked != null) {
        marked = Number(marked);
      }
      if (draggableWhenStopped != null) {
        draggableWhenStopped = Number(draggableWhenStopped);
      }

      // unit conversions
      [x, y] = Array.from(toNextgenCoordinates(x, y));
      friction = friction * CLASSIC_TO_NEXTGEN_FRICTION_RATIO;
      vx = vx / 100; // 100 m/s is 0.01 in MML and should be 0.0001 nm/fs
      vy = -vy / 100;

      const restraint = $node.find("[property=restraint]");
      if (restraint.length > 0) {
        const $restraint = cheerio(restraint);

        const atomIndex = atoms.length;
        let k = getFloatProperty($restraint, "k");
        let x0 = getFloatProperty($restraint, "x0");
        let y0 = getFloatProperty($restraint, "y0");

        [x0, y0] = Array.from(toNextgenCoordinates(x0, y0));

        // MML reports spring constant strength in units of eV per 0.01 nm. Convert to eV/nm ???
        k *= 100;

        const restraintRawData = {
          atomIndex, k, x0, y0
        };

        // Unit conversion performed on undefined values can convert them to NaN.
        // Revert back all NaNs to undefined, as we do not expect any NaN
        // as property. Undefined values will be replaced by default values by validator.
        removeNaNProperties(restraintRawData);

        // Validate all properties and provides default values for undefined values.
        const restraintValidatedData = validator.validateCompleteness(metadata.restraint, restraintRawData, {
          includeOnlySerializedProperties: true
        });

        restraints.push(restraintValidatedData);
      }


      const atomRawData = {
        element, x, y, vx, vy, charge, friction, radical, pinned, marked, visible, draggable, draggableWhenStopped
      };

      // Unit conversion performed on undefined values can convert them to NaN.
      // Revert back all NaNs to undefined, as we do not expect any NaN
      // as property. Undefined values will be replaced by default values by validator.
      removeNaNProperties(atomRawData);

      // Validate all properties and provides default values for undefined values.
      const atomValidatedData = validator.validateCompleteness(metadata.atom, atomRawData, {
        includeOnlySerializedProperties: true
      });

      atoms.push(atomValidatedData);
    }

    return [atoms, restraints];
  };

  /*
    radial bonds
  */
  const radialBonds = [];
  const radialBondNodes = $mml(".org-concord-mw2d-models-RadialBond-Delegate");
  for (node of Array.from(radialBondNodes)) {
    $node = getNode(cheerio(node));

    // It appears from an inspection of MW's AtomicModel.encode(java.beans.XMLEncoder out) method
    // that atoms are written to the MML file in ascending order. Therefore 'atom1 = 1' means
    // the second atom in the order atoms are found in the file. The atom[1|2] property is NOT
    // written to the file at all if it has the default value 0.

    atom1 = getIntProperty($node, "atom1");
    atom2 = getIntProperty($node, "atom2");
    length = getFloatProperty($node, "bondLength");
    strength = getFloatProperty($node, "bondStrength");
    // In Next Gen MW we change style to type. This is the more generic approach,
    // as type can define both visual and physical properties of the radial bond.
    const type = getIntProperty($node, "style", "byte");

    // convert from MML units to Lab units.

    // MML reports bondStrength in units of eV per 0.01 nm. Convert to eV/nm
    strength *= 1e4;

    // MML reports bondLength in units of 0.01 nm. Convert to nm.
    length *= 0.01;

    const radialBondRawData = {
      atom1, atom2, length, strength, type
    };

    // Unit conversion performed on undefined values can convert them to NaN.
    // Revert back all NaNs to undefined, as we do not expect any NaN
    // as property. Undefined values will be replaced by default values by validator.
    removeNaNProperties(radialBondRawData);

    // Validate all properties and provides default values for undefined values.
    const radialBondValidatedData = validator.validateCompleteness(metadata.radialBond, radialBondRawData, {
      includeOnlySerializedProperties: true
    });

    radialBonds.push(radialBondValidatedData);
  }

  /*
    angular bonds
  */
  const angularBonds = [];
  const angularBondNodes = $mml(".org-concord-mw2d-models-AngularBond-Delegate");
  for (node of Array.from(angularBondNodes)) {
    $node = getNode(cheerio(node));

    // It appears from an inspection of MW's AtomicModel.encode(java.beans.XMLEncoder out) method
    // that atoms are written to the MML file in ascending order. Therefore 'atom1 = 1' means
    // the second atom in the order atoms are found in the file. The atom[1|2] property is NOT
    // written to the file at all if it has the default value 0.

    atom1 = getIntProperty($node, "atom1");
    atom2 = getIntProperty($node, "atom2");
    const atom3 = getIntProperty($node, "atom3");
    // unit: radian
    const angle = getFloatProperty($node, "bondAngle");
    // unit: eV/radian^2
    strength = getFloatProperty($node, "bondStrength");
    // Unit conversion is unnecessary.

    const angularBondRawData = {
      atom1, atom2, atom3, angle, strength
    };

    // Validate all properties and provides default values for undefined values.
    const angularBondValidatedData = validator.validateCompleteness(metadata.angularBond, angularBondRawData, {
      includeOnlySerializedProperties: true
    });

    angularBonds.push(angularBondValidatedData);
  }

  /*
    heatBath settings
  */
  const heatBath = $mml(".org-concord-mw2d-models-HeatBath").find("[property=expectedTemperature]");
  if (heatBath.length > 0) {
    targetTemperature = parseFloat(heatBath.find("double").text());
  }

  /* Put everything together into Lab's JSON format */
  const results = parseAtoms();
  const atoms = results[0];
  const restraints = results[1];

  const x = ((() => {
    const result2 = [];
    for (atom of Array.from(atoms)) {
      result2.push(atom.x);
    }
    return result2;
  })());
  const y = ((() => {
    const result3 = [];
    for (atom of Array.from(atoms)) {
      result3.push(atom.y);
    }
    return result3;
  })());
  const vx = ((() => {
    const result4 = [];
    for (atom of Array.from(atoms)) {
      result4.push(atom.vx);
    }
    return result4;
  })());
  const vy = ((() => {
    const result5 = [];
    for (atom of Array.from(atoms)) {
      result5.push(atom.vy);
    }
    return result5;
  })());
  const charge = ((() => {
    const result6 = [];
    for (atom of Array.from(atoms)) {
      result6.push(atom.charge);
    }
    return result6;
  })());
  const friction = ((() => {
    const result7 = [];
    for (atom of Array.from(atoms)) {
      result7.push(atom.friction);
    }
    return result7;
  })());
  const radical = ((() => {
    const result8 = [];
    for (atom of Array.from(atoms)) {
      result8.push(atom.radical);
    }
    return result8;
  })());
  const element = ((() => {
    const result9 = [];
    for (atom of Array.from(atoms)) {
      result9.push(atom.element);
    }
    return result9;
  })());
  const pinned = ((() => {
    const result10 = [];
    for (atom of Array.from(atoms)) {
      result10.push(atom.pinned);
    }
    return result10;
  })());
  const marked = ((() => {
    const result11 = [];
    for (atom of Array.from(atoms)) {
      result11.push(atom.marked);
    }
    return result11;
  })());
  visible = ((() => {
    const result12 = [];
    for (atom of Array.from(atoms)) {
      result12.push(atom.visible);
    }
    return result12;
  })());
  const draggable = ((() => {
    const result13 = [];
    for (atom of Array.from(atoms)) {
      result13.push(atom.draggable);
    }
    return result13;
  })());
  const draggableWhenStopped = ((() => {
    const result14 = [];
    for (atom of Array.from(atoms)) {
      result14.push(atom.draggableWhenStopped);
    }
    return result14;
  })());

  const id = (atoms[0] != null ? atoms[0].element : undefined) || 0;

  /*
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
  */

  const $reactionObj = $mml("[class*=\"org-concord-mw2d-models-Reaction\"]");

  const useChemicalReactions = $reactionObj.length > 0;

  if (useChemicalReactions) {
    const parameters = $reactionObj.find("[method=put]");
    reaction = {};

    // Do not convert reaction parameters now. Default values from metadata will be used. We will
    // have to implement conversion from Classic to NextGen format.
    // reactionParameters = {}
    // for prop in parameters
    //   $node = cheerio(prop)
    //   key = $node.find('string').text()
    //   value = parseFloat($node.find('double').text())
    //   reactionParameters[key] = value
    //
    // reaction.parameters = reactionParameters

    reaction = validator.validateCompleteness(metadata.chemicalReactions, reaction, {
      includeOnlySerializedProperties: true
    });
  }

  /*
    Quantum Dynamics
  */
  const excitationStates = $mml("void[property=excitedStates] void[method=put]");
  let $lightSource = $mml("void[property=lightSource]");
  // Use quantum dynamics engine if excitation states are defined or there is an active light source.
  const useQuantumDynamics = (excitationStates.length > 0) ||
    (($lightSource.length > 0) && getBooleanProperty($lightSource, "on"));

  if (useQuantumDynamics) {

    let elementEnergyLevels;
    const getEnergyLevels = function(elementNode) {
      /*
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
      */

      // default energy levels; see:
      // https://github.com/concord-consortium/mw/blob/d3f621ba87825888737257a6cb9ac9e4e4f63f77/src/org/concord/mw2d/models/ElectronicStructure.java#L41-L47
      // applied to every element; see:
      // https://github.com/concord-consortium/mw/blob/d3f621ba87825888737257a6cb9ac9e4e4f63f77/src/org/concord/mw2d/models/Element.java#L183-L185
      let energy;
      let energyLevels = [-4, -1, -0.5];

      const $elementNode = getNode(cheerio(elementNode));

      for (node of Array.from($elementNode.find("void[property=energyLevels] > void"))) {
        $node = getNode(cheerio(node));
        if ($node.attr("method") === "clear") {
          energyLevels = [];
        } else if ($node.attr("method") === "add") {
          energyLevels.push(getFloatProperty($node, "energy", "float"));
        } else if ($node.attr("index")) {
          index = parseInt($node.attr("index"), 10);
          energyLevels[index] = getFloatProperty($node, "energy", "float");
        }
      }

      const convert = energy => constants.convert(energy, {
        from: constants.unit.EV,
        to: constants.unit.MW_ENERGY_UNIT
      });

      return (() => {
        const result15 = [];
        for (energy of Array.from(energyLevels)) {
          result15.push(convert(energy));
        }
        return result15;
      })();
    };


    if (excitationStates.length > 0) {
      for (atom of Array.from(excitationStates)) {
        $node = getNode(cheerio(atom));
        const atomIndex = parseInt(cheerio($node.find("int")[0]).text());
        excitation = parseInt($node.find("void[index=1] int").text());
        if (isNaN(excitation)) {
          excitation = 0;
        }
        atoms[atomIndex].excitation = excitation;
      }

      excitation = ((() => {
        const result15 = [];
        for (atom of Array.from(atoms)) {
          result15.push(atom.excitation);
        }
        return result15;
      })());
      elementEnergyLevels = ((() => {
        const result16 = [];
        for (elementNode of Array.from(elementNodes)) {
          result16.push(getEnergyLevels(elementNode));
        }
        return result16;
      })());
    }

    // default value which can be overridden by an explicit quantumRule found below:
    let radiationlessEmissionProbability = 1;

    const quantumRule = $mml(".org-concord-mw2d-models-QuantumRule");
    if (quantumRule.length) {
      const probabilityMap = quantumRule.find("void[property=probabilityMap]>[method=put]");
      for (let put of Array.from(probabilityMap)) {
        $node = getNode(cheerio(put));
        const key = parseInt($node.find("int").text());
        const val = parseFloat($node.find("float").text());

        // key values are ints hard-coded in classic mw
        if (key === 11) {
          radiationlessEmissionProbability = val;
        }
      }
    }

    let lightSource = {};
    $lightSource = $mml("void[property=lightSource]");
    if ($lightSource.length > 0) {
      lightSource = {};
      lightSource.on = getBooleanProperty($lightSource, "on") || false;
      lightSource.frequency = getFloatProperty($lightSource, "frequency");
      lightSource.monochromatic = getBooleanProperty($lightSource, "monochromatic");
      lightSource.radiationPeriod = getIntProperty($lightSource, "radiationPeriod");
      lightSource.numberOfBeams = getIntProperty($lightSource, "numberOfBeams");
      lightSource.angleOfIncidence = getFloatProperty($lightSource, "angleOfIncidence");
      if (lightSource.radiationPeriod) {
        lightSource.radiationPeriod = lightSource.radiationPeriod / 2;
      }
      if (lightSource.angleOfIncidence) {
        lightSource.angleOfIncidence = -lightSource.angleOfIncidence;
      }
    }

    removeNullProperties(lightSource);

    if ((lightSource.frequency == null)) {
      lightSource = undefined;
    }

    quantumDynamics = validator.validateCompleteness(metadata.quantumDynamics, {
      elementEnergyLevels,
      radiationlessEmissionProbability,
      lightSource
    }, {
      includeOnlySerializedProperties: true
    });
  }


  /* Convert array of hashes to a hash of arrays, for use by MD2D */
  const unroll = function(array, ...props) {
    const unrolled = {};
    for (prop of Array.from(props)) {
      unrolled[prop] = (Array.from(array).map((item) => item[prop]));
    }
    return unrolled;
  };

  // Main properties of the model.
  let json = {
    coulombForces,
    temperatureControl: !!targetTemperature,
      targetTemperature,
      width,
      height,
      viscosity,
      gravitationalField,
      timeStepsPerTick,
      timeStep,
      dielectricConstant,
      solventForceType
  };

  // Unit conversion performed on undefined values can convert them to NaN.
  // Revert back all NaNs to undefined, as they will be replaced by default values.
  removeNaNProperties(json);
  // Validate all properties and provides default values for undefined values.
  json = validator.validateCompleteness(metadata.mainProperties, json, {
    includeOnlySerializedProperties: true
  });

  // Properties which are managed by model, but they define view.
  // Model handles them, as they are e.g. stored in the history.
  let viewOptions = {
    viewPortWidth,
    viewPortHeight,
    viewPortX,
    viewPortY,
    backgroundColor,
    markColor,
    keShading,
    chargeShading,
    showChargeSymbols,
    showVDWLines,
    VDWLinesCutoff,
    showClock,
    showVelocityVectors,
    showForceVectors,
    showElectricField,
    electricFieldDensity,
    images,
    textBoxes,
    velocityVectors: {
        length: velocityVectorLength,
        width: velocityVectorWidth,
        color: velocityVectorColor
      },
      forceVectors: {
        length: forceVectorLength,
        width: forceVectorWidth,
        color: forceVectorColor
      }
  };

  // Unit conversion performed on undefined values can convert them to NaN.
  // Revert back all NaNs to undefined, as they will be replaced by default values.
  removeNaNProperties(viewOptions);
  // Validate all properties and provides default values for undefined values.
  viewOptions = validator.validateCompleteness(metadata.viewOptions, viewOptions, {
    includeOnlySerializedProperties: true
  });

  // remove properties that aren't to be serialzed:
  for (let option of Object.keys(viewOptions || {})) {
    if (metadata.viewOptions[option].serialize === false) {
      delete viewOptions[option];
    }
  }

  json.viewOptions = viewOptions;

  json.pairwiseLJProperties = pairwiseLJProperties;

  json.elements = unroll(elements, "mass", "sigma", "epsilon", "color");

  json.atoms = {
    x,
    y,
    vx,
    vy,
    charge,
    friction,
    radical,
    element,
    pinned,
    marked,
    visible,
    draggable,
    draggableWhenStopped,
    excitation
  };

  if (radialBonds.length > 0) {
    json.radialBonds = unroll(radialBonds, "atom1", "atom2", "length", "strength", "type");
  }

  if (angularBonds.length > 0) {
    json.angularBonds = unroll(angularBonds, "atom1", "atom2", "atom3", "angle", "strength");
  }

  if (restraints.length > 0) {
    json.restraints = unroll(restraints, "atomIndex", "k", "x0", "y0");
  }

  if (obstacles.length > 0) {
    json.obstacles = unroll(obstacles, "x", "y", "vx", "vy", "externalAx", "externalAy", "displayExternalAcceleration", "friction",
      "height", "width", "mass", "westProbe", "northProbe", "eastProbe", "southProbe", "color", "visible");
  }

  if (shapes.length > 0) {
    json.shapes = unroll(shapes, "type", "x", "y", "height", "width", "fence",
      "color", "lineColor", "lineWeight", "lineDashes",
      "layer", "layerPosition", "visible");
  }

  if (electricFields.length > 0) {
    json.electricFields = unroll(electricFields, "intensity", "orientation", "shapeIdx");
  }

  if (lines.length > 0) {
    json.lines = unroll(lines, "x1", "y1", "x2", "y2", "beginStyle", "endStyle", "fence", "lineColor", "lineWeight", "lineDashes",
      "layer", "layerPosition", "visible");
  }

  if (useQuantumDynamics) {
    json.quantumDynamics = quantumDynamics;
    json.useQuantumDynamics = true;
  }

  if (useChemicalReactions) {
    json.chemicalReactions = reaction;
    json.useChemicalReactions = true;
  }

  // Remove some properties from the final serialized model.
  const removeArrayIfDefault = function(name, array, defaultVal) {
    if (array.every(i => i === defaultVal)) {
      return delete json.atoms[name];
    }
  };

  // Arrays which has only default values.
  const removeDefaultArraysFor = function(...props) {
    for (prop of Array.from(props)) {
      removeArrayIfDefault(prop, json.atoms[prop], metadata.atom[prop].defaultValue);
    }
    return null;
  };

  removeDefaultArraysFor("marked", "visible", "draggable", "draggableWhenStopped");

  // Remove targetTemperature when heat-bath is disabled.
  if (!json.temperatureControl) {
    delete json.targetTemperature;
  }
  // Remove atomTraceId when atom tracing is disabled.
  if (!json.viewOptions.showAtomTrace) {
    delete json.viewOptions.atomTraceId;
  }
  // Remove excitation if not using quantum dynamics
  if (!useQuantumDynamics) {
    delete json.atoms.excitation;
  }
  // Remove radicals if not using chemical reactions
  if (!useChemicalReactions) {
    delete json.atoms.radical;
  }

  // Remove modelSampleRate as this is Next Gen MW specific option.
  delete json.modelSampleRate;

  // Remove minX, minYm, maxX, maxY, in MD2D these are derived from model width and height
  delete json.minX;
  delete json.minY;
  delete json.maxX;
  delete json.maxY;

  return {
    json
  };
};

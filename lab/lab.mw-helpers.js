(function() {

  window.MWHelpers = {};

  /*
    Parses an mml file and returns an object containing the stringified JSON
  
    @return
      json: jsonString of the model
      errors: array of errors encountered
  */

  MWHelpers.parseMML = function(mmlString) {
    /* perform any pre-processing on the string
    */
    var $mml, $node, $type, atom, atomNodes, atoms, charge, elemId, elemTypes, epsilon, getNode, height, id, json, jsonObj, mass, name, node, sigma, type, typesArr, viewPort, viewPortHeight, viewPortWidth, viewPortX, viewPortY, viewProps, vx, vy, width, x, y, _i, _j, _len, _len2, _ref, _ref2, _ref3, _ref4;
    mmlString = mmlString.replace(/class=".*"/g, function(match) {
      return match.replace(/[\.$]/g, "-");
    });
    /* parse the string into XML Document using jQuery and get a jQuery object
    */
    $mml = $($.parseXML(mmlString));
    getNode = function($entity) {
      if ($entity.attr("idref")) return $mml.find("#" + ($entity.attr("idref")));
      return $entity;
    };
    /*
        Find the container size
    */
    viewProps = $mml.find(".org-concord-mw2d-models-RectangularBoundary-Delegate");
    width = parseInt(viewProps.find(">[property=width]>double").text());
    height = parseInt(viewProps.find(">[property=height]>double").text());
    /*
        Find the view-port size
    */
    viewPort = viewProps.find(">[property=viewSize]>.java-awt-Dimension>int");
    if (viewPort) {
      viewPortWidth = parseInt(viewPort[0].textContent);
      viewPortHeight = parseInt(viewPort[1].textContent);
      viewPortX = parseInt(viewProps.find(">[property=x]>double").text() || 0);
      viewPortY = parseInt(viewProps.find(">[property=y]>double").text() || 0);
    } else {
      viewPortWidth = width;
      viewPortHeight = height;
      viewPortX = viewPortY = 0;
    }
    /*
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
    */
    typesArr = $mml.find(".org-concord-mw2d-models-Element");
    elemTypes = [];
    for (_i = 0, _len = typesArr.length; _i < _len; _i++) {
      type = typesArr[_i];
      $type = $(type);
      name = $type.attr('id');
      id = ((_ref = $type.find("[property=ID]>int")[0]) != null ? _ref.textContent : void 0) || 0;
      mass = (_ref2 = $type.find("[property=mass]>double")[0]) != null ? _ref2.textContent : void 0;
      sigma = (_ref3 = $type.find("[property=sigma]>double")[0]) != null ? _ref3.textContent : void 0;
      epsilon = (_ref4 = $type.find("[property=epsilon]>double")[0]) != null ? _ref4.textContent : void 0;
      elemTypes[id] = {
        name: id,
        mass: mass,
        sigma: sigma,
        epsilon: epsilon
      };
    }
    /*
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
    */
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
    atoms = [];
    atomNodes = $mml.find(".org-concord-mw2d-models-Atom");
    for (_j = 0, _len2 = atomNodes.length; _j < _len2; _j++) {
      node = atomNodes[_j];
      $node = getNode($(node));
      elemId = parseInt($node.find("[property=ID]>int").text() || 0);
      x = parseFloat($node.find("[property=rx]").text());
      y = parseFloat($node.find("[property=ry]").text());
      vx = parseFloat($node.find("[property=vx]").text() || 0);
      vy = parseFloat($node.find("[property=vy]").text() || 0);
      y = viewPortHeight - y;
      vy = -vy;
      x = x - viewPortX;
      y = y - viewPortY;
      x = x / 100;
      y = y / 100;
      vx = vx / 100;
      vy = vy / 100;
      atoms.push({
        elemId: elemId,
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        charge: 0
      });
    }
    width = width / 100;
    height = height / 100;
    /* Put everything together into Lab's JSON format
    */
    x = (function() {
      var _k, _len3, _results;
      _results = [];
      for (_k = 0, _len3 = atoms.length; _k < _len3; _k++) {
        atom = atoms[_k];
        _results.push(atom.x);
      }
      return _results;
    })();
    y = (function() {
      var _k, _len3, _results;
      _results = [];
      for (_k = 0, _len3 = atoms.length; _k < _len3; _k++) {
        atom = atoms[_k];
        _results.push(atom.y);
      }
      return _results;
    })();
    vx = (function() {
      var _k, _len3, _results;
      _results = [];
      for (_k = 0, _len3 = atoms.length; _k < _len3; _k++) {
        atom = atoms[_k];
        _results.push(atom.vx);
      }
      return _results;
    })();
    vy = (function() {
      var _k, _len3, _results;
      _results = [];
      for (_k = 0, _len3 = atoms.length; _k < _len3; _k++) {
        atom = atoms[_k];
        _results.push(atom.vy);
      }
      return _results;
    })();
    charge = (function() {
      var _k, _len3, _results;
      _results = [];
      for (_k = 0, _len3 = atoms.length; _k < _len3; _k++) {
        atom = atoms[_k];
        _results.push(atom.charge);
      }
      return _results;
    })();
    id = atoms[0].elemId || 0;
    epsilon = elemTypes[id].epsilon;
    sigma = elemTypes[id].sigma / 100;
    epsilon = -epsilon;
    jsonObj = {
      temperature_control: false,
      epsilon: epsilon,
      sigma: sigma,
      lennard_jones_forces: true,
      coulomb_forces: false,
      width: width,
      height: height,
      atoms: {
        X: x,
        Y: y,
        VX: vx,
        VY: vy,
        CHARGE: charge
      }
    };
    json = JSON.stringify(jsonObj, null, 2);
    return {
      json: json
    };
  };

}).call(this);

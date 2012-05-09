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
    var $mml, $node, $pair, $type, atom, atomNodes, atoms, charge, elem1, elem2, elemId, elemTypes, epsilon, epsilonPairs, getNode, height, id, json, jsonObj, labHeight, labWidth, mass, name, node, pair, rx, ry, sigma, type, typesArr, value, vx, vy, width, x, y, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3, _ref4;
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
      elemTypes[id] = {
        name: id,
        mass: mass,
        sigma: sigma,
        epsilon: []
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
    epsilonPairs = $mml.find(".org-concord-mw2d-models-Affinity [property=epsilon]>[method=put]");
    for (_j = 0, _len2 = epsilonPairs.length; _j < _len2; _j++) {
      pair = epsilonPairs[_j];
      $pair = getNode($(pair));
      elem1 = parseInt(getNode($pair.find("[property=element1]>object")).find("[property=ID]>int").text() || 0);
      elem2 = parseInt(getNode($pair.find("[property=element2]>object")).find("[property=ID]>int").text() || 0);
      value = $pair.find(">double").text();
      elemTypes[elem1].epsilon[elem2] = value;
      elemTypes[elem2].epsilon[elem1] = value;
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
    atoms = [];
    atomNodes = $mml.find(".org-concord-mw2d-models-Atom");
    for (_k = 0, _len3 = atomNodes.length; _k < _len3; _k++) {
      node = atomNodes[_k];
      $node = getNode($(node));
      elemId = parseInt(((_ref4 = $node.find("[property=ID]")[0]) != null ? _ref4.textContent : void 0) || 0);
      x = parseFloat($node.find("[property=rx]").text());
      y = parseFloat($node.find("[property=ry]").text());
      vx = parseFloat($node.find("[property=vx]").text() || 0);
      vy = parseFloat($node.find("[property=vy]").text() || 0);
      atoms.push({
        element: elemId,
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        charge: 0
      });
    }
    /*
        Find the container size
    */
    width = parseInt($mml.find(".org-concord-mw2d-models-RectangularBoundary-Delegate>[property=width]").find(">double").text());
    height = parseInt($mml.find(".org-concord-mw2d-models-RectangularBoundary-Delegate>[property=height]").find(">double").text());
    /* Put everything together into Lab's JSON format
    */
    x = (function() {
      var _l, _len4, _results;
      _results = [];
      for (_l = 0, _len4 = atoms.length; _l < _len4; _l++) {
        atom = atoms[_l];
        _results.push(atom.x);
      }
      return _results;
    })();
    y = (function() {
      var _l, _len4, _results;
      _results = [];
      for (_l = 0, _len4 = atoms.length; _l < _len4; _l++) {
        atom = atoms[_l];
        _results.push(atom.y);
      }
      return _results;
    })();
    vx = (function() {
      var _l, _len4, _results;
      _results = [];
      for (_l = 0, _len4 = atoms.length; _l < _len4; _l++) {
        atom = atoms[_l];
        _results.push(atom.vx);
      }
      return _results;
    })();
    vy = (function() {
      var _l, _len4, _results;
      _results = [];
      for (_l = 0, _len4 = atoms.length; _l < _len4; _l++) {
        atom = atoms[_l];
        _results.push(atom.vy);
      }
      return _results;
    })();
    charge = (function() {
      var _l, _len4, _results;
      _results = [];
      for (_l = 0, _len4 = atoms.length; _l < _len4; _l++) {
        atom = atoms[_l];
        _results.push(atom.charge);
      }
      return _results;
    })();
    labWidth = 10;
    labHeight = 10;
    x = (function() {
      var _l, _len4, _results;
      _results = [];
      for (_l = 0, _len4 = x.length; _l < _len4; _l++) {
        rx = x[_l];
        _results.push(rx * (labWidth / width));
      }
      return _results;
    })();
    y = (function() {
      var _l, _len4, _results;
      _results = [];
      for (_l = 0, _len4 = y.length; _l < _len4; _l++) {
        ry = y[_l];
        _results.push(labHeight - (ry * (labHeight / height)));
      }
      return _results;
    })();
    epsilon = elemTypes[0].epsilon[1];
    epsilon = -epsilon;
    jsonObj = {
      temperature_control: false,
      epsilon: epsilon,
      lennard_jones_forces: true,
      coulomb_forces: false,
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

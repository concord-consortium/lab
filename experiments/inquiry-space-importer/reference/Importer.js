// ==========================================================================
// Project:   Importer
// Copyright: ©2011 KCP Technologies, Inc.
// ==========================================================================

/**
 * @fileoverview Defines Importer component to be embedded in DG to import tab-delimited text.
 * @author bfinzer@kcptech.com (William Finzer)
 * @preserve (c) 2011 KCP Technologies, Inc.
 */

var Importer = {

  controller: window.parent.DG.currGameController,

  initImporterAsGame: function() {
    this.controller.doCommand( {
      action: 'initGame',
      args: {
        name: "Importer",
        dimensions: { width: 750, height: 450 },
      }
    });
  },

  createCollection: function( iName, iAttrsArray, iChildKey) {
    this.controller.doCommand( {
      action: 'createCollection',
      args: {
        name: iName,
        attrs: iAttrsArray,
        childAttrName: iChildKey
      }
    });
  },

  openCase: function( iCollectionName, iValuesArray) {
    return this.controller.doCommand( {
      action: 'openCase',
      args: {
              collection: iCollectionName,
              values: iValuesArray
            }
    });
  },

  createCase: function( iCollectionName, iValuesArray, iParentID) {
    this.controller.doCommand( {
      action: 'createCase',
      args: {
        collection: iCollectionName,
        values: iValuesArray,
        parent: iParentID
      }
    });
  },

  closeCase: function( iCollectionName, iValuesArray, iCaseID) {
    this.controller.doCommand( {
      action: 'closeCase',
      args: {
              collection: iCollectionName,
              values: iValuesArray,
              caseID: iCaseID
            }
    });
  },

  doImport: function() {
    var this_ = this,
        tText = document.getElementById("textToImport").value.trim();

    function updateReport( iReport) {
      var tDiv = document.getElementById('report');
      while( tDiv.childNodes.length)
        tDiv.removeChild( tDiv.childNodes[ 0]);

      tDiv.appendChild( document.createTextNode( iReport));
    }

    function importAsJSON( iObject) {
      var tParentName = iObject.collection_name,
          tParentAttrsArray = [],
          tChildAttrsArray = [],
          tChildKey = '',
          tChildName = '',
          tFirstParentCase = iObject.cases[ 0],
          tNumParents = 0,
          tNumChildren = 0;

      // Run through the properties of the first case gathering attribute names and the key to the child collection
      this_.forEachProperty( tFirstParentCase, function( iKey, iValue) {
        if( typeof iValue === 'object') {
          tChildKey = iKey;
          tChildName = iValue.collection_name;
          // Pull out the names of the child collection's attributes
          for( var tKey in iValue.cases[0]) {
            tChildAttrsArray.push( { name: tKey });
          }
        }
        else
          tParentAttrsArray.push( { name: iKey });
      });

      this_.createCollection( tParentName, tParentAttrsArray, tChildKey);

      this_.createCollection( tChildName, tChildAttrsArray);

      iObject.cases.forEach( function( iCase) {
        var tOpenCaseResult,
            tValues = [];
        // Extract the values for the parent case, except for the array of child cases
        this_.forEachProperty( iCase, function( iKey, iValue) {
          if( iKey !== tChildKey)
            tValues.push( iValue);
        });
        // Open the parent case
        tOpenCaseResult = this_.openCase( tParentName, tValues);
        if( !tOpenCaseResult.success) {
          document.window.alert( "Importer: Error calling 'openCase'");
          return;
        }
        // Create each of the child cases
        iCase[ tChildKey].cases.forEach( function( iChildCase) {
          this_.createCase( tChildName, this_.values( iChildCase), tOpenCaseResult.caseID);
          tNumChildren++;
        });
        // Close the parent case
        this_.closeCase( tParentName, tValues, tOpenCaseResult.caseID);
        tNumParents++;
      });

      updateReport( tNumParents + ' parent cases and ' + tNumChildren + ' child cases');

    } // importAsJSON

    function importAsSimpleText( iText) {
      var tRows = iText.split("\n"),
          tCollectionName = tRows.shift(),
          tAttrNamesRow = tRows.shift(),
          tSep = (tAttrNamesRow.indexOf( ",") === -1) ? "\t" : ",",
          tAttributeNames,
          tAttrsArray,
          tNumCases = 0;

      tAttributeNames = tAttrNamesRow.split( tSep)
      tAttrsArray = tAttributeNames.map( function( iName) {
        var tAttrObject = {};
        tAttrObject.name = iName;
        return tAttrObject;
      });

      // parent collection kludge
      this_.createCollection( 'Import', [{ name: 'cases' }], 'import');

      this_.createCollection( tCollectionName, tAttrsArray);

      var tOpenCaseResult = this_.openCase( 'Import', [ "pseudo-case" ]);

      if( !tOpenCaseResult.success) {
        console.log("Importer: Error calling 'openCase'"); // alert the user? Bail?
        return;
      }

      tRows.forEach( function( iRow) {
        if( iRow !== "") {
          this_.createCase( tCollectionName, iRow.split(tSep), tOpenCaseResult.caseID);
          tNumCases++;
        }
      });

      this_.closeCase( 'Import', [ "pseudo-case" ], tOpenCaseResult.caseID);

      updateReport( tNumCases + ' cases');
    }   // importAsSimpleText

    // Begin doImport
    this.initImporterAsGame();

    try {
      tJSONObject = JSON.parse( tText);
    }
    catch( e) {
      tJSONObject = null;
    }

    if( tJSONObject)
      importAsJSON( tJSONObject);
    else
      importAsSimpleText( tText);

  },

  /**
    Applies the specified function to each property of the specified object.
    The order in which the properties are visited is not specified by the standard.

    @param {Object} iObject   The object whose properties should be iterated
   */
  forEachProperty: function( iObject, iFunction) {
    if( !iObject) return;
    for( var tKey in iObject) {
      if( iObject.hasOwnProperty( tKey))
        iFunction( tKey, iObject[ tKey]);
    }
  },

  /**
    Returns an array of values representing the property values of the object.
    The order of the returned elements is not specified by the standard.
    Returns an empty array for undefined or null objects.

    @param {Object} iObject   The object whose properties names should be returned
    @returns {Array of values}  Array of property values
   */
  values: function( iObject) {
    var tValues = [];
    this.forEachProperty( iObject, function( iKey, iValue) { tValues.push( iValue); } );
    return tValues;
  },

};

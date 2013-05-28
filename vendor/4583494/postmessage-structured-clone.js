/*
 * Copyright (c) 2013 Ryan Seddon
 * Licensed under the MIT license.
 */

var support = 0,
		_bTestResults,
		result = document.getElementById("support");
	
	// Beacon the results to Browserscope.
	var beaconResults = function() {
	  var resultdata = (support ? "<span style='color:#090; font-weight: bold; font-size: 1.2em;'>DOES</span>" : "<span style='color:#C00; font-weight: bold; font-size: 1.2em;'>DOES NOT</span>" );

	  result.innerHTML = "Your browser " + resultdata + " support structured clones";

	  var testKey = 'agt1YS1wcm9maWxlcnINCxIEVGVzdBiPp8ALDA';
	  var newScript = document.createElement('script'),
	      firstScript = document.getElementsByTagName('script')[0];
	  newScript.src = 'http://www.browserscope.org/user/beacon/' + testKey;
	  firstScript.parentNode.insertBefore(newScript, firstScript);
	};

	if(!!window.postMessage) {
		try {
		    // Safari 5.1 will sometimes throw an exception and sometimes won't, lolwut?
	        // When it doesn't we capture the message event and check the
	        // internal [[Class]] property of the message being passed through.
	        // Safari will pass through DOM nodes as Null, gotcha.
	        window.onmessage = function(e){
	            support = Object.prototype.toString.call(e.data).indexOf("Null") != -1 ? 1 : 0;
	            _bTestResults = {
					'structured_clones': support
				};
	            beaconResults();
	        }
		    // Spec states you can't transmit DOM nodes and it will throw an error
		    // postMessage implimentations that support cloned data will throw.
		    window.postMessage(document.createElement("a"),"*");
		} catch(e) {
		    support = e.DATA_CLONE_ERR ? 1 : 0;
		    _bTestResults = {
				'structured_clones': support
			};
			beaconResults();
		}
	}
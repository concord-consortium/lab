    var applet;

    function getApplet(id) {
	applet = document.getElementById(id);
    }

    function jsReset(id) {
	getApplet(id);
	applet.reset();
    }

    function jsReload(id) {
	getApplet(id);
	applet.reload();
    }

    function run(id) {
	getApplet(id);
	applet.run();
    }  

    function stop(id) {
	getApplet(id);
	applet.stop();
    }  

    function runScript(id, script) {
        getApplet(id);
        applet.runNativeScript(script);
    }

 
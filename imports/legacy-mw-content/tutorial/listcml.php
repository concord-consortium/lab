<?php 
   // create a handler for the directory
    $handler = opendir('/var/tomcat/mw_tomcat/webapps/modeler1.3/tutorial');

    // keep going until all files in directory have been read
    while ($file = readdir($handler)) {

        // if $file isn't this directory or its parent, 
        // add it to the results array
        if ( strstr($file,'cml') )
         { echo "Match: ".$file;}
    }

    // tidy up: close the handler
    closedir($handler);

?>

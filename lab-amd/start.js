(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }


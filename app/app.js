var app_gui = require("nw.gui");
var app_window;

$(function() {
  app_window = app_gui.Window.get();

  $('#app-menu-new-file').click(function(event) {
    console.log($(this).attr('id') + " is clicked");
  });
  $('#app-menu-open-file').click(function(event) {
    console.log($(this).attr('id') + " is clicked");
  });
  $('#app-menu-save').click(function(event) {
    console.log($(this).attr('id') + " is clicked");
  });

  app_window.show();

  // for debugging
  app_window.showDevTools();
});
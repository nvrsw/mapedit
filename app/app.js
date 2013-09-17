var app_gui = require('nw.gui');
var app_fs = require('fs');

var app_window;
var app = {
  setting: null
};

app.loadSetting = function() {
  app_fs.readFile('test/maps.json', function(err, data) {
    var setting = eval("(" + data + ")");
    if (!setting.maps || setting.maps.length <= 0) {
      console.log('there is no maps in test/maps.json');
      return;
    }
    // load setting
  });
};

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

  app.loadSetting();

  app_window.showDevTools();
  app_window.show();
});
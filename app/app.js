var app_gui = require('nw.gui');
var app_fs = require('fs');
var app_window;
var app = {};

app.Diagram = function(diagram_id, setting) {
  var diagram = this;
  var canvas = null;

  setting.callbacks.add(function(data) {
    switch(data.name)
      {
      case 'setting.init':
        var width;
        var height;

        width = setting.config.maps[setting.map_idx].width;
        height = setting.config.maps[setting.map_idx].height;

        if (canvas)
          canvas.clear();

        $('#' + diagram_id).empty();
        $('#' + diagram_id).append("<canvas id='app-canvas'></canvas>");
        $('#app-canvas').attr('width', width);
        $('#app-canvas').attr('height', height);

        canvas = new fabric.Canvas('app-canvas', {
            selection: false,
            perPixelTargetFind: true
          });

        console.log('diagram inited');
        break;
      }
  });
};

app.Sidebar = function(sidebar_id, setting) {
  var sidebar = this;

  setting.callbacks.add(function(data) {
    switch(data.name)
      {
      case 'setting.init':
        console.log('sidebar inited');
        break;
      }
  });
};

app.Setting = function(config) {
  var that = this;

  this.config = null;
  this.map_idx = 0;
  this.callbacks = $.Callbacks();

  this.init = function(config) {
    that.config = config;
    this.callbacks.fire({ name: 'setting.init' });
  };

  this.add = function() {
  };
  this.remove = function() {
  };
  this.save = function() {
  };
};

function loadSetting(filename, setting) {
  app_fs.readFile(filename, function(err, data) {
    var config = eval("(" + data + ")");

    if (!config.maps || config.maps.length <= 0) {
      console.log('there is no maps in' + filename);
      return;
    }

    setting.init(config);
  });
};

$(function() {
  var setting;
  var diagram;
  var sidebar;

  setting = new app.Setting();
  diagram = new app.Diagram('app-diagram', setting);
  sidebar = new app.Sidebar('app-sidebar', setting);

  app_window = app_gui.Window.get();

  $('#app-menu-new-file').click(function(event) {
    console.log($(this).attr('id') + " is clicked");
  });
  $('#app-menu-open-file').click(function(event) {
    console.log($(this).attr('id') + " is clicked");
    loadSetting('test/maps.json', setting);
  });
  $('#app-menu-save').click(function(event) {
    console.log($(this).attr('id') + " is clicked");
  });

  app_window.showDevTools();
  app_window.show();
});
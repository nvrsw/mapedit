var app_gui = require('nw.gui');
var app_fs = require('fs');
var app_window;
var app = {};

app.Diagram = function(diagram_id, setting) {
  var diagram = this;
  var canvas = null;

  function findCenter(x1, y1, x2, y2) {
    return {x: (x1 + x2) / 2, y: (y1 + y2) / 2};
  }

  function addItem(item) {
    var obj = null;
    var center = findCenter(item.x1, item.y1, item.x2, item.y2);

    switch (item.type)
      {
      case 0: // DAI_BOX
        obj = new fabric.Rect({
          left: center.x,
          top: center.y,
          width: item.x2 - item.x1,
          height: item.y2 - item.y1,
          fill: 'rgb(255,255,255)',
          stroke: 'rgb(0,0,0)',
          strokeWidth: 1
        });
        break;
      case 1: // DAI_CIRCLE
        obj = new fabric.Circle({
          left: center.x,
          top: center.y,
          radius: (item.x2 - item.x1) / 2,
          fill: 'rgb(255,255,255)',
          stroke: 'rgb(0,0,0)',
          strokeWidth: 1
        });
        break;
      }

    if (!obj)
      return;

    obj.set('hasRotatingPoint', false);
    obj.set('hasControls', true);
    obj.set('hasBorders', false);
    obj.set('lockRotation', true);

    canvas.add(obj);
  }

  function load() {
    if (!canvas)
      return;

    var items = setting.config.maps[setting.map_idx].items;
    for (var i = 0; i < items.length; i++)
      addItem(items[i]);

    canvas.renderAll();
  }

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
        $('#' + diagram_id).attr('width', width);
        $('#' + diagram_id).attr('height', height);
        $('#app-canvas').attr('width', width);
        $('#app-canvas').attr('height', height);

        canvas = new fabric.Canvas('app-canvas', {
            selection: false,
            perPixelTargetFind: true
          });
        break;
      case 'setting.load':
        load();
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
  this.load = function() {
    this.callbacks.fire({ name: 'setting.load' });
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
    setting.load(config);
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
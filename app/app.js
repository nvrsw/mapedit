var app_gui = require('nw.gui');
var app_fs = require('fs');
var app_window;
var app = {};

app.Diagram = function(diagram_id, setting) {
  var diagram = this;
  var canvas = null;
  var scale = 1.0;

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

    var t = new Date();

    var items = setting.config.maps[setting.map_idx].items;
    for (var i = 0; i < items.length; i++)
      addItem(items[i]);
 
    canvas.renderAll();

    console.log ("load time : " + (new Date() - t) / 1000 + " seconds");
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
        $('#app-canvas').attr('width', width);
        $('#app-canvas').attr('height', height);

        canvas = new fabric.Canvas('app-canvas', {
          selection: false,
          perPixelTargetFind: true,
          c_scaleValue: 1.0,
          c_scale: function(value) {
            var self = this;
            var restoreIt = function(prop) {
              return parseFloat(prop, 10) * value;
            };
            var scaleIt = function(prop) {
              return parseFloat(prop, 10) / self.c_scaleValue;
            };

            self.setHeight(self.getHeight() / self.c_scaleValue);
            self.setWidth(self.getWidth() / self.c_scaleValue);
            self.forEachObject(function(obj) {
              var currentObjTop = obj.get('top'),
                  currentObjLeft = obj.get('left'),
                  currentObjScaleX = obj.get('scaleX'),
                  currentObjScaleY = obj.get('scaleY'),
                  scaledObjTop = restoreIt(currentObjTop),
                  scaledObjLeft = restoreIt(currentObjLeft),
                  scaledObjScaleX = restoreIt(currentObjScaleX),
                  scaledObjScaleY = restoreIt(currentObjScaleY);

              obj.set({
                top: scaledObjTop,
                left: scaledObjLeft,
                scaleX: scaledObjScaleX,
                scaleY: scaledObjScaleY
              });
              obj.setCoords();
            });

            self.setHeight(self.getHeight() * value);
            self.setWidth(self.getWidth() * value);
            self.forEachObject(function(obj) {
              var currentObjTop = obj.get('top'),
                  currentObjLeft = obj.get('left'),
                  currentObjScaleX = obj.get('scaleX'),
                  currentObjScaleY = obj.get('scaleY'),
                  scaledObjTop = scaleIt(currentObjTop),
                  scaledObjLeft = scaleIt(currentObjLeft),
                  scaledObjScaleX = scaleIt(currentObjScaleX),
                  scaledObjScaleY = scaleIt(currentObjScaleY);

              obj.set({
                top: scaledObjTop,
                left: scaledObjLeft,
                scaleX: scaledObjScaleX,
                scaleY: scaledObjScaleY
              });
              obj.setCoords();
            });

            self.c_scaleValue = value;
            self.renderAll();
          }
        });

        canvas.findTarget = (function(originalFn) {
          return function() {
            var target = originalFn.apply(this, arguments);
            if (target) {
              if (this._hoveredTarget !== target) {
                canvas.fire('object:over', { target: target });
                if (this._hoveredTarget) {
                  canvas.fire('object:out', { target: this._hoveredTarget });
                }
                this._hoveredTarget = target;
              }
            } else {
              if (this._hoveredTarget) {
                canvas.fire('object:out', { target: this._hoveredTarget });
                this._hoveredTarget = null;
              }
            }

            return target;
          };
        })(canvas.findTarget);

        break;
      case 'setting.load':
        load();
        break;
      case 'setting.zoom':
        var new_scale = parseFloat (data.value, 10);
        if (scale != new_scale)
          {
            console.log ('change scale from '+ scale + ' to ' + new_scale);
            canvas.c_scale(new_scale);
            scale = new_scale;
          }
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
  this.zoom = function(scale) {
    this.callbacks.fire({ name: 'setting.zoom', value: scale })
  };
};

function loadSetting(filename, setting) {
  var loadingObj = $('#app-loading-overlay');

  loadingObj.show();

  app_fs.readFile(filename, function(err, data) {
    var config = eval("(" + data + ")");

    if (!config.maps || config.maps.length <= 0) {
      console.log('there is no maps in' + filename);
      loadingObj.hide();
      return;
    }

    setting.init(config);
    setting.load(config);

    loadingObj.hide();
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

  $('#app-view-200').click(function(event) {
    setting.zoom("2.0");
  });

  $('#app-view-100').click(function(event) {
    setting.zoom("1.0");
  });

  $('#app-view-75').click(function(event) {
    setting.zoom("0.75");
  });

  $('#app-view-50').click(function(event) {
    setting.zoom("0.5");
  });

  var diff_w = $(window).width() - $('#app-diagram').width();
  var diff_h = $(window).height() - $('#app-diagram').height();

  /* change position of scrollbar according to window size */
  function resize_real() {
    var width = $(window).width() - diff_w;
    var height = $(window).height() - diff_h;

    $('#app-diagram').css('width', width + 'px');
    $('#app-diagram').css('height', height + 'px');
  }

  $(window).resize(function() {
    clearTimeout(this.rtid);
    this.rtid = setTimeout(resize_real, 100);
  });

  app_window.showDevTools();
  app_window.show();
});
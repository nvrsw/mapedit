var app_gui = require('nw.gui');
var app_fs = require('fs');
var app_window;
var app = {};

app.Diagram = function(diagram_id, setting) {
  var diagram = this;
  var canvas = null;
  var currentObject = null;
  var previousObject = null;

  diagram.width = 800;
  diagram.height = 600;

  function findCenter(x1, y1, x2, y2) {
    return {x: (x1 + x2) / 2, y: (y1 + y2) / 2};
  }

  diagram.reflectSizeChaged = function() {
    if (canvas)
      canvas.calcOffset();
  };

  function init() {
    diagram.width = setting.config.maps[setting.map_idx].width;
    diagram.height = setting.config.maps[setting.map_idx].height;

    if (canvas)
      canvas.clear();

    $('#' + diagram_id).scrollTop(0).scrollLeft(0);
    $('#' + diagram_id).empty();
    $('#' + diagram_id).append("<canvas id='app-canvas'></canvas>");
    $('#app-canvas').attr('width', diagram.width);
    $('#app-canvas').attr('height', diagram.height);

    /* initialize varialbes */
    currentObject = null;
    previousObject = null;

    /* initialize canvas */
    canvas = new fabric.Canvas('app-canvas', {
      selection: false,
      perPixelTargetFind: true,
      c_scaleValue: 1.0,
      c_scale: function(value) {
        var self = this;
        var restoreIt = function(prop) {
          return parseFloat(prop, 10) / self.c_scaleValue;
        };
        var scaleIt = function(prop) {
          return parseFloat(prop, 10) * value;
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

    canvas.c_getObjectById = function(c_id) {
      var f = null;
      var objects = this.getObjects();
      var i = objects.length;
      while (i--) {
        var obj = objects[i];
        if (obj.c_id && obj.c_id == c_id) {
          f = obj;
          break;
        }
      }

      return f;
    };

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

    canvas.on('object:over', function(e) {
      var obj = e.target;

      obj.setFill('red');
      canvas.renderAll();
    });

    canvas.on('object:out', function(e) {
      var obj = e.target;

      obj.setFill('white');
      canvas.renderAll();
    });

    canvas.on('mouse:down', function(e) {
      if (e.target)
        return;

      setting.select(null);
    });

    canvas.on('object:selected', function(e) {
      var obj = e.target;

      if (!obj)
        return;

      if (obj.c_id) {
        setting.select(obj.c_id);
        return;
      }
    });

    canvas.on('object:moving', function(e) {
      var obj = e.target;

      if (!obj)
        return;

      if (obj.c_dragBoundFunc)
        obj.c_dragBoundFunc();
    });

    canvas.on('object:modified', function(e) {
      var obj = e.target;

      if (!obj)
        return;

      if (obj.c_id)
        {
          var hw = obj.getWidth() / 2;
          var hh = obj.getHeight() / 2;
          var points = [];

          points.push(Math.round((obj.left - hw) / canvas.c_scaleValue / 2));
          points.push(Math.round((obj.top - hh) / canvas.c_scaleValue / 2));
          points.push(Math.round((obj.left + hw) / canvas.c_scaleValue / 2));
          points.push(Math.round((obj.top + hh) / canvas.c_scaleValue / 2));

          setting.modify(obj.c_id, 'points', points.join(','));
        }
    });
  }

  function addItem(c_id, item) {
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
        obj.c_type = item.type;
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
        obj.c_type = item.type;
        break;
      }

    if (!obj)
      return;

    obj.c_id = c_id;

    obj.set('hasRotatingPoint', false);
    obj.set('hasControls', true);
    obj.set('hasBorders', false);
    obj.set('lockRotation', true);

    obj.c_dragBoundFunc = function() {
      var w = diagram.width;
      var h = diagram.height;

      var xoff = this.getWidth() / 2;
      var yoff = this.getHeight() / 2;

      var tl = {
        x: this.left - xoff,
        y: this.top - yoff
      };

      var tr = {
        x: this.left + xoff,
        y: this.top - yoff
      };

      var bl = {
        x: this.left - xoff,
        y: this.top + yoff
      };

      if (tl.x < 0) {
        var diff = 0 - tl.x;
        this.left += diff;
      } else if (tr.x > w) {
        var diff = tr.x - w;
        this.left -= diff;
      }

      if (tl.y < 0) {
        var diff = 0 - tl.y;
        this.top += diff;
      } else if (bl.y > h) {
        var diff = bl.y - h;
        this.top -= diff;
      }
    };

    canvas.add(obj);
  }

  function addBackgroundImage(c_id, path) {
    fabric.util.loadImage(path, function(data) {
      var obj = new fabric.Image(data, {
        left: diagram.width / 2,
        top: diagram.height / 2
      });

      canvas.c_id = c_id;

      obj.set('hasRotatingPoint', false);
      obj.set('hasControls', false);
      obj.set('lockUniScaling', true);
      obj.set('hasBorders', false);
      obj.set('lockScalingX', true);
      obj.set('lockScalingY', true);
      obj.set('lockMovementX', true);
      obj.set('lockMovementY', true);
      obj.set('lockRotation', true);
      obj.set('disableHover', true);
      obj.set('selectable', false);

      canvas.add(obj);
      canvas.sendToBack(obj);
    });
  }

  function selectItem(c_id) {
    var obj = null;

    if (c_id)
      obj = canvas.c_getObjectById(c_id);

    if (!obj)
      obj = null;

    if (obj == currentObject)
      return;

    previousObject = currentObject;
    currentObject = obj;
    if (currentObject)
      canvas.bringToFront(currentObject);

    canvas.renderAll();
  }

  setting.callbacks.add(function(data) {
    switch(data.cmd)
      {
      case 'setting.init':
        init();
        break;
      case 'setting.zoom':
        if (canvas)
          {
            var value = parseFloat (data.value, 10);
            if (canvas.c_scaleValue != value)
              canvas.c_scale(value);
          }
        break;
      case 'item.addBackground':
        if (canvas)
          addBackgroundImage(data.id, data.path);
        break;
      case 'item.add':
        if (canvas)
          addItem(data.id, data.item);
        break;
      case 'item.selected':
        if (canvas)
          selectItem(data.value);
        break;
      case 'item.draw':
        if (canvas)
          canvas.renderAll();
        break;
      }
  });
};

app.Sidebar = function(sidebar_id, setting) {
  var sidebar = this;

  setting.callbacks.add(function(data) {
    switch(data.cmd)
      {
      case 'setting.init':
        console.log('sidebar inited');
        break;
      }
  });
};

app.Setting = function() {
  var setting = this;

  this.basedir = "test/";
  this.config = null;
  this.map_idx = 0;
  this.callbacks = $.Callbacks();
  this.selectId ='';

  this.init = function(config) {
    this.config = config;

    for (var m = 0; m < config.maps.length; m++)
      {
        for (var i = 0; i < config.maps[m].items.length; i++)
          config.maps[m].items[i].alive = true;
      }

    this.callbacks.fire({ cmd: 'setting.init' });
  };
  this.load = function() {
    var t = new Date();

    if (setting.config.maps[setting.map_idx].background_images)
      {
        var files = setting.config.maps[setting.map_idx].background_images;
        for (var i = 0; i < files.length; i++)
          this.callbacks.fire({
            cmd  : 'item.addBackground',
            id   : "map-" + setting.map_idx + "-bg-" + i,
            path : setting.basedir + files[i]
          });
      }

    var items = setting.config.maps[setting.map_idx].items;
    for (var i = 0; i < items.length; i++)
      {
        if (items[i].alive)
          {
            var c_id = "map-" + setting.map_idx + "-item-" + i;

            this.callbacks.fire({
              cmd  : 'item.add',
              id   : "map-" + setting.map_idx + "-item-" + i,
              item : items[i]
            });
          }
      }

    this.callbacks.fire({ cmd: 'item.draw' });

    console.log ("load time : " + (new Date() - t) / 1000 + " seconds");
  };
  this.save = function() {
  };
  this.zoom = function(scale) {
    this.callbacks.fire({ cmd: 'setting.zoom', value: scale })
  };
  this.select = function(c_id) {
    if (this.selectId == c_id)
      return;

    this.selectId = c_id;
    this.callbacks.fire({ cmd: 'item.selected', value: c_id});
  };
  this.modify = function(c_id, key, value) {
    var k = c_id.split('-');
    var item;

    item = setting.config.maps[k[1]].items[k[3]];
    switch (key) {
      case 'points':
        var points = value.split(',');

        item.x1 = points[0];
        item.y1 = points[1];
        item.x2 = points[2];
        item.y2 = points[3];
        break;
    }

    console.log(c_id + '[' + key + '] : ' + value);
  };
  this.remove = function() {
  };
};

function loadMap(filename, setting) {
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
    setting.load();

    loadingObj.hide();
  });
};

$(function() {
  var setting;
  var diagram;
  var sidebar;

  app_window = app_gui.Window.get();

  setting = new app.Setting();
  diagram = new app.Diagram('app-diagram', setting);
  sidebar = new app.Sidebar('app-sidebar', setting);

  $('#app-menu-new-file').click(function(event) {
    console.log($(this).attr('id') + " is clicked");
  });
  $('#app-menu-open-file').click(function(event) {
    console.log($(this).attr('id') + " is clicked");
    loadMap('test/maps.json', setting);
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

  // window width(1280)/height(720) of package.json
  var diff_w = 1280 - $('#app-diagram').width();
  var diff_h = 720 - $('#app-diagram').height();

  // change position of scrollbar according to window size
  function resize_real() {
    var width = $(window).width() - diff_w;
    var height = $(window).height() - diff_h;

    $('#app-diagram').scrollTop(0).scrollLeft(0);
    $('#app-diagram').css('width', width + 'px');
    $('#app-diagram').css('height', height + 'px');
    diagram.reflectSizeChaged();
  }

  $(window).resize(function() {
    clearTimeout(this.rtid);
    this.rtid = setTimeout(resize_real, 100);
  });

  app_window.showDevTools();
  app_window.show();
});
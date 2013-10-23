var app_gui = require('nw.gui');
var app_fs = require('fs');
var app_window;
var app = {};

app.Diagram = function(diagram_id, setting) {
  var diagram = this;
  var rootContainer = $('#' + diagram_id);
  var diaList = [];
  var curDiaId = '';

  function lookupDia(dia_id) {
    var dia = null;

    for (var i = 0; i < diaList.length; i++)
      {
        var d = diaList[i];

        if (d.c_id && d.c_id == dia_id)
          {
            dia = d;
            break;
          }
      }

    return dia;
  };

  function diaForeach(callback) {
    for (var i = 0; i < diaList.length; i++)
      callback(diaList[i]);
  }

  function findCenter(x1, y1, x2, y2) {
    return {x: (x1 + x2) / 2, y: (y1 + y2) / 2};
  }

  diagram.reflectSizeChaged = function() {
    $('#app-diagram').scrollTop(0).scrollLeft(0);
    diaForeach(function(dia) {
      if (dia.canvas)
        dia.canvas.calcOffset();
    });
  };

  function init() {
    diaForeach(function(dia) {
      if (dia.canvas)
        dia.canvas.clear();
    });

    diaList = [];
    rootContainer.empty();
    rootContainer.attr('width', setting.config.maps[0].width);
    rootContainer.attr('height', setting.config.maps[0].height);

    for (var i = 0; i < setting.config.maps.length; i++)
      {
        var dia = {
          c_id   : 'app-dia-' + i,
          width  : setting.config.maps[i].width,
          height : setting.config.maps[i].height
        };
        var canvasID = dia.c_id + '-canvas';

        rootContainer.append("<div id='" + dia.c_id + "'></div>");
        $('#' + dia.c_id).append("<canvas id='" + canvasID + "' class='app-canvas'></canvas>");
        $('#' + canvasID).attr('width', dia.width);
        $('#' + canvasID).attr('height', dia.height);

        dia.currentObject = null;
        dia.previousObject = null;

        var canvas;
        canvas = new fabric.Canvas(canvasID, {
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

              points.push(Math.round((obj.left - hw) / canvas.c_scaleValue));
              points.push(Math.round((obj.top - hh) / canvas.c_scaleValue));
              points.push(Math.round((obj.left + hw) / canvas.c_scaleValue));
              points.push(Math.round((obj.top + hh) / canvas.c_scaleValue));

              setting.modify(obj.c_id, 'points', points.join(','));
            }
        });

        dia.canvas = canvas;
        diaList.push(dia);

        $('#' + dia.c_id).hide();
      }
  }

  function addItem(dia, c_id, item) {
    if (!dia.canvas)
      return;

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
    obj.set({
      hasRotatingPoint: false,
      hasControls: true,
      hasBorders: true,
      borderColor: 'red',
      cornerColor: 'green',
      cornerSize: 6,
      transparentCorners: false,
      lockRotation: true
    });

    obj.c_dragBoundFunc = function() {
      var max_width = dia.width;
      var max_height = dia.height;

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
      } else if (tr.x > max_width) {
        var diff = tr.x - max_width;
        this.left -= diff;
      }

      if (tl.y < 0) {
        var diff = 0 - tl.y;
        this.top += diff;
      } else if (bl.y > max_height) {
        var diff = bl.y - max_height;
        this.top -= diff;
      }
    };

    dia.canvas.add(obj);
  }

  function addBackgroundImage(dia, c_id, path) {
    if (!dia.canvas)
      return;

    fabric.util.loadImage(path, function(img) {
      var obj = new fabric.Image(img, {
        left: dia.width / 2,
        top: dia.height / 2
      });

      dia.canvas.c_id = c_id;

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

      dia.canvas.add(obj);
      dia.canvas.sendToBack(obj);
    });
  }

  function selectItem(dia, c_id) {
    if (!dia.canvas)
      return;

    var obj = null;

    if (c_id)
      obj = dia.canvas.c_getObjectById(c_id);

    if (!obj)
      obj = null;

    if (obj == dia.currentObject)
      return;

    dia.previousObject = dia.currentObject;
    dia.currentObject = obj;
    if (currentObject)
      dia.canvas.bringToFront(currentObject);

    dia.canvas.renderAll();
  }

  setting.callbacks.add(function(data) {
    switch(data.cmd)
      {
      case 'setting.init':
        init();
        break;
      case 'setting.zoom':
        var elms = data.id.split('-');
        var dia_id = 'app-dia-' + elms[1];
        var dia = lookupDia(dia_id);
        if (dia && dia.canvas)
          {
            var value = parseFloat (data.value, 10);
            if (dia.canvas.c_scaleValue != value)
              dia.canvas.c_scale(value);
          }
        break;
      case 'item.addBackground':
        var elms = data.id.split('-');
        var dia_id = 'app-dia-' + elms[1];
        var dia = lookupDia(dia_id);
        if (dia)
          addBackgroundImage(dia, data.id, data.path);
        break;
      case 'item.add':
        var elms = data.id.split('-');
        var dia_id = 'app-dia-' + elms[1];
        var dia = lookupDia(dia_id);
        if (dia)
          addItem(dia, data.id, data.item);
        break;
      case 'item.selected':
        var elms = data.id.split('-');
        var dia_id = 'app-dia-' + elms[1];
        var dia = lookupDia(dia_id);
        if (dia)
          selectItem(dia, data.value);
        break;
      case 'map.show':
        var elms = data.id.split('-');
        var dia_id = 'app-dia-' + elms[1];

        $('#app-diagram').scrollTop(0).scrollLeft(0);
        diaForeach(function(dia) {
          if (dia.c_id == dia_id)
            {
              $('#' + dia.c_id).show("slow");
              if (dia.canvas)
                {
                  dia.canvas.calcOffset();
                  dia.canvas._hoveredTarget = null;
                  dia.canvas.deactivateAll();
                  dia.canvas.renderAll();
                }
            }
          else
            {
              $('#' + dia.c_id).hide();
            }
        });
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
        {
          var rootContainer = $('#app-sidebar-map-list');

          rootContainer.empty();
          for (var i = 0; i < setting.config.maps.length; i++)
            {
              var map = setting.config.maps[i];
              var id = "app-sidebar-map-" + i;

              rootContainer.append("<button id='" + id + "' type='button' class='btn btn-primary'>" + map.name + "</div>");
              $('#' + id).on('click', function() {
                var elms = $(this).attr('id').split('-');
                var mapID = "map-" + elms[3];
                setting.showMap(mapID);
              });
            }
        }
        break;
      case 'map.show':
        $('#app-sidebar-map').text(data.id + '[' + data.name + ']');
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

    var config = setting.config;
    for (var m_idx = 0; m_idx < config.maps.length; m_idx++)
      {
        if (config.maps[m_idx].background_images)
          {
            var files = config.maps[m_idx].background_images;
            for (var i = 0; i < files.length; i++)
              this.callbacks.fire({
                cmd  : 'item.addBackground',
                id   : "map-" + m_idx + "-bg-" + i,
                path : setting.basedir + files[i]
              });
          }

        var items = config.maps[m_idx].items;
        for (var i = 0; i < items.length; i++)
          {
            if (items[i].alive)
              {
                var c_id = "map-" + m_idx + "-item-" + i;

                this.callbacks.fire({
                  cmd  : 'item.add',
                  id   : "map-" + m_idx + "-item-" + i,
                  item : items[i]
                });
              }
          }
      }

    this.showMap('map-' + setting.map_idx);
    console.log ("load time : " + (new Date() - t) / 1000 + " seconds");
  };
  this.showMap = function(mapID) {
    var elms = mapID.split('-');

    setting.map_idx = parseInt(elms[1]);
    this.callbacks.fire({
      cmd  : 'map.show',
      id   : mapID,
      name : setting.config.maps[setting.map_idx].name
    });

    setting.select(null);
  };
  this.save = function() {
  };
  this.zoom = function(scale) {
    this.callbacks.fire({
      cmd   : 'setting.zoom',
      id    : "map-" + setting.map_idx,
      value : scale
    })
  };
  this.select = function(c_id) {
    var id;

    if (c_id)
      id = c_id;
    else
      id = "map-" + setting.map_idx + "-item-null";

    if (this.selectId == id)
      return;

    this.selectId = id;
    this.callbacks.fire({ cmd: 'item.selected', id: id });
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

var LabeledRect = fabric.util.createClass(fabric.Rect, {
  type: 'labeledRect',
  initialize: function(options) {
    options || (options = { });
    this.callSuper('initialize', options);
    this.set('label', options.label || '');
  },
  toObject: function() {
    return fabric.util.object.extend(this.callSuper('toObject'), {
      label: this.get('label')
    });
  },
  _render: function(ctx) {
    this.callSuper('_render', ctx);
    if (this.label.length <= 3)
      ctx.font = '12px Sans Mono';
    else
      ctx.font = '10px Sans Mono';

    ctx.fillStyle = '#333';
    ctx.fillText(this.label, -this.width/2 + 4, -this.height/2 + 13);
  }
});

var LabeledCircle = fabric.util.createClass(fabric.Circle, {
  type: 'labeledCircle',
  initialize: function(options) {
    options || (options = { });
    this.callSuper('initialize', options);
    this.set('label', options.label || '');
  },
  toObject: function() {
    return fabric.util.object.extend(this.callSuper('toObject'), {
      label: this.get('label')
    });
  },
  _render: function(ctx) {
    this.callSuper('_render', ctx);
    if (this.label.length <= 3)
      ctx.font = '12px Sans Mono';
    else
      ctx.font = '10px Sans Mono';

    ctx.fillStyle = '#333';
    ctx.fillText(this.label, -this.width/2 + 4, -this.height/2 + 18);
  }
});

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
          },
          c_backgrounds: [],
          c_addBackground: function(obj) {
            var self = this;

            self.c_backgrounds.push(obj);
            self.add(obj);

            for (var i = self.c_backgrounds.length - 1; i >= 0; i--)
              self.sendToBack(self.c_backgrounds[i]);
          },
          c_getObjectById: function(c_id) {
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
          }
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

              points.push(Math.round((obj.left - hw) / canvas.c_scaleValue));
              points.push(Math.round((obj.top - hh) / canvas.c_scaleValue));
              points.push(Math.round((obj.left + hw) / canvas.c_scaleValue));
              points.push(Math.round((obj.top + hh) / canvas.c_scaleValue));

              obj.c_points = points.join(',');
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
        obj = new LabeledRect({
          left: center.x,
          top: center.y,
          width: item.x2 - item.x1,
          height: item.y2 - item.y1,
          fill: 'rgb(255,255,255)',
          stroke: 'rgb(0,0,0)',
          strokeWidth: 1,
          label: item.name,
        });
        obj.c_type = item.type;
        obj.c_points = [item.x1, item.y1, item.x2, item.y2].join(',');
        obj.c_changePoints = function(points) {
          if (this.c_points != points)
            return;

          this.c_points = points;

          var elms = points.split(',');
          var x1 = parseInt(elms[0]);
          var y1 = parseInt(elms[1]);
          var x2 = parseInt(elms[2]);
          var y2 = parseInt(elms[3]);
          var c = findCenter(x1, y1, x2, y2);

          this.left = c.x * dia.canvas.c_scaleValue;
          this.top = c.y * dia.canvas.c_scaleValue;
          this.width = (x2 - x1) * dia.canvas.c_scaleValue;
          this.height = (y2 - y1) * dia.canvas.c_scaleValue;

          dia.canvas.renderAll();
        };

        break;
      case 1: // DAI_CIRCLE
        obj = new LabeledCircle({
          left: center.x,
          top: center.y,
          radius: (item.x2 - item.x1) / 2,
          fill: 'rgb(255,255,255)',
          stroke: 'rgb(0,0,0)',
          strokeWidth: 1,
          label: item.name
        });
        obj.c_type = item.type;
        obj.c_points = [item.x1, item.y1, item.x2, item.y2].join(',');
        obj.c_changePoints = function(points) {
          if (this.c_points != points)
            return;

          this.c_points = points;

          var elms = points.split(',');
          var x1 = parseInt(elms[0]);
          var y1 = parseInt(elms[1]);
          var x2 = parseInt(elms[2]);
          var y2 = parseInt(elms[3]);
          var c = findCenter(x1, y1, x2, y2);

          this.left = c.x * dia.canvas.c_scaleValue;
          this.top = c.y * dia.canvas.c_scaleValue;
          this.radius = (x2 - x1) * dia.canvas.c_scaleValue;

          dia.canvas.renderAll();
        };
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

      dia.canvas.c_addBackground(obj);
      dia.canvas.sendToBack(obj);
    });
  }

  function selectItem(dia, c_id) {
    if (!dia.canvas)
      return;

    var obj = null;
    if (c_id)
      obj = dia.canvas.c_getObjectById(c_id);

    if (obj == dia.currentObject)
      return;

    dia.previousObject = dia.currentObject;
    dia.currentObject = obj;
    if (dia.currentObject)
      dia.canvas.bringToFront(dia.currentObject);

    dia.canvas.renderAll();
  }

  function modifyItem(dia, c_id, key, value) {
    if (!dia.canvas)
      return;

    obj = dia.canvas.c_getObjectById(c_id);
    if (!obj)
      return;

    switch (key)
      {
      case 'points':
        obj.c_changePoints(value);
        break;
      }

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
          selectItem(dia, data.id);
        break;
      case 'item.modified':
        var elms = data.id.split('-');
        var dia_id = 'app-dia-' + elms[1];
        var dia = lookupDia(dia_id);
        if (dia)
          modifyItem(dia, data.id, data.key, data.value);

        break;
      case 'map.selected':
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
  var selectedMap = '';

  setting.callbacks.add(function(data) {
    switch(data.cmd)
      {
      case 'setting.init':
        {
          var sibling = $('#app-sidebar-map-pivot');
          var selectedMap = '';

          $.each(setting.config.maps, function(idx, map) {
            removeMapEntry(map, idx, sibling);
          });

          $.each(setting.config.maps, function(idx, map) {
            createMapEntry(map, idx, sibling);
          });
        }
        break;
      case 'map.selected':
        if (selectedMap == data.id)
          break;

        selectedMap = data.id;
        $('a[data-target="#app-sidebar-' + data.id + '"]').click();
        break;
      case 'map.modified':
        switch(data.key)
          {
          case 'name':
            $('#app-sidebar-' + data.id + '-toggle-name').text(data.value);
            break;
          }
        break;
      }
  });

  function createMapEntry(map, idx, sibling) {
    var c_id = "app-sidebar-map-" + idx;

    var html  = "<div class='accordion-group app-sidebar-accordion-group'>";
        html +=   "<div class='accordion-heading'>";
        html +=     "<button type='button' class='btn btn-mini btn-link btn-group' rel='tooltip' title='Remove this map' id='" + c_id + "-remove'>";
        html +=       "<i class='icon-trash'></i>";
        html +=         "</button>";
        html +=     "<a class='accordion-toggle' data-toggle='collapse' data-target='#" + c_id + "'";
        html +=        "data-parent='#app-sidebar-map-group'>";
        html +=        "<span id='" + c_id + "-toggle-name'>" + map.name + "</span>";
        html +=     "</a>";
        html +=   "</div> <!-- accordion-heading -->";
        html +=   "<div id='" + c_id + "' class='accordion-body collapse app-sidebar-accordion-group-body'>";
        html +=     "<div class='accordion-inner'>";
        html +=       "<table class='table-striped'>";
        html +=         "<tbody id='" + c_id + "-content'>";
        html +=           "<tr>";
        html +=             "<th>";
        html +=               "<label for='" + c_id + "-name'>Name</label>";
        html +=             "</th>";
        html +=             "<td>";
        html +=               "<input id='" + c_id + "-name' type='text' value='" + map.name + "' class='input-medium'>";
        html +=             "</td>";
        html +=           "</tr>";
        html +=           "<tr>";
        html +=             "<th>";
        html +=               "<label>Size</label>";
        html +=             "</th>";
        html +=             "<td>";
        html +=               "<label>" + map.width + "x" + map.height +"</label>";
        html +=             "</td>";
        html +=           "</tr>";
        html +=         "</tbody>";
        html +=       "</table>";
        html +=       "<label>Background Images</label>";
        html +=       "<ol>";
        for (var i = 0; i < map.background_images.length; i++)
          {
            html +=     "<li>" + map.background_images[i] + "</li>";
          }
        html +=       "</ol>";
        html +=     "</div>";
        html +=   "</div>";
        html += "</div>";

    $(html).insertBefore(sibling);

    var c = $('#' + c_id);

    c.on('hide', function() {
      $(this).css({ 'overflow': 'hidden' });
      var id = $(this).attr('id');
      $('a[data-target="#' + id + '"]').parent().removeClass('app-sidebar-entry-selected');
    });

    c.on('show', function() {
      var id = $(this).attr('id');
      $('a[data-target="#' + id + '"]').parent().addClass('app-sidebar-entry-selected');
      var elms = id.split('-'); // 'app-sidebar-map-0'
      var obj_id = 'map-' + elms[3];
      setting.selectMap(obj_id);
    });

    c.on('shown', function() {
      $(this).css({ 'overflow': 'visible' });
    });

    $('#' + c_id + '-name').change(function(e) {
      var name = $.trim($(this).val());
      if (name == '')
        return;

      var map_idx = $(this).attr('id').split('-')[3];
      var oid = 'map-' + map_idx;
      setting.modify(oid, 'name', name);
    });
    $('#' + c_id + '-remove').click(function(e) {
      console.log($(this).attr('id'));
    });
  }

  function removeMapEntry(map, idx) {
    var obj = $('#app-sidebar-map-' + idx);
    if (obj)
      obj.parent().remove();
  }
};

app.Setting = function() {
  var setting = this;

  this.basedir = "test/";
  this.config = null;
  this.map_idx = 0;
  this.callbacks = $.Callbacks();
  this.selectId ='';
  this.path='';

  this.init = function(config, path) {
    this.path = path;
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

    this.selectMap('map-' + setting.map_idx);
    console.log ("load time : " + (new Date() - t) / 1000 + " seconds");
  };
  this.selectMap = function(mapID) {
    var elms = mapID.split('-');

    setting.map_idx = parseInt(elms[1]);
    this.callbacks.fire({
      cmd  : 'map.selected',
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

    var changed = false;
    if (k.length == 2)  /* map-0 */
      {
        var map;

        map = setting.config.maps[k[1]];
        switch (key)
          {
          case 'name':
            if (map[key] != value)
              {
                map[key] = value;
                changed = true;
              }
            break;
          }

        if (changed)
          {
            console.log('modify ' + c_id + '-' + key + ' => ' + value);
            this.callbacks.fire({
              cmd   : 'map.modified',
              id    : c_id,
              key   : key,
              value : value
            });
          }
      }
    else if (k.length == 4) /* map-0-item-0 */
      {
        var item;

        item = setting.config.maps[k[1]].items[k[3]];
        switch (key)
          {
          case 'points':
            var points = value.split(',');

            if (item.x1 != points[0]
                || item.y1 != points[1]
                || item.x2 != points[2]
                || item.y2 != points[3])
              {
                item.x1 = points[0];
                item.y1 = points[1];
                item.x2 = points[2];
                item.y2 = points[3];
                changed = true;
              }
            break;
          }

        if (changed)
          {
            console.log('modify ' + c_id + '-' + key + ' => ' + value);
            this.callbacks.fire({
              cmd   : 'item.modified',
              id    : c_id,
              key   : key,
              value : value
            });
          }
      }
  };
  this.remove = function() {
  };

  this.loadMap = function(path) {
    var loadingObj = $('#app-loading-overlay');

    loadingObj.show();

    app_fs.readFile(path, function(err, data) {
      var config;

      try {
        config = eval("(" + data + ")");
      } catch(e) {
        alert('invalid map file : ' + path);
        loadingObj.hide();
        return;
      }

      if (!config.maps || config.maps.length <= 0) {
        alert('invalid map format : ' + path);
        loadingObj.hide();
        return;
      }

      setting.init(config, path);
      setting.load();

      loadingObj.hide();
    });
  };
  this.reloadMap = function() {
    if (this.path == '')
      return;

    this.loadMap(this.path);
  };

};

$(function() {
  var setting;
  var diagram;
  var sidebar;

  app_window = app_gui.Window.get();

  setting = new app.Setting();
  diagram = new app.Diagram('app-diagram', setting);
  sidebar = new app.Sidebar('app-sidebar', setting);

  $('#app-menu-new-file').click(function(e) {
    console.log($(this).attr('id') + " is clicked");
  });
  $('#app-menu-open-file').click(function(e) {
    $('#app-map-file').trigger('click');
  });
  $('#app-map-file').on('change', function(e) {
    console.log($(this).val());
    setting.loadMap($(this).val());
  });

  $('#app-menu-openrecent').click(function(e) {
    setting.reloadMap();
  });

  $('#app-menu-save').click(function(e) {
    console.log($(this).val());
  });

  $('#app-view-200').click(function(e) {
    setting.zoom("2.0");
  });

  $('#app-view-100').click(function(e) {
    setting.zoom("1.0");
  });

  $('#app-view-75').click(function(e) {
    setting.zoom("0.75");
  });

  $('#app-view-50').click(function(e) {
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

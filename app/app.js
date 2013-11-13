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

    var fs;

    if (this.label.length <= 3)
      ctx.font = '12px Sans Mono';
    else
      ctx.font = '10px Sans Mono';

    ctx.fillStyle = this.stroke;
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

    ctx.fillStyle = this.stroke;
    ctx.fillText(this.label, -this.width/2 + 4, -this.height/2 + 18);
  }
});

var app = {
  window: null,
  gui: require('nw.gui'),
  os: require('os'),
  fs: require('fs'),
  path: require('path'),
  mapFilename: 'maps.json',
  defaultBackgroundColor: "#2e3436",
  defaultLineColor: "#ffffff",
  defaultFillColor: "#2e343640",
  tmpDir: null,
  requestTemporaryDir: function() {
    var osTmp = this.os.tmpdir();
    var count = 65535;
    while (true) {
      var r1 = Math.floor(Math.random() * 65535);
      var r2 = Math.floor(Math.random() * 65535);
      var dir = this.path.join(osTmp, "emap-" + r1 + "-" + r2);
      if (!app.fs.existsSync(dir))
        {
          app.fs.mkdirSync(dir);
          this.tmpDir = dir;
          return dir;
        }

      count--;
      if (count <= 0)
        break;
    }

    console.log("failed to get temporary directory");
    return "emap-unknown-" + Math.floor(Math.random() * 65535);
  },
  rmdir: function(dir) {
    var files = this.fs.readdirSync(dir);
    for(var i = 0; i < files.length; i++) {
      var filename = this.path.join(dir, files[i]);
      var stat = this.fs.statSync(filename);
      
      if(filename == "." || filename == "..") {
        // nothing to do
      } else if(stat.isDirectory()) {
        // rmdir recursively
        this.rmdir(filename);
      } else {
        // remove file
        this.fs.unlinkSync(filename);
      }
    }
    this.fs.rmdirSync(dir);
  },
  releaseTemporaryDir: function(tmpDir) {
    this.rmdir(tmpDir);
  }
};

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

  function colorCSS(hexString) {  // #ffffffff
    var color;

    if (hexString && hexString[0] == '#')
      {
        if (hexString.length == 9) // rgba
          {
            var hr = hexString.substring(1, 3);
            var hg = hexString.substring(3, 5);
            var hb = hexString.substring(5, 7);
            var ha = hexString.substring(7, 9);
            color  = 'rgba(';
            color += parseInt(hr, 16) + ',';
            color += parseInt(hg, 16) + ',';
            color += parseInt(hb, 16) + ',';
            color += (parseInt(ha, 16) / 255).toFixed(2) + ')';
          }
        else if (hexString.length == 7) // rgb
          {
            var hr = hexString.substring(1, 3);
            var hg = hexString.substring(3, 5);
            var hb = hexString.substring(5, 7);
            color  = 'rgb(';
            color += parseInt(hr, 16) + ',';
            color += parseInt(hg, 16) + ',';
            color += parseInt(hb, 16) + ')';
          }
      }
    else
      {
        color = app.defaultBackgroundColor;
      }

    return color;
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
  }

  function addMap(map) {
    var dia = {
      c_id   : 'app-dia-' + map.id.split('-')[1],
      width  : map.width,
      height : map.height
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

        self.c_backgrounds.sort(function(a, b) {
          return b.c_id - a.c_id;
        });
        for (var i = self.c_backgrounds.length - 1; i >= 0; i--)
          self.sendToBack(self.c_backgrounds[i]);

        self.renderAll();
      },
      c_removeBackground: function(obj) {
        var self = this;

        for (var i = 0; i < self.c_backgrounds.length; i++)
          {
            if (self.c_backgrounds[i] == obj)
              {
                self.c_backgrounds.splice(i, 1);
                break;
              }
          }
        self.remove(obj);
        self.renderAll();
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

    if (map.background_color)
      canvas.backgroundColor = colorCSS(map.background_color);
    else
      canvas.backgroundColor = colorCSS(app.defaultBackgroundColor);

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
          var points = [];

          points.push(Math.round(obj.oCoords.tl.x / dia.canvas.c_scaleValue));
          points.push(Math.round(obj.oCoords.tl.y / dia.canvas.c_scaleValue));
          points.push(Math.round(obj.oCoords.br.x / dia.canvas.c_scaleValue));
          points.push(Math.round(obj.oCoords.br.y / dia.canvas.c_scaleValue));
          obj.c_points = points.join(',');

          setting.modify(obj.c_id, 'points', points.join(','));
        }
    });

    dia.canvas = canvas;
    diaList.push(dia);

    $('#' + dia.c_id).hide();
  }

  function removeMap(dia) {
    var idx = -1;

    for (var i = 0; i < diaList.length; i++)
      {
        if (diaList[i].c_id == dia.c_id)
          {
            idx = i;
            break;
          }
      }
    if (idx >= 0)
      {
        $('#' + dia.c_id).remove();
        diaList.splice(i, 1);
      }
  }

  function addItem(dia, c_id, item) {
    if (!dia.canvas)
      return;

    var obj = null;

    var center = findCenter(item.x1, item.y1, item.x2, item.y2);
    var left = center.x * dia.canvas.c_scaleValue;
    var top = center.y * dia.canvas.c_scaleValue;

    switch (item.type)
      {
      case 0: // DAI_BOX
        var baseWidth = 30;
        var baseHeight = 20;
        var width = (item.x2 - item.x1) * dia.canvas.c_scaleValue;
        var height = (item.y2 - item.y1) * dia.canvas.c_scaleValue;
        var scaleX = width / baseWidth;
        var scaleY = height / baseHeight;

        obj = new LabeledRect({
          left: left,
          top: top,
          width: baseWidth,
          height: baseHeight,
          scaleX: scaleX,
          scaleY: scaleY,
          fill: colorCSS(app.defaultFillColor),
          stroke: colorCSS(app.defaultLineColor),
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

          this.setLeft(Math.round(c.x * dia.canvas.c_scaleValue));
          this.setTop(Math.round(c.y * dia.canvas.c_scaleValue));
          this.setWidth(Math.round((x2 - x1) * dia.canvas.c_scaleValue / this.scaleX));
          this.setHeight(Math.round((y2 - y1) * dia.canvas.c_scaleValue / this.scaleY));
          this.setCoords();

          dia.canvas.renderAll();
        };
        break;
      case 1: // DAI_CIRCLE
        var baseWidth = 30;
        var baseHeight = 30;
        var width = (item.x2 - item.x1) * dia.canvas.c_scaleValue;
        var height = (item.y2 - item.y1) * dia.canvas.c_scaleValue;
        var scaleX = width / baseWidth;
        var scaleY = height / baseHeight;
        var baseRadius = 15;

        obj = new LabeledCircle({
          left: left,
          top: top,
          radius: baseRadius,
          scaleX: scaleX,
          scaleY: scaleY,
          fill: colorCSS(app.defaultFillColor),
          stroke: colorCSS(app.defaultLineColor),
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

          this.setLeft(Math.round(c.x * dia.canvas.c_scaleValue));
          this.setTop(Math.round(c.y * dia.canvas.c_scaleValue));
          this.setRadius(Math.round((x2 - x1) * dia.canvas.c_scaleValue / 2 / this.scaleX));
          this.setCoords();

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

  function removeItem(dia, c_id) {
    if (!dia.canvas)
      return;

    var obj = dia.canvas.c_getObjectById(c_id);
    if (!obj)
      return;

    dia.canvas.remove(obj);
  }

  function addBackgroundImage(dia, c_id, filename) {
    if (!dia.canvas)
      return;

    var iObj = dia.canvas.c_getObjectById(c_id);
    if (iObj)
      {
        dia.canvas.c_removeBackground(iObj);
      }

    var path = setting.imageDir + '/' + filename;
    fabric.util.loadImage(path, function(img) {
      var obj = new fabric.Image(img, {
        left: dia.width / 2,
        top: dia.height / 2
      });

      obj.c_id = c_id;

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
    });
  }

  function removeBackgroundImage(dia, c_id) {
    var obj = dia.canvas.c_getObjectById(c_id);
    if (obj)
      dia.canvas.c_removeBackground(obj);
  };

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
      {
        dia.canvas.setActiveObject(dia.currentObject);
        dia.canvas.bringToFront(dia.currentObject);
        return;
      }

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
      case 'name':
        obj.set('label', value);
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
          addBackgroundImage(dia, data.id, data.file);
        break;
      case 'item.removeBackground':
        $('#app-sidebar-' + data.id).text('empty');
        var elms = data.id.split('-');
        var dia_id = 'app-dia-' + elms[1];
        var dia = lookupDia(dia_id);
        if (dia)
          removeBackgroundImage(dia, data.id);
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
      case 'item.removed':
        var elms = data.id.split('-');
        var dia_id = 'app-dia-' + elms[1];
        var dia = lookupDia(dia_id);
        if (dia)
          removeItem(dia, data.id);
        break;
      case 'map.draw':
        var elms = data.id.split('-');
        var dia_id = 'app-dia-' + elms[1];
        var dia = lookupDia(dia_id);
        if (dia && dia.canvas)
          dia.canvas.renderAll();
        break;
      case 'map.added':
        addMap(data.map);
        var elms = data.id.split('-');
        var dia_id = 'app-dia-' + elms[1];
        break;
      case 'map.removed':
        var elms = data.id.split('-');
        var dia_id = 'app-dia-' + elms[1];
        var dia = lookupDia(dia_id);
        if (dia)
          removeMap(dia);
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
        $('#app-sidebar-map-pivot').siblings().remove();
        sidebar.setItemEditible(false);
        break;
      case 'map.selected':
        if (selectedMap == data.id)
          break;

        selectedMap = data.id;
        $('a[data-target="#app-sidebar-' + data.id + '"]').click();
        break;
      case 'map.added':
        createMapEntry(data.map, $('#app-sidebar-map-pivot'));
        break;
      case 'map.removed':
        removeMapEntry(data.id);
        break;
      case 'map.modified':
        switch(data.key)
          {
          case 'name':
            $('#app-sidebar-' + data.id + '-toggle-name').text(data.value);
            break;
          }
        break;
      case 'item.selected':
        var elms = data.id.split('-');
        if (elms[3] == 'null')
          {
            sidebar.setItemEditible(false);
            break;
          }
        var item = setting.config.maps[elms[1]].items[elms[3]];
        sidebar.setItemEditible(true);
        $('#app-sidebar-item-info-name').val(item.name);

        var typeObj = $('#app-sidebar-item-info-type');
        if (item.type == 0)
          typeObj.val('DAI Box');
        else if (item.type == 1)
          typeObj.val('DAI Circle');
        else
          typeObj.val('Unknown');

        var coord = [item.x1, item.y1, item.x2, item.y2].join(',');
        $('#app-sidebar-item-info-coordinate').val(coord);
        break;
      case 'item.addBackground':
        $('#app-sidebar-' + data.id).text(data.file);
        break;
      case 'item.removeBackground':
        $('#app-sidebar-' + data.id).text('empty');
        break;
      }
  });

  this.setItemEditible = function (enable) {
    if (enable)
      {
        $('#app-sidebar-item-info-name').prop('disabled', false);
      }
    else
      {
        $('#app-sidebar-item-info-name').val("").prop('disabled', true);
        $('#app-sidebar-item-info-type').val("").prop('disabled', true);
        $('#app-sidebar-item-info-coordinate').val("").prop('disabled', true);
      }
  };

  function createMapEntry(map, sibling) {
    var c_id = "app-sidebar-" + map.id;

    var html  = "<div class='accordion-group app-sidebar-accordion-group'>";
        html +=   "<div class='accordion-heading'>";
        html +=     "<button type='button' class='btn btn-mini btn-link btn-group' rel='tooltip' title='Remove this map' id='" + c_id + "-remove'>";
        html +=       "<i class='icon-trash'></i>";
        html +=     "</button>";
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
        html +=       "<div class='app-sidebar-bg-container'>";
        html +=         "<ul>"
        for (var i = 0; i < map.backgrounds.length; i++) {
          html +=         "<li>";
          html +=           "<div id='" + c_id + "-bg-" + i + "'>empty</div>";
          html +=           "<button type='button' class='btn btn-mini btn-link'";
          html +=                    "rel='tooltip' title='Remove this background' id='" + c_id + "-bg-" + i + "-remove'>";
          html +=           "<i class='icon-trash'></i>";
          html +=           "</button>";
          html +=         "</li>";
        }
        html +=         "</ul>"
        html +=       "<div>";
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
      var elms = $(this).attr('id').split('-');
      var mapID = [elms[2], elms[3]].join('-');
      setting.removeMap(mapID);
    });

    for (var i = 0; i < map.backgrounds.length; i++) {
      if (map.backgrounds[i] == "")
        {
          $('#' + c_id + "-bg-" + i).text("empty");
        }
      else
        {
          $('#' + c_id + "-bg-" + i).text(map.backgrounds[i]);
        }
    }

    for (var i = 0; i < map.backgrounds.length; i++) {
      $('#' + c_id + "-bg-" + i).click(function(e) {
        app.curBgTarget=$(this).attr('id');
        $('#app-sidebar-bg-file').trigger('click');
      });
      $('#' + c_id + "-bg-" + i + "-remove").click(function(e) {
        var elms = $(this).attr('id').split('-');
        setting.removeBackground(elms[5]);
      });
    }
  }

  function removeMapEntry(mapID) {
    var obj = $('#app-sidebar-' + mapID);
    if (obj)
      obj.parent().remove();
  }
};

app.Setting = function() {
  var setting = this;
  var inited = false;

  this.config = null;
  this.zipPath = null;
  this.tmpDir = null;
  this.imageDir = null;

  this.map_idx = 0;
  this.callbacks = $.Callbacks();
  this.selectedID ='';

  this.init = function(config, zipPath, tmpDir) {
    this.config = config;
    this.zipPath = zipPath;

    if (this.tmpDir)
      app.releaseTemporaryDir(this.tmpDir);

    this.tmpDir = tmpDir;
    this.imageDir = app.path.join(tmpDir, 'images');

    $('#app-overlay').hide();

    for (var m = 0; m < config.maps.length; m++)
      {
        config.maps[m].valid = true;
        for (var i = 0; i < config.maps[m].items.length; i++)
          config.maps[m].items[i].valid = true;

        config.maps[m].backgrounds = [];
        for (var i = 0; i < 5; i++)
          config.maps[m].backgrounds.push("empty");

        for (var i = 0; i < config.maps[m].background_images.length && i < 5; i++)
          config.maps[m].backgrounds[i] = config.maps[m].background_images[i];
      }

    this.callbacks.fire({ cmd: 'setting.init' });
  };
  this.add = function(item, options) {
    if (!inited)
      return;

    var m_idx = setting.map_idx;
    if (!setting.config || !setting.config.maps[m_idx] || !setting.config.maps[m_idx].items)
      return;

    var ritem = item;
    if (!ritem)
      {
        var x1, y1, x2, y2;

        switch (options.type)
          {
          case 0:
            x1 = 40;
            y1 = 40;
            x2 = 70;
            y2 = 60;
            break;
          case 1:
            x1 = 40;
            y1 = 40;
            x2 = 70;
            y2 = 70;
            break;
          default:
            console.log ("failed to add item (unknown item type:" + options.type + ")");
            return;
          }

        ritem = {
          id : 'map-' + m_idx + '-item-' + setting.config.maps[m_idx].items.length,
          valid: true,
          name: 100 + setting.config.maps[m_idx].items.length + "",
          type: options.type,
          x1 : x1,
          y1 : y1,
          x2 : x2,
          y2 : y2
        };
        setting.config.maps[m_idx].items.push(ritem);
        setting.callbacks.fire({
          cmd  : 'item.add',
          id   : ritem.id,
          item : ritem
        });

        this.select(ritem.id);  /* drawing event is occurred */
        return;
      }

    setting.callbacks.fire({
      cmd  : 'item.add',
      id   : ritem.id,
      item : ritem
    });
  };

  this.load = function() {
    var t = new Date();

    inited = true;

    var config = setting.config;
    for (var i = 0; i < config.maps.length; i++)
      {
        var map = config.maps[i];

        map.valid = true;
        map.id = 'map-' + i;
        this.addMap(map, {});
      }

    for (var m_idx = 0; m_idx < config.maps.length; m_idx++)
      {
        if (config.maps[m_idx].backgrounds)
          {
            var files = config.maps[m_idx].backgrounds;
            for (var i = 0; i < files.length; i++) {
              if (!files[i]
                  || files[i] == ""
                  || files[i] == "empty")
                continue;

              this.callbacks.fire({
                cmd  : 'item.addBackground',
                id   : "map-" + m_idx + "-bg-" + i,
                file : files[i]
              });
            }
          }

        var items = config.maps[m_idx].items;
        for (var i = 0; i < items.length; i++)
          {
            var item = items[i];
            item.id = "map-" + m_idx + "-item-" + i;
            item.valid = true;
            this.add(item, {});
          }
      }

    if (config.maps.length > 0)
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

    if (this.selectedID == id)
      return;

    this.selectedID = id;
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
            var x1 = parseInt(points[0]);
            var y1 = parseInt(points[1]);
            var x2 = parseInt(points[2]);
            var y2 = parseInt(points[3]);

            if (item.x1 != x1
                || item.y1 != y1
                || item.x2 != x2
                || item.y2 != y2)
              {
                item.x1 = x1;
                item.y1 = y1;
                item.x2 = x2;
                item.y2 = y2;
                changed = true;
              }
            break;
          case 'name':
            if (item.name != value)
              {
                item.name = value;
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

  this.modifySelected = function(key, value) {
    if (!inited)
      return;

    if (setting.selectedID && setting.selectedID != '')
      {
        var elms = setting.selectedID.split('-');
        if (elms[3] == 'null')
          return;

        if (setting.config.maps[elms[1]].items[elms[3]])
          setting.modify(setting.selectedID, key, value);
      }
  };

  this.removeSelected = function() {
    if (!inited)
      return;

    if (setting.selectedID && setting.selectedID != '')
      {
        var elms = setting.selectedID.split('-');
        if (elms[3] == 'null')
          return;

        if (setting.config.maps[elms[1]].items[elms[3]])
          {
            setting.config.maps[elms[1]].items[elms[3]].valid = false;
            setting.callbacks.fire({
              cmd   : 'item.removed',
              id    : setting.selectedID
            });
            setting.select(null);
          }
      }
  };

  this.addBackground = function(bgIndex, filename) {
    if (!inited)
      return;

    var m_idx = setting.map_idx;
    if (!setting.config
        || !setting.config.maps[m_idx]
        || !setting.config.maps[m_idx].items)
      return;

    setting.config.maps[m_idx].backgrounds[bgIndex] = filename;

    this.callbacks.fire({
      cmd  : 'item.addBackground',
      id   : "map-" + m_idx + "-bg-" + bgIndex,
      file : filename
    });
  };

  this.removeBackground = function(bgIndex) {
    if (!inited)
      return;

    var m_idx = setting.map_idx;
    if (!setting.config
        || !setting.config.maps[m_idx]
        || !setting.config.maps[m_idx].items)
      return;

    setting.config.maps[m_idx].backgrounds[bgIndex] = "empty";

    this.callbacks.fire({
      cmd  : 'item.removeBackground',
      id   : "map-" + m_idx + "-bg-" + bgIndex
    });
  };

  this.addMap = function(m, options) {
    if (!inited)
      return;

    var map = m;
    if (!map)
      {
        map = {
          'valid'  : true,
          'id'     : 'map-' + this.config.maps.length,
          'name'   : options.name,
          'width'  : options.width,
          'height' : options.height,
          'background_images' : [],
          'backgrounds' : ["", "", "", "", ""],
          'items' : []
        };
        this.config.maps.push(map);

        this.callbacks.fire({
          cmd : 'map.added',
          id  : map.id,
          map : map
        });
        this.selectMap(map.id);
        return;
      }

    this.callbacks.fire({
      cmd : 'map.added',
      id  : map.id,
      map : map
    });
  };

  this.removeMap = function(mapID) {
    for (var i = 0; i < this.config.maps.length; i++)
      {
        if (this.config.maps[i].id == mapID)
          {
            this.config.maps[i].valid = false;
            this.callbacks.fire({
              cmd : 'map.removed',
              id : mapID
            });
            break;
          }
      }
  };

  this.openZipFile = function(zipPath) {
    var loadingObj = $('#app-loading-overlay');

    var ext = zipPath.substr(zipPath.lastIndexOf('.') + 1);
    if (!ext || (ext != 'zip' && ext != 'ZIP'))
      {
        alert ("'" + zipPath + "' is not a E-MAP file.");
        return;
      }

    if (!app.fs.existsSync(zipPath)) {
      console.log("there is no '" + zipPath + "'");
      return;
    }

    loadingObj.show();

    var rdata = app.fs.readFileSync(zipPath, 'binary');
    var unzip = new require('node-zip')(rdata, {
      base64: false, checkCRC32: true
    });

    var tmpDir = app.requestTemporaryDir();
    $.each(unzip.files, function (index, entry) {
      var tmpPath = app.path.join(tmpDir, entry.name);
      if (entry.options.dir)
        app.fs.mkdirSync(tmpPath);
      else
        app.fs.writeFileSync(tmpPath, entry.data, 'binary');
    });

    var mapPath = app.path.join(tmpDir, app.mapFilename);
    if (!app.fs.existsSync(mapPath))
      {
        alert("there is no '" + app.mapFilename + "' file");
        app.releaseTemporaryDir(tmpDir);
        loadingObj.hide();
        return;
      }

    var rdata = app.fs.readFileSync(mapPath);
    var config;
    try {
      config = eval("(" + rdata + ")");
      if (!config) {
        alert('invalid map file1 : ' + zipPath);
        app.releaseTemporaryDir(tmpDir);
        loadingObj.hide();
        return;
      }
    } catch(e) {
      alert('invalid map file2 : ' + zipPath);
      app.releaseTemporaryDir(tmpDir);
      loadingObj.hide();
      return;
    }

    if (!config.maps) {
      alert('invalid map format : ' + zipPath);
      app.releaseTemporaryDir(tmpDir);
      loadingObj.hide();
      return;
    }

    var imageDir = app.path.join(tmpDir, 'images');
    if (!app.fs.existsSync(imageDir))
      app.fs.mkdirSync(imageDir);

    setting.init(config, zipPath, tmpDir);
    setting.load();
    loadingObj.hide();
  };
  this.reopenZipFile = function() {
    if (!this.zipPath)
      return;

    this.openZipFile(this.zipPath);
  };
  this.newZipFile = function(zipPath) {
    var mapData = {
      'format' : 1,
      'maps' : []
    };

    var mapJson = JSON.stringify(mapData, null, 2);
    var zip = new require('node-zip')();
    zip.file(app.mapFilename, mapJson);
    var zipFolder = zip.folder('images');
    var data = zip.generate( { base64: false } );
    app.fs.writeFileSync(zipPath, data, 'binary');

    this.openZipFile(zipPath);
  };

  function generateMap() {
    var config = {};

    config.format = setting.config.format;
    config.maps = [];
    for (var m = 0; m < setting.config.maps.length; m++) {
      var map = setting.config.maps[m];
      if (!map.valid)
        continue;

      var new_map = {};
      new_map.name = map.name;
      new_map.width = map.width;
      new_map.height = map.height;
      if (map.background_color)
        new_map.background_color = map.background_color;

      new_map.background_images = [];
      for (var i = 0; i < map.backgrounds.length; i++)
        {
          if (!map.backgrounds[i] 
              || map.backgrounds[i] == ""
              || map.backgrounds[i] == "empty")
            continue;

          new_map.background_images.push(map.backgrounds[i]);
        }

      new_map.items = [];
      for (var i = 0; i < map.items.length; i++) {
          var item = map.items[i];
          if (!item.valid)
            continue;

          var new_item = {};
          new_item.name = item.name;
          new_item.type = item.type;
          new_item.x1 = item.x1;
          new_item.y1 = item.y1;
          new_item.x2 = item.x2;
          new_item.y2 = item.y2;
          new_map.items.push(new_item);
      }

      config.maps.push(new_map);
    }

    return config;
  }

  this.saveZipFile = function() {
    if (!inited)
      return;

    var loadingObj = $('#app-loading-overlay');
    loadingObj.show();

    var mapData = generateMap();
    var mapJson = JSON.stringify(mapData, null, 2);
    var zip = new require('node-zip')();
    zip.file(app.mapFilename, mapJson);

    var images = [];
    for (m = 0; m < mapData.maps.length; m++) {
      var map = mapData.maps[m];

      for (var i = 0; i < map.background_images.length; i++)
        images.push(map.background_images[i]);
    }

    var lookupImage = function(filename) {
      if (images.length <= 0)
        return false;

      for (var i = 0; i < images.length; i++) {
        if (images[i] == filename)
          return true;
      }

      return false;
    };

    if (app.fs.existsSync(setting.imageDir))
      {
        var files = app.fs.readdirSync(setting.imageDir);
        var zipFolder = zip.folder('images');
        for (var i = 0; i < files.length; i++)
          {
            if (!lookupImage(files[i]))
              continue;

            var imageFile = app.path.join(setting.imageDir, files[i]);
            zipFolder.file(files[i],
                           app.fs.readFileSync(imageFile).toString('base64'),
                           { base64: true, binary: true });
          }
      }
    var data = zip.generate({ base64: false });
    app.fs.writeFileSync(setting.zipPath, data, 'binary');

    loadingObj.hide();
  };
};

$(function() {
  var setting;
  var diagram;
  var sidebar;
  var validateInputValue = function(elem, min, max) {
    var val = parseInt($(elem).val());
    if (!val) val = 0;
    val = Math.max(min, Math.min(max, val));
    $(elem).val(val);
    return val;
  };

  app.window = app.gui.Window.get();

  setting = new app.Setting();
  diagram = new app.Diagram('app-diagram', setting);
  sidebar = new app.Sidebar('app-sidebar', setting);
  sidebar.setItemEditible(false);

  var app_sidebar_width = parseInt($('#app-sidebar').css('width'));
  $('#app-diagram-container').css('width', (1280 - app_sidebar_width) + "px");
  $('#app-diagram-container').css('left', app_sidebar_width + "px");
  $('#app-diagram').css('width', (1280 - app_sidebar_width) + "px");
  $('#app-diagram').css('left', app_sidebar_width + "px");

  $('#app-overlay').show();

  $('#app-menu-new-file').click(function(e) {
    $('#app-modal-newfile').modal('show');
  });
  $('#app-modal-newfile-ok').click(function(e) {
    $('#app-modal-newfile').modal('hide');
    var name = $.trim($('#app-modal-newfile-name').val());
    if (name == '')
      return;

    var zipPath = app.path.join(process.cwd(), name + ".zip");
    setting.newZipFile(zipPath);
    $('#app-modal-newfile-name').val("");
  });

  $('#app-menu-open-file').click(function(e) {
    $('#app-map-file').trigger('click');
  });
  $('#app-map-file').on('change', function(e) {
    var path = $.trim($(this).val());
    if (path == '')
      return;

    setting.openZipFile(path);
  });

  $('#app-sidebar-bg-file').on('change', function(e) {
    var path = $.trim($(this).val());
    if (path == '')
      return;
    $(this).val('');

    var filename = app.path.basename(path);
    var ext = filename.substr(filename.lastIndexOf('.') + 1);
    if (!ext || (ext != 'png' && ext != 'PNG'))
      {
        console.log(path + ' is not a png file');
        return;
      }
    var bgIndex = app.curBgTarget.split('-')[5];
    var imagePath = app.path.join(setting.imageDir, filename);
    app.fs.writeFileSync(imagePath, app.fs.readFileSync(path), 'binary');
    setting.addBackground(bgIndex, filename);
  });

  $('#app-menu-openrecent').click(function(e) {
    setting.reopenZipFile();
  });

  $('#app-menu-save-file').click(function(e) {
    setting.saveZipFile();
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

  $('#app-sidebar-map-add').click(function(e) {
    $('#app-modal-map').modal('show');
  });

  $('#app-sidebar-item-add-rect').click(function(e) {
    setting.add(null, { type: 0 });
  });
  $('#app-sidebar-item-add-circle').click(function(e) {
    setting.add(null, { type: 1 });
  });
  $('#app-sidebar-item-remove').click(function(e) {
    setting.removeSelected();
  });

  $('#app-modal-map-ok').click(function(e) {
    $('#app-modal-map').modal('hide');
    var name = $.trim($('#app-modal-map-name').val());
    if (name == '')
      return;

    var width = parseInt($('#app-modal-map-width').val());
    if (width < 100 || width > 9999)
      return;

    var height = parseInt($('#app-modal-map-height').val());
    if (width < 100 || width > 9999)
      return;

    setting.addMap(null, {
      name   : name,
      width  : width,
      height : height
    });
  });

  $('#app-sidebar-item-info-name').change(function(e) {
    var name = $.trim($(this).val());
    if (name == '')
      return;
    setting.modifySelected('name', name);
  });

  // window width(1280)/height(720) of package.json
  var diff_w = 1280 - $('#app-diagram').width();
  var diff_h = 720 - $('#app-diagram').height();

  // change position of scrollbar according to window size
  function resize_real() {
    var width = $(window).width() - diff_w;
    var height = $(window).height() - diff_h;

    $('#app-diagram-container').css('width', width + 'px');
    $('#app-diagram-container').css('height', height + 'px');
    $('#app-diagram').css('width', width + 'px');
    $('#app-diagram').css('height', height + 'px');
    diagram.reflectSizeChaged();
  }

  $(window).resize(function() {
    clearTimeout(this.rtid);
    this.rtid = setTimeout(resize_real, 100);
  });

  app.window.on('close', function() {
    // cleanup temporary directories
    if (setting.tmpDir && app.fs.existsSync(setting.tmpDir))
      app.releaseTemporaryDir(setting.tmpDir);
    setting.tmpDir = null;

    if (app.tmpDir && app.fs.existsSync(app.tmpDir))
      app.releaseTemporaryDir(app.tmpDir);
    app.tmpDir = null;

    this.close(true);
  });

  app.window.showDevTools();
  app.window.show();
});
